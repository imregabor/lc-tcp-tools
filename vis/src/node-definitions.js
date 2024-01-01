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
  }
};

