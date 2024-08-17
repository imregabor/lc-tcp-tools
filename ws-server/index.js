'use strict';

const express = require('express');
const openFwdConn = require('./tcp-forwarding-connection.js');
const openListeningSrv = require('./tcp-listening-server.js');
const openWsSrv = require('./websocket-server.js');
const lowLevel = require('./lowlevel.js');
const net = require('net');
const network = require('./network.js');
const qr = require('qrcode');
const currentSetup = require('./current-setup.js');
const effects = require('./effects.js');
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const chalk = require('chalk');

// see https://www.npmjs.com/package/command-line-args
const cliOpts = [
  { name : 'mp3srv', type : String, multiple : true, description : 'Specify mp3 servers' },
  { name : 'help', alias : 'h', type : Boolean, description : 'Print usage help' }
];
const options = commandLineArgs(cliOpts)

if (options.help) {
  // see https://github.com/75lb/command-line-usage
  const usageDef = [
    {
      header: 'WS server',
      content: 'Bridge/forward effect stream to TCP router, serve static frontends.'
    },
    {
      header: 'Options',
      optionList : cliOpts
    }
  ];
  const usage = commandLineUsage(usageDef);
  console.log(usage);
  return;
}

if (options.mp3srv) {
  for (var s of options.mp3srv) {
    if (!s.startsWith('http://') && !s.startsWith('https://')) {
      throw new Error(`MP3 server url does not start with "http://" or "https://": ${s}`)
    }
    if (s.endsWith('/')) {
      throw new Error(`MP3 server url ends with "/": ${s}`)
    }
    network.pingUrl(s, 'MP3 server');
  }
}


const starttime = Date.now();
const listeningPort = 12345;
const fwdPort = 23;
const fwdHost = '192.168.22.10';
// const fwdHost = '192.168.10.102';
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


const effectsMachine = effects.createEffectsMachine({
  send : () => {
    const message = currentSetup.toMessage();
    dispatchMessage(message);
  }
});

const wsSrv = openWsSrv({
  log : m => console.log('[WS srv] ' + m),
  path : '/ws-api/effects',
  messagesOnNewConnection : () => {
    const m = [];
    m.push(currentSetup.toMessage());
    const activeEffects = effectsMachine.getActiveEffects();
    for (const e of activeEffects) {
      e.e = 'effect';
      e.m = [ e.m ];
      m.push(e);
    }

    return m;
  }
});

const ccSrv = openWsSrv({
  log : m => {
    console.log('[CC srv] ' + m);
  },
  onMessage : d => wsSrv.broadcast(d),
  path : '/ws-api/control'
});


function dispatchMessage(message) {
  fwdConn.write(message);
  wsSrv.broadcast(message);
}

app.use(express.static('../replay-demo/dist'));

app.get('/vis/settings', (req, res) => {
  const ret = {
  };
  if (options.mp3srv) {
    ret.mp3srv = options.mp3srv;
  }
  res.json(ret);
});

app.use('/vis/data', express.static('../vis/data'));
app.use('/vis', express.static('../vis/dist'));

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
    dispatchMessage(message);
    res.status(200).send();
  }
});

app.post('/api/scene', (req, res) => {
  const m = req.query.m;
  const s = req.query.s;

  try {
    var mods = currentSetup.getModulesByName(m);
    var scene = effects.getSceneByName(s);
    for (var mod of mods) {
      scene.apply(mod);
    }
    const message = currentSetup.toMessage();
    dispatchMessage(message);
    wsSrv.broadcastJson({ e : 'scene', m : mods.map(m => m.getName()), v : scene.id });
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }
});

app.post('/api/effect', (req, res) => {
  const e = req.query.e;
  const m = req.query.m;
  try {
    var mods = currentSetup.getModulesByName(m);

    if (e === 'stop') {
      for (var mod of mods) {
        effectsMachine.stop(mod);
      }
      wsSrv.broadcastJson({ e : 'effect', m : mods.map(m => m.getName()), v : e });
    } else {
      var effect = effects.getEffectByName(e);
      for (var mod of mods) {
        effectsMachine.start(mod, effect);
      }
      wsSrv.broadcastJson({ e : 'effect', m : mods.map(m => m.getName()), v : e });
    }
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }


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
  dispatchMessage(message);
  res.status(200).send();
});

