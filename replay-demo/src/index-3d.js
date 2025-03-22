"use strict";

import './index-3d.css';
import * as scene from './scene.js';
import * as d3 from 'd3';
import model3d from './3d-model.js';

import * as setup from './current-setup.js';
import parsePacket from './packet-parsing.js';
import * as apiClient from './api-client.js';



function startListening(s) {
  const i24 = []
  const i35 = []

  function mapPacket(packet) {
    setup.linear24.mapPacket(packet, (x, y, v) => i24[x] = v);
    setup.matrix35.mapPacket(packet, (x, y, v) => {
      // need to sync index mappings
      // input:
      //  - x: 0..6, chain, 0: road side, 6: thuja side
      //  - y: 0..4, pos,   0: garden side, 4: house side

      // out:
      //  - 0: house/thuja corner
      //  - +1: 1 step along chain to gardern
      //  - +5: 1 step to next chain to road

      i35[4 - y + (6 - x) * 5] = v;
    });
    s.setM35(i35);
  }

  apiClient.openWsLink({
    endpoint : '/ws-api/effects',
    onPackets : packets => {
      for (const packet of packets) {
        mapPacket(parsePacket(packet));
      }
    },
  });
}

export function initPage() {
  const sceneGraph = model3d.sceneGraph; //  scene.getScene();
  const matrix35 = model3d.matrix35;
  console.log(model3d)


  const s = scene.bind(d3.select('body'), sceneGraph, matrix35);

  // upper left control div
  const ulcd = d3.select('body').append('div').classed('ul-ctrl', true);
  ulcd.append('a').classed('modelink', true).attr('href', '/vis/#catalog').attr('title', 'Start page')
    .append('i').classed('fa fa-home', true);
  ulcd.append('a').classed('modelink', true).attr('href', '#2d').attr('title', 'Switch to 2D').text('2D');
  ulcd.append('a').classed('modelink', true).attr('href', '/vis/#vis2').attr('title', 'Switch to effect machine')
    .append('i').classed('fa fa-music', true);


  const llcd = d3.select('body').append('div').classed('ll-ctrl', true);

  const r1 = llcd.append('div').classed('ll-ctrl-row', true);
  const r1c1 = r1.append('div').classed('ll-ctrl-c1', true);
  const r1c2 = r1.append('div').classed('ll-ctrl-c2', true).text('Walk');
  r1c1.append('div').classed('keyhelp m', true).text('W');
  r1c1.append('br')
  r1c1.append('div').classed('keyhelp', true).text('A');
  r1c1.append('div').classed('keyhelp', true).text('S');
  r1c1.append('div').classed('keyhelp', true).text('D');

  const r2 = llcd.append('div').classed('ll-ctrl-row', true);
  const r2c1 = r2.append('div').classed('ll-ctrl-c1', true);
  const r2c2 = r2.append('div').classed('ll-ctrl-c2', true).text('Look around');
  r2c1.append('div').classed('keyhelp m', true).append('i').classed('fa fa-arrow-up', true);
  r2c1.append('br')
  r2c1.append('div').classed('keyhelp', true).append('i').classed('fa fa-arrow-left', true);
  r2c1.append('div').classed('keyhelp', true).append('i').classed('fa fa-arrow-down', true);
  r2c1.append('div').classed('keyhelp', true).append('i').classed('fa fa-arrow-right', true);


  const r3 = llcd.append('div').classed('ll-ctrl-row', true);
  const r3c1 = r3.append('div').classed('ll-ctrl-c1', true);
  const r3c2 = r3.append('div').classed('ll-ctrl-c2', true).text('Eye height');
  r3c1.append('div').classed('keyhelp w', true).text('PgUp');
  r3c1.append('div').classed('keyhelp w', true).text('PgDn');

  const r4 = llcd.append('div').classed('ll-ctrl-row', true);
  const r4c1 = r4.append('div').classed('ll-ctrl-c1', true);
  const r4c2 = r4.append('div').classed('ll-ctrl-c2', true).text('Zoom');
  r4c1.append('div').classed('keyhelp', true).text('+');
  r4c1.append('div').classed('keyhelp', true).text('-');

  startListening(s);
}

// document.addEventListener('DOMContentLoaded', initPage);
