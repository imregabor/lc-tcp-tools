"use strict";


const  ws = require('ws');
const { networkInterfaces } = require('os');
const net = require('net');
const express = require('express');
const openFwdConn = require('./tcp-forwarding-connection.js');
const openListeningSrv = require('./tcp-listening-server.js');


const nets = networkInterfaces();
const listeningPort = 12345;


const fwdHost = "192.168.10.101";
//const fwdHost = "localhost";
// const host = "192.168.10.101";
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
  const data = +req.query.data;
  console.log('sendToAll ' + data);

  var err;
    if (! (data >= 0 && data <= 255)) {
    err = (err ? err + " / " : "") + "Invalid data: " + data;
  }

  if (err) {
    res.status(400).send(err);
  } else {
    var ds = data.toString(16);
    if (ds.length < 2) {
      ds = '0' + ds;
    }

    var messages = '';
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

      messages = messages + msg + '\n';

      //fwdConn.write(msg + '\n');
      //if (sock) {
      //  // Send on WebSocket
      //  sock.send(msg + '\n');
      //}
    }

    fwdConn.write(messages);
    if (sock) {
      // Send on WebSocket
      sock.send(messages);
    }
    res.status(200).send();
  }
});

app.post('/api/sendPacket', (req, res) => {
  const bus = +req.query.bus;
  const address = +req.query.address;
  const data = +req.query.data;

  console.log('sendPacket ' + bus + ':' + address + ' ' + data);

  var err;
  if (! (bus >= 0 && bus <= 7)) {
    err = "Invalid bus: " + bus;
  } 
  if (! (address >= 0 && address <= 127)) {
    err = (err ? err + " / " : "") + "Invalid address: " + address;
  }
  if (! (data >= 0 && data <= 255)) {
    err = (err ? err + " / " : "") + "Invalid data: " + data; 
  }

  if (err) {
    res.status(400).send(err);
  } else {

    var msg = "S";

    for (var i = 0; i < bus; i++) {
      msg += "0000";
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
      msg += "0000";
    }

    console.log('Sending ' + msg)

    fwdConn.write(msg + '\n');
    if (sock) {
      // Send on WebSocket
      sock.send(msg + '\n');
    }


    res.status(200).send();
  }
});




// const wss = new ws.Server({ port: 8080 });
// see https://masteringjs.io/tutorials/express/websockets
const wss = new ws.Server({ noServer: true });

var sock;


console.log("# TCP server / web socket server")
console.log("#")
console.log("# My IP address(es):");

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
        const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
        if (net.family === familyV4Value && !net.internal) {
            console.log("#   ", name, ": ", net.address);
        }
    }
}



wss.on('connection', function connection(ws, req) {
  console.log("WebSocket connection from " +  req.socket.remoteAddress);

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




