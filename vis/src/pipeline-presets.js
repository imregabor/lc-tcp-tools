'use strict';

export const simpleVu =
  {
    "nodes": [
      {
        "type": "aa",
        "label": "Analyzer",
        "params": {
          "fftSize": 1024,
          "targetFps": 200
        },
        "layout": {
          "x": 200,
          "y": 200
        }
      },
      {
        "type": "aa",
        "label": "Analyzer 2",
        "params": {
          "fftSize": 1024,
          "targetFps": 50
        },
        "layout": {
          "x": 200,
          "y": 400
        }
      },
      {
        "type": "dbm2linm",
        "label": "Spectrum to lin",
        "layout": {
          "x": 400,
          "y": 400
        }
      },
      {
        "type": "aw",
        "label": "A-weights",
        "layout": {
          "x": 600,
          "y": 400
        }
      },
      {
        "type": "fde",
        "label": "FD energy",
        "layout": {
          "x": 800,
          "y": 400
        }
      },
      {
        "type": "vu",
        "label": "VU",
        "params": {
          "channels": 35,
          "maxDecayH": 5000,
          "minDecayH": 5000,
          "maxFloor": 0.0001,
          "onValueA": 0.5,
          "onValueB": 0.5
        },
        "layout": {
          "x": 1000,
          "y": 400
        }
      },
      {
        "type": "tde",
        "label": "TD energy",
        "layout": {
          "x": 400,
          "y": 200
        }
      },
      {
        "type": "vu",
        "label": "VU 2",
        "params": {
          "channels": 24,
          "maxDecayH": 5000,
          "minDecayH": 5000,
          "maxFloor": 0.0001,
          "onValueA": 0.5,
          "onValueB": 0.5
        },
        "layout": {
          "x": 600,
          "y": 200
        }
      },
      {
        "type": "lr",
        "label": "Legacy router",
        "params": {
          "targetFps": 45
        },
        "layout": {
          "x": 1200,
          "y": 200
        }
      }
    ],
    "edges": [
      {
        "n1index": 0,
        "n2index": 6,
        "p1": "tdo",
        "p2": "tdi"
      },
      {
        "n1index": 0,
        "n2index": 2,
        "p1": "spo",
        "p2": "spi"
      },
      {
        "n1index": 2,
        "n2index": 3,
        "p1": "spo",
        "p2": "spi"
      },
      {
        "n1index": 3,
        "n2index": 4,
        "p1": "spo",
        "p2": "fdi"
      },
      {
        "n1index": 4,
        "n2index": 5,
        "p1": "eo",
        "p2": "ein"
      },
      {
        "n1index": 5,
        "n2index": 8,
        "p1": "out",
        "p2": "lm35"
      },
      {
        "n1index": 6,
        "n2index": 7,
        "p1": "eo",
        "p2": "ein"
      },
      {
        "n1index": 7,
        "n2index": 8,
        "p1": "out",
        "p2": "lb24"
      }
    ]
  };
