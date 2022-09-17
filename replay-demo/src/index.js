"use strict";
import _ from 'lodash';
import * as d3 from 'd3';
import './style.css';
import chroma from 'chroma-js';
import cap from '../../data/capture-ppp.txt.gz';


function replay(opts) {
  const lines = opts.lines;
  const callback = opts.cb;

  const start = Date.now();
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
    getTs: () => running ? Date.now() - start : "NOT RUNNING",
    getPp: () => 100 * nextLine / lines.length
  };
  fetch();
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
        v: 0
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
    ddivs.style('background-color', d => vToColor(d.v));
  }

  render();

  var ret = {
    setValue : function(x, y, v) {
      dots[ toIndex(x, y) ].v = v;
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
  for (var i = 0; i < 24; i++) {
    m1.setValue(i, 0, i / 23.0);
  }
  m1.render();
  var m2 = addMatrix(body, { cols: 7, rows: 5 } );

  anima1();

  function r() {
    m1.render();
    fps.tick();
    fps.render();
    requestAnimationFrame(r);
  }

  r();

  const ff = d3.format(".1f");
  replayStatus = replay({
    lines: cap.split('\n'),
    cb: p => {
      var txt;
      if (replayStatus.isRunning()) {
        const ts = replayStatus.getTs();
        const pp = replayStatus.getPp();
        txt = ff(ts / 1000) + " s " + ff(pp) + " %";

      } else {
        txt = "STOPPED";
      }
      pbv.text(txt);
    }
  });

}

// see
document.addEventListener("DOMContentLoaded", initPage);