'use strict';

import './spectrum2.css';
import * as d3 from 'd3';
import * as u from './util.js';
import * as piano from './piano.js';
import chroma from 'chroma-js';

export default function addTo(parentD3) {
  const canvas = parentD3.append('canvas').attr('width', 800).attr('height', 64);
  const canvas2d = canvas.node().getContext('2d');
  const maxfLabel = parentD3.append('div').classed('display-spectrum-limit maxf', true);
  const maxLabel = parentD3.append('div').classed('display-spectrum-limit max', true);
  const minLabel = parentD3.append('div').classed('display-spectrum-limit min', true);

  // canvas size
  var cw = 800;
  var ch = 64;

  var max = 0;
  var min = 0;

  var buffer;
  var lastMaxf;
  var fresh = true;
  var newLimits = false;
  var freqLimit;
  var displayLogScale = false;
  var displayBars = true;
  var displayWaterfall = false;
  var wfally = 0;

   const vToColor = chroma
    //.scale(['#300000', '#d41111', '#eded5e', '#ffffe6', '#ffffff'])
    // see https://colorbrewer2.org/#type=sequential&scheme=YlOrBr&n=9
    // .scale(['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506'])
    .scale(['#fff7bc', '#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506'])
    .correctLightness();

  function aToColor(a) {
    if (a < 0) {
      a = 0;
    } else if (a > 1) {
      a = 1;
    }
    return vToColor(a);
  }

  function clear() {
    canvas2d.clearRect(0,0,cw,ch);
    wfally = 0;
  }

  function reset() {
    max = 0;
    min = 0;
    maxfLabel.text('');
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
      updateLimits();
      clear();
      return ret;
    },
    setDisplayBars : l => {
      displayBars = l;
      updateLimits();
      clear();
      return ret;
    },
    setDisplayWaterfall : l => {
      displayWaterfall = l;
      updateLimits();
      clear();
      return ret;
    },
    freqLimit : l => {
      freqLimit = l;
      updateLimits();
      clear();
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
      lastMaxf = maxf;
      if (!buffer || buffer.length !== bins.length) {
        buffer = new Float32Array(bins.length);
        updateLimits();
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

      const maxDisplayedFreq = freqLimit ? Math.min(freqLimit, lastMaxf) : lastMaxf;
      const displayedBinCount = Math.round(buffer.length * maxDisplayedFreq / lastMaxf);



      var barsH = 0;
      var barsY0 = 0;
      var barsY1 = 0;
      var wfallH = 0;
      var wfallY0 = 0;
      var wfallY1 = 0;

      if (displayLogScale) {
        // TODO: auto parametrize based on frequency limits (?)

        var keys = piano.layout88keys(cw, ch, true);

        if (displayBars) {
          barsH = displayWaterfall
              ? Math.round((ch - keys.keyAreaHeight - 15) * 0.3)
              : ch - keys.keyAreaHeight - 15;
          if (barsH < 50) {
            barsH = 50;
          }
          barsY0 = keys.keyAreaHeight;
          barsY1 = barsY0 + barsH;
        }
        if (displayWaterfall) {
          wfallH = ch - barsY1 - 15;
          if (wfallH < 0) {
            wfallH = 0;
          }
          wfallY0 = barsY1;
          wfallY1 = wfallY0 + wfallH;
        }

        canvas2d.clearRect(0,barsY0,cw,barsH);

        // TODO: paint keys/grid once (on separate canvas layer(s)), dont overwrite
        piano.renderKeys(keys, canvas2d);
        piano.renderGrid(keys, barsH, canvas2d);

        var bars = piano.layoutFftBins(keys, buffer.length, lastMaxf);
        if (displayBars) {
          piano.renderBins(keys, barsY0, barsY1, barsH, bars, buffer, min, max, displayedBinCount, canvas2d);
        }
        if (displayWaterfall) {
          piano.renderWfallLine(keys, wfally + wfallY0, bars, buffer, min, max, aToColor, displayedBinCount, canvas2d);

          const clry = (wfally + 30) % wfallH + wfallY0;
          canvas2d.clearRect(0,clry,cw,1);

          wfally = (wfally + 1) % wfallH;

        }
        return;
      }

      canvas2d.clearRect(0,0,cw,ch);


      canvas2d.fillStyle = '#ddd';


      const gw = Math.min(cw, displayedBinCount);
      for (var f = 1; f <= Math.round(maxDisplayedFreq / 1000); f++) {
        const x = Math.round(gw * f * 1000 / maxDisplayedFreq);
        const tenKhzBar = f % 10 === 0;
        canvas2d.fillRect(tenKhzBar ? x - 1 : x, 0, tenKhzBar ? 3 : 1, ch);
      }

      canvas2d.fillStyle = 'steelblue';
      if (displayedBinCount <= cw) {
        // no binning
        for (var i = 0; i < displayedBinCount; i++) {
          var h = Math.round(ch * (buffer[i] - min) / (max - min));
          if (h < 1) {
            h = 1;
          }
          canvas2d.fillRect(i, ch - h, 1, h);
        }
      } else {
        // some pixels will have > 1 bars
        for (var i = 0; i < cw; i++) {
          const b1 = Math.floor(displayedBinCount * i / cw); // inclusive
          const b2 = Math.floor(displayedBinCount * (i + 1) / cw); // exclusive
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
