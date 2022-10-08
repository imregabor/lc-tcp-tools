"use strict";
import _ from 'lodash';
import * as d3 from 'd3';
import './style.css';
import chroma from 'chroma-js';
//import cap from '../../data/capture-ppp.txt.gz';
import cap from '../../data/capture-rfd.txt.gz';
import fa from './fa.js';
import parsePacket from './packet-parsing.js';
import * as setup from './current-setup.js';
import addFrameCounter from './add-frame-counter.js';
import attachPerfCounter from './add-perf-counter.js';
import replay from './replay.js';
import * as pageCtr from './page-controls.js';


/* See https://patorjk.com/software/taag/#p=display&h=0&v=0&f=Georgia11&t=addMatrix

                ,,         ,,                                              ,,
              `7MM       `7MM  `7MMM.     ,MMF'           mm               db
                MM         MM    MMMb    dPMM             MM
 ,6"Yb.    ,M""bMM    ,M""bMM    M YM   ,M MM   ,6"Yb.  mmMMmm  `7Mb,od8 `7MM  `7M'   `MF'
8)   MM  ,AP    MM  ,AP    MM    M  Mb  M' MM  8)   MM    MM      MM' "'   MM    `VA ,V'
 ,pm9MM  8MI    MM  8MI    MM    M  YM.P'  MM   ,pm9MM    MM      MM       MM      XMX
8M   MM  `Mb    MM  `Mb    MM    M  `YM'   MM  8M   MM    MM      MM       MM    ,V' VA.
`Moo9^Yo. `Wbmd"MML. `Wbmd"MML..JML. `'  .JMML.`Moo9^Yo.  `Mbmo .JMML.   .JMML..AM.   .MA.


 */

