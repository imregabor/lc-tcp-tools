'use strict';

import _ from 'lodash';
import * as d3 from 'd3';
import './style.css';
//import cap from '../../data/capture-ppp.txt.gz';
import cap from '../../data/capture-rfd.txt.gz';
import fa from './fa.js';
import parsePacket from './packet-parsing.js';
import * as setup from './current-setup.js';
import addFrameCounter from './add-frame-counter.js';
import attachPerfCounter from './add-perf-counter.js';
import replay from './replay.js';
import * as pageCtr from './page-controls.js';
import * as apiClient from './api-client.js';
import * as lightMatrix from './light-matrix.js';
import qrOverlay from './qr-overlay.js';

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


export function initPage() {
  const body = d3.select('body');

  // Top header ----------------

  const fpsdiv = body.append('div').classed('fps', true);

  fpsdiv
      .append('a').classed('modelink', true).attr('href', '/vis/#catalog').attr('title', 'Start page')
      .append('i').classed('fa fa-home', true);

  fpsdiv
      .append('a').classed('modelink', true).attr('href', '#3d').attr('title', 'Switch to 3D')
      .text('3D');

  fpsdiv
     .append('a').classed('modelink', true).attr('href', '/vis/#vis2').attr('title', 'Switch to effect machine')
     .append('i').classed('fa fa-music', true);


  fpsdiv.append('span').classed('label', true).text('Rendering FPS:');
  const fpsv = fpsdiv.append('span').classed('value', true);
  fps = attachPerfCounter(fpsv);

  const playbackGroup = fpsdiv.append('div').classed('counter-group', true).classed('hidden', true);
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

  const statusInfoDiv = body.append('div').classed('status-info', true).classed('hidden', 'true');
  const statusInfoContent = statusInfoDiv.append('pre');


  // page controls + status -------------------
  const pageControls = pageCtr.addTo(fpsdiv);

  const wsLinkIcon = pageControls.addStatusIcon({
    styles : pageCtr.statusIconStyles.link,
    titles : {
      unknown : 'WS link is in unknown state',
      warn : 'WS link is connecting',
      err : 'WS link is not connected',
      ok : 'WS link is up',
    }
  }).unknown();

  const restApiIcon = pageControls.addStatusIcon({
    styles : pageCtr.statusIconStyles.network,
    titles : {
      unknown : 'REST API availability is unknown',
      warn : 'REST API availability is unknown',
      err : 'REST API is not reachable',
      ok : 'REST API is up',
    }
  }).unknown();


  const srvListeningIcon = pageControls.addStatusIcon({
    styles : pageCtr.statusIconStyles.ear,
    titles : {
      unknown: 'Server listening connection is in unknown state',
      warn: 'Server listening connection is in unknown state',
      err: 'Server listening connection has no connected client',
      ok: 'Client connected to server listening connection'
    }
  }).unknown();

  const srvFwdConnIcon = pageControls.addStatusIcon({
    styles : pageCtr.statusIconStyles.plug,
    titles : {
      unknown : 'Server forwarding connection is in unknown state',
      warn : 'Server forwarding connection is in unknown state',
      err : 'Server forwarding connection is not connected',
      ok : 'Server forwarding connection is connected',
    }
  }).unknown();

  pageControls.sep();

  function updateStatusIconsOk(statusInfo) {
    restApiIcon.ok();
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

  pageControls.addButtonIcon({
    style : pageCtr.buttonIconStyles.send,
    title : 'Send to mobile',
    onClick : () => {
      apiClient.getServerUrls(urls => {
        const overlay = qrOverlay()
          .header('Server listening interfaces')
          .footer('Click/tap or ESC/SPACE/ENTER to close');
        for (const url of urls) {
          overlay.add(url.url, url.name, url.url);
        }
      });
    }
  });

  function updateStatusIconsErr(statusInfo) {
    restApiIcon.err();
    srvListeningIcon.unknown();
    srvFwdConnIcon.unknown();
  }

  const playbackBtn = pageControls.addToggleIcon({
    styles : pageCtr.toggleIconStyles.playStop,
    titles : {
      on : 'Stop packet replay',
      off : 'Start local packet replay'
    },
    onChange : on => {
      playbackGroup.classed('hidden', !on);
      if (replayStatus) {
        playbackBtn.off();
        replayStatus.stop();
        replayStatus = undefined;
      } else {
        playbackBtn.on();
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
            playbackGroup.classed('hidden', true);
            replayStatus = undefined;
            playbackBtn.off();
          }
        });
      }
    }
  });

  const frameCounterBtn = pageControls.addToggleIcon({
    styles : pageCtr.toggleIconStyles.clock,
    title : 'Show/hide precision frame counter',
    onChange : on => frameCounter.show(on)
  });

  const infoButton = pageControls.addToggleIcon({
    styles : pageCtr.toggleIconStyles.info,
    title : 'Show/hide server status',
    onChange : on => {
      if (on) {
        fetchStatusInfo();
      } else {
        statusInfoDiv.classed('hidden', true);
      }
    }
  });

  function pingStatusInfo() {
    apiClient.getStatusInfo(updateStatusIconsOk, updateStatusIconsErr);
  }

  function fetchStatusInfo() {
    apiClient.getStatusInfo(
        response => {
          updateStatusIconsOk(response);
          if (!infoButton.isOn()) {
            statusInfoDiv.classed('hidden', true);
            return;
          }
          statusInfoDiv.classed('hidden', false);
          statusInfoContent.text(JSON.stringify(response, null, 2));
          setTimeout(fetchStatusInfo, 500);
        },
        error => {
          statusInfoDiv.classed('hidden', false);
          statusInfoContent.text("Error fetching status info " + error);
          updateStatusIconsErr(error);
          console.log('Error fetching status info', error);
          setTimeout(fetchStatusInfo, 500);
        }
    );

  }

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

  m1 = lightMatrix.addMatrix(body, {
    cols: 24,
    rows: 1,
    seph: 0.1,
    // padh: 0.2,
    hover : (x, y, v) => {
      apiClient.sendSinglePacket(setup.linear24.toWire(x, y, v));
    },
    sendBulk10 : bulk10 => {
      apiClient.sendBulk10('m1', bulk10);
    },
    sendEffect : e => {
      apiClient.sendEffect('m1', e);
    },
    sendScene : s => {
      apiClient.sendScene('m1', s);
    }
  })
    .call(m => { setLabelsOnMatrix(m, setup.linear24); return m; })
    ;

  /*
  for (var i = 0; i < 24; i++) {
    m1.setValue(i, 0, i / 23.0);
  }
  */
  m1.render();
  m2 = lightMatrix.addMatrix(body, {
    cols: 7,
    rows: 5,
    hover : (x, y, v) => {
      apiClient.sendSinglePacket(setup.matrix35.toWire(x, y, v));
    },
    sendBulk10 : bulk10 => {
      apiClient.sendBulk10('m2', bulk10);
    },
    sendEffect : e => {
      apiClient.sendEffect('m2', e);
    },
    sendScene : s => {
      apiClient.sendScene('m2', s);
    }
  })
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

  apiClient.openWsLink({
    endpoint : '/ws-api/effects',
    onUp : () => {
      wsLinkIcon.ok();
      pingStatusInfo();
    },
    onDown : () => {
      wsLinkIcon.err();
      pingStatusInfo();
    },
    onConnecting : () => {
      wsLinkIcon.warn();
      pingStatusInfo();
    },
    onPackets : packets => {
      packetGroupsPerSec.tick(1);
      packetsPerSec.tick(packets.length);
      for (const packet of packets) {
        mapPacket(parsePacket(packet));
      }
    },
    onStatusChange : () => {
      pingStatusInfo();
    },
    onJson : d => {
      if (d.e === 'scene' && d.v) {
        for (var m of d.m) {
          if (m === 'm1') {
            m1.flashSceneButton(d.v);
          } else if (m === 'm2') {
            m2.flashSceneButton(d.v);
          }
        }
      }
      if (d.e === 'effect' && d.v) {
        for (var m of d.m) {
          if (m === 'm1') {
            m1.setEffectButton(d.v);
          } else if (m === 'm2') {
            m2.setEffectButton(d.v);
          }
        }
      }
    }
  });

  function periodicStatusInfo() {
    pingStatusInfo();
    setTimeout(periodicStatusInfo, 2000);
  }
  periodicStatusInfo();


}

// document.addEventListener('DOMContentLoaded', initPage);
