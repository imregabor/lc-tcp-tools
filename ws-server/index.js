"use strict";

const express = require('express');
const openFwdConn = require('./tcp-forwarding-connection.js');
const openListeningSrv = require('./tcp-listening-server.js');
const openWsSrv = require('./websocket-server.js');
const lowLevel = require('./lowlevel.js');
const net = require('net');
const network = require('./network.js');
const qr = require('qrcode');

const starttime = Date.now();
const listeningPort = 12345;
const fwdPort = 23;
const fwdHost = '192.168.10.101';
// const fwdHost = 'localhost';
// const host = '192.168.10.101';
const expressPort = 3000



const app = express();


const fwdConn = openFwdConn({
  host : fwdHost,
  port : fwdPort,
  log : m => console.log('[FWD conn]', m)
});

const listeningSrv = openListeningSrv({
  port : listeningPort,
  log : m => console.log('[LST srv]', m)
});

const wsSrv = openWsSrv({
  log : m => console.log('[WS srv] ', m)
});


app.use(express.static('../replay-demo/dist'));

app.get('/api/restApiListeningAddresses', (req, res) => {
  const ret = network.restApiListeningAddresses('http', expressPort);
  res.json(ret);
});

app.get('/api/status', (req, res) => {
  res.json({
    uptime : Date.now() - starttime,
    fwdConnStatus : fwdConn.getStatus(),
    listeningSrvStatus : listeningSrv.getStatus(),
    wsSrvStatus : wsSrv.getStatus()
  });
});

app.post('/api/sendToAll', (req, res) => {
  try {
    console.log('sendToAll ' + req.query.data);
    const messages = lowLevel.singleDataToAllBusesAndAddresses(req.query.data);
    fwdConn.write(messages);
    wsSrv.broadcast(messages);
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

    // console.log('sendPacket ' + message);
    fwdConn.write(message);
    wsSrv.broadcast(message);
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }
});






console.log('# TCP server / web socket server')
console.log('#')
console.log('# My IP address(es):');
for(const a of network.getLocalIPv4Interfaces()) {
  console.log('# ' + a.name + ': ' + a.address);
}




// see https://masteringjs.io/tutorials/express/websockets
const expressServer = app.listen(expressPort, () => {
  console.log('xpress server listening on port ' + expressPort);
})

wsSrv.addToExpressServer(expressServer);

listeningSrv.onData(d => {
  // console.log(d.toString());
  wsSrv.broadcast(d.toString());
  fwdConn.write(d.toString());
});

listeningSrv.onStatusChange(() => wsSrv.broadcast('# status change\n'));
fwdConn.onStatusChange(() => wsSrv.broadcast('# status change\n'));

async function generateQrCodes() {
  var s = '\n\n\nListening REST API address(es):\n\n';
  for(const a of network.restApiListeningAddresses('http', expressPort)) {
    const qrstring = await qr.toString(a.url, { errorCorrectionLevel: 'H' });
    s = s + a.name + ': ' + a.url + '\n' + qrstring + '\n\n';
  }
  s = s + '\n\n\n';
  return s;
}

generateQrCodes()
  .then(s => console.log(s));


