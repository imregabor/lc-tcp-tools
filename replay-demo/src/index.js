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


/* See https://patorjk.com/software/taag/#p=display&h=0&v=0&f=Georgia11&t=replay

                               ,,
                             `7MM
                               MM
`7Mb,od8  .gP"Ya  `7MMpdMAo.   MM   ,6"Yb.  `7M'   `MF'
  MM' "' ,M'   Yb   MM   `Wb   MM  8)   MM    VA   ,V
  MM     8M""""""   MM    M8   MM   ,pm9MM     VA ,V
  MM     YM.    ,   MM   ,AP   MM  8M   MM      VVV
.JMML.    `Mbmmd'   MMbmmd'  .JMML.`Moo9^Yo.    ,V
                    MM                         ,V
                  .JMML.                    OOb"

 */

function replay(opts) {
  const lines = opts.lines;
  const callback = opts.cb;

  const start = Date.now();
  var lastTs = start;
  var nextLine = 0;
  var running = true;

  function fetch() {
    var p = [];
    const nowDt = Date.now() - start;

    while (nextLine <  lines.length) {
      const s = lines[nextLine];
      if (s.startsWith('# dt ')) {
        var dt = +s.substring(5);
        if (dt > nowDt) {
          running = true;
          setTimeout(fetch, dt - nowDt);
          break;
        }
        lastTs = dt;
      }
      nextLine++;

      if (s.startsWith('S')) {
        p.push(s);
      }
    }

    if (nextLine >= lines.length) {
      running = false;
    }

    if (p.length > 0) {
      callback(p);
    }
  }

  var ret = {
    isRunning: () => running,
    getTs: () => lastTs,
    getPp: () => 100 * nextLine / lines.length
  };
  fetch();
  return ret;
}


function addFrameCounter(d3sel) {
  var shown;

  const div = d3sel.append('div').classed('frame-counter', true);

  div.append('div').classed('frame-label', true).text('frame:');
  div.append('div').classed('time-label', true).text('time:');

  const fv = div.append('div').classed('frame-value', true);
  const tv = div.append('div').classed('time-value', true);

  var fc = 0;

  const format = d3.format('04d');
  const boxes = [];

  for (var i = 0; i < 20; i++) {
    boxes.push(
      div.append('div').classed('box', true).style('left', (i * 20 + 170) + 'px')
    );
  }

  const ret = {
    show : show => {
      shown = show;
      div.style('display', shown ? 'block' : 'none');
    },
    frame : () => {
      if (!shown) {
        return;
      }

      const box = boxes[ fc % boxes.length ];
      box.classed('on', !box.classed('on'));

      fc = (fc + 1) % 10000;
      fv.text(format(fc));
      tv.text(format(Date.now() % 10000));

    }
  };
  ret.show(true);
  return ret;

}

function attachPerfCounter(d3sel, formatSpec) {
  const maxBufSize = 100;
  const buf = Array(maxBufSize).fill(0);
  const cnt = Array(maxBufSize).fill(0);
  const format = d3.format(formatSpec ?  formatSpec : '.0f');


  var nextToWrite = 0;
  var oldestValid = 0;
  var validCount = 0;
  var cntSum = 0;
  var lastTime ;

  function render() {
    const now = Date.now();
    while (validCount > 0 && buf[oldestValid] < now - 1000) {
      cntSum -= cnt[oldestValid];
      oldestValid = (oldestValid + 1) % maxBufSize;
      validCount --;
    }

    if (validCount < 1) {
      d3sel.text('-----');
    } else if (validCount < 10) {
      const s = Math.round(validCount / 2);
      d3sel.text('*****'.substring(5 - s));
    } else {
      const oldestTime = buf[oldestValid];
      const oldestCount = cnt[oldestValid];
      if (lastTime == oldestTime) {
        d3sel.text('?');
      } else {
        d3sel.text(format(1000 * (cntSum - oldestCount) / (lastTime - oldestTime)));
      }
    }
  }

  const ret = {
    tick : (count) => {
      if (count <= 0) {
        console.log('Invalid count ' + count);
      }
      const now = Date.now();
      lastTime = now;
      if (validCount == maxBufSize) {
        cntSum -= cnt[nextToWrite];
      }
      cntSum += count;
      buf[nextToWrite] = now;
      cnt[nextToWrite] = count;

      nextToWrite = (nextToWrite + 1) % maxBufSize;
      if (validCount == maxBufSize) {
        oldestValid = nextToWrite;
      } else {
        validCount ++;
      }
    },
    render : () => render()
  };
  ret.render();
  return ret;
}

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



function component() {
  const element = document.createElement('div');

  element.innerHTML = _.join(['Hello', 'webpack'], ' ');

  d3.selectAll('abc')
  return element;
}


var m1;
var m2;

var fps;
var pbv;
var replayStatus; 
var packetsPerSec;
var packetGroupsPerSec;

