'use strict';

import './scalar.css';
import * as u from './util.js';
import * as d3 from 'd3';


export default function addTo(parentD3, label) {
  const d = parentD3.append('div').classed('display-scalar', true);
  const canvas = d.append('canvas').attr('width', 800).attr('height', 64);

  d.append('span').classed('label', true).text(label);
  const vSpan = d.append('span').classed('value', true);

  const minSpan  = d.append('span').classed('limit min', true);
  const maxSpan  = d.append('span').classed('limit max', true);

  const canvas2d = canvas.node().getContext('2d');

  var valueFormat = v => v;

  var cw = 800;
  var ch = 64;

  //const buff = [];
  //const buffRangeLow = [];
  //const buffRangeHigh = [];
  //var buffSize = 0;

  var vals;
  var rlows;
  var rhighs;
  var wraparound; // wrap around happened: all data in buffers are valid
  var seekpos; // position for seeking
  var onseek; // seek callback


  var lastValue = undefined;
  var nextCx = 0; // next X value to store
  var lastCx = 0; // last X value plotted

  function updateCanvasSize(x, y) {
    cw = x;
    ch = y;
    canvas.attr('width', cw);
    canvas.attr('height', ch);
    vals = new Array(cw);
    if (rlows) {
      rlows = new Array(cw);
      rhighs = new Array(cw);
    }

    if (seekpos) {
      seekpos = new Array(cw);
    }
    nextCx = 0;
    lastCx = 0;
  }
  updateCanvasSize(cw, ch);




  var min = 0;
  var initialMin = 0;
  var max = 1;
  var initialMax = 1;
  var autoScale = false;
  var showRange = false;

  function updateLimits() {
    if (wraparound) {
      lastCx = (nextCx + 1) % cw;
    } else {
      lastCx = 0;
    }
    if (min === 0 && max === 0) {
      minSpan.text('');
      maxSpan.text('');
    } else {
      minSpan.text(u.niceRound(min));
      maxSpan.text(u.niceRound(max));
    }
  }

  const ret = {
    valueFormat : f => {
      valueFormat = f;
      return ret;
    },
    onSeek : callback => {
      onseek = callback;
      seekpos = new Array(cw);
      canvas.on('click', e => {
        const x = Math.round(d3.pointer(e, canvas.node())[0]);
        if (x < 0 || x >= cw) {
          return;
        }
        if (!wraparound && x >= lastCx) {
          // not yet filled
          return;
        }

        canvas2d.fillStyle = 'green';
        canvas2d.fillRect(x, 0, 1, ch);
        onseek(seekpos[x]);
      });
      return ret;
    },
    autoScale : () => {
      autoScale = true;
      return ret;
    },
    showRange : () => {
      showRange = true;
      rlows = new Array(cw);
      rhighs = new Array(cw);
      return ret;
    },
    ch : v => {
      ch = v;
      canvas.attr('height', ch);
      canvas2d.clearRect(0,0,cw,ch);
      return ret;
    },
    max : v => {
      max = v;
      initialMax = v;
      updateLimits();
      return ret;
    },
    min : v => {
      min = v;
      initialMin = v;
      updateLimits();
      return ret;
    },
    add : (v, rlow, rhigh, pos) => {
      lastValue = v;
      vals[nextCx] = v;
      if (onseek) {
        seekpos[nextCx] = pos;
      }
      if (showRange) {
        rlows[nextCx] = rlow;
        rhighs[nextCx] = rhigh;
      }
      nextCx = (nextCx + 1) % cw;
      if (nextCx === 0) {
        wraparound = true;
      }
      if (nextCx === lastCx) {
        lastCx = (lastCx + 1) % cw;
      }

      if (autoScale) {
        var r = false;

        if (v < min) {
          r = true;
          if (v < 0) {
            min = v * 2;
          } else {
            min = v / 2;
          }
        }

        if (v > max) {
          r = true;
          if (v > 0) {
            max = v * 2;
          } else {
            min = v / 2;
          }

        }
        if (r) {
          ret.clear();
          updateLimits();
          ret.render();
        }
      }

      if (Math.abs(lastCx - nextCx) > 200) {
        ret.render();
      }
    },
    render : () => {
      if (typeof lastValue === 'undefined') {
        vSpan.text('N/A');
        return;
      } else {
        vSpan.text(valueFormat(lastValue));
      }

      while(lastCx !== nextCx) {
        canvas2d.clearRect((lastCx + 20) % cw, 0, 1, ch);


        if (showRange) {
          var rly = ch - 1 - ch * (rlows[lastCx] - min) / (max - min);
          var rhy = ch - 1 - ch * (rhighs[lastCx] - min) / (max - min);
          if (rly < 0) {
            rly = 0;
          }
          if (rly >= ch) {
            rly = ch - 1;
          }
          if (rhy < 0) {
            rhy = 0;
          }
          if (rhy >= ch) {
            rhy = ch - 1;
          }
          if (rly >= 0 && rhy >= 0 && rly < ch && rhy < ch) {
            canvas2d.fillStyle = '#eee';
            canvas2d.fillRect(lastCx, Math.min(rly, rhy), 1, Math.abs(rhy - rly) + 1);
          }
        }


        canvas2d.fillStyle = 'black';
        var y0 = ch - 1 - ch * (vals[lastCx] - min) / (max - min);
        if (y0 < 0) {
          y0 = 0;
        }
        if (y0 >= ch) {
          y0 = ch - 1;
        }
        if (y0 >= 0 && y0 < ch) {
          canvas2d.fillRect(lastCx, y0, 1, 1);
        }

        lastCx = (lastCx + 1) % cw;

      }
    },
    clear : () => {
      canvas2d.clearRect(0, 0, cw, ch);
    },
    reset : () => {
      lastValue = undefined;
      canvas2d.clearRect(0, 0, cw, ch);

      nextCx = 0;
      lastCx = 0;
      wraparound = false;

      min = initialMin;
      max = initialMax;
      updateLimits();
      ret.render();
      return ret;
    }
  };
  return ret;
}
