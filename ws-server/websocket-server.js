"use strict";

const ws = require('ws');

function open(opts) {
  const log = opts.log ? opts.log : console.log;
  const messageOnNewConnection = opts.messageOnNewConnection;

  // const wss = new ws.Server({ port: 8080 });
  // see https://masteringjs.io/tutorials/express/websockets
  const wss = new ws.Server({ noServer: true });

  var broadcastMessageCount = 0;
  var connectionCount = 0;
  var activeConnections = {};

  // see https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections


  wss.on('connection', function connection(ws, req) {
    const connectionId = connectionCount;
    connectionCount++;

    log('WebSocket connection [' + connectionId + '] from ' +  req.socket.remoteAddress);
    activeConnections[connectionId] = {
      socket : ws,
      connectedTime : Date.now(),
      alive : true,
      messageCount : 0
    };

    ws.on('message', data => {
      log('[' + connectionId + '] received: %s', data);
    });

    ws.on('close', () => {
      log('[' + connectionId + '] close');
      delete activeConnections[connectionId];
    });

    if (messageOnNewConnection) {
      ws.send(messageOnNewConnection());
    }
  });


  const ret = {
    addToExpressServer : expressServer => {
      expressServer.on('upgrade', (request, socket, head) => {
        wss.handleUpgrade(request, socket, head, socket => {
          wss.emit('connection', socket, request);
        });
      });
    },
    getStatus : () => {
      const status = {
        broadcastMessageCount : broadcastMessageCount,
        connectionCount : connectionCount,
        activeConnectionCount : 0,
        activeConnections : []
      };
      for (const ci in activeConnections) {
        if (!activeConnections.hasOwnProperty(ci)) {
          continue;
        }
        const ws = activeConnections[ci].socket;
        const uptime = Date.now() - activeConnections[ci].connectedTime;
        status.activeConnectionCount++;
        status.activeConnections.push({
          messageCount : activeConnections[ci].messageCount,
          readyState : ws.readyState,
          uptime : uptime
        });
      }
      return status;
    },
    broadcast : message => {
      broadcastMessageCount++;
      for (const ci in activeConnections) {
        if (!activeConnections.hasOwnProperty(ci)) {
          continue;
        }
        activeConnections[ci].messageCount++;
        activeConnections[ci].socket.send(message);
      }
    },
    broadcastJson : json => {
      const message = JSON.stringify(json);
      ret.broadcast(message);
    }
  };
  return ret;
}

module.exports = open;
