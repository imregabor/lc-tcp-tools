'use strict';

import * as d3 from 'd3';
import './player-demo.css';
import * as playback from './playback.js';
import * as poll from './poll.js';



export function initPage() {
  const body = d3.select('body');


  const c1 = body.append('div').classed('player-demo-titled-container', true);
  const c2 = body.append('div').classed('player-demo-titled-container', true);
  const c3 = body.append('div').classed('player-demo-titled-container', true);
  c1.append('div').classed('playback-parent-div-label', true).text('parentD3');
  const pbb1 = c1.append('div').classed('playback-parent-div', true);
  c2.append('div').classed('playback-parent-div-label', true).text('playerParentD3');
  const pbb2 = c2.append('div').classed('playback-parent-div', true);
  c3.append('div').classed('playback-parent-div-label', true).text('msgD3');
  const pbb3 = c3.append('div').classed('playback-parent-div', true);
  const pb = playback.addSimplePlayback(pbb1, pbb2, pbb3);


  const c4 = body.append('div').classed('player-demo-titled-container', true);
  c4.append('div').classed('playback-parent-div-label', true).text('Status:');
  const status = c4.append('div').classed('playback-parent-div', true).append('pre').append('code');

  function updateStatus() {
    var t = '';
    t = t + `sampleRate:      ${pb.sampleRate()}\n`;
    t = t + `getCurrentTime:  ${pb.getCurrentTime()}\n`;
    t = t + `getDuration:     ${pb.getDuration()}\n`;
    t = t + `getPlaybackInfo: ${JSON.stringify(pb.getPlaybackInfo())}\n`;
    t = t + `isPlaying:       ${pb.isPlaying()}\n`;
    t = t + `isPaused:        ${pb.isPaused()}\n`;
    status.text(t);
  }
  poll.newPoll(250, updateStatus).start();

  const c5 = body.append('div').classed('player-demo-titled-container', true);
  c5.append('div').classed('playback-parent-div-label', true).text('Events');

  function log(s) {
    c5.append('div').text(`${new Date(Date.now()).toLocaleString()}: ${s}`);
  }

  pb.onPlaybackStarted(() => log('playback started'));
  pb.onPlaybackStopped(() => log('playback stopped'));
  pb.onPlaybackPaused(() => log('playback paused'));
  pb.onPlaybackResumed(() => log('playback resumed'));
}
