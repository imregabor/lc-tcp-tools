"use strict";
import _ from 'lodash';
import * as d3 from 'd3';
import './style.css';
import chroma from 'chroma-js';
import cap from '../../data/capture-ppp.txt.gz';

console.log("HHH", cap);


function addMatrix(parentD3, opts) {
  const containerPadding = (opts.pad ? opts.pad : 1.0) * 60;
  const dotSeparation = (opts.sep ? opts.sep : 1.0) * 40;
  const dotSize = 30;

  function toIndex(col, row) {
    return row * opts.cols + col;
  } 

  const vToColor = chroma
    .scale(['#4d0f00', '#eded5e', '#ffffe6'])
    .correctLightness();

  var dots = [];
  for (var y = 0; y < opts.rows; y++) {
    for (var x = 0; x < opts.cols; x++) {
      var dot = {
        x : x,
        y : y,
        i : toIndex(x, y),
        v: 0
      }
      dots.push(dot);
    }
  }

  var cnt = parentD3.append('div')
    .classed('matrix-container', true)
    .style('width', (opts.cols * dotSize + (opts.cols - 1) * dotSeparation + 2 * containerPadding) + "px")
    .style('height', (opts.rows * dotSize + (opts.rows - 1) * dotSeparation + 2 * containerPadding) + "px");

  var ddivs = cnt.selectAll('.matrix-dot').data(dots).enter().append('div')
    .classed('matrix-dot', true)
    .style('width', dotSize + "px")
    .style('height', dotSize + "px")
    .style('left', d => (d.x * (dotSize + dotSeparation) + containerPadding) + "px")
    .style('top', d => (d.y * (dotSize + dotSeparation) + containerPadding) + "px")
    
    .attr("title", d => "Index: " + d.i);

  function render() {
    ddivs.style('background-color', d => vToColor(d.v));
  }

  render();

  var ret = {
    setValue : function(x, y, v) {
      dots[ toIndex(x, y) ].v = v;
    },
    getValue : function(x, y) {
      return dots[ toIndex(x, y) ].v;
    },
    render : function() {
      render();
    },
    cols: () => opts.cols,
    rows: () => opts.rows
  };
  return ret;
}



function component() {
  const element = document.createElement('div');

  element.innerHTML = _.join(['Hello', 'webpack'], ' ');

  d3.selectAll('abc')
  return element;
}

var m1;

function anima1() {
  for (var i = 0; i < m1.cols(); i++) {
    const ov = m1.getValue(i, 0);
    var nv = ov + 0.05;
    if (nv > 1.0) {
      nv = nv -1.0;
    }
    m1.setValue(i, 0, nv);
  }
  setTimeout(anima1, 50);
}

function initPage() {
  const body = d3.select('body');

  body.append('span').text('Hello');


  m1 = addMatrix(body, { cols: 24, rows: 1, sep: 0.1, pad: 0.2 } );
  for (var i = 0; i < 24; i++) {
    m1.setValue(i, 0, i / 23.0);
  }
  m1.render();
  var m2 = addMatrix(body, { cols: 7, rows: 5 } );

  anima1();

  function r() {
    m1.render();
    requestAnimationFrame(r);
  }

  r();
}

// see
document.addEventListener("DOMContentLoaded", initPage);