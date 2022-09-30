"use strict";
import _ from 'lodash';
import * as d3 from 'd3';
import './style.css';
import chroma from 'chroma-js';
//import cap from '../../data/capture-ppp.txt.gz';
import cap from '../../data/capture-rfd.txt.gz';
import fa from "./fa.js";


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
      if (s.startsWith("# dt ")) {
        var dt = +s.substring(5);
        if (dt > nowDt) {
          running = true;
          setTimeout(fetch, dt - nowDt);
          break;
        }
        lastTs = dt;
      }
      nextLine++;

      if (s.startsWith("S")) {
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

function parsePacket(s) {
  if (!s.startsWith('S')) {
    console.log('Invalid frame ' + s);
    return
  }
  var ret = {
    a: [],
    d: []
  };

  var i = 1;
  while (i < s.length - 3) {
    ret.a.push(parseInt(s.substring(i + 0, i + 2), 16));
    ret.d.push(parseInt(s.substring(i + 2, i + 4), 16));
    i+= 4;
  }

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
  const buf = [];
  const cnt = [];
  var rollingCount = 0;
  const format = d3.format(formatSpec ?  formatSpec : ".0f");

  const bufSize = 100;
  var next = 0;

  function render() {
    if (buf.length < 2) {
      d3sel.text("----");
    } else {
      const now = Date.now();
      const first = buf[ next ];

      if (now == first) {
        d3sel.text("?");
      } else {
        d3sel.text(format(1000 * rollingCount / (now - first)));
      }
    }
  }

  const ret = {
    tick : (count) => {
      if (count <= 0) {
        console.log("Invalid count " + count);
      }
      const now = Date.now();
      if (buf.length < bufSize) {
        buf.push(now);
        cnt.push(count);
        rollingCount += count;
        next = 0;
      } else {
        rollingCount -= cnt[next];
        rollingCount += count;
        buf[next] = now;
        cnt[next] = count;
        next = (next + 1) % buf.length;
      }
    },
    render : () => render()
  };
  ret.render();
  return ret;
}


function addMatrix(parentD3, opts) {
  const containerPadding = (opts.pad ? opts.pad : 1.0) * 60;
  const dotSeparation = (opts.sep ? opts.sep : 1.0) * 40;
  const dotSize = 30;

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
        infoText: x + ":" + y
      }
      dots.push(dot);
    }
  }

  var cnt = parentD3.append('div')
    .classed('matrix-container hide-info', true)
    .style('width', (opts.cols * dotSize + (opts.cols - 1) * dotSeparation + 2 * containerPadding) + "px")
    .style('height', (opts.rows * dotSize + (opts.rows - 1) * dotSeparation + 2 * containerPadding) + "px");



  var topLabel = cnt.append("span").classed("container-label top", true).text("top label");
  var bottomLabel = cnt.append("span").classed("container-label bottom", true).text("bottom label");
  var leftLabel = cnt.append("span").classed("container-label left", true).text("left label");
  var rightLabel = cnt.append("span").classed("container-label right", true).text("right label");

  // controls over labels
  var ctrls = cnt.append("div").classed("controls", true);
  var infoButton = ctrls.append("i").classed("fa fa-circle-info", true).attr('title', 'Show/hide info annotations');
  ctrls.append('i').classed('fa fa-rotate-right', true).attr('title', 'Rotate display right');
  ctrls.append('i').classed('fa fa-rotate-left', true).attr('title', 'Rotate display left');
  ctrls.append('i').classed('fa fa-left-right', true).attr('title', 'Flip display horizontally');
  ctrls.append('i').classed('fa fa-up-down', true).attr('title', 'Flip display vertically');


  infoButton.on("click", () => { 
    const toOn = cnt.classed("hide-info");
    infoButton.classed("on", toOn);
    cnt.classed("hide-info", !toOn); 
  });


  var ddivs = cnt.selectAll('.matrix-dot').data(dots).enter().append('div')
    .classed('matrix-dot', true)
    .style('width', dotSize + "px")
    .style('height', dotSize + "px")
    .style('left', d => (d.x * (dotSize + dotSeparation) + containerPadding) + "px")
    .style('top', d => (d.y * (dotSize + dotSeparation) + containerPadding) + "px")
    
    .attr("title", d => "Index: " + d.i);

  var infoTexts = ddivs.append("div").classed("info-detail", true);
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

