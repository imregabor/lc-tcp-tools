'use strict';

export function niceRound(v) {
  const va = Math.abs(v);
  if (va > 100) {
    return Math.round(v);
  } else if (va >= 10) {
    return Math.round(v * 10) / 10;
  } else if (va >= 1) {
    return Math.round(va * 100) / 100;
  } else if (va >= 0.1) {
    return Math.round(va * 1000) / 1000;
  } else if (va >= 0.01) {
    return Math.round(va * 10000) / 10000;
  } else if (va >= 0.001) {
    return Math.round(va * 100000) / 100000;
  } else if (va >= 0.0001) {
    return Math.round(va * 1000000) / 1000000;
  }else if (va >= 0.00001) {
    return Math.round(va * 10000000) / 10000000;
  }else {
    return va;
  }
}

export function calcAWeights(bands, sampleRate) {
  // See https://en.wikipedia.org/wiki/A-weighting
  // Note that return value is for the amplitude spectrum and not for intensity spectrum
  console.log(`calc A-weights. Bands: ${bands}, sampleRate: ${sampleRate} 1/s, band span: ${sampleRate / (2 * (bands - 1))} Hz`);
  const ret = [];
  var min, max;
  for (var i = 0; i < bands; i++) {
    const f = i * sampleRate / (2 * bands);
    const raf = 12194 * 12194 * f * f * f * f / (
        (f * f  + 20.6 * 20.6) *
        Math.sqrt((f * f  + 107.7 * 107.7) * (f * f + 737.9 * 737.9)) *
        (f * f + 12194 * 12194)
      );
    if (i == 0 || min > raf) {
      min = raf;
    }
    if (i == 0 || max < raf) {
      max = raf;
    }
    ret.push(raf);
  }
  console.log(`Weights min: ${min}, max: ${max}, first items: ${ret[0]}, ${ret[1]}, ${ret[2]}, ${ret[3]}`);

  // dirty mod for bass enchance
  for (var i = 0; i < bands; i++) {
    const f = i * sampleRate / (2 * bands);
    const a = Math.max(0.25 - 0.25 * f / 3000, 0);
    ret[i] = a + ret[i]; // Math.max(a, ret[i]);
  }

  console.log('Final adjusted weights', ret);
  return ret;
}

export function calcTimeDomainEnergy(samples) {
  var ret = 0;
  for (var n = 0; n < samples.length; n++) {
    ret = ret + samples[n] * samples[n];
  }
  return ret / samples.length;
}


export function calcMagnitudeFromDb(fft, out, decayConstant) {
  if (fft.length != out.length) {
    throw new Error(`FFT length ${fft.length} and output lenghth ${out.length} mismatch`);
  }
  for (var i = 0; i < fft.length; i++) {
    // note that I [ W / m2 ] = 10 ^ (-12 + dB IL / 10)`
    // scale around band energy close(r) to 1
    const mag = Math.exp(4 + fft[i] / 20);
    if (decayConstant) {
      out[i] = out[i] * decayConstant;
      if (mag > out[i]) {
        out[i] = mag;
      }
    } else {
      out[i] = mag;
    }
   }
}

export function calcWeightedMagnitudes(fftm, w, out) {
  if (fftm.length != out.length) {
    throw new Error(`FFT length ${fftm.length} and output lenghth ${out.length} mismatch`);
  }
  if (fftm.length != w.length) {
    throw new Error(`FFT length ${fftm.length} and weights lenghth ${w.length} mismatch`);
  }
  for (var i = 0; i < fftm.length; i++) {
    out[i] = fftm[i] * w[i];
  }
}

export function calcIntensities(fftm, out) {
  if (fftm.length != out.length) {
    throw new Error(`FFT length ${fftm.length} and output lenghth ${out.length} mismatch`);
  }
  for (var i = 0; i < fftm.length; i++) {
    out[i] = fftm[i] * fftm[i];
  }
}

export function sum(input) {
  var ret = 0;
  for (var i = 0; i < input.length; i++) {
    ret = ret + input[i];
  }
  return ret;
}

export function avg(input) {
  var ret = 0;
  for (var i = 0; i < input.length; i++) {
    ret = ret + input[i];
  }
  return ret / input.length;
}

export function channelsToBulk100(values) {
  var ret = '';
  for (var i = 0; i < values.length; i++) {
    var vi = values[i];
    if (! (vi >= 0)) {
      vi = 0;
    } else if (! (vi <= 1)) {
      vi = 1;
    }
    const s = '' + Math.round(99 * vi);
    if (s.length == 1) {
      ret = ret + '0';
    }
    ret = ret + s
  }
  return ret;
}

export function from7to35(values, out) {
  if (values.length !== 7) {
    throw new Error();
  }
  if (out.length !== 35) {
    throw new Error();
  }
  const w = 7;
  const h = 5;
  const hh = 2;
  for (var i = 0; i < values.length; i++) {
    for (var j = -2; j <= 2; j++) {
      const idx = i  + w * (hh + j);
      const vv = Math.pow(values[i], Math.abs(j) * 2 + 1);
      out[idx] = vv;
    }
  }
}

/*
export function calcMagnitudeFromDb(fft, out) {
  if (fft.length != out.length) {
    throw new Error(`FFT length ${fft.length} and output lenghth ${out.length} mismatch`);
  }
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
*/

