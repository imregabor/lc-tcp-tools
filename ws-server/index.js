"use strict";


const  ws = require('ws');
const { networkInterfaces } = require('os');
const net = require('net');
const express = require('express');
const openFwdConn = require('./tcp-forwarding-connection.js');



const nets = networkInterfaces();
const port = 12345;


const fwdHost = "192.168.10.101";
//const fwdHost = "localhost";
// const host = "192.168.10.101";
const fwdPort = 23;

const app = express();

const expressPort = 3000


const fwdConn = openFwdConn({
  host : fwdHost,
  port : fwdPort
});


app.get('/', (req, res) => {
  res.send('Hello World!')
});

app.get('/api/status', (req, res) => {
  res.json({
    fwdConnStatus : fwdConn.getStatus()
  });
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


    res.status(200).send();
  }
});

app.listen(expressPort, () => {
  console.log('xpress server listening on port ' + expressPort);
})



const wss = new ws.Server({ port: 8080 });

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





console.log("#");
console.log("# Start TCP listening on port " + port);
// see https://nodejs.org/api/net.html#netcreateserveroptions-connectionlistener
var server = net.createServer({ noDelay : true}, function(socket) {
  const socketDescription = "TCP effects connection from " + socket.remoteAddress + ":" + socket.remotePort;

  console.log("# connection - " + socketDescription);

  socket.on("data", d => {
  	// console.log(d.toString());
  	if (sock) {
      // Send on WebSocket
  		sock.send(d.toString());
  	}

    fwdConn.write(d.toString());
  });

  socket.on("close", () => {
    console.log("# close - " + socketDescription + ", continue listening");
  });

  socket.on("error", () => {
    console.log("# error - " + socketDescription + ", continue listening")
  });
});

server.listen(port, () => {
  console.log('# TCP server bound on port ' + port + '. Waiting for connection.');
});




