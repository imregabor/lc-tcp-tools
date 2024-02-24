'use strict';

import './spectrum2.css';
import * as d3 from 'd3';
import * as u from './util.js';
import * as piano from './piano.js';
import * as colorScales from './color-scales.js';

export default function addTo(parentD3) {
  const canvas_underlay = parentD3.append('canvas')
      .classed('spectrum2-canvas', true)
      .attr('width', 800).attr('height', 64);
  const canvas = parentD3.append('canvas')
      .classed('spectrum2-canvas', true)
      .attr('width', 800).attr('height', 64);
  const canvas2d = canvas.node().getContext('2d');
  const canvas2d_underlay = canvas_underlay.node().getContext('2d');
  const maxfLabel = parentD3.append('div').classed('display-spectrum-limit maxf', true);
  const maxLabel = parentD3.append('div').classed('display-spectrum-limit max', true);
  const minLabel = parentD3.append('div').classed('display-spectrum-limit min', true);

  // canvas size
  var cw = 800;
  var ch = 64;

  var max = 0;
  var min = 0;

  // cumulative max values for bars display
  var buffer;

  // values for spectogram (waterfall); samples are reused
  var buffers = [];
  var buffersValids = 0;
  var maxBuffers = 20;

  var lastMaxf;
  var fresh = true;
  var newLimits = false;
  var freqLimit;
  var displayLogScale = false;
  var displayBars = true;
  var displayWaterfall = false;
  var wfally = 0;

  // derived from settings in layout()
  const l = {
    maxDisplayedFreq : 0,
    displayedBinCount : 0,
    keys : undefined,
    barsH : 0,
    barsY0 : 0,
    barsY1 : 0,
    wfallH : 0,
    wfallY0 : 0,
    wfallY1 : 0,
    bars : undefined
  };

  const aToColor = colorScales.yellowish();




  function layout() {
    if (!buffer || !lastMaxf) {
      return;
    }
    canvas2d_underlay.clearRect(0,0,cw,ch);
    l.maxDisplayedFreq = freqLimit ? Math.min(freqLimit, lastMaxf) : lastMaxf;
    l.displayedBinCount = Math.round(buffer.length * l.maxDisplayedFreq / lastMaxf);
    if (displayLogScale) {
      l.keys = piano.layout88keys(cw, ch, true);
      l.bars = piano.layoutFftBins(l.keys, buffer.length, lastMaxf);
    }

    const dy0 = displayLogScale ? l.keys.keyAreaHeight : 0;
    const dh = ch - (displayLogScale ? (l.keys.keyAreaHeight + 15) : 0);

    if (displayBars) {
      l.barsH = displayWaterfall
          ? Math.round(dh * 0.25)
          : dh;
      if (l.barsH < 50) {
        l.barsH = 50;
      }
    } else {
      l.barsH = 0;
    }
    l.barsY0 = dy0;
    l.barsY1 = l.barsY0 + l.barsH; // waterfall layout will depend on this even when no bars shown
    if (displayWaterfall) {
      l.wfallH = dh - l.barsH;
      if (l.wfallH < 0) {
        l.wfallH = 0;
      }
    }
    l.wfallY0 = l.barsY1;
    l.wfallY1 = l.wfallY0 + l.wfallH;

    if (displayLogScale) {
      piano.renderKeys(l.keys, canvas2d_underlay);
      piano.renderGrid(l.keys, l.barsH, canvas2d_underlay);
    } else {
      canvas2d_underlay.fillStyle = '#ddd';
      const gw = Math.min(cw, l.displayedBinCount);
      for (var f = 1; f <= Math.round(l.maxDisplayedFreq / 1000); f++) {
        const x = Math.round(gw * f * 1000 / l.maxDisplayedFreq);
        const tenKhzBar = f % 10 === 0;
        canvas2d_underlay.fillRect(tenKhzBar ? x - 1 : x, 0, tenKhzBar ? 3 : 1, l.barsH);
      }
    }

  }


  function clear() {
    canvas2d.clearRect(0,0,cw,ch);
    wfally = 0;

  }

  function reset() {
    max = 0;
    min = 0;
    buffer = undefined;
    buffers = undefined;
    buffersValids = 0;
    maxfLabel.text('');
    maxLabel.text('');
    minLabel.text('');
    clear();
    layout();
  }

  function updateCanvasSize(x, y) {
    cw = x;
    ch = y;
    canvas.attr('width', cw);
    canvas.attr('height', ch);
    canvas_underlay.attr('width', cw);
    canvas_underlay.attr('height', ch);
    clear();
    layout();
  }
  updateCanvasSize(cw, ch);

  function updateLimits() {
    if (min === 0 && max === 0) {
      minLabel.text('');
      maxLabel.text('');
    } else {
      minLabel.text(u.niceRound(min));
      maxLabel.text(u.niceRound(max));
    }
    const bw = buffer && lastMaxf ? `, ${u.niceRound(lastMaxf / buffer.length)} Hz / bin` : '';
    if (lastMaxf) {
      if (freqLimit && lastMaxf > freqLimit) {
        maxfLabel.text(`0 - ${u.niceRound(freqLimit / 1000)} kHz (limited)${bw}`);
      } else {
        maxfLabel.text(`0 - ${u.niceRound(lastMaxf / 1000)} kHz${bw}`);
      }
    } else {
      maxfLabel.text('');
    }
  }


  const ret = {
    setLogScale : l => {
      displayLogScale = l;
      clear();
      layout();
      return ret;
    },
    setDisplayBars : l => {
      displayBars = l;
      clear();
      layout();
      return ret;
    },
    setDisplayWaterfall : l => {
      displayWaterfall = l;
      clear();
      layout();
      return ret;
    },
    freqLimit : l => {
      freqLimit = l;
      updateLimits();
      clear();
      layout();
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
    reset : () => {
      reset();
      return ret;
    },
    add : (bins, maxf) => {
      if (!lastMaxf) {
        newLimits = true;
      }
      lastMaxf = maxf;
      if (fresh) {
        buffersValids = 0;
      }
      if (!buffer || buffer.length !== bins.length) {
        buffer = new Float32Array(bins.length);
        buffers = [];
        buffersValids = 0;
        newLimits = true;
      }
      if (displayWaterfall && buffersValids < maxBuffers) {
        if (buffers.length <= buffersValids) {
          buffers.push(new Float32Array(bins.length));
        }
        buffers[buffersValids].set(bins);
        buffersValids ++;
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
      if (!buffer) {
        return;
      }

      if (newLimits) {
        newLimits = false;
        updateLimits();
        layout();
      }


      if (displayLogScale) {
        // TODO: auto parametrize based on frequency limits (?)
        canvas2d.clearRect(0, l.barsY0, cw, l.barsH);

        if (displayBars) {
          piano.renderBins(l.keys, l.barsY0, l.barsY1, l.barsH, l.bars, buffer, min, max, l.displayedBinCount, canvas2d);
        }
        if (displayWaterfall) {
          for (var bufi = 0; bufi < buffersValids; bufi++) {
            const b = buffers[bufi];
            const y = (wfally + bufi) % l.wfallH + l.wfallY0
            piano.renderWfallLine(l.keys, y, l.bars, b, min, max, aToColor, l.displayedBinCount, canvas2d);
          }

          //const clry = (wfally + 30) % l.wfallH + l.wfallY0;
          //canvas2d.clearRect(0, clry, cw, 1);
          const nextClearLine = (wfally + 1 + buffersValids) % l.wfallH + l.wfallY0;
          const lastClearLine = (wfally + 30 + buffersValids) % l.wfallH + l.wfallY0;
          if (nextClearLine < lastClearLine) {
            canvas2d.clearRect(0, nextClearLine, cw, lastClearLine - nextClearLine);
          } else {
            canvas2d.clearRect(0, nextClearLine, cw, l.wfallY1 - nextClearLine);
            canvas2d.clearRect(0, l.wfallY0, cw, lastClearLine - l.wfallY0);
          }



          if (!fresh) {
            // avoid when render called without prior add
            wfally = (wfally + buffersValids) % l.wfallH;
          }
        }
        fresh = true;
        return;
      }

      // display lin scale


      canvas2d.clearRect(0,l.barsY0,cw,l.barsH);

      canvas2d.fillStyle = 'steelblue';
      if (l.displayedBinCount <= cw) {
        // no binning
        if (displayBars) {
          for (var i = 0; i < l.displayedBinCount; i++) {
            var h = Math.round(l.barsH * (buffer[i] - min) / (max - min));
            if (h < 1) {
              h = 1;
            }
            canvas2d.fillRect(i, l.barsH - h, 1, h);
          }
        }
        if (displayWaterfall) {
          for (var bufi = 0; bufi < buffersValids; bufi++) {
            const b = buffers[bufi];
            const y = (wfally + bufi) % l.wfallH + l.wfallY0
            for (var i = 0; i < l.displayedBinCount; i++) {
              const a = (b[i] - min) / (max - min);
              canvas2d.fillStyle = aToColor(a);
              canvas2d.fillRect(i, y, 1, 1);
            }
          }
        }

      } else {
        // some pixels will have > 1 bars
        if (displayBars) {
          for (var i = 0; i < cw; i++) {
            const b1 = Math.floor(l.displayedBinCount * i / cw); // inclusive
            const b2 = Math.floor(l.displayedBinCount * (i + 1) / cw); // exclusive
            var mx = buffer[b1];
            for (var j = b1 + 1; j < b2; j++) {
              if (buffer[j] > mx) {
                mx = buffer[j];
              }
            }
            var h = Math.round(l.barsH * (mx - min) / (max - min));
            if (h < 1) {
              h = 1;
            }
            canvas2d.fillRect(i, l.barsH - h, 1, h);
          }
        }
        if (displayWaterfall) {
          for (var bufi = 0; bufi < buffersValids; bufi++) {
            const b = buffers[bufi];
            const y = (wfally + bufi) % l.wfallH + l.wfallY0
            for (var i = 0; i < cw; i++) {
              const b1 = Math.floor(l.displayedBinCount * i / cw); // inclusive
              const b2 = Math.floor(l.displayedBinCount * (i + 1) / cw); // exclusive
              var mx = b[b1];
              for (var j = b1 + 1; j < b2; j++) {
                if (b[j] > mx) {
                  mx = b[j];
                }
              }
              const a = (mx - min) / (max - min);
              canvas2d.fillStyle = aToColor(a);
              canvas2d.fillRect(i, y, 1, 1);
            }
          }
        }
      }
      if (displayWaterfall) {
        const nextClearLine = (wfally + 1 + buffersValids) % l.wfallH + l.wfallY0;
        const lastClearLine = (wfally + 30 + buffersValids) % l.wfallH + l.wfallY0;
        if (nextClearLine < lastClearLine) {
          canvas2d.clearRect(0, nextClearLine, cw, lastClearLine - nextClearLine);
        } else {
          canvas2d.clearRect(0, nextClearLine, cw, l.wfallY1 - nextClearLine);
          canvas2d.clearRect(0, l.wfallY0, cw, lastClearLine - l.wfallY0);
        }

        if (!fresh) {
          // avoid when render called without prior add
          wfally = (wfally + buffersValids) % l.wfallH;
        }
      }
      fresh = true;

    }

  };
  return ret;
}