app.post('/api/setBulk100', (req, res) => {
  const m1 = req.query.m1;
  const m2 = req.query.m2;

  if (m1) {
    currentSetup.modules.m1.setBulk(lowLevel.parseBulk100(m1));
  }
  if (m2) {
    currentSetup.modules.m2.setBulk(lowLevel.parseBulk100(m2));
  }

  const message = currentSetup.toMessage();
  dispatchMessage(message);
  res.status(200).send();
});

app.post('/api/setBulkFF', (req, res) => {
  const m1 = req.query.m1;
  const m2 = req.query.m2;

  if (m1) {
    currentSetup.modules.m1.setBulk(lowLevel.parseBulkFF(m1));
  }
  if (m2) {
    currentSetup.modules.m2.setBulk(lowLevel.parseBulkFF(m2));
  }

  const message = currentSetup.toMessage();
  dispatchMessage(message);
  res.status(200).send();
});



app.get('/api/restApiListeningAddresses', (req, res) => {
  const ret = network.restApiListeningAddresses('http', expressPort);
  res.json(ret);
});

app.get('/api/status', (req, res) => {
  const ret = {
    uptime : Date.now() - starttime,
    fwdConnStatus : fwdConn.getStatus(),
    listeningSrvStatus : listeningSrv.getStatus(),
    wsSrvStatus : wsSrv.getStatus(),
    ccSrvStatus : ccSrv.getStatus()
  };
  if (options.mp3srv) {
    ret.mp3srv = options.mp3srv;
  }
  res.json(ret);
});

//  curl -X POST http://localhost:3000/api/sendToAll?data=135
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
    dispatchMessage(message);
    res.status(200).send();
  } catch (e) {
    console.log(e);
    res.status(400).send(e);
  }
});

app.post('/api/start-playback', (req, res) => {
  const u = req.query.u;
  if (u) {
    ccSrv.broadcastJson({ command : 'START_PLAYBACK', url : u });
    res.status(200).send();
    // check and just log if ping failed
    network.pingUrl(u, 'START AUDIO URL');
  } else {
    res.status(400).send('Invalid/no url: ' + u);
  }
});

app.post('/api/stop-playback', (req, res) => {
  ccSrv.broadcastJson({ command : 'STOP_PLAYBACK' });
  res.status(200).send();
});

app.post('/api/pause-playback', (req, res) => {
  ccSrv.broadcastJson({ command : 'PAUSE_PLAYBACK' });
  res.status(200).send();
});

app.post('/api/resume-playback', (req, res) => {
  ccSrv.broadcastJson({ command : 'RESUME_PLAYBACK' });
  res.status(200).send();
});

app.post('/api/check-playback-info', (req, res) => {
  ccSrv.broadcastJson({ command : 'CHECK_PLAYBACK_INFO' });
  res.status(200).send();
});


app.post('/api/seek-playback', (req, res) => {
  const t = +req.query.t;
  if (t) {
    ccSrv.broadcastJson({ command : 'SEEK_PLAYBACK', t : t });
    res.status(200).send();
  } else {
    res.status(400).send('Invalid/no timestamp: ' + req.query.t);
  }
});

app.post('/api/seek-relative-playback', (req, res) => {
  const d = +req.query.d;
  if (d) {
    ccSrv.broadcastJson({ command : 'SEEK_RELATIVE_PLAYBACK', d : d });
    res.status(200).send();
  } else {
    res.status(400).send('Invalid/no delta: ' + req.query.d);
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
ccSrv.addToExpressServer(expressServer);

listeningSrv.onData(d => {
  // console.log(d.toString());
  wsSrv.broadcast(d.toString());
  fwdConn.write(d.toString());
});

listeningSrv.onStatusChange(() => wsSrv.broadcast('# status change\n'));
fwdConn.onStatusChange(() => wsSrv.broadcast('# status change\n'));

async function generateQrCodes() {
  var ret = '\n\n\nListening REST API address(es):\n\n';
  for(const a of network.restApiListeningAddresses('http', expressPort)) {
    var qrstring = await qr.toString(a.url, {
      errorCorrectionLevel: 'H',
      margin : 4
    });

    ret = ret + a.name + ': ' + a.url + '\n';
    var qrlines = qrstring.split('\n');
    for (var qrline of qrlines) {
      // force white background
      // '\u2005' is a space character; chalk truncates some trailing normal spaces
      ret = ret + chalk.black.bgWhite('\u2005' + qrline + '\u2005') + '\n'
    }

    ret = ret + '\n\n';
  }
  ret = ret + '\n\n\n';
  return ret;
}

generateQrCodes()
  .then(s => console.log(s));

