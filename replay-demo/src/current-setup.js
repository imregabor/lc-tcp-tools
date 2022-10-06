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

export const linear24 = {
  description : '24 x 100W linear light bar',
  dimensions : { cols : 24, rows : 1 },
  toWire : function(x, y, v) {
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
  },
  mapPacket : function(packet, setValue) {
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
};

export const matrix35 = {
  description : '7 x 5 x 60W overhead light matrix',
  dimensions : { cols : 7, rows : 5 },
  toWire : function(x, y, v) {
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
  },
  mapPacket : function(packet, setValue) {

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
};

