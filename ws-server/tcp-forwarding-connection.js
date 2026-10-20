"use strict";

const net = require('net');
const dgram = require('node:dgram');


function open(opts) {
  const log = opts.log ? opts.log : console.log;
  const host = opts.host;
  const port = opts.port;
  const datagramPort = opts.datagramPort;
  const retryTimeout = opts.retryTimeout ? opts.retryTimeout : 1;
  var onStatusChange = opts.onStatusChange;
  const conns = host + ':' + port;
  var connectionAttempts = 0;

  var datagramSocket;
  if (datagramPort) {
    const s = dgram.createSocket('udp4');
    s.connect(datagramPort, host, () => {
      // TODO: how to handle error?
      log('Datagram (UDP) connect to ' + JSON.stringify(s.remoteAddress()));
      datagramSocket = s;
    });

  } else {
    datagramSocket = null;
  }

  log(`FWD connecting to ${conns} with retyTimeout of ${retryTimeout} s`);
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
      log('End FWD connection to ' + conns);
      connected = false;
      if (!retrying) {
        retrying = true;
        log(`  Retry FWD conenction in ${retryTimeout} s`);
        setTimeout(tryConnect, 1000 * retryTimeout);
        notifyStatusChange();
      }
    });
    fwdClient.on('error', () => {
      log('ERROR FWD connection to ' + conns);
      connected = false;
      if (!retrying) {
        retrying = true;
        log(`  Retry FWD conenction in ${retryTimeout} s`);
        setTimeout(tryConnect, 1000 * retryTimeout);
        notifyStatusChange();
      }
    });
    fwdClient.on('data', d => {
      log('DATA from FWD connection (dropped): ' + d.toString());
    });
  }
  tryConnect();


  function keepAliveConn() {
    if (connected) {
      fwdClient.write('#\n');
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
        local: fwdClient.localAddress + ':' + fwdClient.localPort + ' (' + fwdClient.localFamily + ')'
      };
    },
    isConnected: () => connected,
    write : data => {
      if (connected) {
        fwdClient.write(data);
      }
    },
    writeDatagram : data => {
      if (!datagramSocket) {
        // fallback to TCP
        ret.write(data);
      } else if (connected) {
        // send through UDP
        datagramSocket.send(data);
        // log('Sending:\n' + data);
      }
    }
  };
  return ret;
}

module.exports = open;
