"use strict";

const express = require('express');
const openFwdConn = require('./tcp-forwarding-connection.js');
const openListeningSrv = require('./tcp-listening-server.js');
const openWsSrv = require('./websocket-server.js');
const lowLevel = require('./lowlevel.js');
const net = require('net');
const network = require('./network.js');
const qr = require('qrcode');
const currentSetup = require('./current-setup.js');

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

app.get('/api/currentState', (req, res) => {
  const ret = currentSetup.toMessage();
  res.set('Content-Type', 'text/plain').send(ret);
});

app.post('/api/setSingleCoord', (req, res) => {
  const m = req.query.m;
  const x = +req.query.x;
  const y = +req.query.y;
  const v = +req.query.v;
  var err = '';
  if (m === 'm1') {
    currentSetup.modules.m1.setSingleCoord(x, y, v);
  } else if (m === 'm2') {
    currentSetup.modules.m2.setSingleCoord(x, y, v);
  } else {
    err = 'Unknown module ' + m;
  }
  if (err) {
    console.log(err);
    res.status(400).send(err);
  } else {
    const message = currentSetup.toMessage();
    fwdConn.write(message);
    wsSrv.broadcast(message);
    res.status(200).send();
  }
});


var effectInterval;
function effectChaseOn(m) {
  const dims = m.getDimensions();
  var p = 0;
  return () => {
    const state = m.getState();
    for (var i = 0; i < dims.size; i++) {
      if (state[i] > 0.05) {
        state[i] -= 0.05;
      } else {
        state[i] -= 0;
      }
    }
    state[p] = 1.0;
    p = (p + 1) % dims.size;
  }
}

function effectBreatheOn(m) {
  const dims = m.getDimensions();
  var p = 0;
  var d = 0.1;
  return () => {
    const state = m.getState();
    p = p + d;
    if (p >= 0.999999) {
      p = 1.0;
      d = -d;
    } else if (p < 0.000001) {
      p = 0.0;
      d = -d;
    }
    for (var i = 0; i < dims.size; i++) {
      state[i] = p;
    }
  }
}

function makeEffectsStop() {
  if (effectInterval) {
    clearInterval(effectInterval);
    effectInterval = undefined;
  }
}

app.post('/api/scene', (req, res) => {
  const m = req.query.m;
  const s = req.query.s;

  var mod;
  if (m === 'm1') {
    mod = currentSetup.modules.m1;
  } else if (m === 'm2') {
    mod = currentSetup.modules.m2;
  } else {
    res.status(400).send('Unknown module ' + m);
    return;
  }

  if (m && (s === 'on' || s === 'off')) {
    const v = (s === 'on') ? 1.0 : 0.0;
    mod.getState().fill(v);
    const message = currentSetup.toMessage();
    fwdConn.write(message);
    wsSrv.broadcast(message);
    res.status(200).send();
  } else {
    res.status(400).send('Unknown scene ' + s);
  }

});

app.post('/api/effect', (req, res) => {
  const e = req.query.e;
  makeEffectsStop();


  var m1e, m2e;
  if (e === "chase") {
    m1e = effectChaseOn(currentSetup.modules.m1);
    m2e = effectChaseOn(currentSetup.modules.m2);
  } else if (e === "breathe") {
    m1e = effectBreatheOn(currentSetup.modules.m1);
    m2e = effectBreatheOn(currentSetup.modules.m2);
  }

  if (m1e || m2e) {
    effectInterval = setInterval(() => {
      m1e();
      m2e();
      const message = currentSetup.toMessage();
      fwdConn.write(message);
      wsSrv.broadcast(message);
    }, 20);
  }

  res.status(200).send();
});


app.post('/api/setBulk10', (req, res) => {
  const m1 = req.query.m1;
  const m2 = req.query.m2;

  if (m1) {
    currentSetup.modules.m1.setBulk(lowLevel.parseBulk10(m1));
  }
  if (m2) {
    currentSetup.modules.m2.setBulk(lowLevel.parseBulk10(m2));
  }

  const message = currentSetup.toMessage();
  fwdConn.write(message);
  wsSrv.broadcast(message);
  res.status(200).send();
});


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