function anima1() {
  for (var i = 0; i < m1.cols(); i++) {
    const ov = m1.getValue(i, 0);
    var nv = ov + 0.05;
    if (nv > 1.0) {
      nv = nv -1.0;
    }
    m1.setValue(i, 0, nv);
  }
  setTimeout(anima1, 50);
}

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

  fpsdiv.append('span').classed('label', true).text('Playback:');
  pbv = fpsdiv.append('span').classed('value', true);

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
  const pageControls = fpsdiv.append('div').classed('page-controls', true);

  const wsLinkIcon = pageControls.append('i').classed('fa fa-link-slash fa-fw stat', true);
  function wsLinkDown() {
    wsLinkIcon.classed('fa-link-slash', true);
    wsLinkIcon.classed('fa-link', false);
    wsLinkIcon.classed('err', true);
    wsLinkIcon.classed('ok', false);
    wsLinkIcon.classed('warn', false);
    wsLinkIcon.attr('title', 'WS link is down');
  }

  function wsLinkUp() {
    wsLinkIcon.classed('fa-link-slash', false);
    wsLinkIcon.classed('fa-link', true);
    wsLinkIcon.classed('err', false);
    wsLinkIcon.classed('ok', true);
    wsLinkIcon.classed('warn', false);
    wsLinkIcon.attr('title', 'WS link is up');
  }

  function wsLinkWarn() {
    wsLinkIcon.classed('fa-link-slash', true);
    wsLinkIcon.classed('fa-link', false);
    wsLinkIcon.classed('err', false);
    wsLinkIcon.classed('ok', false);
    wsLinkIcon.classed('warn', true);
    wsLinkIcon.attr('title', 'WS link is in WARN state');
  }
  wsLinkWarn();

  const srvListeningIcon = pageControls.append('i').classed('fa fa-ear-deaf fa-fw stat', true);
  function srvListeningDown() {
    srvListeningIcon.classed('fa-ear-deaf', true);
    srvListeningIcon.classed('fa-ear-listen', false);
    srvListeningIcon.classed('err', true);
    srvListeningIcon.classed('ok', false);
    srvListeningIcon.classed('warn', false);
    srvListeningIcon.attr('title', 'Server listening connection is down');
  }

  function srvListeningUp() {
    srvListeningIcon.classed('fa-ear-deaf', false);
    srvListeningIcon.classed('fa-ear-listen', true);
    srvListeningIcon.classed('err', false);
    srvListeningIcon.classed('ok', true);
    srvListeningIcon.classed('warn', false);
    srvListeningIcon.attr('title', 'Server listening connection is up');
  }

  function srvListeningWarn() {
    srvListeningIcon.classed('fa-ear-deaf', true);
    srvListeningIcon.classed('fa-ear-listen', false);
    srvListeningIcon.classed('err', false);
    srvListeningIcon.classed('ok', false);
    srvListeningIcon.classed('warn', true);
    srvListeningIcon.attr('title', 'Server listening connection is in WARN state');
  }
  function srvListeningUnknown() {
    srvListeningIcon.classed('fa-ear-deaf', true);
    srvListeningIcon.classed('fa-ear-listen', false);
    srvListeningIcon.classed('err', false);
    srvListeningIcon.classed('ok', false);
    srvListeningIcon.classed('warn', false);
    srvListeningIcon.attr('title', 'Server listening connection is in unknown state');
  }
  srvListeningUnknown();


  const srvFwdConnIcon = pageControls.append('i').classed('fa fa-plug fa-fw stat', true);
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

  pageControls.append('span').classed('sep', true);

  function updateStatusIcons(statusInfo) {
    if (statusInfo.listeningSrvStatus.activeConnectionCount > 0) {
      srvListeningUp();
    } else {
      srvListeningDown();
    }
    if (statusInfo.fwdConnStatus.connected) {
      srvFwdConnUp();
    } else {
      srvFwdConnDown();
    }
  }


  const frameCounterBtn = pageControls.append('i').classed('fa fa-clock', true).attr('title', 'Show/hide precision frame counter');
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

  const infoButton = pageControls.append('i').classed('fa fa-circle-info', true).attr('title', 'Show/hide server status');
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
  // anima1();



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
    wsLinkUp();
  }

  ws.onclose = e => {
    console.log('WS link onclose', e)
    wsLinkDown();
  }

  ws.onerror = e => {
   console.log('WS link onerror', e) 
   wsLinkDown();
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

  /*
  replayStatus = replay({
    lines: cap.split('\n'),
    cb: p => {
      packetGroupsPerSec.tick(1);
      packetsPerSec.tick(p.length);
      for (var s of p) {
        var packet = parsePacket(s);
        mapPacket(packet);
      }
    }
  });
  */
}

// see
document.addEventListener('DOMContentLoaded', initPage);
