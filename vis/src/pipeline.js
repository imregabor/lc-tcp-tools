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
  var apoll;
  var lastTick;

  // invoked with milliseconds since last call
  const tickEvent = ed.ed();

  function tick() {
    console.log('Tick')
    const now = Date.now();
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


  function createAnalyzers() {
    console.log('Create analyzers');
    if (!ctxFrontend || !graph) {
      return;
    }
    analyzers = analyzers || {};
    var maxFps = 0;
    graph.nodes.forEach(n => {
      if (n.type !== 'aa') {
        return;
      }
      const na = {
        analyzerNode : ctxFrontend.newAnalyserNode(),
        targetFps : n.params.targetFps,
        targetDelayMs : 1000 / n.params.targetFps,
      };
      na.analyzerNode.fftSize = n.params.fftSize;
      na.analyzerNode.smoothingTimeConstant = 0;
      analyzers[n.id] = na;
      maxFps = Math.max(maxFps, na.targetFps);
    });
    console.log('Analyzers:', analyzers, 'maxFps:', maxFps);

    if (maxFps > 1000) {
      maxFps = 1000;
    }
    if (maxFps < 5) {
      maxFps = 5;
    }

    apoll = poll.newPoll(Math.round(1000 / maxFps), tick);
  }


  const ret = {
    setCtx : ctxFe => {
      console.log('AudioContext frontend set');
      ctxFrontend = ctxFe;
      analyzers = undefined;
      createAnalyzers();
      return ret;
    },
    setGraph : g => {
      console.log('Processing graph set', g);
      graph = g;
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
