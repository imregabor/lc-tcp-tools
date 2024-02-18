'use strict';


export const nodeFunctions = {
  aw : {
    initState : params => {
      // ensure that node have a state
      // todo: parametrize the curve
      return {};
    }
  },
  vu : {
    initState : params => {
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
      state.maxDecayL = Math.log(2) / params.maxDecayH;
      state.minDecayL = Math.log(2) / params.minDecayH;
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
  vu : {
    w : 100,
    h : 130,
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
        x : 120,
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
        len : 85
      },
      maxDecayH : {
        label: 'max decay',
        initial : 5000,
        x : 5,
        y : 85,
        len : 85
      },
      minDecayH : {
        label: 'min decay',
        initial : 5000,
        x : 5,
        y : 100,
        len : 85
      },
    }
  },
  lr : {
    w : 100,
    h : 130,
    title : 'Legacy router',
    ports : {
      lm35 : {
        type : 'in',
        label : 'Matrix 35',
        x : -20,
        y : 40,
        l : 70
      },
      lb24 : {
        type : 'in',
        label : 'Bar 24',
        x : -20,
        y : 70,
        l : 70
      }
    },
    params : {
      targetFps : {
        label: 'targetFps',
        initial : 30,
        x : 5,
        y : 100,
        len : 85
      }
    }
  }
};
