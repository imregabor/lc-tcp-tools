'use strict';

import * as u from './util.js';

/*
 * Light organ-like effect.
 */

export default function newOrgan(channels, minf, maxf) {
  var totalDt = 0;
  const min = new Float32Array(channels);
  const max = new Float32Array(channels);
  const vals = new Float32Array(channels);
  const startbin = new Uint16Array(channels);
  const binct = new Uint16Array(channels);
  var maxspill = 0.8;
  var minspill = 0;

  // Decay half lifes, in ms
  const maxDecayH = 5000;
  const minDecayH = 5000;

  // value decay half life
  const vDecayH = 250;

  // Decay rate constants
  // lambda from https://en.wikipedia.org/wiki/Exponential_decay
  const maxDecayL = Math.log(2) / maxDecayH;
  const minDecayL = Math.log(2) / minDecayH;
  const vDecayL = Math.log(2) / vDecayH;


  const ret = {
    minSpill : s => {
      minspill = s;
      return ret;
    },
    maxSpill : s => {
      maxspill = s;
      return ret;
    },
    params : (sampleRate, fftBinCount) => {
      console.log(`Set up organ, channels: ${channels}, minf: ${minf}, maxf: ${maxf}, sampleRate: ${sampleRate}, fftBinCount: ${fftBinCount}`);

      if (fftBinCount < channels) {
        throw new Error('Not enough FFT bins');
      }

      // first channel upper limit is minf
      // last channel upper limit is maxf
      // there are channel - 1 steps
      // minf * l ^ (channels - 1) = maxf

      var l = Math.pow( maxf / minf, 1 / (channels - 1));
      console.log(`initial l: ${l}`);

      var nextStartBinIndex = 1;
      var nextUpperFreq = minf;
      for (var i = 0; i < channels; i++) {

        var nextEndBinIndex = Math.round((fftBinCount - 1) * nextUpperFreq * 2 / sampleRate);
        console.log(`Channel ${i} end freq: ${nextUpperFreq}, initial end bin index: ${nextEndBinIndex}`);

        var adjust = false;
        if (nextStartBinIndex > nextEndBinIndex) {
          nextEndBinIndex = nextStartBinIndex;
          adjust = true;
        }



        binct[i] = nextEndBinIndex - nextStartBinIndex + 1;
        startbin[i] = nextStartBinIndex;

        nextStartBinIndex = nextEndBinIndex + 1;
        nextUpperFreq = nextUpperFreq * l;

        if (adjust) {
          const f = nextStartBinIndex * sampleRate / (2 * (fftBinCount - 1));
          l = Math.pow( maxf / f, 1 / (channels - i - 1));
          nextUpperFreq = f * l;
        }
      }
      console.log(`Channel start bins: ${startbin}`);
      console.log(`Channel widths (in bins): ${binct}`);
    },
    getVals : out => {
      if (out.length !== channels) {
        throw new Error();
      }
      for (var i = 0; i < channels; i++) {
        out[i] = vals[i];
      }
      vals.fill(0);
      totalDt = 0;
    },
    add : (spectrum, dt) => {

      const maxDecay = Math.exp( -maxDecayL * dt);
      const minDecay = Math.exp( -minDecayL * dt);

      for (var i = 0; i < channels; i++) {
        var value = 0;
        for (var j = 0; j < binct[i]; j++) {
          const s = spectrum[ startbin[i] + j ];
          value = value + s;
          //if (s > value) {
          //  value = s;
          //}
        }
        value = value / binct[i];

        const vh = value * 1;
        const vl = value / 1;

        if (value > max[i]) {
          max[i] = vh;
        } else {
          max[i] = maxDecay * (max[i] - vh) + vh;
        }
        if (value < min[i]) {
          min[i] = vl;
        } else {
          min[i] = minDecay * (min[i] - vl) + vl;
        }

        if (maxspill) {
          if (i > 0 && max[i - 1] * maxspill > max[i]) {
            max[i] = max[i - 1] * maxspill;
          }
          if (i < channels - 1 && max[i + 1] * maxspill > max[i]) {
            max[i] = max[i + 1] * maxspill;
          }
        }
        if (minspill) {
          if (i > 0 && min[i - 1] / minspill < min[i]) {
            min[i] = min[i - 1] / minspill;
          }
          if (i < channels - 1 && min[i + 1] / maxspill < min[i]) {
            min[i] = min[i + 1] / minspill;
          }
        }

        const newV = (value - min[i]) / (max[i] - min[i]);
        if (newV > vals[i]) {
          vals[i] = newV;
        }
      }
      // console.log(spectrum, vals, min, max)
      totalDt = totalDt + dt;
    },
    getLinearBulk100 : () => {
      const ret = u.channelsToBulk100(vals);

      // decay instead of reset
      const vDecay = Math.exp( -vDecayL * totalDt);
      for (var i = 0; i < vals.length; i++) {
        vals[i] = vals[i] * vDecay;
      }
      // vals.fill(0);
      totalDt = 0;
      return ret;
    },
    reset : () => {
      min.fill(0);
      max.fill(0);
      vals.fill(0);
      totalDt = 0;
    },

    totalDt : () => totalDt
  };
  return ret;
}
