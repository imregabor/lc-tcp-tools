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
      console.log('Processing graph set', g);
      graph = g;
      updateAnalyzers();
      return ret;
    },
    updateParameter : p => {
      console.log('Parameter update', p);
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
