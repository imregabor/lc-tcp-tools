'use strict';

import './spectrum.css';
import * as u from './util.js';

export default function addTo(parentD3, label) {
  const d = parentD3.append('div').classed('display-spectrum', true);
  const canvas = d.append('canvas').attr('width', 512).attr('height', 200);

  const labelSpan = d.append('span').classed('label', true).text(label);
  const label2Span = d.append('span').classed('label label2', true);

  const minSpan  = d.append('span').classed('limit min', true);
  const maxSpan  = d.append('span').classed('limit max', true);

  const canvas2d = canvas.node().getContext('2d');
  var canvas2, canvas22d;

  var cw = 512;
  var ch = 200;
  var c2h = 300;
  var c2y = 0;
  var dt = 0;
  var maxf;

  const maxDecayH = 3000;
  const maxDecayL = Math.log(2) / maxDecayH;

  function updateCanvasSize(x, y) {
    cw = x;
    ch = y;
    canvas.attr('width', cw);
    canvas.attr('height', ch);
    y = undefined;
    c2y = 0;
  }

  var y; // accumulate bar starting y positions on the canvas
  var downsample; // number of bins to aggregate per one display bar
  var min = -200;
  var initialMin = min;
  var max = 0;
  var initialMax = max;

  var sampleRate;
  var fftBins;
  var autoScale = false;
  var unit;
  var dt;

  function updateLabels() {
    if (!sampleRate) {
      label2Span.text('');
    } else {
      const mf = maxf ? Math.min(maxf, sampleRate / 2) : sampleRate / 2;
      label2Span.text(`0 - ${mf / 1000} kHz`);
    }

    if (max === 0 && min === 0) {
      minSpan.text('');
      maxSpan.text('');
    } else {
      minSpan.text(`${u.niceRound(min)}${unit ? ' ' + unit : ''}`);
      maxSpan.text(`${u.niceRound(max)}${unit ? ' ' + unit : ''}`);
    }
  }
  updateLabels();

  const ret = {
    cw : w => { updateCanvasSize(w, ch); return ret; },
    ch : h => { updateCanvasSize(cw, h); return ret; },
    waterfall : () => {
      canvas2 = d.append('canvas').attr('width', cw).attr('height', c2h).style('display', 'block');
      canvas22d = canvas2.node().getContext('2d');
      return ret;
    },
    params : (srate, bins) => {
      sampleRate = srate;
      fftBins = bins;
      updateLabels();
      // dont set y here because size change might invalidate it
    },
    maxf : f => {
      maxf = f;
      if (sampleRate) {
        ret.sampleRate(sampleRate); // to update label
      }
      return ret;
    },
    min: v => {
      min = v;
      initialMin = v;
      ret.clear();
      updateLabels();
      return ret;
    },
    max: v => {
      max = v;
      initialMax = v;
      ret.clear();
      updateLabels();
      return ret;
    },
    unit : v => {
      unit = v;
      updateLabels();
      return ret;
    },
    autoScale : () => {
      autoScale = true;
      return ret;
    },
    add : (bands, t) => {
      if (bands.length !== fftBins) {
        throw new Error(`Expected ${fftBins} bands, got ${bands.length}`);
      }

      dt = dt + t;


      if (!y) {
        // FFT bands to cover approximately
        var fftBandsToCover;
        if (maxf) {
          fftBandsToCover = Math.round(2 * maxf * fftBins / sampleRate);
          if (fftBandsToCover < 1) {
            fftBandsToCover = 1;
          } else if (fftBandsToCover > fftBins) {
            fftBandsToCover = fftBins;
          }
        } else {
          fftBandsToCover = fftBins;
        }


        downsample = 1;


        while (fftBandsToCover / downsample > cw) {
          downsample *= 2;
        }

        y = new Array(Math.floor(fftBandsToCover / downsample));
      }


      if (autoScale) {
        var r = false;
        var imax = bands[0];
        var imin = bands[0];
        for (var i = 0; i < y.length * downsample; i++) {
          if (imin > bands[i]) {
            imin = bands[i]
          }
          if (imax < bands[i]) {
            imax = bands[i]
          }
        }

        // max = imax + (max - imax) * maxDecay;

        if (min > imin) {
            r = true;
            min = imin < 0 ? imin * 1.25 : imin / 1.25;
          }
          if (max < imax) {
            r = true;
            max = imax * 1.25;
          }

        if (r) {
          // ret.clear();
          updateLabels();
        }
      }
      for (var i = 0, x = 0; x < y.length; i++, x++) {
        var band = bands[i];
        for (var j = 1; j < downsample; j++) {
          i++;
          if (band < bands[i]) {
            band = bands[i];
          }
        }

        var by = (band - min) / (max - min);
        if (by < 0) {
          by = 0;
        }
        if (by > 1) {
          by = 1;
        }
        if (y[x] < by) {
          y[x] = by;
        }
      }
    },
    render : () => {
      ret.clear();
      if (!y) {
        return;
      }
      if (autoScale) {
        updateLabels();
      }

      if (sampleRate) {
        canvas2d.fillStyle = '#ddd';

        // f in kHz
        for (var f = 0; f < sampleRate / 2000; f++) {
          const x = Math.round(f * 2000 * fftBins / (downsample * sampleRate));
          if (maxf && f > maxf) {
            break;
          }
          canvas2d.fillRect(x, 0, x % 10 === 0 ? 2 : 1, ch);
        }
      }
      if (canvas2) {
        canvas22d.clearRect(0, (c2y + 20) % c2h, cw, 1);
        for (var i = 0; i < y.length; i++) {
          const s = '' + Math.floor(255 * y[i]);
          canvas22d.fillStyle = 'rgb(' + s + ',' + s + ',' + s + ')';
          canvas22d.fillRect(i, c2y, 1, 1);
        }
        c2y = (c2y + 1) % c2h;
      }

      canvas2d.fillStyle = 'steelblue';
      for (var i = 0; i < y.length; i++) {
        const y1 = ch - y[i] * (ch - 1) - 1;
        canvas2d.fillRect(i, y1, 1, ch - y1);
        y[i] = 0;
      }


      if (autoScale) {
        const maxDecay = Math.exp( -maxDecayL * dt);
        max = max * maxDecay;
      }
      dt = 0;

    },
    reset : () => {
      y = undefined;
      dt = 0;
      c2y = 0;
      min = initialMin;
      max = initialMax;
      ret.clear();
      updateLabels();
      if (canvas22d) {
        canvas22d.clearRect(0, 0, cw, c2h);
      }
    },
    clear : () => {
      canvas2d.clearRect(0, 0, cw, ch);
    }
  };
  return ret;

}
