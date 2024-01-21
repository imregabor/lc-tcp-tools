'use strict';

import * as poll from './poll.js';
import * as ed from './ed.js';
import * as u from './util.js';
import * as nodeDefs from './node-definitions.js';
import * as d3 from 'd3';


export function createPipeline() {
  // AudioContext frontend; currently playback instance is passed
  //  - can create analyzerNode
  //  - can tell sample rate
  var ctxFrontend;

  // Processing graph
  var graph;

  var visDataEnabled = false;

  // map of analyzer ID to node defined in createAnalyzers()
  var analyzers;

  // map of port outport ID (nodeID + '/' + outPortID) to port state
  //  - found: used temporarily when topology changed
  //  - updated: when new value is present in a tick
  var portStates;

  var apoll;
  var lastTick;


  const nodeFunctions = nodeDefs.nodeFunctions;

  // invoked with milliseconds since last call
  const tickEvent = ed.ed();

  function tick() {
    const now = Date.now();

    for (var id in portStates) {
      if (!portStates.hasOwnProperty(id)) {
        continue;
      }
      const p = portStates[id];
      p.updated = false;
    }

    for (var id in analyzers) {

      if (!analyzers.hasOwnProperty(id)) {
        continue;
      }

      const a = analyzers[id];
      const shouldCall = !a.lastCall || (a.lastCall + a.targetDelayMs <= now);
      if (!shouldCall) {
        continue;
      }
      a.lastCall = now;
      if (graph.nodeIds[id].portStateIds.spo) {
        const psId = graph.nodeIds[id].portStateIds.spo;
        const ps = portStates[psId];
        ps.type = 'spectrum';
        ps.updated = true;
        if (!ps.bins || ps.bins.length !== a.analyzerNode.frequencyBinCount) {
          ps.bins = new Float32Array(a.analyzerNode.frequencyBinCount);
        }
        a.analyzerNode.getFloatFrequencyData(ps.bins);         // fftdb - spectrum magnitudes in dB
      }
      if (graph.nodeIds[id].portStateIds.tdo) {
        const psId = graph.nodeIds[id].portStateIds.tdo;
        const ps = portStates[psId];
        ps.type = 'samples';
        ps.updated = true;
        if (!ps.samples || ps.samples.length !== a.analyzerNode.fftSize) {
          ps.samples = new Float32Array(a.analyzerNode.fftSize);
        }
        a.analyzerNode.getFloatTimeDomainData(ps.samples);
      }
    }

    graph.dagOrderIds.forEach(id => {
      const node = graph.nodeIds[id];
      switch (node.type) {
        case 'aa':
          // analyzers already processed
          break;
        case 'tde':
          var ips;
          var ops;
          if (node.portStateIds.tdi) {
            ips = portStates[node.portStateIds.tdi];
            if (ips.type !== 'samples') {
              // TODO: better error handling; in graph init time
              throw new Error('Expected "samples" as input');
            }
          }
          if (node.portStateIds.eo) {
            ops = portStates[node.portStateIds.eo];
            ops.type = 'scalar';
            ops.value = 0;
          }
          if (ips && ops && ips.updated) {
            ops.value = u.calcTimeDomainEnergy(ips.samples);
            ops.updated = true;
          }

          break;
        case 'vu':
          var ips;
          var ops;
          if (node.portStateIds.ein) {
            ips = portStates[node.portStateIds.ein];
            if (ips.type !== 'scalar') {
              // TODO: better error handling; in graph init time
              throw new Error('Expected "scalar" as input');
            }
          }
          if (node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];
            ops.type = 'channels';

            if (!ops.channels || ops.channels.length !== node.params.channels) {
              ops.channels = new Float32Array(node.params.channels);
            }

          }
          if (ips && ops && ips.updated) {
            const state = node.state;
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation

            const value = ips.value;


            const maxDecay = Math.exp( -state.maxDecayL * dt);
            const minDecay = Math.exp( -state.minDecayL * dt);
            const vh = value * 1.25; // todo - option
            const vl = value / 1.5;

            state.max = maxDecay * (state.max - vh) + vh;
            if (value > state.max) {
              state.max = vh;
            }

            state.min = minDecay * (state.min - vl) + vl;
            if (value < state.min) {
              state.min = vl;
            }

            var on = node.params.channels * (value - state.min) / (state.max - state.min);

            for (var i = 0; i < node.params.channels; i++) {
              if (on >= 1) {
                ops.channels[i] = 1;
                on = on - 1;
              } else if (on > 0) {
                ops.channels[i] = on;
                on = 0;
              } else {
                ops.channels[i] = 0;
              }
            }
            ops.updated = true;
          }
          break;
        case 'lr':
          var ipsLb24;
          var ipsLm35;
          if (node.portStateIds.lb24) {
            ipsLb24 = portStates[node.portStateIds.lb24];
            if (ipsLb24.type !== 'channels') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "channels" as input, got ${ipsLb24.type}`);
            }
          }
          if (node.portStateIds.lm35) {
            ipsLm35 = portStates[node.portStateIds.lm35];
            if (ipsLm35.type !== 'channels') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "channels" as input, got ${ipsLm35.type}`);
            }
          }

          const state = node.state;
          var maybeSend = false;
          if (ipsLb24 && ipsLb24.updated) {
            for (var i = 0; i < 24; i++) {
              state.lb24[i] = Math.max(state.lb24[i], ipsLb24.channels[i]);
            }
            maybeSend = true;
          }

          if (ipsLm35 && ipsLm35.updated) {
            for (var i = 0; i < 35; i++) {
              state.lm35[i] = Math.max(state.lm35[i], ipsLm35.channels[i]);
            }
            maybeSend = true;
          }

          const send = maybeSend && (!state.lastSend || ((now - state.lastSend) >= state.targetDelayMs));

          if (send) {
            state.lastSend = now;
            var url = '/api/setBulk100';
            var sepChar = '?';
            if (ipsLb24) {
              url = url + sepChar + 'm1=' + u.channelsToBulk100(state.lb24);
              state.lb24.fill(0);
              sepChar = '&';
            }
            if (ipsLm35) {
              url = url + sepChar + 'm2=' + u.channelsToBulk100(state.lm35);
              state.lm35.fill(0);
              sepChar = '&';
            }

            d3.text(url, {
              method : 'POST',
            }).then(() => {}, () => {});
          }
          break;
      }
    });

    if (visDataEnabled) {
      tickEvent(now - lastTick);
    }
    lastTick = now;
  }

  function updatePortStates() {
    console.log('Update port states');
    if (!graph) {
      return;
    }

    portStates = portStates || {};

    for (var id in portStates) {
      if (!portStates.hasOwnProperty(id)) {
        continue;
      }
      const p = portStates[id];
      p.found = false;
    }


    graph.nodes.forEach(n => {
      for (var portId in n.portStateIds) {
        if (!n.portStateIds.hasOwnProperty(portId)) {
          continue;
        }
        const psId = n.portStateIds[portId];
        var ps;
        if (!portStates[psId]) {
          ps = {};
          portStates[psId] = ps;
        } else {
          ps = portStates[psId];
        }
        ps.found = true;
      }
    });

    for (var id in portStates) {
      if (!portStates.hasOwnProperty(id)) {
        continue;
      }
      const p = portStates[id];
      if ( !p.found ) {
        delete portStates[id];
      }
    }

    console.log('PortStates:', portStates);
  }


  function updateAnalyzers() {
    console.log('Create / update analyzers');
    if (!ctxFrontend || !graph) {
      return;
    }
    analyzers = analyzers || {};
    var maxFps = 0;

    for (var id in analyzers) {
      if (!analyzers.hasOwnProperty(id)) {
        continue;
      }
      const a = analyzers[id];
      a.found = false;
    }

    graph.nodes.forEach(n => {
      if (n.type !== 'aa') {
        return;
      }
      var na;
      if (!analyzers[n.id]) {
        na = {
          analyzerNode : ctxFrontend.newAnalyserNode(),
        };
        na.analyzerNode.smoothingTimeConstant = 0;
        analyzers[n.id] = na;
      } else {
        na = analyzers[n.id];
      }
      na.graphNode = n;
      na.found = true;
      na.targetFps = n.params.targetFps;
      na.targetDelayMs = 1000 / n.params.targetFps;
      na.analyzerNode.fftSize = n.params.fftSize;
      maxFps = Math.max(maxFps, na.targetFps);
    });

    for (var id in analyzers) {
      if (!analyzers.hasOwnProperty(id)) {
        continue;
      }
      const a = analyzers[id];
      if ( !a.found ) {
        delete analyzers[id];
      };
    }


    console.log('Analyzers:', analyzers, 'maxFps:', maxFps);

    if (maxFps > 1000) {
      maxFps = 1000;
    }
    if (maxFps < 5) {
      maxFps = 5;
    }

    const pollDelay = Math.round(1000 / maxFps);
    if (apoll) {
      apoll.setDelay(pollDelay);
    } else {
      apoll = poll.newPoll(pollDelay, tick);
    }

  }


  const ret = {
    setCtx : ctxFe => {
      console.log('AudioContext frontend set');
      ctxFrontend = ctxFe;
      analyzers = undefined;
      updateAnalyzers();
      return ret;
    },
    setGraph : g => {
      // note that passed graph is extended
      //   g.nodeIds:     map of ID to nodes
      //   g.dagOrderIds: DAG ordered node IDs
      //   g.nodes[].isConnected: true when there is an in/out edge
      //   g.nodes[].portStateIds: map of port ID to ID in portStates (when connected)
      g.nodeIds = {};


      g.nodes.forEach(n => {
        n.isConnected = false;
        g.nodeIds[n.id] = n;
        n.portStateIds = {};
        if (nodeFunctions[n.type] && nodeFunctions[n.type].initState) {
          n.state = nodeFunctions[n.type].initState(n.params);
        }
      });
      g.edges.forEach(e => {
        g.nodeIds[e.n1id].isConnected = true;
        g.nodeIds[e.n2id].isConnected = true;

        g.nodeIds[e.n1id].portStateIds[ e.p1 ] = `${e.n1id}/${e.p1}`;
        g.nodeIds[e.n2id].portStateIds[ e.p2 ] = `${e.n1id}/${e.p1}`;
      });

      const dagLevels = {};
      g.nodes.forEach(n => { dagLevels[n.id] = 0; });
      var nextRound = true;
      while (nextRound) {
        nextRound = false;
        g.edges.forEach(e => {
          const minDagLevel = dagLevels[e.n1id] + 1;
          if (dagLevels[e.n2id] < minDagLevel) {
            nextRound = true;
            dagLevels[e.n2id] = minDagLevel;
            if (minDagLevel > g.nodes.lenght || minDagLevel > g.edges.length) {
              // TODO: This will leave editor in an inconsistent state
              // better error handling / reporting is needed
              throw new Error('Loop found');
            }
          }
        });
      }


      g.dagOrderIds = [];
      g.nodes.forEach(n => g.dagOrderIds.push(n.id));
      g.dagOrderIds.sort((a, b) => dagLevels[a] - dagLevels[b]);





      console.log('Processing graph set', g);

      graph = g;
      updatePortStates();
      updateAnalyzers();
      return ret;
    },
    updateParameter : p => {
      console.log('Parameter update', p);
      const node = graph.nodeIds[p.nodeid];
      node.params[p.paramid] = p.value;
      if (node.type === 'aa') {
        updateAnalyzers();
      }

      if (nodeFunctions[node.type] && nodeFunctions[node.type].initState) {
        if (nodeFunctions[node.type].updateState) {
          nodeFunctions[node.type].updateState(node.params, node.state);
        } else {
          node.state = nodeFunctions[node.type].initState(node.params);
        }
      }

      return ret;
    },
    run : () => {
      console.log('Run');
      lastTick = Date.now(); // avoid reporting large first dt value
      apoll.start();
      return ret;
    },
    stop : () => {
      console.log('Stop');
      apoll.stop();
      return ret;
    },
    reset : () => {
      console.log('Reset');
      return ret;
    },
    // Interface for visualizations
    /**
     * No visualization callbacks will be invoked.
     */
    pauseVisData : () => {
      visDataEnabled = false;
      return ret;
    },
    /**
     * Invoke visualization callbacks.
     */
    resumeVisData : () => {
      visDataEnabled = true;
      return ret;
    },
    /**
     * Invoked with time in milliseconds since last tick.
     */
    onTick : h => {
      tickEvent.add(h);
      return ret;
    }
  };
  return ret;
}
