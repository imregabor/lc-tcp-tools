'use strict';

import * as u from './util.js';


export const nodeFunctions = {
  aa : {
    initState : params => {
      params.targetFps = u.clip(params.targetFps, 5, 1000);
      return {};
    },
    updateState : (params, state) => {
      params.targetFps = u.clip(params.targetFps, 5, 1000);
    }
  },
  aw : {
    initState : params => {
      // ensure that node have a state
      // todo: parametrize the curve
      return {};
    }
  },
  mh : {
    initState : params => {
      params.decay = +params.decay;
      params.sustain = +params.sustain;
      params.attack = +params.attack;
      return {

        // Decay rate constants
        // lambda from https://en.wikipedia.org/wiki/Exponential_decay
        decayL : Math.log(2) / params.decay,
        attackL : Math.log(2) / params.attack,
      }
    },
    updateState : (params, state) => {
      params.decay = +params.decay;
      params.sustain = +params.sustain;
      params.attack = +params.attack;
      state.decayL = Math.log(2) / params.decay;
      state.attackL = Math.log(2) / params.attack;
    }
  },
  normalize : {
    initState : params => {
      params.maxDecayH = +params.maxDecayH;
      params.sustain = +params.sustain;
      params.maxFloor = +params.maxFloor;
      params.globalNorm = +params.globalNorm;
      return {

        // Decay rate constants
        // lambda from https://en.wikipedia.org/wiki/Exponential_decay
        holdTill : 0,
        maxDecayL : Math.log(2) / params.maxDecayH
      }
    },
    updateState : (params, state) => {
      params.maxDecayH = +params.maxDecayH;
      params.sustain = +params.sustain;
      params.maxFloor = +params.maxFloor;
      params.globalNorm = +params.globalNorm;
      state.holdTill = 0;
      state.maxDecayL = Math.log(2) / params.maxDecayH;
    }
  },
  linScale : {
    initState : params => {
      params.scaleA = +params.scaleA;
      params.scaleB = +params.scaleB;
      params.clip = +params.clip;
      return {

      };
    },
    updateState : (params, state) => {
      params.scaleA = +params.scaleA;
      params.scaleB = +params.scaleB;
      params.clip = +params.clip;
    }
  },
  linCombine : {
    initState : params => {
      return {

      };
    },
    updateState : (params, state) => {
    }
  },
  channelRemap : {
    initState : params => {
      params.mode = +params.mode;
      return {
        map : []
      }
    },
    updateState : (params, state) => {
      params.mode = +params.mode;
      state.map = [];
    }
  },
  vu : {
    initState : params => {
      params.maxDecayH = +params.maxDecayH;
      params.maxDecayL = +params.maxDecayL;
      params.maxFloor = +params.maxFloor;
      params.onValueA = +params.onValueA;
      params.onValueB = +params.onValueB;

      return {
        max : 0,
        min : 0,

        // Decay rate constants
        // lambda from https://en.wikipedia.org/wiki/Exponential_decay
        maxDecayL : Math.log(2) / params.maxDecayH,
        minDecayL : Math.log(2) / params.minDecayH
      }
    },
    updateState : (params, state) => {
      params.maxDecayH = +params.maxDecayH;
      params.maxDecayL = +params.maxDecayL;
      params.maxFloor = +params.maxFloor;
      params.onValueA = +params.onValueA;
      params.onValueB = +params.onValueB;

      state.maxDecayL = Math.log(2) / params.maxDecayH;
      state.minDecayL = Math.log(2) / params.minDecayH;
    }
  },
  sb : {
    initState : params => {
      // we will need to know bin count and max frequency to do the actual splitting
      // will do in tick handling on-demand when params mismatch
      return {
        maxDecayL : Math.log(2) / params.maxDecayH,
        max : undefined,
        binCount : 0,
        maxFreq : 0,
        chBin0 : undefined,
        chBin1 : undefined,
        chBin0a : undefined,
        chBin1a : undefined,

        // maxSpill ^ maxSpillHbc = 0.5; use negative to infinite; 0 to turn ogg
        // maxSpill = 0.5 ^ (1/maxSpillHbc)
        // maxSpillHbc = log(0.5) / log(maxSpill)
        // maxSpill 0.85 -> maxSpillHbc 4.3
        // maxSpill 0.9  -> maxSpillHbc 6.6
        // maxSpill 0.95 -> maxSpillHbc 13.5
        maxSpill : (params.maxSpillHbc < 0)
            ? 1.0
            : (params.maxSpillHbc === 0)
                ? 0.0
                : Math.pow(0.5, 1 / params.maxSpillHbc)
      };
    },
    updateState : (params, state) => {
      state.max = undefined;
      state.maxDecayL = Math.log(2) / params.maxDecayH;
      state.binCount = 0;
      state.maxFreq = 0;
      state.chBin0 = undefined;
      state.chBin1 = undefined;
      state.chBin0a = undefined;
      state.chBin1a = undefined;
      state.maxSpill = (params.maxSpillHbc < 0)
          ? 1.0
          : (params.maxSpillHbc === 0)
              ? 0.0
              : Math.pow(0.5, 1 / params.maxSpillHbc);
    }
  },
  vsb : {
    initState : params => {
      params.maxFloor = +params.maxFloor;
      params.doNormalize = +params.doNormalize;
      params.doLpf = +params.doLpf;
      params.doHpf = +params.doHpf;
      const freqs = params.freqs.split(',').map(s => +s);
      console.log('freqs:', freqs);

      return {
        freqs : freqs,
        channels : freqs.length - 1 + (params.doLpf ? 1 : 0) + (params.doHpf ? 1 : 0), // number of output channels

        maxDecayL : Math.log(2) / params.maxDecayH,
        max : undefined,
        binCount : 0, // cached input spectrum properties
        maxFreq : 0, // cached input spectrum properties
        firstChannelFirstBin : undefined, // first bin index of the first channel
        channelBinCounts  : undefined // bin counts for each output channels
      };
    },
    updateState : (params, state) => {
      params.maxFloor = +params.maxFloor;
      params.doNormalize = +params.doNormalize;
      params.doLpf = +params.doLpf;
      params.doHpf = +params.doHpf;
      const freqs = params.freqs.split(',').map(s => +s);
      console.log('freqs:', freqs);
      state.freqs = freqs;
      state.channels = freqs.length - 1 + (params.doLpf ? 1 : 0) + (params.doHpf ? 1 : 0);
      state.max = undefined;
      state.maxDecayL = Math.log(2) / params.maxDecayH;
      state.binCount = 0;
      state.maxFreq = 0;
      state.firstChannelFirstBin = undefined;
      state.channelBinCounts = undefined;
    }
  },
  pid : {
    initState : params => {
      params.width = +params.width;
      params.p = +params.p;
      params.d = +params.d;
      params.i = +params.i;
      params.iDecayH = +params.iDecayH;
      params.dClip0 = +params.dClip0;
      return {
        i : undefined, // integrated channel values, only when I is requested
        v : undefined, // sample values for channels, only when D is requested
        dt : undefined, // dt since last sample (in milliseconds), only when D is requested
        pos : undefined, // next sample to store in buff, only when D is requested
        buffull : false, // buffers full, only when D is requested
        iDecayL : Math.log(2) / params.iDecayH
      }
    },
    updateState : (params, state) => {
      params.width = +params.width;
      params.p = +params.p;
      params.d = +params.d;
      params.i = +params.i;
      params.iDecayH = +params.iDecayH;
      params.dClip0 = +params.dClip0;
      state.i = undefined;
      state.v = undefined;
      state.dt = undefined;
      state.pos = undefined;
      state.buffull = false;
      state.iDecayL = Math.log(2) / params.iDecayH;
    }
  },
  hhc : {
    initState : params => {
      params.width = +params.width;
      const state = {
        c : [],
        a : 0
      };
      for (var i = 0; i < params.width; i++) {
        const ci = 0.5 + 0.5 * Math.cos(i * 3.14159 / params.width);
        state.c.push(ci);
        state.a = state.a + ci;
      }
      return state;
    },
    updateState : (params, state) => {
      params.width = +params.width;
      state.c = [];
      state.a = 0;
      for (var i = 0; i < params.width; i++) {
        const ci = 0.5 + 0.5 * Math.cos(i * 3.14159 / params.width);
        state.c.push(ci);
        state.a = state.a + ci;
      }
    }
  },
  lr : {
    initState : params => {
      params.targetFps = u.clip(params.targetFps, 5, 1000);

      return {
        targetDelayMs : 1000 / params.targetFps, // todo - use this pattern for analyzers
        lb24 : new Float32Array(24),
        lm35 : new Float32Array(35)
      };
    },
    updateState : (params, state) => {
      params.targetFps = u.clip(params.targetFps, 5, 1000);

      state.targetDelayMs = 1000 / params.targetFps;
    }
  },
  wss : {
    initState : params => {
      params.targetFps = u.clip(params.targetFps, 5, 1000);
      params.gamma = +params.gamma;
      params.scale = u.clip(params.scale, 0, 1);
      return {
        targetDelayMs : 1000 / params.targetFps, // todo - use this pattern for analyzers
        chs : new Float32Array(3),
        channelCount : 3,
        maybeSend : false
      };
    },
    updateState : (params, state) => {
      params.targetFps = u.clip(params.targetFps, 5, 1000);
      params.gamma = +params.gamma;
      params.scale = u.clip(params.scale, 0, 1);

      state.targetDelayMs = 1000 / params.targetFps;
    }
  },
  rgbmap : {
    initState : params => {
      params.mode = +params.mode;
      return {
      };
    },
    updateState : (params, state) => {
      params.mode = +params.mode;
    }
  },
  lfo : {
    initState : params => {
      params.waveform = +params.waveform;
      params.frequency = +params.frequency;
      params.phase = u.clip(params.phase, 0, 1);
      params.dc = u.clip(params.dc, 0, 1);
      params.a = u.clip(params.a, 0, 1);
      const period = Math.round(60000 / params.frequency);
      return {
        period : period,
        shift : period * params.phase
      };
    },
    updateState : (params, state) => {
      params.waveform = +params.waveform;
      params.frequency = +params.frequency;
      params.phase = u.clip(params.phase, 0, 1);
      params.dc = u.clip(params.dc, 0, 1);
      params.a = u.clip(params.a, 0, 1);

      state.period = Math.round(60000 / params.frequency);
      state.shift = state.period * params.phase;
    }
  },
  fixedEffect : {
    initState : params => {
      params.mode = +params.mode;
      params.dt = +params.dt;
      params.channels = +params.channels;
      params.value1 = +params.value1;
      params.value2 = +params.value2;
      params.dotsize = +params.dotsize;
      return {
        x : 0,
        y : 0,
        dx : 0,
        dy : 0,
        lastStep : 0
      };
    },
    updateState : (params, state) => {
      params.mode = +params.mode;
      params.dt = +params.dt;
      params.channels = +params.channels;
      params.value1 = +params.value1;
      params.value2 = +params.value2;
      params.dotsize = +params.dotsize;
      state.x = 0;
      state.y = 0;
      state.dx = 0;
      state.dy = 0;
      state.lastStep = 0;
    }
  }

};