function addMatrix(parentD3, opts) {
  const containerPaddingH = (opts.padh ? opts.padh : 1.0) * 30;
  const containerPaddingV = (opts.padv ? opts.padv : 1.0) * 30;
  const dotSeparationH = (opts.seph ? opts.seph : 1.0) * 40;
  const dotSeparationV = (opts.sepv ? opts.sepv : 1.0) * 40;
  const halfDotSeparationH = Math.round(dotSeparationH / 2);
  const halfDotSeparationV = Math.round(dotSeparationV / 2);
  const dotSizeH = 30;
  const dotSizeV = 30;

  function toIndex(col, row) {
    return row * opts.cols + col;
  } 

  const vToColor = chroma
    .scale(['#300000', '#d41111', '#eded5e', '#ffffe6', '#ffffff'])
    .correctLightness();

  var dots = [];
  for (var y = 0; y < opts.rows; y++) {
    for (var x = 0; x < opts.cols; x++) {
      var dot = {
        x : x,
        y : y,
        i : toIndex(x, y),
        v: 0,
        t: 0,
        infoText: x + ':' + y
      }
      dots.push(dot);
    }
  }

  var cnt = parentD3.append('div')
    .classed('matrix-container hide-info', true)
    .style('width', (opts.cols * ( dotSizeH + dotSeparationH) + 2 * containerPaddingH - dotSeparationH) + 'px')
    .style('height', (opts.rows * (dotSizeV + dotSeparationV) + 2 * containerPaddingV - dotSeparationV) + 'px');



  var topLabel = cnt.append('span').classed('container-label top', true).text('top label');
  var bottomLabel = cnt.append('span').classed('container-label bottom', true).text('bottom label');
  var leftLabel = cnt.append('span').classed('container-label left', true).text('left label');
  var rightLabel = cnt.append('span').classed('container-label right', true).text('right label');
  var titleLabel = cnt.append('span').classed('container-label title', true).text('title label');

  // controls over labels
  var ctrls = cnt.append('div').classed('controls', true);
  var infoButton = ctrls.append('i').classed('fa fa-circle-info', true).attr('title', 'Show/hide info annotations');
  ctrls.append('i').classed('fa fa-rotate-right', true).attr('title', 'Rotate display right');
  ctrls.append('i').classed('fa fa-rotate-left', true).attr('title', 'Rotate display left');
  ctrls.append('i').classed('fa fa-left-right', true).attr('title', 'Flip display horizontally');
  ctrls.append('i').classed('fa fa-up-down', true).attr('title', 'Flip display vertically');

  var lightupButton = ctrls.append('i').classed('fa-regular fa-lightbulb', true).attr('title', 'Light up on hover');

  ctrls.append('i').classed('fa-solid fa-arrows-up-to-line fa-rotate-270', true).attr('title', 'Light up left block on hover');
  ctrls.append('i').classed('fa-solid fa-arrows-up-to-line fa-rotate-90', true).attr('title', 'Light up left block on hover');
  ctrls.append('i').classed('fa-solid fa-arrows-up-to-line', true).attr('title', 'Light up top block on hover');
  ctrls.append('i').classed('fa-solid fa-arrows-up-to-line fa-rotate-180', true).attr('title', 'Light up bottom block on hover');


  var lighupOnHover = false;

  infoButton.on('click', () => {
    const toOn = cnt.classed('hide-info');
    infoButton.classed('on', toOn);
    cnt.classed('hide-info', !toOn);
  });

  lightupButton.on('click', () => {
    const toOn = !lightupButton.classed('on');
    cnt.classed('highlighting', toOn);
    lighupOnHover = toOn;
    lightupButton
      .classed('fa-regular', !toOn)
      .classed('fa-solid', toOn)
      .classed('on', toOn);
    if (!toOn) {
      ddivs.classed('mark', false);
    }
  });

  var dotOuterDivs = cnt.selectAll('.matrix-dot').data(dots).enter().append('div')
    .classed('matrix-dot-outer', true)
    .style('width', (dotSizeH + dotSeparationH) + 'px')
    .style('height', (dotSizeV + dotSeparationV) + 'px')
    .style('left', d => (d.x * (dotSizeH + dotSeparationH) + containerPaddingH - halfDotSeparationH) + 'px')
    .style('top', d => (d.y * (dotSizeV + dotSeparationV) + containerPaddingV - halfDotSeparationV) + 'px')

  var ddivs = dotOuterDivs.append('div')
    .classed('matrix-dot', true)
    .style('width', dotSizeH + 'px')
    .style('height', dotSizeV + 'px')
    .style('left', halfDotSeparationH + 'px')
    .style('top', halfDotSeparationV + 'px')
    .attr('title', d => 'Index: ' + d.i);

  dotOuterDivs.on('mouseenter', (e, d) => {
    if (!lighupOnHover) {
      return;
    }
    d3.select(e.target).classed('mark', true);
    if (opts.hover) {
      opts.hover(d.x, d.y, 1.0);
    }
  });
  dotOuterDivs.on('mouseleave', (e, d) => {
    if (!lighupOnHover) {
      return;
    }
    d3.select(e.target).classed('mark', false);
    if (opts.hover) {
      opts.hover(d.x, d.y, 0.0);
    }
  });

  var infoTexts = ddivs.append('div').classed('info-detail', true);
  function bindInfoText() {
    infoTexts.text(d => d.infoText);
  }
  bindInfoText();

  function render() {
    for (var d of dots) {
      if (d.v < d.t) {
        d.v = d.t;
      } else {
        d.v = d.v - (d.v - d.t) * 0.5;
      }
    }
    ddivs.style('background-color', d => vToColor(d.v * d.v));
  }

  render();

  var ret = {
    call : f => f(ret),
    titleLabelText : t => { titleLabel.text(t); return ret; },
    topLabelText : t => { topLabel.text(t); return ret; },
    bottomLabelText : t => { bottomLabel.text(t); return ret; },
    leftLabelText : t => { leftLabel.text(t); return ret; },
    rightLabelText : t => { rightLabel.text(t); return ret; },
    infoText : (x, y, text) => { dots[ toIndex(x, y) ].infoText = text; bindInfoText(); return ret; },
    setValue : function(x, y, v) {
      if (v < 0) {
        v = 0;
      } else if (v > 1) {
        v = 1;
      }
      // v = v * v;
      dots[ toIndex(x, y) ].t = v;
    },
    getValue : function(x, y) {
      return dots[ toIndex(x, y) ].v;
    },
    render : function() {
      render();
    },
    cols: () => opts.cols,
    rows: () => opts.rows
  };
  return ret;
}


var m1;
var m2;

var fps;
var pbv;
var replayStatus; 
var packetsPerSec;
var packetGroupsPerSec;


