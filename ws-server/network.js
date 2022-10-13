"use strict";

const { networkInterfaces } = require('os');

function getLocalIPv4Interfaces() {
  const ret = [];
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
      const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
      if (net.family === familyV4Value && !net.internal) {
        ret.push({
          name: name,
          address: net.address
        })
      }
    }
  }
  return ret;
}

function restApiListeningAddresses(protocol, port) {
  const ret =  getLocalIPv4Interfaces();
  for (const i of ret) {
    i.url = protocol + '://' + i.address + ':' + port + '/index.html';
  }
  return ret;
}

module.exports.getLocalIPv4Interfaces = getLocalIPv4Interfaces;
module.exports.restApiListeningAddresses = restApiListeningAddresses;
