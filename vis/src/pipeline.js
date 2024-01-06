'use strict';

import * as poll from './poll.js';



export function createPipeline() {
  // AudioContext frontend; currently playback instance is passed
  //  - can create analyzerNode
  //  - can tell sample rate
  var ctxFrontend;

  // Processing graph
  var graph;

  // map of analyzer ID to node defined in createAnalyzers()
  var analyzers;
  var apoll;


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
    },
    setGraph : g => {
      console.log('Processing graph set', g);
      graph = g;
    },
    run : () => {
      console.log('Run');
      apoll.start();
    },
    stop : () => {
      console.log('Stop');
      apoll.stop();
    },
    reset : () => {
      console.log('Reset');
    }
  };
  return ret;
}
