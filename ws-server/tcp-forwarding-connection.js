"use strict";

const net = require('net');


function open(opts) {
  const log = opts.log ? opts.log : console.log;
  const host = opts.host;
  const port = opts.port;
  var onStatusChange = opts.onStatusChange;
  const conns = host + ":" + port;
  var connectionAttempts = 0;

  log('FWD connecting to ' + conns);
  var connected = false;
  var connectedTime;;
  var fwdClient;

  function notifyStatusChange() {
    if (onStatusChange) {
      onStatusChange();
    }
  }

  // see https://nodejs.org/api/net.html#socketconnectoptions-connectlistener
  function tryConnect() {
    connectionAttempts ++;

    if (fwdClient) {
      fwdClient.destroy();
    }
    var retrying = false;
    fwdClient = net.Socket().connect({ port: port, host : host, family : 4, noDelay : true}, () => {
      log('Connected to FWD to ' + conns);
      connected = true;
      connectedTime = Date.now();
      notifyStatusChange();
    });
    fwdClient.on('end', () => {
      log("End FWD connection to " + conns);
      connected = false;
      if (!retrying) {
        retrying = true;
        log("  Retry FWD conenction in 1s");
        setTimeout(tryConnect, 1000);
        notifyStatusChange();
      }
    });
    fwdClient.on('error', () => {
      log("ERROR FWD connection to " + conns);
      connected = false;
      if (!retrying) {
        retrying = true;
        log("  Retry FWD conenction in 1s");
        setTimeout(tryConnect, 1000);
        notifyStatusChange();
      }
    });
    fwdClient.on('data', d => {
      log("DATA from FWD connection (dropped): " + d.toString());
    });
  }
  tryConnect();


  function keepAliveConn() {
    if (connected) {
      fwdClient.write("#\n");
    }
    setTimeout(keepAliveConn, 1000);
  }
  keepAliveConn();


  const ret = {
    onStatusChange: f => {
      if (onStatusChange) {
        throw 'onStatusChange callback is already set.';
      }
      onStatusChange = f;
    },
    getStatus: () => {
      return {
        connectionAttempts : connectionAttempts,
        bytesRead : fwdClient.bytesRead,
        bytesWritten : fwdClient.bytesWritten,
        remote : conns,
        connected : connected,
        uptime : connected ? Date.now() - connectedTime : 0,
        readyState : fwdClient.readyState,
        local: fwdClient.localAddress + ":" + fwdClient.localPort + " (" + fwdClient.localFamily + ")"
      };
    },
    isConnected: () => connected,
    write : data => {
      if (connected) {
        fwdClient.write(data);
      }
    }
  };
  return ret;
}

module.exports = open;
