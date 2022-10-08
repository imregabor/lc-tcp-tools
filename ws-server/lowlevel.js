"use strict";

/**
 * Low level utilities for hardware handling.
 */


function parse(value) {
  if (value.startsWith('0x')) {
    return parseInt(value.substring(2), 16);
  } else {
    return parseInt(value);
  }
}


function singlePacketToMessage(b, a, d) {
  const bus = parse(b);
  const address = parse(a);
  const data = parse(d);


  var err;
  if (! (bus >= 0 && bus <= 7)) {
    err = 'Invalid bus: ' + bus;
  }
  if (! (address >= 0 && address <= 127)) {
    err = (err ? err + ' / ' : '') + 'Invalid address: ' + address;
  }
  if (! (data >= 0 && data <= 255)) {
    err = (err ? err + ' / ' : '') + 'Invalid data: ' + data;
  }

  if (err) {
    throw err;
  } else {

    var msg = 'S';

    for (var i = 0; i < bus; i++) {
      msg += '0000';
    }
    var as = address.toString(16);
    if (as.length < 2) {
      msg += '0';
    }
    msg += as;

    var dt = data.toString(16);
    if (dt.length < 2) {
      msg += '0';
    }
    msg += dt;

    for (var i = bus; i < 7; i++) {
      msg += '0000';
    }
    msg += '\n';

    return msg;
  }
}

function singleDataToAllBusesAndAddresses(d) {
  const data = parse(d);


  if (! (data >= 0 && data <= 255)) {
    throw 'Invalid data: ' + data;
  }

  var ds = data.toString(16);
  if (ds.length < 2) {
    ds = '0' + ds;
  }

  var ret = '';
  for (var address = 0; address < 128; address++) {
    var as = address.toString(16);
    if (as.length < 2) {
      as = '0' + as;
    }

    var msg = 'S';
    for (var i = 0; i < 8; i++) {
      msg += as;
      msg += ds;
    }

    ret = ret + msg + '\n';
  }
  return ret;
}

module.exports.singlePacketToMessage = singlePacketToMessage;
module.exports.singleDataToAllBusesAndAddresses = singleDataToAllBusesAndAddresses;
