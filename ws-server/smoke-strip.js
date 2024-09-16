'use strict';

/**
 * Smoke test of WS2812 strip gateway.
 */

const { SerialPort } = require('serialport');

SerialPort.list().then( l => {
  console.log('--------------------------------');
  console.log('Serial port list:');
  console.log();
  console.log(l);
  console.log();
  console.log('--------------------------------');
});


const port = new SerialPort({
  path: 'com6',
  baudRate: 115200,
  hupcl : false
}, f => {
  console.log('called', f);
  if (f === null) {
    console.log('Start animation');
    frame();
  }
});
console.log('Port constructed');

const n = 8;


function vToHex2(v) {
  if (v < 0) {
    v = 0;
  }
  if (v > 1) {
    v = 1;
  }
  const s = Math.round(v * 255).toString(16);
  return s.length == 1 ? '0' + s : s;
}

function frame() {
  const f = (Date.now() % 500) / 500;
  var s = '@';
  for (var i = 0; i < n; i++) {
    var r = 0.5 + 0.5 * Math.cos(2 * Math.PI * (f + i / n));
    r = r * r;
    var g = 0.5 + 0.5 * Math.cos(2 * Math.PI * (f + 1 / 3 + i / n));
    g = g * g;
    var b = 0.5 + 0.5 * Math.cos(2 * Math.PI * (f + 2 / 3 + i / n));
    b = b * b;
    s = s + vToHex2(r) + vToHex2(g) + vToHex2(b)
  }
  s = s + ';';
  port.write(s);
  setTimeout(frame, 10);
}

