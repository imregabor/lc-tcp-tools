'use strict';

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const lowLevel = require('./lowlevel.js');


// @returns promise
function listSerialPorts() {
  return SerialPort.list();
}


function connectTo(portName, onError) {
  const log = m => console.log(`[ws-strip @ ${portName}] ${m}`);
  log(`Opening port ${portName}`);

  // port constructed, no callback
  const STATE_OPENING = 0;

  // port opened, grace period for controller to be ready
  const STATE_WAITING = 1;

  // data received from the controller
  const STATE_READY = 2;

  // message sent
  const STATE_SENDING = 3;

  // error or timeout happened
  const STATE_ERROR = 4;



  var state = STATE_OPENING;
  var lastSend;
  var waitingPingCount = 0;

  function ready() {
    state = STATE_READY;
  }

  function error() {
    if (state === STATE_ERROR) {
      return;
    }
    state = STATE_ERROR;
    try {
      port.close();
    } catch (e) {
      log(`Close attempt error: ${e}`)
    }
    if (onError) {
      onError();
    }
  }


  const port = new SerialPort({
    path: portName,
    baudRate: 115200,
    hupcl : false
  }, f => {
    if (f) {
      log(`Error opening ${portName}: ${f.message}`);
      error();
    }
    if (f === null) {
      log('Port opened, waiting controller to answer');
      state = STATE_WAITING;
    }
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
  port.on('error', d => {
    log(`port error ${d ? d.message : d}`);
    error();
  });
  parser.on('data', d => {
    if (state === STATE_ERROR) {
      log(`Data received in error state; stay in error: "${d}"`);
      return;
    }
    if (state === STATE_WAITING) {
      log(`First data arrived: "${d}"`);
    }
    ready();
  });


  const ret = {
    isReady : () => state === STATE_READY,
    isError : () => state === STATE_ERROR,
    isUp : () => state === STATE_READY || state === STATE_SENDING,
    isWaiting : () => state === STATE_WAITING,
    send : message => {
      if (state !== STATE_READY && state !== STATE_WAITING) {
        return;
      }
      if (state === STATE_READY) {
        state = STATE_SENDING;
        lastSend = Date.now();
      }

      port.write(message, e => {
        if (e) {
          log(`send error ${e.message}`)
          error();
        }
      })
    }
  };

  function periodicPing() {
    if (state === STATE_ERROR) {
      // no more ping
      return;
    }

    if (state == STATE_WAITING) {
      if (waitingPingCount > 16) {
        log(`error: no response after ${waitingPingCount}`);
        error();
        return
      }
      waitingPingCount++;
      log(`sending initial ping # ${waitingPingCount}`);
      ret.send('?;');
    } else if (state == STATE_READY) {
      const dt = Date.now() - lastSend;
      if (!(dt < 100)) {
        // only ping when there is no recent message exchange
        ret.send('?;');
      }
    } else if (state === STATE_SENDING) {
      const dt = Date.now() - lastSend;
      if (dt > 500) {
        log(`failing due to no response for ${dt} ms`);
        error();
        return;
      }
    }
    setTimeout(periodicPing, 500);
  }
  periodicPing();
  return ret;

}

// when not specified using auto
function connect(port) {
  var a;
  var sentCount = 0;
  var droppedCount = 0;
  var maxLedCount = 256;

  const log = message => console.log(`[ws-strip] ${message}`);

  function autoConnect() {
    listSerialPorts().then(ports => {
      for(var p of ports) {
        if (
          (p['vendorId'] === '1A86' &&  p['productId'] === '7523') ||
          (p['vendorId'] === '0403' &&  p['productId'] === '6001')
        ) {
          a = connectTo(p['path'], () => {
            a = undefined;
            log('Error with connection, retry in 2s');
            setTimeout(autoConnect, 2000);
          });
        }
      }
      if (!a) {
        log('[ws-strip] CH340/MAX232 not found, retry in 1s');
        setTimeout(autoConnect, 1000);
      }
    });
  }

  function manualConnect() {
    a = connectTo(port, () => {
      a = undefined;
      log('Error with connection, retry in 2s');
      setTimeout(manualConnect, 2000);
    });
  }

  if (port) {
    manualConnect();
  } else {
    autoConnect();
  }

  const ret = {
    getStatus : () => {
      return {
        sentCount : sentCount,
        droppedCount : droppedCount,
        up : !!a && a.isUp(),
        waiting : !!a && a.isWaiting(),
        maxLedCount : maxLedCount
      };
    },
    send : message => {
      if (!!a && a.isReady()) {
        sentCount = sentCount + 1;
        a.send(message);
      } else {
        droppedCount = droppedCount + 1;
      }
    },
    sendValues : values => {
      var message = '@';
      var sendCount = Math.min(maxLedCount * 3, values.length);
      for (var i = 0; i < sendCount; i++) {
        message = message + lowLevel.vToHex2(values[i]);
      }
      if (sendCount % 3 !== 0) {
        for (var i = 0; i < 3 - sendCount % 3; i++) {
          message = message + '00';
        }
      }
      message = message + ';';
      ret.send(message);
    }

  };
  return ret;
}

module.exports.listSerialPorts = listSerialPorts;
module.exports.connect = connect;