// map packet to lights
function mapPacket(packet) {
  // Translate to (Effect *)  new EightBulbEffect( "Nyolcizzo 1 on port 6", 6, 0x28 ,8 ) ;
  if (packet.a.length > 6) {
    const a = packet.a[6];
    const d = packet.d[6];
    if (a >= 0x28 && a < 0x28 + 8) {
      const li = 1.0 - (d - 2) / 118;
      m1.setValue(a - 0x28, 0, li);
    }
  }

  // Translate to (Effect *)  new EightBulbEffect( "Nyolcizzo 2 on port 7", 7, 0x28 ,8 ) ;
  if (packet.a.length > 7) {
    const a = packet.a[7];
    const d = packet.d[7];
    if (a >= 0x20 && a < 0x28 + 8) {

      const li = 1.0 - (d - 2) / 118;
      m1.setValue(8 + a - 0x28, 0, li);
    }
  }

  // Translate to (Effect *)  new EightBulbEffect( "Nyolcizzo 3 on port 4", 4, 0x20 ,8) ;
  if (packet.a.length > 4) {
    const a = packet.a[4];
    const d = packet.d[4];
    if (a >= 0x20 && a < 0x20 + 8) {

      const li = 1.0 - (d - 2) / 118;
      m1.setValue(16 + a - 0x20, 0, li);
    }
  }

  //  mods[ 4 ] = (Effect *)  new LightMatrix( "Light Matrix on Bus B0(R0),B1(R1-2),B2(R3-4),B3(R5-6)", 7, 5 );
  // This is tricky
  // Address map:

  // ROW BUS  <5>  <4>  <3>  <2>  <1>
  //           0    1    2    3    4
  //  0   0   0x34 0x33 0x32 0x31 0x30
  //  1   1   0x35 0x36 0x37 0x38 0x39 (reversed!)
  //  2   1   0x3e 0x3d 0x3c 0x3b 0x3a
  //  3   2   0x43 0x42 0x41 0x40 0x3f
  //  4   2   0x48 0x47 0x46 0x45 0x44
  //  5   3   0x4d 0x4c 0x4b 0x4a 0x49
  //  6   3   0x52 0x51 0x50 0x4f 0x4e

  if (packet.a.length > 3) {
    const a0 = packet.a[0];
    const d0 = packet.d[0];
    const a1 = packet.a[1];
    const d1 = packet.d[1];
    const a2 = packet.a[2];
    const d2 = packet.d[2];
    const a3 = packet.a[3];
    const d3 = packet.d[3];
    const li0 = 1.0 - (d0 - 2) / 118;
    const li1 = 1.0 - (d1 - 2) / 118;
    const li2 = 1.0 - (d2 - 2) / 118;
    const li3 = 1.0 - (d3 - 2) / 118;

    if (a0 >= 0x30 && a0 <= 0x34) { m2.setValue(0x34 - a0, 0, li0); }
    if (a1 >= 0x35 && a1 <= 0x39) { m2.setValue(a1 - 0x35, 1, li1); }
    if (a1 >= 0x3a && a1 <= 0x3e) { m2.setValue(0x3e - a1, 2, li1); }
    if (a2 >= 0x3f && a2 <= 0x43) { m2.setValue(0x43 - a2, 3, li2); }
    if (a2 >= 0x44 && a2 <= 0x48) { m2.setValue(0x48 - a2, 4, li2); }
    if (a3 >= 0x49 && a3 <= 0x4d) { m2.setValue(0x4d - a3, 5, li3); }
    if (a3 >= 0x4e && a3 <= 0x52) { m2.setValue(0x52 - a3, 6, li3); }

  }

}

