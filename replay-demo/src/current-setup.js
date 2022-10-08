"use strict";

function instensityToWireValue(intensity) {
  var ret = Math.round(120 - 118 * intensity);
  if (ret < 2) { ret = 2; }
  if (ret > 120) { ret = 120; }
  return ret;
}

function wireValueToIntensity(wireValue) {
  var ret = 1.0 - (wireValue - 2) / 118;
  if (ret < 0.0) {
    ret = 0.0;
  } else if (ret > 1.0) {
    ret = 1.0;
  }
  return ret;
}

function mapPacketToLinear24(packet, setValue) {
  // Thuja side group
  if (packet.a.length > 4) {
    const a = packet.a[4];
    const d = packet.d[4];
    if (a >= 0x20 && a < 0x20 + 8) {
      const li = wireValueToIntensity(d);
      setValue(a - 0x20, 0, li);
    }
  }
  // Middle group
  if (packet.a.length > 7) {
    const a = packet.a[7];
    const d = packet.d[7];
    if (a >= 0x28 && a < 0x28 + 8) {
      const li = wireValueToIntensity(d);
      setValue(8 + a - 0x28, 0, li);
    }
  }
  // Road side group
  if (packet.a.length > 6) {
    const a = packet.a[6];
    const d = packet.d[6];
    if (a >= 0x28 && a < 0x28 + 8) {
      const li = wireValueToIntensity(d);
      setValue(16 + a - 0x28, 0, li);
    }
  }
}

function linear24ToWire(x, y, v) {
  if (x < 0 || x >= 24 || y != 0) {
    console.log('Invalid specs. x:', x, 'y:', y);
  }
  const ret = { };

  ret.value = instensityToWireValue(v);

  if (x < 8) {
    ret.bus = 4;
    ret.addr = 0x20 + x;
  } else if (x < 16) {
    ret.bus = 7;
    ret.addr = 0x28 + x - 8;
  } else {
    ret.bus = 6;
    ret.addr = 0x28 + x - 16;
  }

  return ret;
}

function mapPacketToMatrix35(packet, setValue) {
  //  mods[ 4 ] = (Effect *)  new LightMatrix( "Light Matrix on Bus B0(R0),B1(R1-2),B2(R3-4),B3(R5-6)", 7, 5 );
  // This is tricky
  // Address map:

  // ROW BUS  <5>  <4>  <3>  <2>  <1>
  //           0    1    2    3    4
  //  0   0   0x34 0x33 0x32 0x31 0x30
  //  1   1   0x35 0x36 0x37 0x38 0x39 (reversed!)
  //  2   1   0x3e 0x3d 0x3c 0x3b 0x3a
  //  3   2   0x43 0x42 0x41 0x40 0x3f
  //  4   2   0x48 0x47 0x46 0x45 0x44
  //  5   3   0x4d 0x4c 0x4b 0x4a 0x49
  //  6   3   0x52 0x51 0x50 0x4f 0x4e

  if (packet.a.length > 3) {
    const a0 = packet.a[0];
    const d0 = packet.d[0];
    const a1 = packet.a[1];
    const d1 = packet.d[1];
    const a2 = packet.a[2];
    const d2 = packet.d[2];
    const a3 = packet.a[3];
    const d3 = packet.d[3];
    const li0 = wireValueToIntensity(d0);
    const li1 = wireValueToIntensity(d1);
    const li2 = wireValueToIntensity(d2);
    const li3 = wireValueToIntensity(d3);

    if (a0 >= 0x30 && a0 <= 0x34) { setValue(6, a0 - 0x30, li0); }
    if (a1 >= 0x35 && a1 <= 0x39) { setValue(5, 0x39 - a1, li1); }
    if (a1 >= 0x3a && a1 <= 0x3e) { setValue(4, a1 - 0x3a, li1); }
    if (a2 >= 0x3f && a2 <= 0x43) { setValue(3, a2 - 0x3f, li2); }
    if (a2 >= 0x44 && a2 <= 0x48) { setValue(2, a2 - 0x44, li2); }
    if (a3 >= 0x49 && a3 <= 0x4d) { setValue(1, a3 - 0x49, li3); }
    if (a3 >= 0x4e && a3 <= 0x52) { setValue(0, a3 - 0x4e, li3); }
  }
}

