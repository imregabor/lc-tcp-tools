'use strict';

import * as d3 from 'd3';
import './notes.css';

var container;

function m(label, message) {
  if (!container) {
    container = d3.select('body').append('div').classed('note-ctr', true);
  }
  console.log(`[${label}]`, message);


  const div = container
    .append('div')
    .classed('note-top', true)
    .text(message)
    .style('opacity', 0)
  div
    .transition()
    .duration(150)
    .style('opacity', 1)
    .transition()
    .duration(350)
    .delay(1500)
    .style('height', '0px') // not the nicest hide; enclosing div would be better
    .style('margin-bottom', '0px')
    .style('padding', '0px')
    .style('opacity', 0)
    .remove();
  return div;
}

export function top(message) {
  m('MESSAGE', message);
}

export function topErr(message) {
  m('ERROR', message).classed('note-err', true);
}