function initPage() {
  const body = d3.select('body');

  // Top header ----------------

  const fpsdiv = body.append('div').classed("fps", true);
  fpsdiv.append("span").classed("label", true).text("Rendering FPS:");
  const fpsv = fpsdiv.append("span").classed("value", true);
  fps = attachPerfCounter(fpsv);

  fpsdiv.append("span").classed("label", true).text("Playback:");
  pbv = fpsdiv.append("span").classed("value", true);

  fpsdiv.append("span").classed("label", true).text("Data packets / s:");
  const ppsdiv = fpsdiv.append("span").classed("value", true);
  packetsPerSec = attachPerfCounter(ppsdiv, ".1f");

  fpsdiv.append("span").classed("label", true).text("Packet groups / s:");
  const pgpsdiv = fpsdiv.append("span").classed("value", true);
  packetGroupsPerSec = attachPerfCounter(pgpsdiv, ".1f");


  const frameCounter = addFrameCounter(body);
  frameCounter.show(false);


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

  const frameCounterBtn = pageControls.append('i').classed('fa fa-clock', true).attr('title', 'Show/hide precision frame counter');
  frameCounterBtn.on('click', () => {
    const next = !frameCounterBtn.classed('on');
    frameCounter.show(next);
    frameCounterBtn.classed('on', next);
  });


  m1 = addMatrix(body, { cols: 24, rows: 1, sep: 0.1, pad: 0.2 } )
    .leftLabelText("thujas")
    .rightLabelText("road")
    .topLabelText("")
    .bottomLabelText("")
    .infoText( 0 + 0, 0, "6:28") // bus 6
    .infoText( 0 + 1, 0, "6:29")
    .infoText( 0 + 2, 0, "6:2a")
    .infoText( 0 + 3, 0, "6:2b")
    .infoText( 0 + 4, 0, "6:2c")
    .infoText( 0 + 5, 0, "6:2d")
    .infoText( 0 + 6, 0, "6:2e")
    .infoText( 0 + 7, 0, "6:2f")
    .infoText( 8 + 0, 0, "7:28") // bus 7
    .infoText( 8 + 1, 0, "7:29")
    .infoText( 8 + 2, 0, "7:2a")
    .infoText( 8 + 3, 0, "7:2b")
    .infoText( 8 + 4, 0, "7:2c")
    .infoText( 8 + 5, 0, "7:2d")
    .infoText( 8 + 6, 0, "7:2e")
    .infoText( 8 + 7, 0, "7:2f")
    .infoText(16 + 0, 0, "4:28") // bus 4
    .infoText(16 + 1, 0, "4:29")
    .infoText(16 + 2, 0, "4:2a")
    .infoText(16 + 3, 0, "4:2b")
    .infoText(16 + 4, 0, "4:2c")
    .infoText(16 + 5, 0, "4:2d")
    .infoText(16 + 6, 0, "4:2e")
    .infoText(16 + 7, 0, "4:2f")
    ;

  /*
  for (var i = 0; i < 24; i++) {
    m1.setValue(i, 0, i / 23.0);
  }
  */
  m1.render();
  m2 = addMatrix(body, { cols: 5, rows: 7 } )
    .topLabelText("thujas")
    .bottomLabelText("road")
    .leftLabelText("building")
    .rightLabelText("garden")
    .infoText(4, 0, "0:30") // row 0
    .infoText(3, 0, "0:31")
    .infoText(2, 0, "0:32")
    .infoText(1, 0, "0:33")
    .infoText(0, 0, "0:34")
    .infoText(4, 1, "1:39") // row 1
    .infoText(3, 1, "1:38")
    .infoText(2, 1, "1:37")
    .infoText(1, 1, "1:36")
    .infoText(0, 1, "1:35")
    .infoText(4, 2, "1:3a") // row 2
    .infoText(3, 2, "1:3b")
    .infoText(2, 2, "1:3c")
    .infoText(1, 2, "1:3d")
    .infoText(0, 2, "1:3e")
    .infoText(4, 3, "2:3f") // row 3
    .infoText(3, 3, "2:40")
    .infoText(2, 3, "2:41")
    .infoText(1, 3, "2:42")
    .infoText(0, 3, "2:43")
    .infoText(4, 4, "2:44") // row 4
    .infoText(3, 4, "2:45")
    .infoText(2, 4, "2:46")
    .infoText(1, 4, "2:47")
    .infoText(0, 4, "2:48")
    .infoText(4, 5, "3:49") // row 5
    .infoText(3, 5, "3:4a")
    .infoText(2, 5, "3:4b")
    .infoText(1, 5, "3:4c")
    .infoText(0, 5, "3:4d")
    .infoText(4, 6, "3:4e") // row 6
    .infoText(3, 6, "3:4f")
    .infoText(2, 6, "3:50")
    .infoText(1, 6, "3:51")
    .infoText(0, 6, "3:52")
    ;
  m2.render();
  // anima1();



  const ff = d3.format(".1f");
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
      var txt = ff(ts / 1000) + " s " + ff(pp) + " %";
      if (!replayStatus.isRunning()) {
        txt = txt + " (STOPPED)"
      }
      pbv.text(txt);
    }

  }

  r();



  const ws = new WebSocket('ws://localhost:8080');

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
      if (s.startsWith("S")) {
        pgs++;
        mapPacket(parsePacket(s));
      }
    }
    if (pgs > 0) {
      packetGroupsPerSec.tick(1);
      packetsPerSec.tick(pgs);
    }
  }


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
document.addEventListener("DOMContentLoaded", initPage);