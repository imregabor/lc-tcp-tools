'use strict';

import * as d3 from 'd3';


export default function addTo(parentD3) {
  const canvas = parentD3.append('canvas').attr('width', 800).attr('height', 64);
  const canvas2d = canvas.node().getContext('2d');

  var cw = 800;
  var ch = 64;
  var vals;
  var nextCx = 0; // next X value to store
  var lastCx = 0; // last X value plotted
  var min = 0;
  var max = 1;
  var channels = undefined;
  var channelHeight = undefined;
  var channelSep = undefined;
  var needsClear = false;

  var wraparound; // wrap around happened: all data in buffers are valid


  function clear() {
    canvas2d.clearRect(0,0,cw,ch);

    if (wraparound) {
      lastCx = (nextCx + 1) % cw;
    } else {
      lastCx = 0;
    }

    if (channels) {
      channelSep = Math.round(0.15 * ch / channels);
      if (channelSep < 1) {
        channelSep = 1;
      } else if (channelSep > 5) {
        channelSep = 5;
      }
      channelHeight = Math.floor((ch - (channels - 1) * channelSep )/ channels);
      if (channelHeight < 5) {
        channelHeight = 5;
      }

      vals = [];
      canvas2d.fillStyle = '#eee';
      for (var i = 0; i < channels; i++) {
        canvas2d.fillRect(0, (channelHeight + channelSep) * i, cw, channelHeight);
        vals.push(new Array(cw));
      }

    }
  }

  function reset() {
    vals = undefined;
    clear();
    wraparound = false;
    nextCx = 0;
    lastCx = 0;
  }

  function updateCanvasSize(x, y) {

    cw = x;
    ch = y;
    canvas.attr('width', cw);
    canvas.attr('height', ch);

    reset();

  }
  updateCanvasSize(cw, ch);


  const ret = {
    min : v => {
      min = v;
      needsClear = true;
      return ret;
    },
    max : v => {
      max = v;
      needsClear = true;
      return ret;
    },
    ch : v => {
      updateCanvasSize(cw, Math.max(v, 10));
      return ret;
    },
    cw : v => {
      updateCanvasSize(Math.max(v, 10), ch);
      return ret;
    },
    add : values => {
      if (!channels || values.length !== channels) {
        channels = values.length;
        reset();
      }

      for (var i = 0; i < channels; i++) {
        const v = values[i];
        vals[i][nextCx] = v;
        if (v > max) {
          max = v * 1.25;
          needsClear = true;
        }
      }

      nextCx = (nextCx + 1) % cw;
      if (nextCx === 0) {
        wraparound = true;
      }
      if (nextCx === lastCx) {
        lastCx = (lastCx + 1) % cw;
      }
      return ret;
    },
    clear : () => {
      clear();
      return ret;
    },
    reset : () => {
      return ret;
    },
    render : () => {
      if (needsClear) {
        clear();
        needsClear = false;
      }
      if (!vals) {
        return;
      }
      while(lastCx !== nextCx && nextCx < cw) { // note possible race with resize
        for (var i = 0; i < channels; i++) {
          const cy0 = (channelHeight + channelSep) * i;
          const clearX = (lastCx + 20) % cw;

          var h = Math.round(channelHeight * (vals[i][lastCx] - min) / (max - min));
          if (h < 1) {
            h = 1;
          } else if (h > channelHeight) {
            h = channelHeight;
          }

          const y0 = cy0 + channelHeight - h;

          canvas2d.fillStyle = '#eee';

          canvas2d.fillRect(clearX, (channelHeight + channelSep) * i, 1, channelHeight);

          canvas2d.fillStyle = 'black';
          canvas2d.fillRect(lastCx, y0, 1, h);
        }


        lastCx = (lastCx + 1) % cw;
      }
    }


  };
  return ret;

}
