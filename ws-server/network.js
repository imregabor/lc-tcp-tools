"use strict";

const { networkInterfaces } = require('os');
const http = require('http');
const chalk = require('chalk');

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

function pingUrl(url, desc) {
  var answ;
  const options = {
    method: 'HEAD',
    timeout: 1000
  };
  const req = http.request(url, options, resp => {
    answ = true;
    console.log(`${desc} ${url} responded, headers:`);
    console.log('  ' + JSON.stringify(resp.headers));
    console.log();
  });
  req.on('error', (err) => {
    answ = true;
    const msg = `${desc} ${url} check failed: ${err.message}`;
    console.log(chalk.red(msg));
    console.log();
  });
  req.end();
  setTimeout(() => {
    if (answ) {
      return;
    }
    const msg = `${desc} ${url} did not respond in 1s`;
    console.log(chalk.red(msg));
    console.log();
  }, 1000);
}

module.exports.getLocalIPv4Interfaces = getLocalIPv4Interfaces;
module.exports.restApiListeningAddresses = restApiListeningAddresses;
module.exports.pingUrl = pingUrl;
