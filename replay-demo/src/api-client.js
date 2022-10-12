"use strict";

import * as d3 from 'd3';

/**
 * WS API related functionalities.
 */


export function getStatusInfo(result, error) {
  d3.json('/api/status')
    .then(result, error);
}

export function sendSinglePacket(packet) {
  // see https://bitcoden.com/answers/send-post-request-in-d3-with-d3-fetch
  d3.text('/api/sendPacket?bus=' + packet.bus + '&address=' + packet.addr + '&data=' + packet.value, {
    method : 'POST'
  }).then(() => {}, () => {});
}

export function getServerUrls(result, error) {
  d3.json('/api/restApiListeningAddresses')
    .then(result, error);
}

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
  wsUri += '//' + windowLocation.host + '/';


  function handleMessage(e) {
    var lines = e.data.split('\n');
    var packets = [];
    for (var s of lines) {
      if (s.startsWith('S')) {
        packets.push(s);
      } else if (s.startsWith('# status change')) {
        if (opts.onStatusChange) {
          opts.onStatusChange();
        };
      }
    }
    if (packets.length > 0) {
      if (opts.onPackets) {
        opts.onPackets(packets);
      }
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
}
