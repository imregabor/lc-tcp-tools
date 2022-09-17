"use strict";
import _ from 'lodash';
import * as d3 from 'd3';
import './style.css';
import chroma from 'chroma-js';
//import cap from '../../data/capture-ppp.txt.gz';
import cap from '../../data/capture-rfd.txt.gz';


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


function attachPerfCounter(d3sel) {
  const buf = [];
  const bufSize = 100;
  var next = 0;

  function render() {
    if (buf.length < 2) {
      d3sel.text("N / A");
    } else {
      const now = Date.now();
      const first = buf[ next ];

      if (now == first) {
        d3sel.text("?");
      } else {
        d3sel.text("" + Math.round(1000 * buf.length / (now - first)));
      }
    }
  }

  const ret = {
    tick : () => {
      const now = Date.now();
      if (buf.length < bufSize) {
        buf.push(now);
        next = 0;
      } else {
        buf[next] = now;
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
        t: 0
      }
      dots.push(dot);
    }
  }

  var cnt = parentD3.append('div')
    .classed('matrix-container', true)
    .style('width', (opts.cols * dotSize + (opts.cols - 1) * dotSeparation + 2 * containerPadding) + "px")
    .style('height', (opts.rows * dotSize + (opts.rows - 1) * dotSeparation + 2 * containerPadding) + "px");

  var ddivs = cnt.selectAll('.matrix-dot').data(dots).enter().append('div')
    .classed('matrix-dot', true)
    .style('width', dotSize + "px")
    .style('height', dotSize + "px")
    .style('left', d => (d.x * (dotSize + dotSeparation) + containerPadding) + "px")
    .style('top', d => (d.y * (dotSize + dotSeparation) + containerPadding) + "px")
    
    .attr("title", d => "Index: " + d.i);

  function render() {
    for (var d of dots) {
      d.v = d.v - (d.v - d.t) * 0.5;
    }
    ddivs.style('background-color', d => vToColor(d.v * d.v));
  }

  render();

  var ret = {
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

function initPage() {
  const body = d3.select('body');

  const fpsdiv = body.append('div').classed("fps", true);
  fpsdiv.append("span").classed("label", true).text("Rendering FPS:");
  const fpsv = fpsdiv.append("span").classed("value", true);
  fps = attachPerfCounter(fpsv);

  fpsdiv.append("span").classed("label", true).text("Playback:");
  pbv = fpsdiv.append("span").classed("value", true);

  m1 = addMatrix(body, { cols: 24, rows: 1, sep: 0.1, pad: 0.2 } );

  /*
  for (var i = 0; i < 24; i++) {
    m1.setValue(i, 0, i / 23.0);
  }
  */
  m1.render();
  m2 = addMatrix(body, { cols: 5, rows: 7 } );
  m2.render();
  // anima1();

  function r() {
    m1.render();
    m2.render();
    fps.tick();
    fps.render();
    requestAnimationFrame(r);
  }

  r();

  const ff = d3.format(".1f");
  replayStatus = replay({
    lines: cap.split('\n'),
    cb: p => {
      for (var s of p) {
        var packet = parsePacket(s);

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

      // should be in the rendering loop
      const ts = replayStatus.getTs();
      const pp = replayStatus.getPp();
      var txt = ff(ts / 1000) + " s " + ff(pp) + " %";
      if (!replayStatus.isRunning()) {
        txt = txt + " (STOPPED)"
      }
      pbv.text(txt);
    }
  });

}

// see
document.addEventListener("DOMContentLoaded", initPage);