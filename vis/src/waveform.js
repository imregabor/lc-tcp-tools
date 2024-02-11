'use strict';

import './waveform.css';
import * as d3 from 'd3';
import * as u from './util.js';


export default function addTo(parentD3) {
  const canvas = parentD3.append('canvas').attr('width', 800).attr('height', 64);
  const canvas2d = canvas.node().getContext('2d');
  const maxLabel = parentD3.append('div').classed('display-waveform-limit max', true);
  const minLabel = parentD3.append('div').classed('display-waveform-limit min', true);

  // canvas size
  var cw = 800;
  var ch = 64;

  var max = 0;

  var buffer;
  var hasData = false;
  var newLimits = false;


  function clear() {
    canvas2d.clearRect(0,0,cw,ch);
  }

  function reset() {
    max = 0;
    maxLabel.text('');
    minLabel.text('');
    clear();
    hasData = false;
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
    if (max === 0) {
      minLabel.text('');
      maxLabel.text('');
    } else {
      minLabel.text(u.niceRound(-max));
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
    add : samples => {
      if (hasData) {
        return;
      }
      if (!buffer || buffer.length !== samples.length) {
        buffer = new Float32Array(samples.length);
      }
      buffer.set(samples);
      hasData = true;
      return ret;
    },
    render : () => {
      hasData = false;
      canvas2d.clearRect(0,0,cw,ch);
      for (var i = 0; i < buffer.length; i++) {
        if (Math.abs(buffer[i]) > max) {
          max = Math.abs(buffer[i] * 1.2);
          newLimits = true;
        }
      }

      if (newLimits) {
        updateLimits();
      }


      const y0 = Math.round(ch / 2);
      canvas2d.fillStyle = '#ccc';

      if (buffer.length < cw) {
        canvas2d.fillRect(0, y0, buffer.length, 1);
        canvas2d.fillStyle = 'black';
        var prevy = 0;
        for (var i = 0; i < buffer.length; i++) {
          const y = Math.round(y0 - y0 * buffer[i] / max);
          if (i == 0) {
            canvas2d.fillRect(i, y, 1, 1);
          } else {
            if (y === prevy) {
              canvas2d.fillRect(i, y, 1, 1);
            } if (y < prevy) {
              canvas2d.fillRect(i, y, 1, prevy - y);
            } else {
              canvas2d.fillRect(i, prevy, 1, y - prevy);
            }
          }
          prevy = y;
        }
      } else {
        canvas2d.fillRect(0, y0, cw, 1);
        canvas2d.fillStyle = 'black';
        var prevx = 0;
        var prevymin = -1;
        var prevymax = -1;
        var ymin = ch;
        var ymax = 0;
        for (var i = 0; i < buffer.length; i++) {
          const x = Math.round(cw * i / buffer.length);
          const y = Math.round(y0 - y0 * buffer[i] / max);

          if (x > prevx) {
            // draw
            var y1 = ymin;
            var y2 = ymax;
            if (prevx > 0) {
              if (y1 > prevymax) {
                y1 = prevymax + 1;
              }
              if (y2 < prevymin) {
                y2 = prevymin - 1;
              }
            }

            canvas2d.fillRect(prevx, y1, 1, Math.max(1, y2 - y1));

            prevymin = ymin;
            prevymax = ymax;
            ymin = ch;
            ymax = 0;
          }


          if (y < ymin) {
            ymin = y;
          }
          if (y > ymax) {
            ymax = y;
          }

          prevx = x;
        }
      }
    }
  }
  return ret;
}
