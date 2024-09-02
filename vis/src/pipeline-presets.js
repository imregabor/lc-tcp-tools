'use strict';

export const vuAndSpect = {
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
        "fftSize": "512",
        "targetFps": "25"
      },
      "layout": {
        "x": 53.137062072753906,
        "y": -344.8576965332031
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
        "x": 1465.53369140625,
        "y": 398.09881591796875
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
        "x": 2283.0123291015625,
        "y": 143.74807739257812
      }
    },
    {
      "type": "tde",
      "label": "TD energy 2",
      "layout": {
        "x": 243.23904418945312,
        "y": -345.759033203125
      }
    },
    {
      "type": "mh",
      "label": "Max hold",
      "params": {
        "sustain": "1500",
        "decay": "0",
        "attack": 0
      },
      "layout": {
        "x": 422.27142333984375,
        "y": -351.44688415527344
      }
    },
    {
      "type": "linScale",
      "label": "Linear scale",
      "params": {
        "scaleA": 1e5,
        "scaleB": -1e-5,
        "clip": 1
      },
      "layout": {
        "x": 596.9188232421875,
        "y": -342.70420837402344
      }
    },
    {
      "type": "mh",
      "label": "Max hold 2",
      "params": {
        "sustain": "500",
        "decay": "1000",
        "attack": "300"
      },
      "layout": {
        "x": 796.1712036132812,
        "y": -345.4080505371094
      }
    },
    {
      "type": "fixedEffect",
      "label": "Fixed effect",
      "params": {
        "channels": "24",
        "dt": 5,
        "mode": "1",
        "value1": 0.4,
        "value2": 0.6,
        "dotsize": 5
      },
      "layout": {
        "x": 772.9371337890625,
        "y": -169.6229476928711
      }
    },
    {
      "type": "fixedEffect",
      "label": "Fixed effect 2",
      "params": {
        "channels": "35",
        "dt": 1,
        "mode": "0",
        "value1": "1.0",
        "value2": 1,
        "dotsize": 3
      },
      "layout": {
        "x": 1072.9234008789062,
        "y": 248.8474292755127
      }
    },
    {
      "type": "linCombine",
      "label": "Linear combine",
      "params": {},
      "layout": {
        "x": 1131.7596435546875,
        "y": -94.43629264831543
      }
    },
    {
      "type": "linCombine",
      "label": "Linear combine 3",
      "params": {},
      "layout": {
        "x": 2058.3001708984375,
        "y": 304.0530889034271
      }
    },
    {
      "type": "mh",
      "label": "Max hold 3",
      "params": {
        "sustain": "25",
        "decay": "50",
        "attack": 0
      },
      "layout": {
        "x": 800.2670288085938,
        "y": 532.1787719726562
      }
    },
    {
      "type": "sb",
      "label": "Subbands",
      "params": {
        "channels": "35",
        "lf": 100,
        "hf": 1500,
        "maxDecayH": "1000",
        "maxFloor": 0,
        "maxSpillHbc": "8",
        "spillXpf": 0,
        "doAvg": 0,
        "doLpf": 0,
        "doHpf": 0
      },
      "layout": {
        "x": 1025.8544921875,
        "y": 535.228515625
      }
    },
    {
      "type": "mh",
      "label": "Max hold 4",
      "params": {
        "sustain": "50",
        "decay": 150,
        "attack": 0
      },
      "layout": {
        "x": 1270.976318359375,
        "y": 537.5176391601562
      }
    },
    {
      "type": "channelRemap",
      "label": "Channel remap",
      "params": {
        "mode": "8"
      },
      "layout": {
        "x": 1476.5225830078125,
        "y": 614.2960205078125
      }
    },
    {
      "type": "channelRemap",
      "label": "Channel remap 2",
      "params": {
        "mode": "2"
      },
      "layout": {
        "x": 826,
        "y": 193.5
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
      "n1index": 16,
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
      "n1index": 15,
      "n2index": 8,
      "p1": "out",
      "p2": "lb24"
    },
    {
      "n1index": 1,
      "n2index": 9,
      "p1": "tdo",
      "p2": "tdi"
    },
    {
      "n1index": 10,
      "n2index": 11,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 9,
      "n2index": 10,
      "p1": "eo",
      "p2": "in"
    },
    {
      "n1index": 11,
      "n2index": 12,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 12,
      "n2index": 15,
      "p1": "out",
      "p2": "a"
    },
    {
      "n1index": 12,
      "n2index": 16,
      "p1": "out",
      "p2": "a"
    },
    {
      "n1index": 13,
      "n2index": 15,
      "p1": "out",
      "p2": "in0"
    },
    {
      "n1index": 14,
      "n2index": 16,
      "p1": "out",
      "p2": "in0"
    },
    {
      "n1index": 21,
      "n2index": 15,
      "p1": "out",
      "p2": "in1"
    },
    {
      "n1index": 20,
      "n2index": 16,
      "p1": "out",
      "p2": "in1"
    },
    {
      "n1index": 3,
      "n2index": 17,
      "p1": "spo",
      "p2": "in"
    },
    {
      "n1index": 17,
      "n2index": 18,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 18,
      "n2index": 19,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 19,
      "n2index": 20,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 7,
      "n2index": 21,
      "p1": "out",
      "p2": "in"
    }
  ]
};

