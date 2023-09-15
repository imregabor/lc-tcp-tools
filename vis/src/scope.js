'use strict';

import './scope.css';
import * as u from './util.js';
import * as d3 from 'd3';


export default function addTo(parentD3, label) {
  const d = parentD3.append('div').classed('display-scope', true);
  const canvas = d.append('canvas').attr('width', 200).attr('height', 200);
  const canvas2d = canvas.node().getContext('2d');

  d.append('span').classed('label', true).text(label);

  var cw = 200;
  var ch = 200;
  var maxBufSize = 5000;

  var xBuf, yBuf;
  var xMin, xMax, yMin, yMax;
  function reset() {
    xBuf = [];
    yBuf = [];
    xMin = 0;
    xMax = 1e-3;
    yMin = 0;
    yMax = 1e-3;
  }
  reset();

  function updateCanvasSize(x, y) {
    cw = x;
    ch = y;
    canvas.attr('width', cw);
    canvas.attr('height', ch);
  }
  updateCanvasSize(cw, ch);


  const ret = {
    add : (dt, x, y) => {
      var r = false;
      if (x < xMin) {
        xMin = x / 1.5;
        r = true;
      }
      if (x > xMax) {
        xMax = x * 1.5;
        r = true;
      }
      if (y < yMin) {
        yMin = y / 1.5;
        r = true;
      }
      if (y > yMax) {
        yMax = y * 1.5;
        r = true;
      }
      if (r) {
        ret.clear();
      }

      const px = Math.round((cw - 1) * (x - xMin) / (xMax - xMin));
      const py = Math.round(ch - (ch - 1) * (y - yMin) / (yMax - yMin) - 1);
      canvas2d.fillStyle = 'black';
      canvas2d.fillRect(px, py, 1, 1);
    },
    render : () => {

    },
    clear : () => {
      canvas2d.clearRect(0, 0, cw, ch);
    },
    reset : reset
  };
  return ret;
}




