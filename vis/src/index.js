'use strict';

import * as d3 from 'd3';
import * as playback from './playback.js';
import * as apiclient from './api-client.js';
import * as poll from './poll.js';
import scalar from './scalar.js';
import spectrum from './spectrum.js';
import scope from './scope.js';
import vumeter from './vumeter.js';
import organ from './organ.js';
import * as u from './util.js';
import './index.css';



function calcIntensity(fft, w, out) {
  // var sum = 0;
  var sumsi = 0;
  for (var i = 0; i < fft.length; i++) {
    // note that I [ W / m2 ] = 10 ^ (-12 + dB IL / 10)`
    // scale around band energy close(r) to 1
    var ii = Math.exp(4 + fft[i] / 20);
    if (w) {
      ii = ii * w[i];
    }
    var iisq = ii * ii;
    if (out) {
      out[i] = iisq;
    }
    sumsi += iisq;
    // sum += fft[i];
   }
   // console.log(`* dt: ${now - lastPollTs} avg: ${sum / fft.length} avgi: ${sumsi / fft.length}`)
   return sumsi / fft.length;
}

export function initPage() {
  const wslink = apiclient.openWsLink({
    endpoint : '/ws-api/control',
    onJson: o => console.log('Control link message', o)
  });

  const body = d3.select('body');
  body.append('h1').text('Hello');

  var analyserNode;

  var fftdb; // Float FFT (dB) spectrum from analyser node
  var fftm;  // Float FFT linear magnitude spectrum
  var ffti;  // Float FFT intensity spectrum
  var fftwm; // Float weighted FFT magnitude bands
  var fftwi; // Float weighted FFT intensity (energy) bands
  var samples; // Float time-domain data from analyser node
  var fftweights; // Amplitude weights for FFT spectrum

  var vu24 = vumeter(24);

  var vu35 = vumeter(35);
  var organ35 = organ(35, 1, 4000).minSpill(0.85).maxSpill(0.85);
  var organ24 = organ(24, 1, 4000).minSpill(0.85).maxSpill(0.85);
  var organ7 = organ(7, 100, 4000).minSpill(0.85).maxSpill(0.85);

  var visComponents = [];

  var lastPb; // last playback facade
  playback.addSimplePlayback(body, {
    build : pb => {
      analyserNode = pb.newAnalyserNode();
      analyserNode.fftSize = 4096;
      analyserNode.smoothingTimeConstant = 0;
      fftdb = new Float32Array(analyserNode.frequencyBinCount);
      fftm =  new Float32Array(analyserNode.frequencyBinCount);
      ffti =  new Float32Array(analyserNode.frequencyBinCount);
      fftwm = new Float32Array(analyserNode.frequencyBinCount);
      fftwi = new Float32Array(analyserNode.frequencyBinCount);

      samples = new Float32Array(analyserNode.fftSize);
      fftweights = u.calcAWeights(analyserNode.frequencyBinCount, pb.sampleRate());
      sp0.params(pb.sampleRate(), analyserNode.frequencyBinCount);
      sp1.params(pb.sampleRate(), analyserNode.frequencyBinCount);
      sp2.params(pb.sampleRate(), analyserNode.frequencyBinCount);
      sp3.params(pb.sampleRate(), analyserNode.frequencyBinCount);
      sp4.params(pb.sampleRate(), analyserNode.frequencyBinCount);

      organ7.params(pb.sampleRate(), analyserNode.frequencyBinCount);

      organ24.params(pb.sampleRate(), analyserNode.frequencyBinCount);
      organ35.params(pb.sampleRate(), analyserNode.frequencyBinCount);
    },
    onStart : pb => {
      lastPb = pb;
      poll1.start();
      wslink.sendJson({ event : 'START_PLAYBACK', info : pb.getPlaybackInfo() });
    },
    onStop: pb => {
      lastPb = undefined;
      poll1.stop();

      visComponents.forEach(c => c.reset());
      vu24.reset();
      vu35.reset();
      organ24.reset();
      organ35.reset();
      organ7.reset();

      wslink.sendJson({ event : 'STOP_PLAYBACK' });
    }
  });

  const buf35 = new Float32Array(35);
  const buf7 = new Float32Array(7);


  const scope1 = scope(body, 'TD intensity vs FFT intensity');

  const pd = scalar(body, 'Poll delay').min(10).max(25).ch(20);
  const id0 = scalar(body, 'FFT Intensity').min(0).max(0).ch(120).autoScale();
  const id1 = scalar(body, 'A-FFT Intensity').min(0).max(0).ch(120).autoScale().showRange().onSeek(p => { if (lastPb) { lastPb.seek(p); }});
  const id2 = scalar(body, 'TD intensity').min(0).max(0).ch(120).autoScale();

  const sp0 = spectrum(body, 'FFT').unit('dB');
  const sp1 = spectrum(body, 'FFT, linear magnitude').min(0).max(0).autoScale();
  const sp2 = spectrum(body, 'FFT, intensity').min(0).max(0).autoScale();
  const sp3 = spectrum(body, 'FFT, A-weighted, magnitude').min(0).max(0).autoScale();
  const sp4 = spectrum(body, 'FFT, A-weighted, intensity').min(0).max(0).autoScale().waterfall().maxf(4000);

  visComponents.push(scope1);

  visComponents.push(pd);
  visComponents.push(id0);
  visComponents.push(id1);
  visComponents.push(id2);
  visComponents.push(sp0);
  visComponents.push(sp1);
  visComponents.push(sp2);
  visComponents.push(sp3);
  visComponents.push(sp4);

  // FFT smoothing decay half time and lambda
  const fftSmoothingH = 0.1; // 300;
  const fftSmoothingL = Math.log(2) / fftSmoothingH;

  const poll1 = poll.newPoll(5, () => {
    // scheduled poll

    const dt = poll1.lastDt();

    analyserNode.getFloatTimeDomainData(samples);
    analyserNode.getFloatFrequencyData(fftdb);         // fftdb - spectrum magnitudes in dB


    const fftSmoothingDecay = Math.exp( -fftSmoothingL * dt);
    u.calcMagnitudeFromDb(fftdb, fftm, fftSmoothingDecay);                // fftm  - spectrum linear magnitudes
    u.calcIntensities(fftm, ffti);                     // ffti  - spectrum magnitudes
    u.calcWeightedMagnitudes(fftm, fftweights, fftwm); // fftwm - spectrum weighted magnitudes
    u.calcIntensities(fftwm, fftwi);                   // fftwi - spectrum weighted intensities

    const tde = u.calcTimeDomainEnergy(samples);
    const ffte = u.avg(fftm);
    const fftwe = u.avg(fftwm);


    // Dispatch effect
    vu24.add(fftwe, dt);
    vu35.add(fftwe, dt);
    organ24.add(fftwm, dt);
    organ35.add(fftwm, dt);
    organ7.add(fftm, dt);

    const ct = lastPb ? lastPb.getCurrentTime() : 0;

    // dispatch visualization
    pd.add(dt);
    id0.add(u.niceRound(ffte));
    id1.add(u.niceRound(fftwe), vu24.getMin(), vu24.getMax(), ct);
    id2.add(u.niceRound(tde));

    scope1.add(dt, tde, fftwe);

    sp0.add(fftdb, dt);
    sp1.add(fftm, dt);
    sp2.add(ffti, dt);
    sp3.add(fftwm, dt);
    sp4.add(fftwi, dt);


    if (organ24.totalDt() >= 30) {
      // see lowlevel.js
      // const payload1 = vu24.getSingleIntensityBulk100();
      const payload1 = organ24.getLinearBulk100();
      const payload2 = organ35.getLinearBulk100();


      //organ7.getVals(buf7);
      //u.from7to35(buf7, buf35);
      //const payload2 = u.channelsToBulk100(buf35);


      //const payload2 = vu35.getLinearBulk100();
      //const payload2 = vu35.getSingleIntensityBulk100();
      d3.text('/api/setBulk100?m1=' + payload1 + '&m2=' + payload2, {
        method : 'POST',
      }).then(() => {}, () => {});
    }



  });

  poll.animationLoop(() => {
    // if (lastPb) { console.log(lastPb.getCurrentTime()); }
    visComponents.forEach(c => c.render());
  }, 1);
}
