'use strict';

export const nodeTypes = {
  aa : {
    w : 100,
    h : 130,
    title : 'audio analyzer',
    ports : {
      tdo : {
        type : 'out',
        label : 'time domain',
        x : 120,
        y : 40,
        l : 70
      },
      spo : {
        type : 'out',
        label : 'spectrum',
        x : 120,
        y : 70,
        l : 70
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
  aw : {
    w : 130,
    h : 130,
    title : 'a-weights',
    ports : {
      spo : {
        type : 'out',
        label : 'spectrum',
        x : 150,
        y : 40,
        l : 70
      },
      spi : {
        type : 'in',
        label : 'spectrum',
        x : -20,
        y : 40,
        l : 70
      }
    }
  },
  tde : {
    w : 70,
    h : 60,
    title : 'time domain energy',
    ports : {
      tdi : {
        type : 'in',
        label : 'TD',
        x : -20,
        y : 40,
        l : 40
      },
      eo : {
        type : 'out',
        label : 'energy',
        x : 90,
        y : 40,
        l : 40
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
        label : 'Mapping',
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