export const simpleVuWithNoiseGate2 = {
  "nodes": [
    {
      "type": "aa",
      "label": "Analyzer",
      "params": {
        "fftSize": 1024,
        "targetFps": 200
      },
      "layout": {
        "x": 37.31195831298828,
        "y": 215.2674560546875
      }
    },
    {
      "type": "aa",
      "label": "Analyzer 2",
      "params": {
        "fftSize": "512",
        "targetFps": "25"
      },
      "layout": {
        "x": 53.137062072753906,
        "y": -344.8576965332031
      }
    },
    {
      "type": "dbm2linm",
      "label": "Spectrum to lin",
      "layout": {
        "x": 210.24240112304688,
        "y": 389.2336120605469
      }
    },
    {
      "type": "aw",
      "label": "A-weights",
      "layout": {
        "x": 418.3171691894531,
        "y": 391.9252014160156
      }
    },
    {
      "type": "fde",
      "label": "FD energy",
      "layout": {
        "x": 631.7752075195312,
        "y": 385.19622802734375
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
        "x": 1017.7320556640625,
        "y": 441.3052673339844
      }
    },
    {
      "type": "tde",
      "label": "TD energy",
      "layout": {
        "x": 606.9453430175781,
        "y": 221.32638263702393
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
        "x": 1000.8036499023438,
        "y": 222.79324340820312
      }
    },
    {
      "type": "lr",
      "label": "Legacy router",
      "params": {
        "targetFps": 45
      },
      "layout": {
        "x": 1999.1107177734375,
        "y": 144.35671997070312
      }
    },
    {
      "type": "tde",
      "label": "TD energy 2",
      "layout": {
        "x": 243.23904418945312,
        "y": -345.759033203125
      }
    },
    {
      "type": "mh",
      "label": "Max hold",
      "params": {
        "sustain": "1500",
        "decay": "0",
        "attack": 0
      },
      "layout": {
        "x": 422.27142333984375,
        "y": -351.44688415527344
      }
    },
    {
      "type": "linScale",
      "label": "Linear scale",
      "params": {
        "scaleA": "2000",
        "scaleB": 0,
        "clip": 1
      },
      "layout": {
        "x": 596.9188232421875,
        "y": -342.70420837402344
      }
    },
    {
      "type": "mh",
      "label": "Max hold 2",
      "params": {
        "sustain": "500",
        "decay": "1000",
        "attack": "100"
      },
      "layout": {
        "x": 796.1712036132812,
        "y": -345.4080505371094
      }
    },
    {
      "type": "fixedEffect",
      "label": "Fixed effect",
      "params": {
        "channels": "24",
        "dt": "5",
        "mode": "1",
        "value1": "0.4",
        "value2": "0.6",
        "dotsize": "5"
      },
      "layout": {
        "x": 753.4276733398438,
        "y": -192.91639709472656
      }
    },
    {
      "type": "fixedEffect",
      "label": "Fixed effect 2",
      "params": {
        "channels": "35",
        "dt": "1",
        "mode": "0",
        "value1": "1.0",
        "value2": 1,
        "dotsize": 3
      },
      "layout": {
        "x": 786.8076782226562,
        "y": 16.21190071105957
      }
    },
    {
      "type": "linCombine",
      "label": "Linear combine",
      "params": {},
      "layout": {
        "x": 1512.2979736328125,
        "y": -179.38784790039062
      }
    },
    {
      "type": "linCombine",
      "label": "Linear combine 3",
      "params": {},
      "layout": {
        "x": 1149.572265625,
        "y": -20.429317712783813
      }
    },
    {
      "type": "channelRemap",
      "label": "Channel remap",
      "params": {
        "mode": "2"
      },
      "layout": {
        "x": 1227.5322265625,
        "y": 149.5429229736328
      }
    },
    {
      "type": "mh",
      "label": "Max hold 3",
      "params": {
        "sustain": "50",
        "decay": 150,
        "attack": 0
      },
      "layout": {
        "x": 801.9132080078125,
        "y": 223.26882934570312
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
      "n1index": 16,
      "n2index": 8,
      "p1": "out",
      "p2": "lm35"
    },
    {
      "n1index": 15,
      "n2index": 8,
      "p1": "out",
      "p2": "lb24"
    },
    {
      "n1index": 1,
      "n2index": 9,
      "p1": "tdo",
      "p2": "tdi"
    },
    {
      "n1index": 10,
      "n2index": 11,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 9,
      "n2index": 10,
      "p1": "eo",
      "p2": "in"
    },
    {
      "n1index": 11,
      "n2index": 12,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 12,
      "n2index": 15,
      "p1": "out",
      "p2": "a"
    },
    {
      "n1index": 12,
      "n2index": 16,
      "p1": "out",
      "p2": "a"
    },
    {
      "n1index": 13,
      "n2index": 15,
      "p1": "out",
      "p2": "in0"
    },
    {
      "n1index": 14,
      "n2index": 16,
      "p1": "out",
      "p2": "in0"
    },
    {
      "n1index": 17,
      "n2index": 15,
      "p1": "out",
      "p2": "in1"
    },
    {
      "n1index": 5,
      "n2index": 16,
      "p1": "out",
      "p2": "in1"
    },
    {
      "n1index": 7,
      "n2index": 17,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 18,
      "n2index": 7,
      "p1": "out",
      "p2": "ein"
    },
    {
      "n1index": 4,
      "n2index": 18,
      "p1": "eo",
      "p2": "in"
    }
  ]
};

export const simpleVuWithNoiseGate = {
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
        "fftSize": "512",
        "targetFps": "25"
      },
      "layout": {
        "x": 53.137062072753906,
        "y": -344.8576965332031
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
        "x": 1054.624267578125,
        "y": 367.520751953125
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
        "x": 1595.9349365234375,
        "y": 123.90576171875
      }
    },
    {
      "type": "tde",
      "label": "TD energy 2",
      "layout": {
        "x": 243.23904418945312,
        "y": -345.759033203125
      }
    },
    {
      "type": "mh",
      "label": "Max hold",
      "params": {
        "sustain": "1500",
        "decay": "0",
        "attack": 0
      },
      "layout": {
        "x": 422.27142333984375,
        "y": -351.44688415527344
      }
    },
    {
      "type": "linScale",
      "label": "Linear scale",
      "params": {
        "scaleA": "2000",
        "scaleB": 0,
        "clip": 1
      },
      "layout": {
        "x": 596.9188232421875,
        "y": -342.70420837402344
      }
    },
    {
      "type": "mh",
      "label": "Max hold 2",
      "params": {
        "sustain": "500",
        "decay": "1000",
        "attack": "100"
      },
      "layout": {
        "x": 796.1712036132812,
        "y": -345.4080505371094
      }
    },
    {
      "type": "fixedEffect",
      "label": "Fixed effect",
      "params": {
        "channels": "24",
        "dt": 1,
        "mode": "1",
        "value1": "0.4",
        "value2": "0.6",
        "dotsize": "5"
      },
      "layout": {
        "x": 837.010009765625,
        "y": -169.6229476928711
      }
    },
    {
      "type": "fixedEffect",
      "label": "Fixed effect 2",
      "params": {
        "channels": "35",
        "dt": 1,
        "mode": "0",
        "value1": "1.0",
        "value2": 1,
        "dotsize": 3
      },
      "layout": {
        "x": 844.4797973632812,
        "y": 22.480562210083008
      }
    },
    {
      "type": "linCombine",
      "label": "Linear combine",
      "params": {},
      "layout": {
        "x": 1142.7435302734375,
        "y": -215.2594223022461
      }
    },
    {
      "type": "linCombine",
      "label": "Linear combine 3",
      "params": {},
      "layout": {
        "x": 1149.572265625,
        "y": -20.429317712783813
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
      "n1index": 16,
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
      "n1index": 15,
      "n2index": 8,
      "p1": "out",
      "p2": "lb24"
    },
    {
      "n1index": 1,
      "n2index": 9,
      "p1": "tdo",
      "p2": "tdi"
    },
    {
      "n1index": 10,
      "n2index": 11,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 9,
      "n2index": 10,
      "p1": "eo",
      "p2": "in"
    },
    {
      "n1index": 11,
      "n2index": 12,
      "p1": "out",
      "p2": "in"
    },
    {
      "n1index": 12,
      "n2index": 15,
      "p1": "out",
      "p2": "a"
    },
    {
      "n1index": 12,
      "n2index": 16,
      "p1": "out",
      "p2": "a"
    },
    {
      "n1index": 13,
      "n2index": 15,
      "p1": "out",
      "p2": "in0"
    },
    {
      "n1index": 14,
      "n2index": 16,
      "p1": "out",
      "p2": "in0"
    },
    {
      "n1index": 7,
      "n2index": 15,
      "p1": "out",
      "p2": "in1"
    },
    {
      "n1index": 5,
      "n2index": 16,
      "p1": "out",
      "p2": "in1"
    }
  ]
};

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