function matrix35ToWire(x, y, v) {
  if (x < 0 || x >= 7 || y < 0 || y >= 5) {
    console.log('Invalid specs. x:', x, 'y:', y);
  }
  const ret = { };

  ret.value = instensityToWireValue(v);

  if (x == 6) {
    ret.bus = 0;
    ret.addr = 0x30 + y;
  } else if (x == 5) {
    ret.bus = 1;
    ret.addr = 0x39 - y;
  } else if (x == 4) {
    ret.bus = 1;
    ret.addr = 0x3a + y;
  } else if (x == 3) {
    ret.bus = 2;
    ret.addr = 0x3f + y;
  } else if (x == 2) {
    ret.bus = 2;
    ret.addr = 0x44 + y;
  } else if (x == 1) {
    ret.bus = 3;
    ret.addr = 0x49 + y;
  } else  {
    ret.bus = 3;
    ret.addr = 0x4e + y;
  }
  return ret;

}

export const linear24 = {
  description : '24 x 100W linear light bar',
  labels: {
    top: '',
    bottom: '',
    left: 'thujas',
    right: 'road'
  },
  infos: [
    { x:  0 + 0, y: 0, text: '4:20' }, // bus 4
    { x:  0 + 1, y: 0, text: '4:21' },
    { x:  0 + 2, y: 0, text: '4:22' },
    { x:  0 + 3, y: 0, text: '4:23' },
    { x:  0 + 4, y: 0, text: '4:24' },
    { x:  0 + 5, y: 0, text: '4:25' },
    { x:  0 + 6, y: 0, text: '4:26' },
    { x:  0 + 7, y: 0, text: '4:27' },
    { x:  8 + 0, y: 0, text: '7:28' }, // bus 7
    { x:  8 + 1, y: 0, text: '7:29' },
    { x:  8 + 2, y: 0, text: '7:2a' },
    { x:  8 + 3, y: 0, text: '7:2b' },
    { x:  8 + 4, y: 0, text: '7:2c' },
    { x:  8 + 5, y: 0, text: '7:2d' },
    { x:  8 + 6, y: 0, text: '7:2e' },
    { x:  8 + 7, y: 0, text: '7:2f' },
    { x: 16 + 0, y: 0, text: '6:28' }, // bus 6
    { x: 16 + 1, y: 0, text: '6:29' },
    { x: 16 + 2, y: 0, text: '6:2a' },
    { x: 16 + 3, y: 0, text: '6:2b' },
    { x: 16 + 4, y: 0, text: '6:2c' },
    { x: 16 + 5, y: 0, text: '6:2d' },
    { x: 16 + 6, y: 0, text: '6:2e' },
    { x: 16 + 7, y: 0, text: '6:2f' }
  ],
  dimensions : { cols : 24, rows : 1 },
  toWire : linear24ToWire,
  mapPacket : mapPacketToLinear24
};

export const matrix35 = {
  description : '7 x 5 x 60W overhead light matrix',
  labels: {
    top: 'garden',
    bottom: 'building',
    left: 'road',
    right: 'thujas'
  },
  infos: [
    { x: 6, y: 0, text: '0:30' }, // row 0
    { x: 6, y: 1, text: '0:31' },
    { x: 6, y: 2, text: '0:32' },
    { x: 6, y: 3, text: '0:33' },
    { x: 6, y: 4, text: '0:34' },
    { x: 5, y: 0, text: '1:39' }, // row 1
    { x: 5, y: 1, text: '1:38' },
    { x: 5, y: 2, text: '1:37' },
    { x: 5, y: 3, text: '1:36' },
    { x: 5, y: 4, text: '1:35' },
    { x: 4, y: 0, text: '1:3a' }, // row 2
    { x: 4, y: 1, text: '1:3b' },
    { x: 4, y: 2, text: '1:3c' },
    { x: 4, y: 3, text: '1:3d' },
    { x: 4, y: 4, text: '1:3e' },
    { x: 3, y: 0, text: '2:3f' }, // row 3
    { x: 3, y: 1, text: '2:40' },
    { x: 3, y: 2, text: '2:41' },
    { x: 3, y: 3, text: '2:42' },
    { x: 3, y: 4, text: '2:43' },
    { x: 2, y: 0, text: '2:44' }, // row 4
    { x: 2, y: 1, text: '2:45' },
    { x: 2, y: 2, text: '2:46' },
    { x: 2, y: 3, text: '2:47' },
    { x: 2, y: 4, text: '2:48' },
    { x: 1, y: 0, text: '3:49' }, // row 5
    { x: 1, y: 1, text: '3:4a' },
    { x: 1, y: 2, text: '3:4b' },
    { x: 1, y: 3, text: '3:4c' },
    { x: 1, y: 4, text: '3:4d' },
    { x: 0, y: 0, text: '3:4e' }, // row 6
    { x: 0, y: 1, text: '3:4f' },
    { x: 0, y: 2, text: '3:50' },
    { x: 0, y: 3, text: '3:51' },
    { x: 0, y: 4, text: '3:52' }
  ],
  dimensions : { cols : 7, rows : 5 },
  toWire : matrix35ToWire,
  mapPacket : mapPacketToMatrix35
};

