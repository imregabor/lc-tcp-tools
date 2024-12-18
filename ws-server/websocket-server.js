"use strict";

const ws = require('ws');

function open(opts) {
  const messagesOnNewConnection = opts.messagesOnNewConnection;
  const path = opts.path ? opts.path : '/';
  const logTarget = opts.log ? opts.log : console.log;
  const log = m => logTarget('@ ' + path + ': ' + m);

  // const wss = new ws.Server({ port: 8080 });
  // see https://masteringjs.io/tutorials/express/websockets
  const wss = new ws.Server({
    noServer: true,
    path : path
  });

  var broadcastMessageCount = 0;
  var connectionCount = 0;
  var activeConnections = {};

  // see https://www.npmjs.com/package/ws#how-to-detect-and-close-broken-connections


  wss.on('connection', function connection(ws, req) {
    const connectionId = connectionCount;
    connectionCount++;

    log('connection [' + connectionId + '] from ' +  req.socket.remoteAddress);
    activeConnections[connectionId] = {
      socket : ws,
      connectedTime : Date.now(),
      alive : true,
      rcvCount : 0,
      sndCount : 0
    };

    ws.on('message', data => {
      if (!opts.noLogMessages) {
        log('[' + connectionId + '] received: ' + data.toString());
      }
      activeConnections[connectionId].rcvCount++;
      if (opts.onMessage) {
        opts.onMessage(data.toString());
      }
    });

    ws.on('close', () => {
      log('[' + connectionId + '] close');
      delete activeConnections[connectionId];
    });

    if (messagesOnNewConnection) {
      const messagesToSend = messagesOnNewConnection();
      for (const m of messagesToSend) {
        // see https://stackoverflow.com/questions/4059147/check-if-a-variable-is-a-string-in-javascript
        if (typeof m === 'string' || m instanceof String) {
          ws.send(m);
        } else {
          ws.send(JSON.stringify(m));
        }
      }
    }
  });


  const ret = {
    addToExpressServer : expressApp => {
      expressApp.on('upgrade', (request, socket, head) => {
        // not sure if this is the proper way to handle multiple wd endpoints
        if (request.url !== path) {
          return;
        }
        wss.handleUpgrade(request, socket, head, socket => {
          wss.emit('connection', socket, request);
        });
      });
    },
    getStatus : () => {
      const status = {
        path : path,
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
          rcvCount : activeConnections[ci].rcvCount,
          sndount : activeConnections[ci].sndCount,
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
        activeConnections[ci].sndCount++;
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
