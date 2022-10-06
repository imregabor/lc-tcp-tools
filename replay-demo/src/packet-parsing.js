"use strict";

/**
 * Parse a packet string to address/data pairs.
 */
export default function(s) {
  if (!s.startsWith('S')) {
    console.log('Invalid frame ' + s);
    return
  }
  var ret = {
    a: [],
    d: []
  };

  var i = 1;
  while (i < s.length - 3) {
    ret.a.push(parseInt(s.substring(i + 0, i + 2), 16));
    ret.d.push(parseInt(s.substring(i + 2, i + 4), 16));
    i+= 4;
  }

  return ret;
}
