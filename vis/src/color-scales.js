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
}

export function white() {
  if (!cache.white) {
    const steps = ['#000000', '#ffffff'];
    const vToColor = chroma
        .scale(steps);
    const colors = [];
    const count = 500;
    for (var i = 0; i < count; i++) {
      colors.push(vToColor(i / (count - 1)));
    }

    cache.white = a => {
      if (a < 0) {
        a = 0;
      } else if (a > 1) {
        a = 1;
      }
      return colors[Math.round(a * (count - 1))];
    };
    cache.white.steps = steps;
    cache.white.title = 'white';
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
    const colors = [];
    const count = 500;
    for (var i = 0; i < count; i++) {
      colors.push(vToColor(i / (count - 1)));
    }

    cache.yellowish = a => {
      if (a < 0) {
        a = 0;
      } else if (a > 1) {
        a = 1;
      }
      return colors[Math.round(a * (count - 1))];
    };
    cache.yellowish.steps = steps;
    cache.yellowish.title = 'yellowish';
  }
  return cache.yellowish;
}

export function yellowishr() {
  if (!cache.yellowishr) {
    const steps = ['#301103', '#662506', '#993404', '#cc4c02', '#ec7014', '#fe9929', '#fec44f', '#fee391', '#fff7bc'];
    const vToColor = chroma
        .scale(steps)
        .correctLightness();
    const colors = [];
    const count = 500;
    for (var i = 0; i < count; i++) {
      colors.push(vToColor(i / (count - 1)));
    }

    cache.yellowishr = a => {
      if (a < 0) {
        a = 0;
      } else if (a > 1) {
        a = 1;
      }
      return colors[Math.round(a * (count - 1))];
    };
    cache.yellowishr.steps = steps;
    cache.yellowishr.title = 'yellowishr';
  }
  return cache.yellowishr;
}


