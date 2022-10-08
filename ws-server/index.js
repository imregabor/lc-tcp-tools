"use strict";


const ws = require('ws');
const express = require('express');
const openFwdConn = require('./tcp-forwarding-connection.js');
const openListeningSrv = require('./tcp-listening-server.js');
const lowLevel = require('./lowlevel.js');
const net = require('net');
const network = require('./network.js');

const listeningPort = 12345;


const fwdHost = '192.168.10.101';
// const fwdHost = 'localhost';
// const host = '192.168.10.101';
const fwdPort = 23;

const app = express();

const expressPort = 3000

const starttime = Date.now();


const fwdConn = openFwdConn({
  host : fwdHost,
  port : fwdPort,
  log : m => console.log('[FWD conn]', m)
});

const listeningSrv = openListeningSrv({
  port : listeningPort,
  log : m => console.log('[LST srv]', m)
});


app.use(express.static('../replay-demo/dist'));


app.get('/api/status', (req, res) => {
  res.json({
    uptime : Date.now() - starttime,
    fwdConnStatus : fwdConn.getStatus(),
    listeningSrvStatus : listeningSrv.getStatus()
  });
});

app.post('/api/sendToAll', (req, res) => {
  try {
    console.log('sendToAll ' + req.query.data);
    const messages = lowLevel.singleDataToAllBusesAndAddresses(req.query.data);
    fwdConn.write(messages);
    if (sock) {
      // Send on WebSocket
      sock.send(messages);
    }
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }
});

app.post('/api/sendPacket', (req, res) => {
  try {
    const message = lowLevel.singlePacketToMessage(
      req.query.bus,
      req.query.address,
      req.query.data
    );

    console.log('sendPacket ' + message);

    fwdConn.write(message);
    if (sock) {
      // Send on WebSocket
      sock.send(message);
    }
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }
});




// const wss = new ws.Server({ port: 8080 });
// see https://masteringjs.io/tutorials/express/websockets
const wss = new ws.Server({ noServer: true });

var sock;

console.log('# TCP server / web socket server')
console.log('#')
console.log('# My IP address(es):');
for(const a of network.getLocalIPv4Interfaces()) {
  console.log('# ' + a.name + ': ' + a.address);
}


wss.on('connection', function connection(ws, req) {
  console.log('WebSocket connection from ' +  req.socket.remoteAddress);

  ws.on('message', function message(data) {
    console.log('received: %s', data);
  });

  sock = ws;
  ws.send('something');
});


// see https://masteringjs.io/tutorials/express/websockets
const expressServer = app.listen(expressPort, () => {
  console.log('xpress server listening on port ' + expressPort);
})
expressServer.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, socket => {
    wss.emit('connection', socket, request);
  });
});


listeningSrv.onData(d => {
  // console.log(d.toString());
  if (sock) {
    // Send on WebSocket
    sock.send(d.toString());
  }

  fwdConn.write(d.toString());
});

listeningSrv.onStatusChange(() => { if (sock) { sock.send('# status change\n');}});
fwdConn.onStatusChange(() => { if (sock) { sock.send('# status change\n');}});




