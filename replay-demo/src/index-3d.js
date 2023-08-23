"use strict";

import './index-3d.css';
import * as scene from './scene.js';
import * as d3 from 'd3';
import model3d from './3d-model.js';

export function initPage() {
  const sceneGraph = model3d.sceneGraph; //  scene.getScene();
  const matrix35 = model3d.matrix35;
  console.log(model3d)


  scene.bind(d3.select('body'), sceneGraph, matrix35);

  // upper left control div
  const ulcd = d3.select('body').append('div').classed('ul-ctrl', true);
  ulcd.append('a').classed('modelink', true).attr('href', '#2d').attr('title', 'Switch to 2D').text('2D')
      //.append('i').classed('fa fa-square', true);


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

}

// document.addEventListener('DOMContentLoaded', initPage);
