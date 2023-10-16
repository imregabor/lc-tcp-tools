"use strict";

import * as d3 from 'd3';

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


  function handleMessage(e) {
    var msg = e.data;
    if (!msg.startsWith('{')) {
      console.log('ERROR: expected JSON message:', msg);
    }
    if (opts.onJson) {
      opts.onJson(JSON.parse(s));
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
      console.log('WS not OPEN, readyState = ' + ws.readyState + ', cannot send', i)
      return;
    }
    ws.send(message);
  }

  var ws;
  function open() {
    if (opts.onConnecting) {
      opts.onConnecting();
    }
    ws = new WebSocket(wsUri);

    if (opts.onUp) {
      ws.onopen = e => {
        opts.onUp();
      }
    }
    ws.onclose = handleClose;
    ws.onmessage = handleMessage;
  }
  open();

  return {
    sendJson : o => sendJson(o)
  };
}
