'use strict';

import chroma from 'chroma-js';
import * as d3 from 'd3';

const cache = {};

function appendScaleTo(parentD3, scale) {
  parentD3.append('div').text(`${scale.title}:`);
  const cw = 500;
  const ch = 60;
  const canvas = parentD3.append('canvas')
      .attr('width', cw).attr('height', ch);
  const canvas2d = canvas.node().getContext('2d');

  parentD3.append('div').append('pre').text(scale.steps.join(' '));

  for (var i = 0; i < cw; i++) {
    canvas2d.fillStyle = scale(i / (cw - 1));
    canvas2d.fillRect(i, 0, 1, ch / 2);
  }

  for (var i = 0; i < scale.steps.length; i++) {
    canvas2d.fillStyle = scale.steps[i];
    const x0 = Math.floor(cw * i / scale.steps.length);
    const x1 = Math.floor(cw * (i + 1) / scale.steps.length);
    canvas2d.fillRect(x0, ch / 2, x1 - x0, ch / 2);
  }
}

export function initPage() {
  const body = d3.select('body');

  appendScaleTo(body, white());
  appendScaleTo(body, yellowish());
  appendScaleTo(body, yellowishr());
  appendScaleTo(body, incandescent());
  appendScaleTo(body, incandescent2());
  appendScaleTo(body, incandescent3());
}

function chromaToRet(vToColor, steps, title) {
  const colors = [];
  const r = [];
  const g = [];
  const b = [];
  const count = 500;
  for (var i = 0; i < count; i++) {
    const h = vToColor(i / (count - 1));
    colors.push(h);
    const rgb = h.rgb(false);
    r.push(rgb[0] / 255);
    g.push(rgb[1] / 255);
    b.push(rgb[2] / 255);
  }

  const ret = a => {
    if (a < 0) {
      a = 0;
    } else if (a > 1) {
      a = 1;
    }
    return colors[Math.round(a * (count - 1))];
  };
  ret.writeRgb = (a, out, start) => {
    if (a < 0) {
      a = 0;
    } else if (a > 1) {
      a = 1;
    }
    const i = Math.round(a * (count - 1));
    out[start] = r[i];
    out[start + 1] = g[i];
    out[start + 2] = b[i];
  }
  ret.steps = steps;
  ret.title = title;

  return ret;
}

export function white() {
  if (!cache.white) {
    const steps = ['#000000', '#ffffff'];
    const vToColor = chroma
        .scale(steps);
    cache.white = chromaToRet(vToColor, steps, 'white');
  }
  return cache.white;
}

export function yellowish() {
  if (!cache.yellowish) {
    const steps = ['#fff7bc', '#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506', '#301103'];
    const vToColor = chroma
        //.scale(['#300000', '#d41111', '#eded5e', '#ffffe6', '#ffffff'])
        // see https://colorbrewer2.org/#type=sequential&scheme=YlOrBr&n=9
        // .scale(['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506'])
        .scale(steps)
        .correctLightness();
    cache.yellowish = chromaToRet(vToColor, steps, 'yellowish');
  }
  return cache.yellowish;
}

export function yellowishr() {
  if (!cache.yellowishr) {
    const steps = ['#301103', '#662506', '#993404', '#cc4c02', '#ec7014', '#fe9929', '#fec44f', '#fee391', '#fff7bc'];
    const vToColor = chroma
        .scale(steps)
        .correctLightness();
    cache.yellowishr = chromaToRet(vToColor, steps, 'yellowishr');

  }
  return cache.yellowishr;
}

export function incandescent() {
  if (!cache.incandescent) {
    const steps = ['#ff0505', '#ff4f14', '#fba51e', '#ffff89', '#ffffff', '#e6f3ff', '#afd6fd'];
    const vToColor = chroma
        .scale(steps);
    cache.incandescent = chromaToRet(vToColor, steps, 'incandescent');
  }
  return cache.incandescent;
}

export function incandescent2() {
  if (!cache.incandescent2) {
    const steps = [];

    for( var t = 500; t <= 8000; t += 500) {
      steps.push(chroma.temperature(t));
    }
    const vToColor = chroma
        .scale(steps)
        // .correctLightness();
    cache.incandescent2 = chromaToRet(vToColor, steps, 'incandescent2');
  }
  return cache.incandescent2;
}

export function incandescent3() {
  if (!cache.incandescent3) {
    const steps = [];

    for( var t = 1000; t <= 8000; t += 500) {
      var c = chroma.temperature(t).darken(3 * (8000 - t) / 7000);
      steps.push(c);
    }

    const vToColor = chroma
        .scale(steps);
    cache.incandescent3 = chromaToRet(vToColor, steps, 'incandescent3');
  }
  return cache.incandescent3;
}

