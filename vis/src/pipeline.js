'use strict';

import * as poll from './poll.js';
import * as ed from './ed.js';


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
      console.log(now, 'call aa', id);
    }

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
      graph.nodeIds[p.nodeid].params[p.paramid] = p.value;
      if (p.nodetype === 'aa') {
        updateAnalyzers();
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
