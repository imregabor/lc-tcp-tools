'use strict';

import * as poll from './poll.js';
import * as ed from './ed.js';
import * as u from './util.js';
import * as nodeDefs from './node-definitions.js';
import * as d3 from 'd3';

export function a() {
  return 4;
}

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
  const nodeTypes = nodeDefs.nodeTypes;

  // invoked with milliseconds since last call
  const tickEvent = ed.ed();

  const errEvent = ed.ed();


  function tick() {
    const now = Date.now();
    const sampleRate = ctxFrontend.sampleRate();

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

      if (a.err) {
        continue;
      }

      const shouldCall = !a.lastCall || (a.lastCall + a.targetDelayMs <= now);
      if (!shouldCall) {
        continue;
      }
      a.lastCall = now;
      if (graph.nodeIds[id].portStateIds.spo) {
        const psId = graph.nodeIds[id].portStateIds.spo;
        const ps = portStates[psId];
        ps.type = 'spectrum';
        ps.maxf = sampleRate / 2;
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
          console.log('!!!!')
        }
        a.analyzerNode.getFloatTimeDomainData(ps.samples);
      }
    }

    graph.dagOrderIds.forEach(id => {
      const node = graph.nodeIds[id];
      const state = node.state;

      const f = {
        node : node,
        state : state,
        input : (portLabel, expectedType) => {
          const psid = node.portStateIds[portLabel];
          if (!psid) {
            // input port is not connected
            return null;
          }
          const ps = portStates[psid];
          if (expectedType && ps.type && ps.type !== expectedType) {
            throw new Error(`Expected "${expectedType}" as input, got "${ps.type}"`);
          }
          return ps;
        },
        outputScalar : portLabel => {
          const psid = node.portStateIds[portLabel];
        }
      };


      switch (node.type) {
        case 'aa':
          // analyzers already processed
          break;
        case 'fde':
          var ips;
          var ops;
          if (node.portStateIds.fdi) {
            ips = portStates[node.portStateIds.fdi];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.eo) {
            ops = portStates[node.portStateIds.eo];
            if (ops.type !== 'scalar') {
              ops.type = 'scalar';
              ops.value = 0;
            }
          }
          if (ips && ops && ips.updated) {
            ops.value = u.avgSqr1(ips.bins);
            ops.updated = true;
          }
          break;
        case 'tde':
          var ips;
          var ops;
          if (node.portStateIds.tdi) {
            ips = portStates[node.portStateIds.tdi];
            if (ips.type !== 'samples') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "samples" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.eo) {
            ops = portStates[node.portStateIds.eo];
            if (ops.type !== 'scalar') {
              ops.type = 'scalar';
              ops.value = 0;
            }
          }
          if (ips && ops && ips.updated) {
            ops.value = u.calcTimeDomainEnergy(ips.samples);
            ops.updated = true;
          }

          break;
        case 'dbm2linm':
          var ips;
          var ops;
          if (node.portStateIds.spi) {
            ips = portStates[node.portStateIds.spi];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.spo && ips) {
            ops = portStates[node.portStateIds.spo];
            ops.type = 'spectrum';
            if (!ops.bins || ops.bins.length !== ips.bins.length) {
              ops.bins = new Float32Array(ips.bins.length);
            }
          }
          if (ips && ops && ips.updated) {
            ops.maxf = ips.maxf;
            u.calcMagnitudeFromDb(ips.bins, ops.bins);
            ops.updated = true;
          }
          break;
        case 'aw':
          var ips;
          var ops;
          if (node.portStateIds.spi) {
            ips = portStates[node.portStateIds.spi];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.spo && ips) {
            ops = portStates[node.portStateIds.spo];
            ops.type = 'spectrum';
            ops.maxf = ips.maxf;
            if (!ops.bins || ops.bins.length !== ips.bins.length) {
              ops.bins = new Float32Array(ips.bins.length);
            }
          }
          if (ips && (!state.weights || state.weights.length !== ips.bins.length)) {
            state.weights = u.calcAWeights(ips.bins.length, sampleRate);
          }

          if (ips && ops && ips.updated) {
            u.calcWeightedMagnitudes(ips.bins, state.weights, ops.bins);
            ops.updated = true;
          }
          break;
        case 'mh':
          var ips;
          var ops;
          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'scalar' && ips.type !== 'spectrum' && ips.type !== 'channels') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "scalar", "spectrum" or "channels" as input, got "${ips.type}"`);
            }
          }
          if (node.portStateIds.out && ips) {
            ops = portStates[node.portStateIds.out];
            ops.type = ips.type;

            switch (ips.type) {
              case 'scalar':
                if (!ops.value) {
                  ops.value = 0;
                  ops.channels = undefined;
                  ops.bins = undefined;
                  state.holdFrom = 0;
                }
                break;
              case 'channels':
                if (!ops.channels || ops.channels.length !== ips.channels.length || !state.holdFrom || state.holdFrom.length !== ips.channels.length) {
                  ops.value = undefined;
                  ops.channels = new Float32Array(ips.channels.length);
                  ops.bins = undefined;
                  state.holdFrom = new Array(ips.channels.length);
                }
                break;
              case 'spectrum':
                ops.maxf = ips.maxf;
                if (!ops.bins || ops.bins.length !== ips.bins.length || !state.holdFrom || state.holdFrom.length !== ips.bins.length) {
                  ops.value = undefined;
                  ops.channels = undefined;
                  ops.bins = new Float32Array(ips.bins.length);
                  state.holdFrom = new Array(ips.bins.length);
                }
                break;
            }
          }
          if (ips && ops && ips.updated) {
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation
            const decay = Math.exp( -state.decayL * dt);
            switch (ips.type) {
              case 'channels':
              case 'spectrum':
                const ia = ips.type === 'channels' ? ips.channels : ips.bins;
                const oa = ips.type === 'channels' ? ops.channels : ops.bins;
                for (var i = 0; i < oa.length; i++) {
                  if (!node.params.sustain || (state.holdFrom[i] + node.params.sustain) <= now) {
                    oa[i] = oa[i] * decay;
                  }
                  if (ia[i] > oa[i]) {
                    oa[i] = ia[i];
                    if (node.params.sustain) {
                      state.holdFrom[i] = now;
                    }
                  }
                }
                break;
              case 'scalar':
                if (!node.params.sustain || (state.holdFrom + node.params.sustain) <= now) {
                  ops.value = ops.value * decay;
                }
                if (ips.value > ops.value) {
                  ops.value = ips.value;
                  if (node.params.sustain) {
                    state.holdFrom = now;
                  }
                }
                break;
            }
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
              throw new Error(`Expected "scalar" as input, got "${ips.type}"`);
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
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation

            const value = +ips.value;


            const maxDecay = Math.exp( -state.maxDecayL * dt);
            const minDecay = Math.exp( -state.minDecayL * dt);
            const vh = value * 1.25; // todo - option
            const vl = value / 1.5;

            state.max = maxDecay * (state.max - vh) + vh;
            if (node.params.maxFloor > state.max) {
              state.max = node.params.maxFloor;
            }
            if (value > state.max) {
              state.max = vh;
            }

            state.min = minDecay * (state.min - vl) + vl;
            if (value < state.min) {
              state.min = vl;
            }

            const normalized = (value - state.min) / (state.max - state.min);


            var onValue = node.params.onValueA * normalized + node.params.onValueB;
            if (onValue < 0) {
              onValue = 0;
            } else if (onValue > 1) {
              onValue = 1;
            }
            console.log(normalized, onValue)

            var on = node.params.channels * normalized * onValue;

            for (var i = 0; i < node.params.channels; i++) {
              if (on >= onValue) {
                ops.channels[i] = onValue;
                on = on - onValue;
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
        case 'sb':
          var ips;
          var ops;
          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
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
            if (state.binCount !== ips.bins.length || state.maxFreq !== ips.maxf) {
              console.log('Subbands bin layout');
              // TODO: parameter validation, corner cases
              //  - invalid frequencies, freq out of range, hi <= lo (except for 2 ch)
              //  - 1 or 2 ch

              const binWidth = ips.maxf / ips.bins.length;

              state.binCount = ips.bins.length;
              state.maxFreq = ips.maxf;

              state.max = new Float32Array(node.params.channels);
              state.chBin0 = [];
              state.chBin1 = [];
              state.chBin0a = [];
              state.chBin1a = [];

              // middle channel count:           mcc = channels - 2

              // channel width (ratio of freqs): cw
              // channels are equal widths, so   (hi / lo) = cw ^ mcc
              //                                 cw = (hi / lo) ^ 1/mcc
              const cw = Math.pow(node.params.hf / node.params.lf, 1 / (node.params.channels - 2));


              console.log('binWidth:', binWidth, 'binCount:', state.binCount, 'maxFreq:', state.maxFreq, 'cw:', cw);

              // position to first channel (LPF) cutoff
              var lastFreq = node.params.lf;
              var lastPartialBin = lastFreq / binWidth;
              var lastBinUpper = Math.ceil(lastPartialBin);
              var lastBinLower = Math.floor(lastPartialBin);
              var lastLowerPart = lastPartialBin - lastBinLower;
              var lastUpperPart = lastBinUpper - lastPartialBin;

              if (node.params.doLpf) {
                // first channel: LPF
                state.chBin0.push(0)
                state.chBin1.push(lastBinUpper); // inclusve
                state.chBin0a.push(lastBinUpper === 0 ? 0 : 1); // for single bin channel last "a" is used
                state.chBin1a.push(lastLowerPart); // for single bin channel last "a" is used
              }


              var innerChCount = node.params.channels;
              if (node.params.doHpf) {
                innerChCount = innerChCount - 1;
              }
              if (node.params.doLpf) {
                innerChCount = innerChCount - 1;
              }

              // step through inner channels
              for (var i = 0; i < innerChCount; i++) {
                // next freq is current middle channel upper end
                const nextFreq = lastFreq * cw;
                const nextPartialBin = nextFreq / binWidth;
                const nextBinUpper = Math.ceil(nextPartialBin);
                const nextBinLower = Math.floor(nextPartialBin);
                const nextLowerPart = nextPartialBin - nextBinLower;
                const nextUpperPart = nextBinUpper - nextPartialBin;

                state.chBin0.push(lastBinLower);
                state.chBin1.push(nextBinUpper);
                state.chBin0a.push(lastBinLower === nextBinUpper ? 0 : lastUpperPart); // for single bin channel last "a" is used
                state.chBin1a.push(lastBinLower === nextBinUpper ? lastUpperPart + nextLowerPart : nextLowerPart); // for single bin channel last "a" is used

                lastFreq = nextFreq;
                lastPartialBin = nextPartialBin;
                lastBinUpper = nextBinUpper;
                lastBinLower = nextBinLower;
                lastLowerPart = nextLowerPart;
                lastUpperPart = nextUpperPart;

                console.log('Next upper freq for intermediate bin:', nextFreq);
              }

              if (node.params.doHpf) {
                // last channel: HPF
                state.chBin0.push(lastBinLower)
                state.chBin1.push(state.binCount - 1);
                state.chBin0a.push(lastUpperPart);
                state.chBin1a.push(1);
              }

              //const b1 = node.params.hf / binWidth;
              console.log('subbands bins layouted. Params: ', node.params, 'state:', state);
            }

            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation


            const maxDecay = Math.exp( -state.maxDecayL * dt);


            for (var i = 0; i < state.chBin0.length; i++) {
              const firstBinIndex = state.chBin0[i];
              const lastBinIndex = state.chBin1[i];
              var d = 0;
              var sume = 0;
              for (var bin = firstBinIndex; bin <= lastBinIndex; bin++) {
                var a = 1;
                if (bin === lastBinIndex) {
                  a = state.chBin1a[i];
                } else if (bin === firstBinIndex) {
                  a = state.chBin0a[i];
                }
                const e = a * ips.bins[bin] * ips.bins[bin];
                sume = sume + e;
                d = d + a;
              }
              const chi = node.params.doAvg ? sume / d : sume;
              ops.channels[i] = chi;

              state.max[i] = maxDecay * state.max[i];
              if (node.params.maxFloor > state.max[i]) {
                state.max[i] = node.params.maxFloor;
              }
              if (chi > state.max[i]) {
                state.max[i] = chi;
              }
            }
            if (node.params.maxSpillHbc) {
              for (var i = 0; i < state.max.length; i++) {
                const mi = state.max[i];
                const s1 =
                    ((i > 0) && (node.params.spillXpf || !node.params.doLpf))
                    ? state.max[i - 1] * state.maxSpill
                    : 0;
                const s2 =
                    ((i < state.max.length - 1) && (node.params.spillXpf || !node.params.doHpf))
                    ? state.max[i + 1] * state.maxSpill
                    : 0;
                if (mi < s1) {
                  state.max[i] = s1;
                }
                if (mi < s2) {
                  state.max[i] = s2;
                }
              }
            }
            for (var i = 0; i < state.chBin0.length; i++) {
              ops.channels[i] = ops.channels[i] / state.max[i];
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

          var maybeSend = false;
          if (ipsLb24 && ipsLb24.updated) {
            const channelCount = Math.min(24, state.lb24.length);
            for (var i = 0; i < channelCount; i++) {
              state.lb24[i] = Math.max(state.lb24[i], ipsLb24.channels[i]);
            }
            state.lb24valid = true;
            maybeSend = true;
          }

          if (ipsLm35 && ipsLm35.updated) {
            const channelCount = Math.min(35, state.lm35.length);
            for (var i = 0; i < channelCount; i++) {
              state.lm35[i] = Math.max(state.lm35[i], ipsLm35.channels[i]);
            }
            state.lm35valid = true;
            maybeSend = true;
          }

          const send = maybeSend && (!state.lastSend || ((now - state.lastSend) >= state.targetDelayMs));
          if (send) {
            state.lastSend = now;
            var url = '/api/setBulk100';
            var sepChar = '?';
            if (ipsLb24 && state.lb24valid) {
              url = url + sepChar + 'm1=' + u.channelsToBulk100(state.lb24);
              state.lb24.fill(0);
              state.lb24valid = false;
              sepChar = '&';
            }
            if (ipsLm35 && state.lm35valid) {
              url = url + sepChar + 'm2=' + u.channelsToBulk100(state.lm35);
              state.lm35.fill(0);
              state.lm35valid = false;
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
      try {
        na.analyzerNode.fftSize = n.params.fftSize;
        if (na.err) {
          na.err.err = false;
          console.log('Fixed', na.err);
          errEvent(na.err);
        }
        na.err = false;
      } catch (e) {
        na.err = {
          err : true,
          nodeId : n.id,
          nodeLabel : n.label,
          message: e.message
        };
        console.log('Error:', e);
        errEvent(na.err);
      }
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
    onError : h => {
      errEvent.add(h);
      return ret;
    },
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
      console.log('[pipeline] Run');
      lastTick = Date.now(); // avoid reporting large first dt value
      apoll.start();
      return ret;
    },
    stop : () => {
      console.log('[pipeline] Stop');
      apoll.stop();
      return ret;
    },
    reset : () => {
      console.log('[pipeline] Reset');
      graph && graph.nodes.forEach(n => {
        if (nodeFunctions[n.type] && nodeFunctions[n.type].initState) {
          n.state = nodeFunctions[n.type].initState(n.params);
        }
      });
      if (portStates) {
        for (var id in portStates) {
          if (!portStates.hasOwnProperty(id)) {
            continue;
          }
          const p = portStates[id];
          p.value = undefined;
          p.bins = undefined;
          p.channels = undefined;
          p.maxf = undefined;
          p.updated = false;
        }
      }
      return ret;
    },
    // Interface for visualizations
    /**
     * No visualization callbacks will be invoked.
     */
    pauseVisData : () => {
      console.log('[pipeline] Pause visualization');
      visDataEnabled = false;
      return ret;
    },
    /**
     * Invoke visualization callbacks.
     */
    resumeVisData : () => {
      console.log('[pipeline] Resume visualization');
      visDataEnabled = true;
      return ret;
    },
    /**
     * Invoked with time in milliseconds since last tick.
     */
    onTick : h => {
      tickEvent.add(h);
      return ret;
    },
    getPortState : portId => portStates[portId],
    getPortStateInfos : () => {
      if (!graph) {
        return;
      }
      const ret = [];
      graph.nodes.forEach(n => {
        const ports = nodeTypes[n.type].ports;
        for (var pid in ports) {
          if (!ports.hasOwnProperty(pid)) {
            continue;
          }
          if (ports[pid].type === 'out' && n.portStateIds[pid]) {
            ret.push({
              portStateId : n.portStateIds[pid],
              nodeId : n.id,
              nodeLabel : n.label,
              portLabel : ports[pid].label
            });
          }
        }
      });
      return ret;
    }
  };
  return ret;
}