export const nodeTypes = {
  connection : { // special node for connecting distant ports; skipped from DAG and pipeline processing
    w : 150,
    h : 20,
    title : 'Port connection',
    square : true,
    white : true,
    ports : {
      in : {
        type : 'in',
        x : -15,
        y : 10,
        l : 5
      },
      out : {
        type : 'out',
        x : 165,
        y : 10,
        l : 5
      }
    }
  },
  aa : {
    w : 150,
    h : 135,
    title : 'Analyzer',
    ports : {
      tdo : {
        type : 'out',
        label : 'TD [lin mag]',
        x : 165,
        y : 40,
        l : 100
      },
      spo : { // spectrum magnitude dB
        type : 'out',
        label : 'Spectrum [dB mag]',
        x : 165,
        y : 70,
        l : 100
      }
    },
    params : {
      fftSize : {
        label: 'fftSize',
        initial : 1024,
        x : 5,
        y : 100,
        len : 140
      },
      targetFps : {
        label: 'targetFps',
        initial : 50,
        x : 5,
        y : 115,
        len : 140
      }
    }
  },
  dbm2linm : {
    w : 150,
    h : 60,
    title : 'Spectrum to lin',
    ports : {
      spo : {
        type : 'out',
        label : 'FD [lin mag]',
        x : 165,
        y : 40,
        l : 70
      },
      spi : {
        type : 'in',
        label : 'FD [dB mag]',
        x : -15,
        y : 40,
        l : 70
      }
    }
  },
  aw : {
    w : 150,
    h : 60,
    title : 'A-weights',
    ports : {
      spo : {
        type : 'out',
        label : 'FD [lin mag]',
        x : 165,
        y : 40,
        l : 70
      },
      spi : {
        type : 'in',
        label : 'FD [lin mag]',
        x : -15,
        y : 40,
        l : 70
      }
    }
  },
  fde : {
    w : 150,
    h : 60,
    title : 'FD energy',
    ports : {
      fdi : {
        type : 'in',
        label : 'FD [mag]',
        x : -15,
        y : 40,
        l : 50
      },
      eo : {
        type : 'out',
        label : 'Energy',
        x : 165,
        y : 40,
        l : 50
      }
    }
  },
  tde : {
    w : 150,
    h : 60,
    title : 'TD energy',
    ports : {
      tdi : {
        type : 'in',
        label : 'TD [mag]',
        x : -15,
        y : 40,
        l : 50
      },
      eo : {
        type : 'out',
        label : 'Energy',
        x : 165,
        y : 40,
        l : 50
      }
    }
  },
  mh : {
    w : 150,
    h : 120,
    title : 'Max hold',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -15,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
      sustain : {
        label: 'Sustain (ms)',
        descriptionMd : `## Sustain time
Time in \`ms\` to sustain the last (per channel) max value before decaying.`,
        initial : 0,
        x : 5,
        y : 70,
        len : 140
      },
      decay : {
        label: 'Decay (ms)',
        descriptionMd : `## Decay half time
Time in \`ms\` to decay the hold the per channel max value to the half after sustaining.`,
        initial : 150,
        x : 5,
        y : 85,
        len : 140
      },
      attack : {
        label: 'Attack (ms)',
        descriptionMd : `## Attack half time
Time in \`ms\` to close half the distance to the input when the (per channel) input is greater than its currently tracked value.`,
        initial : 0,
        x : 5,
        y : 100,
        len : 140
      }
    }
  },
  normalize : {
    w : 150,
    h : 135,
    title : 'Normalize',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -15,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
      maxDecayH : {
        label: 'Max decay (ms)',
        descriptionMd : `## Normalization max tracking half time
Time to decay the per channel tracked max value to its half (when normalization is requested).`,
        initial : 5000,
        x : 5,
        y : 70,
        len : 140
      },
      maxFloor : {
        label: 'Max floor',
        descriptionMd : `## Max floor
Smallest max value to decay into.`,
        initial : 0.0001,
        x : 5,
        y : 85,
        len : 140
      },
      sustain : {
        label: 'Sustain (ms)',
        descriptionMd : `## Max sustain time
Time in \`ms\` to sustain the last (per channel) max value before start decaying.`,
        initial : 0,
        x : 5,
        y : 100,
        len : 140
      },
      globalNorm: {
        label: 'Global',
        descriptionMd : `## Do global normalization
Track and apply a single max value instead of per channel/band. Ignored for scalar input.`,
        initial : 0,
        x : 5,
        y : 115,
        len : 140
      }
    }
  },
  linScale : {
    w : 150,
    h : 120,
    title : 'Linear scale',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -15,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
      scaleA : {
        label: 'scale (a)',
        descriptionMd: `## Output scale slope \`a\`
Output values scaled with \`out = a * in + b\`.`,
        initial : 1,
        x : 5,
        y : 70,
        len : 140
      },
      scaleB : {
        label: 'scale (b)',
        descriptionMd: `## Output scale offset \`b\`
Output values scaled with \`out = a * in + b\`.`,
        initial : 0,
        x : 5,
        y : 85,
        len : 140
      },
      clip : {
        label: 'clip',
        descriptionMd: `## Output clip to \`0 - 1\`
Output values are clipped to \`0 - 1\` interval.`,
        initial : 1,
        x : 5,
        y : 100,
        len : 140
      }
    }
  },
  linCombine : {
    w : 150,
    h : 135,
    title : 'Linear combine',
    ports : {
      a : {
        type : 'in',
        label : 'a',
        x : -15,
        y : 40,
        l : 50
      },
      in0 : {
        type : 'in',
        label : 'In0',
        x : -15,
        y : 85,
        l : 50
      },
      in1 : {
        type : 'in',
        label : 'In1',
        x : -15,
        y : 115,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
    }
  },
  channelRemap : {
    w : 150,
    h : 90,
    title : 'Channel remap',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -15,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
      mode : {
        label: 'mode',
        descriptionMd :
`## Remapping style
Use the following values:
 - \`0\`: **Default**, pass through
 - \`1\`: **Reverse**, first input channel is mapped to the last output
 - \`2\`: **Center to side**, first input channel is mapped to the middle output
 - \`8\`: **7x5 matrix spiral center start**, mapping 35 channels to a spiral, starting in (around) the center, spiraling out
 - \`9\`: **7x5 matrix spiral corner start**, mapping 35 channels to a spiral, starting in the corner, spiraling in
`,
        initial : 0,
        x : 5,
        y : 70,
        len : 140
      }
    }
  },
  vu : {
    w : 150,
    h : 165,
    title : 'VU',
    ports : {
      ein : {
        type : 'in',
        label : 'Energy',
        x : -15,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Channels',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
      channels : {
        label: 'Channels',
        initial : 24,
        x : 5,
        y : 70,
        len : 140
      },
      maxDecayH : {
        label: 'Max decay (ms)',
        initial : 5000,
        x : 5,
        y : 85,
        len : 140
      },
      minDecayH : {
        label: 'Min decay (ms)',
        initial : 5000,
        x : 5,
        y : 100,
        len : 140
      },
      maxFloor : {
        label: 'Max floor',
        initial : 0.0001,
        x : 5,
        y : 115,
        len : 140
      },
      // Value for "on" channels is calculated by ax + b where x is the input value after normalization
      onValueA : {
        label : 'On v "a"',
        initial : 0.5,
        x : 5,
        y : 130,
        len : 140
      },
      onValueB : {
        label : 'On cv "b"',
        initial : 0.5,
        x : 5,
        y : 145,
        len : 140
      }
    }
  },
  sb : {
    w : 150,
    h : 225,
    title : 'Subbands',
    ports : {
      in : {
        type : 'in',
        label : 'FD [lin mag]',
        x : -15,
        y : 40,
        l : 70
      },
      out : {
        type : 'out',
        label : 'Channels',
        x : 165,
        y : 40,
        l : 70
      }
    },
    params : {
      channels : {
        label: 'channels',
        initial : 8,
        x : 5,
        y : 70,
        len : 140
      },
      lf : {
        label: 'Low freq (Hz)',
        initial : 100,
        x : 5,
        y : 85,
        len : 140
      },
      hf : {
        label: 'High freq (Hz)',
        initial : 1500,
        x : 5,
        y : 100,
        len : 140
      },
      maxDecayH : {
        label: 'Max decay (ms)',
        initial : 5000,
        x : 5,
        y : 115,
        len : 140
      },
      maxFloor : {
        label: 'Max floor',
        initial: 0,
        x : 5,
        y : 130,
        len : 140
      },
      maxSpillHbc : {
        label: 'Max spill b to 1/2',
        initial : 0,
        x : 5,
        y : 145,
        len : 140
      },
      spillXpf : {
        label: 'Spill from xPF',
        initial : 0,
        x : 5,
        y : 160,
        len : 140
      },
      doAvg : {
        label: 'Do AVG',
        initial : 0,
        x : 5,
        y : 175,
        len : 140
      },
      doLpf : {
        label: 'Do LPF band',
        initial : 0,
        x : 5,
        y : 190,
        len : 140
      },
      doHpf : {
        label: 'Do HPF band',
        initial : 0,
        x : 5,
        y : 205,
        len : 140
      }
    }
  },
  vsb : {
    w : 150,
    h : 180,
    title : 'V Subbands',
    ports : {
      in : {
        type : 'in',
        label : 'FD [lin mag]',
        x : -15,
        y : 40,
        l : 70
      },
      out : {
        type : 'out',
        label : 'Channels',
        x : 165,
        y : 40,
        l : 70
      }
    },
    params : {
      freqs : {
        label: 'Frequencies',
        descriptionMd : `## Frequency limits
Comma (\`,\`) separated list of limit frequencies for subbands.

 - **Low pass filter**: When \`Do LPF\` is requested the
first channel is derived from an LPF up to the first limit frequency value.
 - **High pass filter**: When \`Do HPF\` is requested
the last channel is derived from an HPF from the last limit frequency value.
 - All other channels are bordered by the limit frequencies`,
        type : 'string',
        initial : '200, 400, 800, 1600, 3200',
        x : 5,
        y : 70,
        len : 140
      },
      doNormalize : {
        label : 'Do normalize',
        descriptionMd : `## Normalize channel values
When set to non-\`0\` then normalize channel values according to tracked per-channel exponencially decaying maximum value.`,
        initial : 1,
        x : 4,
        y : 85,
        len : 140
      },
      maxDecayH : {
        label: 'Max decay (ms)',
        initial : 5000,
        x : 5,
        y : 100,
        len : 140
      },
      maxFloor : {
        label: 'Max floor (ms)',
        initial: 0,
        x : 5,
        y : 115,
        len : 140
      },
      doAvg : {
        label: 'Do AVG',
        initial : 0,
        x : 5,
        y : 130,
        len : 140
      },
      doLpf : {
        label: 'Do LPF band',
        initial : 1,
        x : 5,
        y : 145,
        len : 140
      },
      doHpf : {
        label: 'Do HPF band',
        initial : 1,
        x : 5,
        y : 160,
        len : 140
      }
    }
  },
  hhc : {
    w : 150,
    h : 90,
    title : 'Half Hanning',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -15,
        y : 40,
        l : 70
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 70
      }
    },
    params : {
      width : {
        label: 'Width (ms)',
        descriptionMd : `## Window width
Window width in millisecond`,
        initial : 200,
        x : 5,
        y : 70,
        len : 140
      }
    }
  },
  pid : {
    w : 150,
    h : 165,
    title : 'PID',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -15,
        y : 40,
        l : 70
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 70
      }
    },
    params : {
      p : {
        label: 'P',
        descriptionMd : `## **P**roportional component
Coefficient for the input value for the proportional compontn`,
        initial : 0,
        x : 5,
        y : 70,
        len : 140
      },
      i : {
        label: 'I',
        descriptionMd : `## **I**ntegrated component
Coefficient for the integral of the input value (subject to decay)`,
        initial : 0,
        x : 5,
        y : 85,
        len : 140

      },
      iDecayH : {
        label: 'I decay to 1/2 (ms)',
        descriptionMd : `## Integrated component decay to half
Time in \`ms\` for the integrated component to decay to half of its value. Since the typical use of
this PID node is in an open loop signal processing pipeline the integrated component would grow
indefinitely without any decay.`,
        initial : 50,
        x : 5,
        y : 100,
        len : 140
      },
      d : {
        label: 'D',
        descriptionMd : `## **D**differential component
Coefficient for the time derivative of the input value`,
        initial : 250,
        x : 5,
        y : 115,
        len : 140
      },
      width : {
        label: 'D-Width (samples)',
        descriptionMd : `## Window width for D
Window width in consecutive samples`,
        initial : 2,
        x : 5,
        y : 130,
        len : 140
      },
      dClip0 : {
        label: 'D clip < 0',
        descriptionMd : `## Clip negative D values
When set to non-\`0\` negative output values are clipped at \`0\`, providing half wave rectification of the differential component`,
        initial : 1,
        x : 5,
        y : 145,
        len : 140
      }
    }
  },
  lr : {
    w : 150,
    h : 120,
    title : 'Legacy router',
    ports : {
      lb24 : {
        type : 'in',
        label : 'Bar 24',
        x : -15,
        y : 40,
        l : 70
      },
      lm35 : {
        type : 'in',
        label : 'Matrix 35',
        x : -15,
        y : 70,
        l : 70
      }
    },
    params : {
      targetFps : {
        label: 'targetFps',
        initial : 45,
        x : 5,
        y : 100,
        len : 140
      }
    }
  },
  wss : {
    w : 150,
    h : 120,
    title : 'WS2812 strip',
    ports : {
      channels : {
        type : 'in',
        label : 'Channels',
        x : -15,
        y : 40,
        l : 70
      }
    },
    params : {
      targetFps : {
        label: 'targetFps',
        initial : 45,
        x : 5,
        y : 70,
        len : 140
      },
      gamma : {
        label: 'gamma',
        descriptionMd :
`## Gamma

Gamma correction (\`v' = pow(v, gamma)\`) applied to the input values (which are between \`0\` and \`1\`) before scaling and sending to the hardware.
`,
        initial : 5,
        x : 5,
        y : 85,
        len : 140
      },
      scale : {
        label: 'scale',
        descriptionMd :
`## Scale

Scale factor (between \`0\` and \`1\`; \`v' = v * scale\`) applied to the values after gamma correctiont before scaling and sending to the hardware.
`,
        initial : 1,
        x : 5,
        y : 100,
        len : 140
      }
    }
  },
  rgbmap : {
    w : 150,
    h : 120,
    title : 'RGB map',
    ports : {
      in1 : {
        type : 'in',
        label : 'IN 1',
        x : -15,
        y : 40,
        l : 70
      },
      in2 : {
        type : 'in',
        label : 'IN 2',
        x : -15,
        y : 70,
        l : 70
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
      mode : {
        label: 'mode',
        descriptionMd :
`## Mode

Use the following values:
 - \`0\`: **White**, Map input 1 to the same R, G and B channels; input 2 is ignored
 - \`1\`: **Yellowish**, Map input 1 according to the "yellowish" color scale; input 2 is ignored
 - \`2\`: **Incandescent**, Map input 1 according to the "incandescent" color scale; input 2 is ignored
 - \`3\`: **Incandescent2**, Map input 1 according to the "incandescent2" color scale; input 2 is ignored
 - \`4\`: **Incandescent3**, Map input 1 according to the "incandescent3" color scale; input 2 is ignored
`,
        initial : 0,
        x : 5,
        y : 100,
        len : 140
      }
    }
  },
  lfo : {
    w : 150,
    h : 150,
    title : 'LFO',
    ports : {
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
      waveform : {
        label: 'Waveform',
        descriptionMd :
`## Waveform

Use the following values:
 - \`0\`: **Sawtooth**, Sawtooth - linear ramp from \`0.0\` to \`1.0\` then fall back to \`0.0\`
 - \`1\`: **Sin**, Sinus
 - \`2\`: **Square**, Square wave with adjustable duty cycle
 - \`3\`: **Triangle**, Triangle wave with adjustable duty cycle (assymetric on/off ramps)'
 - \`4\`: **1-cos pulse**, \`1 - cos\` pulse
`,
        initial : 0,
        x : 5,
        y : 70,
        len : 140
      },
      frequency : {
        label : 'Frequency, 1/min',
        descriptionMd :
`## frequency

Frequency; 1/min`,
        initial : 30,
        x : 5,
        y : 85,
        len : 140
      },
      phase : {
        label: 'Relative phase',
        descriptionMd :
`## Relative phase shift

Relative phase shift, \`0.0\` - \`1.0\`
`,
        initial : 0,
        x : 5,
        y : 100,
        len : 140
      },
      dc: {
        label: 'Duty cycle',
        descriptionMd :
`## Duty cycle

Duty cycle for square and triangle waveforms, \`0.0\` - \`1.0\`
`,
        initial : 0.5,
        x : 5,
        y : 115,
        len : 140
      },
      a: {
        label: 'Amplitude',
        descriptionMd :
`## Amplitude

Amplitude of output, \`0.0\` - \`1.0\`
`,
        initial : 1.0,
        x : 5,
        y : 130,
        len : 140
      }
    }
  },
  fixedEffect : {
    w : 150,
    h : 165,
    title : 'Fixed effect',
    ports : {
      out : {
        type : 'out',
        label : 'Out',
        x : 165,
        y : 40,
        l : 50
      }
    },
    params : {
      channels : {
        label : 'channels',
        descriptionMd :
`## Channel count

Number of generated output channels`,
        initial : 5,
        x : 5,
        y : 70,
        len : 140
      },
      dt : {
        label: 'dt (s)',
        descriptionMd :
`## Time step

Time step for time dependent effects
`,
        initial : 1,
        x : 5,
        y : 100,
        len : 140
      },
      mode : {
        label: 'mode',
        descriptionMd :
`## Effect style

Use the following values:
 - \`0\`: **Static**, Uniform, static values on all channels, specified by \`value1\. Secondary value \`value2\` is ignored.
 - \`1\`: **Symmetric chaser (AA)**, antialiased symmetric (long tail and head) linear chaser, tail/head size specified by \`dotsize\`, loop time specified by \`dt\`
 - \`2\`: **Asymmetric chaser (AA)**, antialiased asymmetric (long tail/short head) linear chaser, tail size specified by \`dotsize\`, loop time specified by \`dt\`
 - \`3\`: **Dot chaser (AA)**, antialiased single dot linear chaser, \`dotsize\` is ignored, loop time specified by \`dt\`. Feel free to combine with downstream max hold.
 - \`4\`: **Dot chaser (non-AA)**, non-antialiased single dot linear chaser, \`dotsize\` is ignored, loop time specified by \`dt\`.
 - \`5\`: **Dot chaser - ping pong (AA)**, antialiased two way single dot chaser, \`dotsize\` is ignored, loop time specified by \`dt\`.
 - \`6\`: **Dot chaser - ping pong (eased, AA)**, antialiased two way single dot chaser with sine wave easing, \`dotsize\` is ignored, loop time specified by \`dt\`.
 - \`7\`: **Dot chaser - ping pong (non-aa)**, not-antialiased two way single dot chaser, \`dotsize\` is ignored, loop time specified by \`dt\`.
 - \`8\`: **Dot chaser - ping pong (eased, non-AA)**, not-antialiased two way single dot chaser with sine wave easing, \`dotsize\` is ignored, loop time specified by \`dt\`.
 - \`9\`: **DVD screensaver for 7x5 matrix**, delay between steps is specified by \`dt\`. Only when 35 channels is set
`,
        initial : 0,
        x : 5,
        y : 85,
        len : 140
      },
      value1 : {
        label: 'value1',
        descriptionMd :
`## First effect parameter

Typically used as baseline intensiy`,
        initial : 0.5,
        x : 5,
        y : 115,
        len : 140
      },
      value2 : {
        label: 'value2',
        descriptionMd :
`## Second effect parameter

Typically used as highlight intensiy`,
        initial : 1,
        x : 5,
        y : 130,
        len : 140
      },
      dotsize : {
        label: 'dotsize',
        descriptionMd :
`## Dot size

Dot size of the chaser effect`,
        initial : 3,
        x : 5,
        y : 145,
        len : 140
      }
    }
  }
};
