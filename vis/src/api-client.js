"use strict";

import * as d3 from 'd3';

export function getStatusInfo(result, error, timeout) {
  // see https://stackoverflow.com/questions/46946380/fetch-api-request-timeout
  // see https://d3js.org/d3-fetch
  // see https://fetch.spec.whatwg.org/#requestinit
  const requestInit =  timeout ?  { signal: AbortSignal.timeout(timeout) } : undefined;
  d3.json('/api/status', requestInit )
     .then(result, error);
}

/** Callback called for each mp3 server address */
export function getMp3Servers(cb) {
  fetch("settings")
    .then(response => response.json())
    .then(s => {
      //console.log('Settings from WS server arrived', s);
      if (s.mp3srv) {
        for(var s of s.mp3srv) {
          cb(s);
        }
      }
    });
}

export function getServerUrls(result, error) {
  const req = d3.json('/api/restApiListeningAddresses');
  if (result) {
    req.then(result, error);
  } else {
    return req;
  }
}


export function stopPlayback() {
  fetch('/api/stop-playback', {
    method: 'POST'
  });
}

export function pausePlayback() {
  fetch('/api/pause-playback', {
    method: 'POST'
  });
}

export function resumePlayback() {
  fetch('/api/resume-playback', {
    method: 'POST'
  });
}


export function startPlayback(url) {
  fetch(`/api/start-playback?u=${url}`, {
    method: 'POST'
  });
}

export function seekRelativePlayback(d) {
  fetch(`/api/seek-relative-playback?d=${+d}`, {
    method: 'POST'
  });
}

export function seekPlayback(t) {
  fetch(`/api/seek-playback?t=${+t}`, {
    method: 'POST'
  });
}


export function checkPlayback() {
  fetch('/api/check-playback-info', {
    method: 'POST'
  });
}


/**
 * WS API related functionalities.
 */
export function openWsLink(opts) {

  //const ws = new WebSocket('ws://localhost:8080');
  // See https://stackoverflow.com/questions/10406930/how-to-construct-a-websocket-uri-relative-to-the-page-uri
  var windowLocation = window.location;
  var wsUri;
  if (windowLocation.protocol === 'https:') {
    wsUri = 'wss:';
  } else {
    wsUri = 'ws:';
  }
  const endpoint = opts.endpoint;
  if (!endpoint || !endpoint.startsWith('/') || endpoint.endsWith('/')) {
    throw new Error('Invalid endpoint ', opts.endpoint)
  }
  wsUri += '//' + windowLocation.host + opts.endpoint;

  const expectNonJsonMessages = opts.expectNonJsonMessages;

  function handleMessage(e) {
    var msg = e.data;
    if (!msg.startsWith('{')) {
      if (!expectNonJsonMessages) {
        console.log('ERROR: expected JSON message:', msg);
      }
      return;
    }
    if (opts.onJson) {
      opts.onJson(JSON.parse(msg));
    }
  }

  var wsReconnectTimeout;
  function handleClose() {
    if (opts.onDown) { opts.onDown(); }
    if (!wsReconnectTimeout) {
      wsReconnectTimeout = setTimeout(() => {
        wsReconnectTimeout = undefined;
        open();
      }, 1000);
    }
  }


  function sendJson(o) {
    const message = JSON.stringify(o);
    if (!ws) {
      console.log('No WS, cannot send', o);
      return;
    }
    if (ws.readyState !== 1) {
      console.log('WS not OPEN, readyState = ' + ws.readyState + ', cannot send', o)
      return;
    }
    ws.send(message);
  }

  function send(message) {
    if (!ws) {
      console.log(`No WS, cannot send ${message}`);
      return;
    }
    if (ws.readyState !== 1) {
      console.log(`WS not OPEN, readyState = ${ws.readyState} cannot send ${message}`);
      return;
    }
    ws.send(message);
  }

  var ws;
  function open() {
    if (opts.onConnecting) {
      opts.onConnecting();
    }
    console.log(`Opening WS link to ${wsUri}`);
    ws = new WebSocket(wsUri);

    if (opts.onUp) {
      ws.onopen = e => {
        opts.onUp();
      }
    }
    ws.onclose = () => { console.log('WS close'); handleClose(); };
    ws.onerror = () => { console.log('WS error'); handleClose(); };
    ws.onmessage = handleMessage;
  }
  open();

  return {
    sendJson : o => sendJson(o),
    send : m => send(m)
  };
}
