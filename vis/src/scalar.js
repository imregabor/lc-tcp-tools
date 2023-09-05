'use strict';

import './scalar.css';

export default function addTo(parentD3, label) {
  const d = parentD3.append('div').classed('display-scalar', true);
  const canvas = d.append('canvas').attr('width', 800).attr('height', 64);

  d.append('span').classed('label', true).text(label);
  const vSpan = d.append('span').classed('value', true);

  const minSpan  = d.append('span').classed('limit min', true);
  const maxSpan  = d.append('span').classed('limit max', true);

  const canvas2d = canvas.node().getContext('2d');
  const cw = 800;
  var ch = 64;

  const buff = [];
  const buffRangeLow = [];
  const buffRangeHigh = [];
  var buffSize = 0;

  var lastValue = undefined;
  var cx = 0;

  var min = 0;
  var initialMin = 0;
  var max = 1;
  var initialMax = 1;
  var autoScale = false;
  var showRange = false;

  function updateLimits() {
    minSpan.text(min);
    maxSpan.text(max);
  }

  const ret = {
    autoScale : () => {
      autoScale = true;
      return ret;
    },
    showRange : () => {
      showRange = true;
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
    add : (v, rlow, rhigh) => {
      lastValue = v;
      if (buffSize < buff.length) {
        buff[buffSize] = v;
        if (showRange) {
          buffRangeLow[buffSize] = rlow;
          buffRangeHigh[buffSize] = rhigh;
        }
      } else {
        buff.push(v);
        buffRangeLow.push(rlow);
        buffRangeHigh.push(rhigh);
      }
      if (autoScale) {
        var r = false;

        while (v < min) {
          min = min - (initialMax - initialMin);
          r = true;
        }

        while (v > max) {
          max = max + (initialMax - initialMin);
          r = true;
        }
        if (r) {
          ret.clear();
          updateLimits();
          ret.render();
        }
      }

      buffSize++;
      if (buffSize >= 100) {
        ret.render();
      }
    },
    render : () => {
      if (typeof lastValue === 'undefined') {
        vSpan.text('N/A');
        return;
      } else {
        vSpan.text(lastValue);
      }

      for (var i = 0; i < buffSize; i++) {
        canvas2d.clearRect((cx + 20) % cw, 0, 1, ch);


        if (showRange) {
          var rly = ch - 1 - ch * (buffRangeLow[i] - min) / (max - min);
          var rhy = ch - 1 - ch * (buffRangeHigh[i] - min) / (max - min);
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
            canvas2d.fillRect(cx, Math.min(rly, rhy), 1, Math.abs(rhy - rly) + 1);
          }
        }


        canvas2d.fillStyle = 'black';
        var y0 = ch - 1 - ch * (buff[i] - min) / (max - min);
        if (y0 < 0) {
          y0 = 0;
        }
        if (y0 >= ch) {
          y0 = ch - 1;
        }
        if (y0 >= 0 && y0 < ch) {
          canvas2d.fillRect(cx, y0, 1, 1);
        }

        cx = (cx + 1) % cw;
      }
      buffSize = 0;
    },
    clear : () => {
      canvas2d.clearRect(0, 0, cw, ch);
    },
    reset : () => {
      lastValue = undefined;
      canvas2d.clearRect(0, 0, cw, ch);
      buffSize = 0;
      cx = 0;
      min = initialMin;
      max = initialMax;
      updateLimits();
      ret.render();
      return ret;
    }
  };
  return ret;
}
