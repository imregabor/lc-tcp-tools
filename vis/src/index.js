'use strict';

import * as d3 from 'd3';
import playback from './playback.js';
import * as poll from './poll.js';
import scalar from './scalar.js';
import vumeter from './vumeter.js';

function calcAWeights(bands, sampleRate) {
  // See https://en.wikipedia.org/wiki/A-weighting
  // Note that return value is for the amplitude spectrum and not for intensity spectrum
  console.log(`bands: ${bands}, sampleRate: ${sampleRate}`);
  const ret = [];
  for (var i = 0; i < bands; i++) {
    const f = i * sampleRate / (2 * bands);
    const raf = 12194 * 12194 * f * f * f * f / (
        (f * f  + 20.6 * 20.6) *
        Math.sqrt((f * f  + 107.7 * 107.7) * (f * f + 737.9 * 737.9)) *
        (f * f + 12194 * 12194)
      );
   ret.push(raf);
  }
  return ret;
}

function calcIntensity(fft, w) {
  // var sum = 0;
  var sumsi = 0;
  for (var i = 0; i < fft.length; i++) {
    // note that I [ W / m2 ] = 10 ^ (-12 + dB IL / 10)`
    // scale around band energy close(r) to 1
    var ii = Math.exp(4 + fft[i] / 20);
    if (w) {
      ii = ii * w[i];
    }
    sumsi += ii * ii;
    // sum += fft[i];
   }
   // console.log(`* dt: ${now - lastPollTs} avg: ${sum / fft.length} avgi: ${sumsi / fft.length}`)
   return sumsi / fft.length;
}

export function initPage() {
  const body = d3.select('body');
  body.append('h1').text('Hello');

  var analyserNode;
  var fft;
  var samples;
  var fftweights;

  var vu24 = vumeter(24);
  var vu35 = vumeter(35);

  playback(body, {
    build : pb => {
      analyserNode = pb.newAnalyserNode();
      analyserNode.fftSize = 1024;
      analyserNode.smoothingTimeConstant = 0;
      fft = new Float32Array(analyserNode.frequencyBinCount);
      samples = new Float32Array(analyserNode.fftSize);
      fftweights = calcAWeights(analyserNode.frequencyBinCount, pb.sampleRate());
    },
    onStart : pb => poll1.start(),
    onStop: pb => {
      poll1.stop();
      pd.reset();
      id.reset();
      id2.reset();
      vu24.reset();
      vu35.reset();
    }
  });


  const pd = scalar(body, 'Poll delay').min(10).max(25).ch(20);
  const id = scalar(body, 'A-FFT Intensity').min(0).max(10).ch(120).autoScale().showRange();
  const id2 = scalar(body, 'TD intensity').min(0).max(0.2).ch(120).autoScale();

  const poll1 = poll.newPoll(10, () => {
    // scheduled poll

    const dt = poll1.lastDt();


    analyserNode.getFloatFrequencyData(fft);
    analyserNode.getFloatTimeDomainData(samples);

    const i = calcIntensity(fft, fftweights);

    var i2 = 0;
    for (var n = 0; n < samples.length; n++) {
      i2 = i2 + samples[n] * samples[n];
    }
    i2 = i2 / samples.length;



    // Dispatch effect
    vu24.add(i, dt);
    vu35.add(i, dt);

    // dispatch visualization
    pd.add(dt);
    id.add(i, vu24.getMin(), vu24.getMax());
    id2.add(i2);

    if (vu24.totalDt() >= 30) {
      // see lowlevel.js
      // const payload1 = vu24.getSingleIntensityBulk100();
      const payload1 = vu24.getLinearBulk100();
      const payload2 = vu35.getLinearBulk100();
      d3.text('/api/setBulk100?m1=' + payload1 + '&m2=' + payload2, {
        method : 'POST',
      }).then(() => {}, () => {});
    }



  });

  poll.animationLoop(() => {
    pd.render();
    id.render();
    id2.render();
  }, 10);
}
