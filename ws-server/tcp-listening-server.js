"use strict";

const net = require('net');

function open(opts) {
  const log = opts.log ? opts.log : console.log;
  const port = opts.port;
  var onData = opts.onData;
  var onStatusChange = opts.onStatusChange;
  var connectionCount = 0;

  const activeConnections = {};

  function notifyStatusChange() {
    if (onStatusChange) {
      onStatusChange();
    }
  }

  log("Start TCP listening on port " + port);
  // see https://nodejs.org/api/net.html#netcreateserveroptions-connectionlistener

  var server = net.createServer({ noDelay : true}, socket => {
    const socketDescription = "TCP effects connection from " + socket.remoteAddress + ":" + socket.remotePort;
    const connectionId = connectionCount;
    activeConnections[connectionId] = {
      socket : socket,
      connectedTime : Date.now()
    };

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
      notifyStatusChange();
    });

    socket.on("error", () => {
      log('error (' + connectionId + ') - ' + socketDescription + ', continue listening')
      delete activeConnections[connectionId];
      notifyStatusChange();
    });

    notifyStatusChange();
  });

  // see https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback
  server.listen(port, '0.0.0.0', () => {
    log('TCP server bound on port ' + port + '. Waiting for connection.');
    notifyStatusChange();
  });

  const ret = {
    onData: f => {
      if (onData) {
        throw 'onData callback is already set.';
      }
      onData = f;
    },
    onStatusChange: f => {
      if (onStatusChange) {
        throw 'onStatusChange callback is already set.';
      }
      onStatusChange = f;
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
        const c = activeConnections[ci].socket;
        const u = Date.now() - activeConnections[ci].connectedTime;
        status.activeConnectionCount++;
        status.activeConnections.push({
          bytesRead : c.bytesRead,
          bytesWritten : c.bytesWritten,
          remote : c.remoteAddress + ':' + c.remotePort +' (' + c.remoteFamily + ')',
          readyState : c.readyState,
          uptime : u
        });
      }
      return status;
    }
  };
  return ret;
}

module.exports = open;