/* see https://patorjk.com/software/taag/#p=display&h=0&v=0&f=Georgia11&t=mapPacket

                                      `7MM"""Mq.                   `7MM                 mm
                                        MM   `MM.                    MM                 MM
`7MMpMMMb.pMMMb.   ,6"Yb.  `7MMpdMAo.   MM   ,M9  ,6"Yb.   ,p6"bo    MM  ,MP' .gP"Ya  mmMMmm
  MM    MM    MM  8)   MM    MM   `Wb   MMmmdM9  8)   MM  6M'  OO    MM ;Y   ,M'   Yb   MM
  MM    MM    MM   ,pm9MM    MM    M8   MM        ,pm9MM  8M         MM;Mm   8M""""""   MM
  MM    MM    MM  8M   MM    MM   ,AP   MM       8M   MM  YM.    ,   MM `Mb. YM.    ,   MM
.JMML  JMML  JMML.`Moo9^Yo.  MMbmmd'  .JMML.     `Moo9^Yo. YMbmd'  .JMML. YA. `Mbmmd'   `Mbmo
                             MM
                           .JMML.

 */

// map packet to lights
function mapPacket(packet) {
  setup.linear24.mapPacket(packet, m1.setValue);
  setup.matrix35.mapPacket(packet, m2.setValue);
}

/* see https://patorjk.com/software/taag/#p=display&h=0&v=0&f=Georgia11&t=initPage

  ,,                ,,
  db                db    mm    `7MM"""Mq.
                          MM      MM   `MM.
`7MM  `7MMpMMMb.  `7MM  mmMMmm    MM   ,M9  ,6"Yb.   .P"Ybmmm  .gP"Ya
  MM    MM    MM    MM    MM      MMmmdM9  8)   MM  :MI  I8   ,M'   Yb
  MM    MM    MM    MM    MM      MM        ,pm9MM   WmmmP"   8M""""""
  MM    MM    MM    MM    MM      MM       8M   MM  8M        YM.    ,
.JMML..JMML  JMML..JMML.  `Mbmo .JMML.     `Moo9^Yo. YMMMMMb   `Mbmmd'
                                                    6'     dP
                                                    Ybmmmd'
*/

function sendSinglePacket(packet) {
  // see https://bitcoden.com/answers/send-post-request-in-d3-with-d3-fetch
  d3.text('/api/sendPacket?bus=' + packet.bus + '&address=' + packet.addr + '&data=' + packet.value, {
    method : 'POST'
  });
}

