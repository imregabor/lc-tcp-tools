'use strict';

import * as d3 from 'd3';

export function initPage() {
  const body = d3.select('body');
  body.append('h1').text('LC tools');
  body.append('a')
      .attr('href', '#vis')
      .text('Effect machine + player');
  body.append('br');
  body.append('a')
      .attr('href', '#vis2')
      .text('Effect machine 2 + player');
  body.append('br');
  body.append('a')
      .attr('href', '#rc')
      .text('Remote controller');
  body.append('br');
  body.append('a')
      .attr('href', '/#2d')
      .text('2D visualize');
  body.append('br');
  body.append('a')
      .attr('href', '/#3d')
      .text('3D visualize');
}
