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
  var waitingSince = Date.now();
  // last heartbeat, relevant after first one
  var lastHb;
  // time since last two heartbeats
  var lastHbPeriod;
  var lastDeviceId = '';
  // number of '?' messages
  var protocolErrorCount = 0;

  function ready() {
    state = STATE_READY;
  }

  function error() {
    if (state === STATE_ERROR) {
      return;
    }
    state = STATE_ERROR;
    lastDeviceId = '';
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
    baudRate: 1000000, //115200,
    hupcl : false
  }, f => {
    if (f) {
      log(`Error opening ${portName}: ${f.message}`);
      error();
    }
    if (f === null) {
      log('Port opened, waiting controller to answer');
      state = STATE_WAITING;

      console.log(port)
    }
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
  port.on('error', d => {
    log(`port error ${d ? d.message : d}`);
    error();
  });
  parser.on('data', d => {
    if (d === 'e') {
      continueSending();
      return;
    }
    if (d === '?') {
      protocolErrorCount++;
      return;
    }
    if (state === STATE_ERROR) {
      log(`Data received in error state; stay in error: "${d}"`);
      return;
    }
    if (state === STATE_WAITING) {
      log(`Data arrived during waiting (@ ${Date.now() - waitingSince} ms): "${d}"`);
    }
    if (d.startsWith('wssgw @ ')) {
      lastDeviceId = d.substring(8);
      const now = Date.now();
      if (lastHb) {
        lastHbPeriod = now - lastHb;
      }
      lastHb = now;
      if (state === STATE_WAITING) {
        log('  -> valid heartbeat, ready to send');
        ready();
      }
    }
    if (d === '+') {
      ready();
    }
  });

  var bufferToSend = undefined;
  var firstByteToSend = undefined;
  var fragmentNo = 0;
  function continueSending() {
    if (!bufferToSend) {
      return;
    }
    if (firstByteToSend < bufferToSend.length) {
      /*
      const amountToSend = Math.min(fragmentNo == 0 ? 250 : 370, bufferToSend.length - firstByteToSend);
      const buffer = Buffer.alloc(amountToSend);
      bufferToSend.copy(buffer, 0, firstByteToSend, firstByteToSend + amountToSend);
      firstByteToSend += amountToSend;
      fragmentNo = fragmentNo + 1;
      */
      port.write(bufferToSend, e => {
        if (e) {
          log(`send error ${e.message}`)
          error();
        }
      });
      bufferToSend = undefined;
    } else {
      bufferToSend = undefined;
    }
  }


  const ret = {
    isReady : () => state === STATE_READY,
    isError : () => state === STATE_ERROR,
    isUp : () => state === STATE_READY || state === STATE_SENDING,
    isWaiting : () => state === STATE_WAITING,
    getDeviceId : () => lastDeviceId,
    getProtocolErrorCount : () => protocolErrorCount,
    getLastHbPeriod : () => lastHbPeriod,
    sendBuffer : buffer => {
      if (state !== STATE_READY && state !== STATE_WAITING) {
        return;
      }
      if (state === STATE_READY) {
        state = STATE_SENDING;
        lastSend = Date.now();
      }
      bufferToSend = buffer;
      firstByteToSend = 0;
      fragmentNo = 0;
      continueSending();
    },
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

  setTimeout(() => {
    if (state  === STATE_WAITING) {
      log(`error: no initial HB after ${Date.now() - waitingSince} ms`);
      error();
    }
  }, 5000);

  function periodicPing() {
    if (state === STATE_ERROR) {
      // no more ping
      return;
    }

    if (state !== STATE_WAITING) {
      // waiting is treated in a single shot check

      const timeSinceLastHb = Date.now() - lastHb;
      if (timeSinceLastHb > 1000) {
        log(`error: no periodic HB after ${timeSinceLastHb} ms`);
        error();
        return;
      }
      if (state === STATE_SENDING) {
        const dt = Date.now() - lastSend;
        if (dt > 500) {
          log(`failing due to no response for ${dt} ms`);
          error();
          return;
        }
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
  var maxLedCount = 512;

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
        log('[ws-strip] CH340/FT232 not found, retry in 1s');
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
        maxLedCount : maxLedCount,
        deviceId : !!a ? a.getDeviceId() : '',
        protocolErrorCount : !!a ? a.getProtocolErrorCount() : 0,
        lastHbPeriod : !!a ? a.getLastHbPeriod() : 0
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
    sendBuffer : message => {
      if (!!a && a.isReady()) {
        sentCount = sentCount + 1;
        a.sendBuffer(message);
      } else {
        droppedCount = droppedCount + 1;
      }
    },
    sendValues : values => {
      if (values.length === 0) {
        return;
      }
      var sendCount = Math.min(maxLedCount * 3, values.length);
      var padCount = (3 - sendCount % 3) % 3;
      var ledCount = Math.round((sendCount + padCount) / 3);

      const buffer = Buffer.alloc(sendCount + padCount + 4);
      buffer[0] = 'b'.charCodeAt(0);
      buffer[1] = Math.floor(ledCount / 256); // MSB
      buffer[2] = ledCount % 256;             // LSB
      for (var i = 0; i < sendCount; i++) {
        buffer[i + 3] = Math.round(values[i] * 255);
      }
      for (var i = 0; i < padCount; i++) {
        buffer[sendCount + i + 3] = 0;
      }
      buffer[sendCount + padCount + 3] = '\n'.charCodeAt(0);

      // reorder
      for (var i = 0; i < ledCount; i++) {
        const t = buffer[3 + 3 * i];
        buffer[3 + 3 * i] = buffer[3 + 3 * i + 1];
        buffer[3 + 3 * i + 1] = t;
      }



      ret.sendBuffer(buffer);
      // log(buffer)

      /*
      var message = '@';
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
      */
    }

  };
  return ret;
}

module.exports.listSerialPorts = listSerialPorts;
module.exports.connect = connect;

