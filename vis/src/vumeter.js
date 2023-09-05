'use strict';

/*
 * VU meter-like effect.
 */

export default function newVuMeter(channels) {
  var max = 0;
  var min = 0;
  var on = 0;
  var totalDt = 0;

  // Decay half lifes, in ms
  const maxDecayH = 5000;
  const minDecayH = 5000;

  // Decay rate constants
  // lambda from https://en.wikipedia.org/wiki/Exponential_decay
  const maxDecayL = Math.log(2) / maxDecayH;
  const minDecayL = Math.log(2) / minDecayH;

  const ret = {
    getMin : () => min,
    getMax : () => max,
    /**
     * Add instantaneous energy.
     *
     * @param value Energy value
     * @dt Delta time since last addition in ms
     */
    add : (value, dt) => {
      // exponential decay towards current value +/- 25%

      const maxDecay = Math.exp( -maxDecayL * dt);
      const minDecay = Math.exp( -minDecayL * dt);
      const vh = value * 1.25;
      const vl = value / 1.5;



      if (value > max) {
        max = vh;
      } else {
        max = maxDecay * (max - vh) + vh;
      }
      if (value < min) {
        min = vl;
      } else {
        min = minDecay * (min - vl) + vl;
      }

      const newOn = channels * (value - min) / (max - min);
      if (on < newOn) {
        on = newOn;
      }
      totalDt = totalDt + dt;
    },
    getSingleIntensityBulk100 : () => {
      var ret = '';
      var s = '' + Math.round(99 * on / channels);
      if (s.length == 1) {
        s = '0' + s;
      }
      for (var i = 0; i < channels; i++) {
        ret = ret + s;
      }
      on = 0;
      totalDt = 0;
      return ret;

    },

    getLinearBulk100 : () => {
      var ret = '';
      var i = 0;
      while (on >= 1 && i < channels) {
        ret = ret + '99'
        i++;
        on = on - 1;
      }
      if (on > 0 && i < channels) {
        const s = '' + Math.round(99 * on);
        if (s.length == 1) {
          ret = ret + '0';
        }
        ret = ret + s
        i++;
      }
      while (i < channels) {
        ret = ret + '00';
        i++;
      }
      on = 0;
      totalDt = 0;
      return ret;
    },

    reset : () => {
      max = 0;
      on = 0;
      totalDt = 0;
    },

    totalDt : () => totalDt
  };
  return ret;
}
