"use strict";

const { networkInterfaces } = require('os');
const net = require('net');
const nets = networkInterfaces();
const port = 12345;

// console.log(JSON.stringify(nets, null, 4));

console.log("# TCP server / packet dump")
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

var start = Date.now();
var last = start;

console.log("#");
console.log("# Start listening on port 12345");
// see https://nodejs.org/api/net.html#netcreateserveroptions-connectionlistener
var server = net.createServer({ noDelay : true}, function(socket) {
  start = Date.now();
  last = start;

  console.log("# connected");
  console.log();

  socket.on("data", d => {
    const now = Date.now();
    console.log("# dt " + (now - start));
    console.log("# since last " + (now - last));
    console.log("" + d);
    last = now;
  });

  socket.on("close", () => {
    console.log("# closed, continue listening");
  });
});

server.listen(port, () => {
  console.log('# TCP server bound on port ' + port + '. Waiting for connection.');
});