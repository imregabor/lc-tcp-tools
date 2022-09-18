"use strict";


const  ws = require('ws');
const { networkInterfaces } = require('os');
const net = require('net');

const nets = networkInterfaces();
const port = 12345;


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
console.log("# Start listening on port 12345");
// see https://nodejs.org/api/net.html#netcreateserveroptions-connectionlistener
var server = net.createServer({ noDelay : true}, function(socket) {

  console.log("# connected");

  socket.on("data", d => {
  	// console.log(d.toString());
  	if (sock) {
  		sock.send(d.toString());
  	}
  });

  socket.on("close", () => {
    console.log("# closed, continue listening");
  });
});

server.listen(port, () => {
  console.log('# TCP server bound on port ' + port + '. Waiting for connection.');
});




