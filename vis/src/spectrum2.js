'use strict';

import './spectrum2.css';
import * as d3 from 'd3';
import * as u from './util.js';


export default function addTo(parentD3) {
  const canvas = parentD3.append('canvas').attr('width', 800).attr('height', 64);
  const canvas2d = canvas.node().getContext('2d');
  const maxLabel = parentD3.append('div').classed('display-spectrum-limit max', true);
  const minLabel = parentD3.append('div').classed('display-spectrum-limit min', true);

  // canvas size
  var cw = 800;
  var ch = 64;

  var max = 0;
  var min = 0;

  var buffer;
  var fresh = true;
  var newLimits = false;

  function clear() {
    canvas2d.clearRect(0,0,cw,ch);
  }

  function reset() {
    max = 0;
    min = 0;
    maxLabel.text('');
    minLabel.text('');
    clear();
  }

  function updateCanvasSize(x, y) {
    cw = x;
    ch = y;
    canvas.attr('width', cw);
    canvas.attr('height', ch);
    clear();
  }
  updateCanvasSize(cw, ch);

  function updateLimits() {
    newLimits = false;
    if (min === 0 && max === 0) {
      minLabel.text('');
      maxLabel.text('');
    } else {
      minLabel.text(u.niceRound(min));
      maxLabel.text(u.niceRound(max));
    }
  }


  const ret = {
    ch : v => {
      updateCanvasSize(cw, Math.max(v, 10));
      return ret;
    },
    cw : v => {
      updateCanvasSize(Math.max(v, 10), ch);
      return ret;
    },
    reset : () => {
      reset();
      return ret;
    },
    add : bins => {
      if (!buffer || buffer.length !== bins.length) {
        buffer = new Float32Array(bins.length);
      }
      for (var i = 0; i < buffer.length; i++) {
        const v = bins[i];
        if (!Number.isFinite(v)) {
          continue;
        }
        if (buffer[i] < v || fresh) {
          buffer[i] = v;
          if (v > max) {
            max = v;
            newLimits = true;
          }
        }
        if (v < min) {
          min = v;
          newLimits = true;
        }
      }
      fresh = false;
      return ret;
    },
    render : () => {
      if (newLimits) {
        updateLimits();
      }
      fresh = true;
      canvas2d.clearRect(0,0,cw,ch);
      canvas2d.fillStyle = 'steelblue';
      if (buffer.length <= cw) {
        // no binning
        for (var i = 0; i < buffer.length; i++) {
          var h = Math.round(ch * (buffer[i] - min) / (max - min));
          if (h < 1) {
            h = 1;
          }
          canvas2d.fillRect(i, ch - h, 1, h);
        }
      } else {
        // some pixels will have > 1 bars
        for (var i = 0; i < cw; i++) {
          const b1 = Math.floor(buffer.length * i / cw); // inclusive
          const b2 = Math.floor(buffer.length * (i + 1) / cw); // exclusive
          var mx = buffer[b1];
          for (var j = b1 + 1; j < b2; j++) {
            if (buffer[j] > mx) {
              mx = buffer[j];
            }
          }
          var h = Math.round(ch * (mx - min) / (max - min));
          if (h < 1) {
            h = 1;
          }
          canvas2d.fillRect(i, ch - h, 1, h);
        }
      }
    }

  };
  return ret;
}
