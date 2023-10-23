'use strict';

import * as d3 from 'd3';
import * as apiclient from './api-client.js';
import './rc.css';
import '@fortawesome/fontawesome-free/css/all.css'

function formatTime(t) {
  t = Math.floor(+t);
  if (t < 3600) {
    return `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, '0')}`
  } else {
    return `${Math.floor(t / 3600)}:${Math.floor((t % 3600)/ 60).toString().padStart(2, '0')}:${(t % 60).toString().padStart(2, '0')}`
  }

  return `${t} s`;
}

function addRb(parentD3, faClass, title) {
  const div = parentD3.append('div').classed('rect-button', true).attr('title', title).on('click', onClick);
  const icon = div.append('i').classed(`fa ${faClass}`, true);
  var lab;
  var click;

  function onClick() {
    if (!click) {
      return;
    }
    if (div.classed('disabled')) {
      return;
    }
    click(ret);
  }

  const ret = {
    label : text => {
      if (lab) {
        return;
      }
      lab = div.append('span').classed('xtra-label', true).text(text);
      return ret;
    },
    enabled : e => {
      div.classed('disabled', !e);
      return ret;
    },
    disable : () => ret.enabled(false),
    enable : () => ret.enabled(true),
    onClick : h => {
      click = h;
      return ret;
    }
  };

  return ret;
}

export function initPage() {
  const wslink = apiclient.openWsLink({
    endpoint : '/ws-api/effects',
    expectNonJsonMessages : true,
    onJson: o => {
      console.log('Status link message', o);
      if (o && o.event && o.event === 'START_PLAYBACK') {
        playing(o.info);
      } else if (o && o.event && o.event === 'STOP_PLAYBACK') {
        notPlaying();
      } else if (o && o.event && o.event === 'PLAYBACK_POSITION') {
        progress(o.info);
      } else if (o && o.event && o.event === 'PLAYBACK_INFO') {
        playing(o.info);
      }


    }
  });

  const body = d3.select('body');
  body.append('h1').text('Remote controller');

  const ct1 = body.append('div').classed('fw-box', true);
  const b1 = addRb(ct1, 'fa-stop', 'Stop playback')
    .onClick(() => apiclient.stopPlayback());
  const b2 = addRb(ct1, 'fa-pause', 'Pause playback');
  const b3 = addRb(ct1, 'fa-play', 'Resume playback');
  const b4 = addRb(ct1, 'fa-caret-left', 'Seek back 3s')
    .label('3s')
    .onClick(() => apiclient.seekRelativePlayback(-3));
  const b5 = addRb(ct1, 'fa-caret-right', 'Seek forward 3s')
    .label('3s')
    .onClick(() => apiclient.seekRelativePlayback(3));

  const sd = ct1.append('div').classed('stats', true);
  const s1 = sd.append('div').classed('stat', true);
  const s2 = sd.append('div').classed('stat', true);

  const pd = body.append('div').classed('fw-box', true);
  const p1 = pd.append('div').classed('stat', true);

  function notPlaying() {
    b1.disable();
    b2.disable();
    b3.disable();
    b4.disable();
    b5.disable();
    s1.text('No playback').classed('disabled', true);
    s2.text('No URL').classed('disabled', true);
    p1.text('No progress').classed('disabled', true);
  }

  function playing(info) {
    b1.enable();
    s1.text(`Playback: ${info.audio}`).classed('disabled', false);
    if (info.url) {
      s2.text(`URL: ${decodeURI(info.url)}`).classed('disabled', false);
    }
  }

  function progress(info) {
    b4.enable();
    b5.enable();
    p1.text(`${formatTime(info.position)} / ${formatTime(info.duration)}`).classed('disabled', false);
  }

  notPlaying();

  apiclient.checkPlayback();
}
