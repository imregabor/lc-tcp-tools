"use strict";


function wireValueToIntensity(wireValue) {
  var ret = 1.0 - (wireValue - 2) / 118;
  if (ret < 0.0) {
    ret = 0.0;
  } else if (ret > 1.0) {
    ret = 1.0;
  }
  return ret;
}

function intensityToWireValue(intensity) {
  if (intensity < 0) {
    return 2;
  } else if (intensity > 1) {
    return 118;
  } else {
    return Math.round(120 - 118 * intensity);
  }
}

/**
 * state: array of intensity values
 * packets: array of packets to send on each buses (sequence of 8 x [address, data])
 */
function stateToPackets24(state, packets) {
  for (var i = 0; i < 8; i++) {
    const a4 = 0x20 + i;
    const a7 = 0x28 + i;
    const a6 = 0x28 + i;
    const d4 = intensityToWireValue(state[i]);
    const d7 = intensityToWireValue(state[8 + i]);
    const d6 = intensityToWireValue(state[16 + i]);

    packets[i * 16 + 4 * 2    ] = a4;
    packets[i * 16 + 4 * 2 + 1] = d4;
    packets[i * 16 + 7 * 2    ] = a7;
    packets[i * 16 + 7 * 2 + 1] = d7;
    packets[i * 16 + 6 * 2    ] = a6;
    packets[i * 16 + 6 * 2 + 1] = d6;
  }
}

function stateToPackets35(state, packets) {
  for (var i = 0; i < 10; i++) {

    var a0, d0, a1, d1, a2, d2, a3, d3;
    if (i < 5) {
      const y = i;
      a0 = 0x30 + y;
      d0 = intensityToWireValue(state[y * 7 + 6]);

      a1 = 0x39 - y;
      d1 = intensityToWireValue(state[y * 7 + 5]);

      a2 = 0x3f + y;
      d2 = intensityToWireValue(state[y * 7 + 3]);

      a3 = 0x49 + y;
      d3 = intensityToWireValue(state[y * 7 + 1]);
    } else {
      const y = i - 5;
      a0 = 0;
      d0 = 0;

      a1 = 0x3a + y;
      d1 = intensityToWireValue(state[y * 7 + 4]);

      a2 = 0x44 + y;
      d2 = intensityToWireValue(state[y * 7 + 2]);

      a3 = 0x4e + y;
      d3 = intensityToWireValue(state[y * 7 + 0]);
    }

    packets[i * 16 + 0 * 2    ] = a0;
    packets[i * 16 + 0 * 2 + 1] = d0;
    packets[i * 16 + 1 * 2    ] = a1;
    packets[i * 16 + 1 * 2 + 1] = d1;
    packets[i * 16 + 2 * 2    ] = a2;
    packets[i * 16 + 2 * 2 + 1] = d2;
    packets[i * 16 + 3 * 2    ] = a3;
    packets[i * 16 + 3 * 2 + 1] = d3;
  }
}

function createMatrix(opts) {
  const rows = opts.dimensions.rows;
  const cols = opts.dimensions.cols;
  const size = rows * cols;
  const state = Array(rows * cols).fill(0);

  const ret = {
    setSingleCoord : (x, y, v) => {
      if (!((x >= 0) && (x < cols) && (y >= 0) && (y < rows))) {
        return;
      }
      if (!(v >= 0)) {
        v = 0;
      } else if (v > 1) {
        v = 1;
      }
      state[x + y * cols] = v;
    },
    setSingle : (pos, v) => {
      if (! (pos >= 0 && pos < size)) {
        return;
      }
      if (!(v >= 0)) {
        v = 0;
      } else if (v > 1) {
        v = 1;
      }
      state[pos] = v;
    },
    setBulk : (v) => {
      for (var i = 0; i < v.length && i < size; i++) {
        ret.setSingle(i, v[i]);
      }
    },
    getState : () => state,
    getDimensions : () => { return { size : size, cols : cols, rows : rows}; }
  };
  return ret;
}

const m1 = createMatrix({
  dimensions : {
    cols : 24,
    rows : 1
  }
});

const m2 = createMatrix({
  dimensions : {
    cols : 7,
    rows : 5
  }
});

function toMessage() {
  const packets = Array(10 * 16).fill(0);
  stateToPackets24(m1.getState(), packets);
  stateToPackets35(m2.getState(), packets);
  var msg = "";
  for (var m = 0; m < 10; m++) {
    msg = msg + 'S';
    for (var b = 0; b < 16; b++) {
      var v = packets[m * 16 + b].toString(16);
      if (v.length == 1) {
        msg = msg + '0' + v;
      } else {
        msg = msg + v;
      }
    }
    msg = msg + '\n';
  }
  return msg;
}

module.exports.toMessage = toMessage;
module.exports.modules = {
  m1 : m1,
  m2 : m2
};
module.exports.meta = {
  m1 : {
    description : '24 x 100W linear light bar',
    connection : 'On bus 4 (0x20-0x27), 7 (0x28-0x2f), 6 (0x28-0x2f)',
    dimensions : { cols : 24, rows : 1 },
    packets : 8

  },
  m2 : {
    description : '7 x 5 x 60W overhead light matrix',
    connection : 'On bus 0 (1S 0x30-0x34), 1 (2S 0x39-0x35/0x3a-0x3e), 2 (2S 0xf-0x43/0x44-0x48), 3 (2S 0x49-0x4d/0x4e-0x52)',
    dimensions : { cols : 7, rows : 5 },
    packets : 10
  }
};



