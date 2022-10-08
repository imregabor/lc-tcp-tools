"use strict";

const fs = require('fs');
const process = require('process');
const readline = require('readline');
const net = require('net');

const host = '127.0.0.1';
// const host = '192.168.10.101';
const port = 12345;
// const port = 23;

var rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

const buff = [];
var stdinClosed = false;

rl.on('line', function(line){
    buff.push(line);
})

rl.on('close', () => {
	console.log('stdin closed');
	stdinClosed = true;
});


const start = Date.now();
console.log('Connecting to ' + host + ' on port ' + port);
var client = net.Socket().connect({ port: port, host : host, family : 4, noDelay : true}, () => {
	console.log('Connected to router');
});


var nextTime = start;

function poll() {
	const now = Date.now();
	if (now < nextTime) {
		setTimeout(poll, nextTime - now);
		return;
	}

	var nextDt;

	while (buff.length > 0) {
		var s = buff.shift();	
		

		if (s.length == 0) {
			continue;
		} else if (s.startsWith('# dt ')) {
			var expectedDt = +s.substring(5);
			var actualDt = Date.now() - start;
            if (expectedDt > actualDt) {
            	nextDt = expectedDt - actualDt;
            	break;
            } else {
            	continue;
            }
		} else if (s.startsWith('S')) {
			client.write(s + '\n');

		}
	}

	if (buff.length > 0 || !stdinClosed) {
		// console.log(nextDt)
		setTimeout(poll, nextDt);
	}
}


setTimeout(poll);