function initPage() {
  const body = d3.select('body');

  // Top header ----------------

  const fpsdiv = body.append('div').classed('fps', true);

  fpsdiv.append('span').classed('label', true).text('Rendering FPS:');
  const fpsv = fpsdiv.append('span').classed('value', true);
  fps = attachPerfCounter(fpsv);

  const playbackGroup = fpsdiv.append('div').classed('counter-group', true);
  playbackGroup.append('span').classed('label', true).text('Playback:');
  pbv = playbackGroup.append('span').classed('value', true);

  fpsdiv.append('span').classed('label', true).text('Data packets / s:');
  const ppsdiv = fpsdiv.append('span').classed('value', true);
  packetsPerSec = attachPerfCounter(ppsdiv, '.1f');

  fpsdiv.append('span').classed('label', true).text('Packet groups / s:');
  const pgpsdiv = fpsdiv.append('span').classed('value', true);
  packetGroupsPerSec = attachPerfCounter(pgpsdiv, '.1f');


  const frameCounter = addFrameCounter(body);
  frameCounter.show(false);

  const statusInfoDiv = body.append('div').classed('status-info', true).style('display', 'none');
  const statusInfoContent = statusInfoDiv.append('pre');


  // page controls + status -------------------
  const pageControls = pageCtr.addTo(fpsdiv);

  const wsLinkIcon = pageControls.addLinkIcon({
    styles : pageCtr.iconStyles.link,
    titles : {
      unknown : 'WS link is in unknown state',
      warn : 'WS link is connecting',
      err : 'WS link is not connected',
      ok : 'WS link is up',
    }
  }).warn();

  const srvListeningIcon = pageControls.addLinkIcon({
    styles : pageCtr.iconStyles.ear,
    titles : {
      unknown: 'Server listening connection is in unknown state',
      warn: 'Server listening connection is in unknown state',
      err: 'Server listening connection has no connected client',
      ok: 'Client connected to server listening connection'
    }
  }).unknown();

  const srvFwdConnIcon = pageControls.addLinkIcon({
    style : pageCtr.iconStyles.plug,
    titles : {
      unknown : 'Server forwarding connection is in unknown state',
      warn : 'Server forwarding connection is in unknown state',
      err : 'Server forwarding connection is not connected',
      ok : 'Server forwarding connection is connected',
    }
  }).unknown();



  const srvFwdConnIcon = pageControls.getDiv().append('i').classed('fa fa-plug fa-fw stat', true);
  function srvFwdConnDown() {
    srvFwdConnIcon.classed('fa-plug', false);
    srvFwdConnIcon.classed('fa-plug-circle-check', false);
    srvFwdConnIcon.classed('fa-plug-circle-xmark', true);
    srvFwdConnIcon.classed('fa-plug-circle-exclamation', false);
    srvFwdConnIcon.classed('err', true);
    srvFwdConnIcon.classed('ok', false);
    srvFwdConnIcon.classed('warn', false);
    srvFwdConnIcon.attr('title', 'Server forwarding connection is down');
  }

  function srvFwdConnUp() {
    srvFwdConnIcon.classed('fa-plug', false);
    srvFwdConnIcon.classed('fa-plug-circle-check', true);
    srvFwdConnIcon.classed('fa-plug-circle-xmark', false);
    srvFwdConnIcon.classed('fa-plug-circle-exclamation', false);
    srvFwdConnIcon.classed('err', false);
    srvFwdConnIcon.classed('ok', true);
    srvFwdConnIcon.classed('warn', false);
    srvFwdConnIcon.attr('title', 'Server forwarding connection is up');
  }

  function srvFwdConnWarn() {
    srvFwdConnIcon.classed('fa-plug', false);
    srvFwdConnIcon.classed('fa-plug-circle-check', false);
    srvFwdConnIcon.classed('fa-plug-circle-xmark', false);
    srvFwdConnIcon.classed('fa-plug-circle-exclamation', true);
    srvFwdConnIcon.classed('err', false);
    srvFwdConnIcon.classed('ok', false);
    srvFwdConnIcon.classed('warn', true);
    srvFwdConnIcon.attr('title', 'Server forwarding connection is in WARN state');
  }

  function srvFwdConnUnknown() {
    srvFwdConnIcon.classed('fa-plug', true);
    srvFwdConnIcon.classed('fa-plug-circle-check', false);
    srvFwdConnIcon.classed('fa-plug-circle-xmark', false);
    srvFwdConnIcon.classed('fa-plug-circle-exclamation', false);
    srvFwdConnIcon.classed('err', false);
    srvFwdConnIcon.classed('ok', false);
    srvFwdConnIcon.classed('warn', false);
    srvFwdConnIcon.attr('title', 'Server forwarding connection is in unknown state');

  }
  srvFwdConnUnknown();

  pageControls.getDiv().append('span').classed('sep', true);

  function updateStatusIcons(statusInfo) {
    if (statusInfo.listeningSrvStatus.activeConnectionCount > 0) {
      srvListeningIcon.ok();
    } else {
      srvListeningIcon.err();
    }
    if (statusInfo.fwdConnStatus.connected) {
      srvFwdConnIcon.ok();
    } else {
      srvFwdConnIcon.err();
    }
  }

  const playbackBtn = pageControls.getDiv().append('i');
  function noPlayback() {
    playbackGroup.classed('hidden', true);
    playbackBtn
        .classed('fa-solid fa-circle-stop on', false)
        .classed('fa-regular fa-circle-play', true)
        .attr('title', 'Start local packet replay');
  }
  function playbackGoing() {
    playbackGroup.classed('hidden', false);
    playbackBtn
        .classed('fa-solid fa-circle-stop on', true)
        .classed('fa-regular fa-circle-play', false)
        .attr('title', 'Stop playback');
  }
  noPlayback();
  playbackBtn.on('click', () => {
    if (replayStatus) {
      noPlayback();
      replayStatus.stop();
      replayStatus = undefined;
    } else {
      playbackGoing();
      replayStatus = replay({
        lines: cap.split('\n'),
        cb: p => {
          packetGroupsPerSec.tick(1);
          packetsPerSec.tick(p.length);
          for (var s of p) {
            var packet = parsePacket(s);
            mapPacket(packet);
          }
        },
        onFinish : () => {
          replayStatus = undefined;
          noPlayback();
        }
      });
    }
  });


  const frameCounterBtn = pageControls.getDiv().append('i').classed('fa fa-clock', true).attr('title', 'Show/hide precision frame counter');
  frameCounterBtn.on('click', () => {
    const next = !frameCounterBtn.classed('on');
    frameCounter.show(next);
    frameCounterBtn.classed('on', next);
  });
  function pingStatusInfo() {
    d3.json('api/status')
      .then(
        response => {
          updateStatusIcons(response);
        }
      );
  }

  function fetchStatusInfo() {
    d3.json('api/status')
      .then(
        response => {
          updateStatusIcons(response);
          if (!infoButton.classed('on')) {
            return;
          }
          statusInfoDiv.style('display', 'block');
          statusInfoContent.text(JSON.stringify(response, null, 2));
          setTimeout(fetchStatusInfo, 500);
        },
        error => {
          console.log('Error', error);
        });

  }

  const infoButton = pageControls.getDiv().append('i').classed('fa fa-circle-info', true).attr('title', 'Show/hide server status');
  infoButton.on('click', () => {
    const next = !infoButton.classed('on');
    infoButton.classed('on', next);
    if (!next) {
      statusInfoDiv.style('display', 'none');
      return;
    }
    fetchStatusInfo();
  });

  function setLabelsOnMatrix(m, setup) {
    m
      .titleLabelText(setup.description)
      .leftLabelText(setup.labels.left)
      .rightLabelText(setup.labels.right)
      .topLabelText(setup.labels.top)
      .bottomLabelText(setup.labels.bottom);
    for (const i of setup.infos) {
      m.infoText(i.x, i.y, i.text);
    }
  }

  m1 = addMatrix(body, {
    cols: 24,
    rows: 1,
    seph: 0.1,
    // padh: 0.2,
    hover : (x, y, v) => {
      sendSinglePacket(setup.linear24.toWire(x, y, v));
    }
  } )
    .call(m => { setLabelsOnMatrix(m, setup.linear24); return m; })
    ;

  /*
  for (var i = 0; i < 24; i++) {
    m1.setValue(i, 0, i / 23.0);
  }
  */
  m1.render();
  m2 = addMatrix(body, {
    cols: 7,
    rows: 5,
    hover : (x, y, v) => {
      sendSinglePacket(setup.matrix35.toWire(x, y, v));
    }})
    .call(m => { setLabelsOnMatrix(m, setup.matrix35); return m; })

    ;
  m2.render();



  const ff = d3.format('.1f');
  function r() {
    m1.render();
    m2.render();
    fps.tick(1);
    fps.render();
    packetsPerSec.render();
    packetGroupsPerSec.render();
    frameCounter.frame();
    requestAnimationFrame(r);

    // should be in the rendering loop
    if (replayStatus) {
      const ts = replayStatus.getTs();
      const pp = replayStatus.getPp();
      var txt = ff(ts / 1000) + ' s ' + ff(pp) + ' %';
      if (!replayStatus.isRunning()) {
        txt = txt + ' (STOPPED)'
      }
      pbv.text(txt);
    }

  }

  r();



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

  const ws = new WebSocket(wsUri);

  ws.onopen = e => { 
    console.log('WS link onopen', e); 
    wsLinkIcon.ok();
  }

  ws.onclose = e => {
    console.log('WS link onclose', e)
    wsLinkIcon.err();

  }

  ws.onerror = e => {
   console.log('WS link onerror', e) 
   wsLinkIcon.err();
  }

  ws.onmessage = e => { 
    var lines = e.data.split('\n');

    var pgs = 0;
    for (var s of lines) {
      if (s.startsWith('S')) {
        pgs++;
        mapPacket(parsePacket(s));
      } else if (s.startsWith('# status change')) {
        pingStatusInfo();
      }
    }
    if (pgs > 0) {
      packetGroupsPerSec.tick(1);
      packetsPerSec.tick(pgs);
    }
  }

  function periodicStatusInfo() {
    pingStatusInfo();
    setTimeout(periodicStatusInfo, 2000);
  }
  periodicStatusInfo();


}

// see
document.addEventListener('DOMContentLoaded', initPage);
