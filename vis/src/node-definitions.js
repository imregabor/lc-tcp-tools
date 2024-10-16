'use strict';


export const nodeFunctions = {
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
        attackL : Math.log(2) / params.attack
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
  lr : {
    initState : params => {
      return {
        targetDelayMs : 1000 / params.targetFps, // todo - use this pattern for analyzers
        lb24 : new Float32Array(24),
        lm35 : new Float32Array(35)
      };
    },
    updateState : (params, state) => {
      state.targetDelayMs = 1000 / params.targetFps;
    }
  },
  wss : {
    initState : params => {
      params.targetFps = +params.targetFps;
      params.gamma = +params.gamma;
      return {

        targetDelayMs : 1000 / params.targetFps, // todo - use this pattern for analyzers
        chs : new Float32Array(3),
        channelCount : 3,
        maybeSend : false
      };
    },
    updateState : (params, state) => {
      params.targetFps = +params.targetFps;
      params.gamma = +params.gamma;

      state.targetDelayMs = 1000 / params.targetFps;
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
  aa : {
    w : 100,
    h : 130,
    title : 'Analyzer',
    ports : {
      tdo : {
        type : 'out',
        label : 'TD [lin mag]',
        x : 120,
        y : 40,
        l : 100
      },
      spo : { // spectrum magnitude dB
        type : 'out',
        label : 'Spectrum [dB mag]',
        x : 120,
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
        len : 85
      },
      targetFps : {
        label: 'targetFps',
        initial : 50,
        x : 5,
        y : 115,
        len : 85
      }
    }
  },
  dbm2linm : {
    w : 130,
    h : 130,
    title : 'Spectrum to lin',
    ports : {
      spo : {
        type : 'out',
        label : 'FD [lin mag]',
        x : 150,
        y : 40,
        l : 70
      },
      spi : {
        type : 'in',
        label : 'FD [dB mag]',
        x : -20,
        y : 40,
        l : 70
      }
    }
  },
  aw : {
    w : 130,
    h : 130,
    title : 'A-weights',
    ports : {
      spo : {
        type : 'out',
        label : 'FD [lin mag]',
        x : 150,
        y : 40,
        l : 70
      },
      spi : {
        type : 'in',
        label : 'FD [lin mag]',
        x : -20,
        y : 40,
        l : 70
      }
    }
  },
  fde : {
    w : 90,
    h : 60,
    title : 'FD energy',
    ports : {
      fdi : {
        type : 'in',
        label : 'FD [mag]',
        x : -20,
        y : 40,
        l : 50
      },
      eo : {
        type : 'out',
        label : 'Energy',
        x : 110,
        y : 40,
        l : 50
      }
    }
  },
  tde : {
    w : 90,
    h : 60,
    title : 'TD energy',
    ports : {
      tdi : {
        type : 'in',
        label : 'TD [mag]',
        x : -20,
        y : 40,
        l : 50
      },
      eo : {
        type : 'out',
        label : 'Energy',
        x : 110,
        y : 40,
        l : 50
      }
    }
  },
  mh : {
    w : 100,
    h : 130,
    title : 'Max hold',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -20,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 120,
        y : 40,
        l : 50
      }
    },
    params : {
      sustain : {
        label: 'sustain',
        initial : 0,
        x : 5,
        y : 70,
        len : 85
      },
      decay : {
        label: 'decay (ms)',
        initial : 150,
        x : 5,
        y : 85,
        len : 85
      },
      attack : {
        label: 'attack (ms)',
        descriptionMd : `## Attack rate
Time in \`ms\` to close half the distance to the input.`,
        initial : 0,
        x : 5,
        y : 100,
        len : 85
      }
    }
  },
  linScale : {
    w : 130,
    h : 130,
    title : 'Linear scale',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -20,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 150,
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
        len : 120
      },
      scaleB : {
        label: 'scale (b)',
        descriptionMd: `## Output scale offset \`b\`
Output values scaled with \`out = a * in + b\`.`,
        initial : 0,
        x : 5,
        y : 85,
        len : 120
      },
      clip : {
        label: 'clip',
        descriptionMd: `## Output clip to \`0 - 1\`
Output values are clipped to \`0 - 1\` interval.`,
        initial : 1,
        x : 5,
        y : 100,
        len : 120
      }
    }
  },
  linCombine : {
    w : 115,
    h : 130,
    title : 'Linear combine',
    ports : {
      a : {
        type : 'in',
        label : 'a',
        x : -20,
        y : 40,
        l : 50
      },
      in0 : {
        type : 'in',
        label : 'In0',
        x : -20,
        y : 80,
        l : 50
      },
      in1 : {
        type : 'in',
        label : 'In1',
        x : -20,
        y : 110,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 120,
        y : 40,
        l : 50
      }
    },
    params : {
    }
  },
  channelRemap : {
    w : 100,
    h : 85,
    title : 'Channel remap',
    ports : {
      in : {
        type : 'in',
        label : 'In',
        x : -20,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Out',
        x : 120,
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
        len : 85
      }
    }
  },
  vu : {
    w : 120,
    h : 160,
    title : 'VU',
    ports : {
      ein : {
        type : 'in',
        label : 'Energy',
        x : -20,
        y : 40,
        l : 50
      },
      out : {
        type : 'out',
        label : 'Channels',
        x : 140,
        y : 40,
        l : 50
      }
    },
    params : {
      channels : {
        label: 'channels',
        initial : 24,
        x : 5,
        y : 70,
        len : 105
      },
      maxDecayH : {
        label: 'max decay',
        initial : 5000,
        x : 5,
        y : 85,
        len : 105
      },
      minDecayH : {
        label: 'min decay',
        initial : 5000,
        x : 5,
        y : 100,
        len : 105
      },
      maxFloor : {
        label: 'max floor',
        initial : 0.0001,
        x : 5,
        y : 115,
        len : 105
      },
      // Value for "on" channels is calculated by ax + b where x is the input value after normalization
      onValueA : {
        label : 'on cv "a"',
        initial : 0.5,
        x : 5,
        y : 130,
        len : 105
      },
      onValueB : {
        label : 'on cv "b"',
        initial : 0.5,
        x : 5,
        y : 145,
        len : 105
      }
    }
  },
  sb : {
    w : 140,
    h : 220,
    title : 'Subbands',
    ports : {
      in : {
        type : 'in',
        label : 'FD [lin mag]',
        x : -20,
        y : 40,
        l : 70
      },
      out : {
        type : 'out',
        label : 'Channels',
        x : 150,
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
        len : 125
      },
      lf : {
        label: 'Low freq',
        initial : 100,
        x : 5,
        y : 85,
        len : 125
      },
      hf : {
        label: 'High freq',
        initial : 1500,
        x : 5,
        y : 100,
        len : 125
      },
      maxDecayH : {
        label: 'Max decay',
        initial : 5000,
        x : 5,
        y : 115,
        len : 125
      },
      maxFloor : {
        label: 'Max floor',
        initial: 0,
        x : 5,
        y : 130,
        len : 125
      },
      maxSpillHbc : {
        label: 'Max spill b to 1/2',
        initial : 0,
        x : 5,
        y : 145,
        len : 125
      },
      spillXpf : {
        label: 'Spill from xPF',
        initial : 0,
        x : 5,
        y : 160,
        len : 125
      },
      doAvg : {
        label: 'Do AVG',
        initial : 0,
        x : 5,
        y : 175,
        len : 125
      },
      doLpf : {
        label: 'Do LPF band',
        initial : 0,
        x : 5,
        y : 190,
        len : 125
      },
      doHpf : {
        label: 'Do HPF band',
        initial : 0,
        x : 5,
        y : 205,
        len : 125
      }
    }
  },
  lr : {
    w : 100,
    h : 130,
    title : 'Legacy router',
    ports : {
      lb24 : {
        type : 'in',
        label : 'Bar 24',
        x : -20,
        y : 40,
        l : 70
      },
      lm35 : {
        type : 'in',
        label : 'Matrix 35',
        x : -20,
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
        len : 85
      }
    }
  },
  wss : {
    w : 100,
    h : 130,
    title : 'WS2812 strip',
    ports : {
      channels : {
        type : 'in',
        label : 'Channels',
        x : -20,
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
        len : 85
      },
      gamma : {
        label: 'gamma',
        initial : 5,
        x : 5,
        y : 85,
        len : 85
      }
    }
  },
  fixedEffect : {
    w : 130,
    h : 160,
    title : 'Fixed effect',
    ports : {
      out : {
        type : 'out',
        label : 'Out',
        x : 150,
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
        len : 120
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
        len : 120
      },
      mode : {
        label: 'mode',
        descriptionMd :
`## Effect style

Use the following values:
 - \`0\`: **Default**, Uniform values, specified by \`value1\`
 - \`1\`: **Chaser1**, antialiased symmetric chaser, extent specified by \`dotsize\`, loop time specified by \`dt\`
 - \`2\`: **Chaser2**, antialiased asymmetric chaser, extent specified by \`dotsize\`, loop time specified by \`dt\`
 - \`9\`: **DVD screensaver for 7x5 matrix**, delay between steps is specified by \`dt\`. Only when 35 channels is set
`,
        initial : 0,
        x : 5,
        y : 85,
        len : 120
      },
      value1 : {
        label: 'value1',
        descriptionMd :
`## First effect parameter

Typically used as baseline intensiy`,
        initial : 0.5,
        x : 5,
        y : 115,
        len : 120
      },
      value2 : {
        label: 'value2',
        descriptionMd :
`## Second effect parameter

Typically used as highlight intensiy`,
        initial : 1,
        x : 5,
        y : 130,
        len : 120
      },
      dotsize : {
        label: 'dotsize',
        descriptionMd :
`## Dot size

Dot size of the chaser effect`,
        initial : 3,
        x : 5,
        y : 145,
        len : 120
      }
    }
  }
};
