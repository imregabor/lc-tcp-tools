'use strict';

import * as d3 from 'd3';
import * as apiclient from './api-client.js';
import './rc.css';
import '@fortawesome/fontawesome-free/css/all.css'

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
        playing();
      } else if (o && o.event && o.event === 'STOP_PLAYBACK') {
        notPlaying();
      }

    }
  });

  const body = d3.select('body');
  body.append('h1').text('Remote controller');

  const b1 = addRb(body, 'fa-stop', 'Stop playback')
    .onClick(() => apiclient.stopPlayback());
  const b2 = addRb(body, 'fa-pause', 'Pause playback');
  const b3 = addRb(body, 'fa-play', 'Resume playback');
  const b4 = addRb(body, 'fa-caret-left', 'Seek back 3s').label('3s');
  const b5 = addRb(body, 'fa-caret-right', 'Seek forward 3s').label('3s');

  function notPlaying() {
    b1.disable();
    b2.disable();
    b3.disable();
    b4.disable();
    b5.disable();
  }

  function playing() {
    b1.enable();
  }

  notPlaying();
}
