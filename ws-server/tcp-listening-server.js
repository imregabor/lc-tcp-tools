"use strict";

const net = require('net');

function open(opts) {
  const log = opts.log ? opts.log : console.log;
  const port = opts.port;
  var onData = opts.onData;
  var connectionCount = 0;

  const activeConnections = {};

  log("Start TCP listening on port " + port);
  // see https://nodejs.org/api/net.html#netcreateserveroptions-connectionlistener

  var server = net.createServer({ noDelay : true}, socket => {
    const socketDescription = "TCP effects connection from " + socket.remoteAddress + ":" + socket.remotePort;
    const connectionId = connectionCount;
    activeConnections[connectionId] = socket;

    connectionCount++;


    log('connection (' + connectionId + ') ' + socketDescription);

    socket.on('data', d => {
      if (onData) {
        onData(d);
      }
    });

    socket.on('close', () => {
      log('close (' + connectionId + ') - ' + socketDescription + ', continue listening');
      delete activeConnections[connectionId];
    });

    socket.on("error", () => {
      log('error (' + connectionId + ') - ' + socketDescription + ', continue listening')
      delete activeConnections[connectionId];
    });
  });

  // see https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback
  server.listen(port, '0.0.0.0', () => {
    log('TCP server bound on port ' + port + '. Waiting for connection.');
  });

  const ret = {
    onData: f => {
        if (onData) {
            throw 'onData callback is already set.';
        }
        onData = f;
    },
    getStatus: () => {
      const serverAddress = server.address();
      const status = {
        connectionCount : connectionCount,
        serverListening : server.listening,
        serverAddress : serverAddress.address + ":" + serverAddress.port + " (" + serverAddress.family + ")",
        serverMaxConnections : server.maxConnections,
        activeConnectionCount : 0,
        activeConnections : []
      };
      for (const ci in activeConnections) {
        if (!activeConnections.hasOwnProperty(ci)) {
          continue;
        }
        const c = activeConnections[ci];

        status.activeConnectionCount++;
        status.activeConnections.push({
          bytesRead : c.bytesRead,
          bytesWritten : c.bytesWritten,
          remote : c.remoteAddress + ':' + c.remotePort +' (' + c.remoteFamily + ')',
          readyState : c.readyState
        });
      }
      return status;
    }
  };
  return ret;
}

module.exports = open;
