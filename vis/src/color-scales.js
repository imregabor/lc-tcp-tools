'use strict';

import chroma from 'chroma-js';
import * as d3 from 'd3';

const cache = {};

export function initPage() {
  const body = d3.select('body');
  body.append('div').text('yellowish:');
  const cw = 500;
  const ch = 60;
  const canvas = body.append('canvas')
      .attr('width', cw).attr('height', ch);
  const canvas2d = canvas.node().getContext('2d');
  const scale = yellowish();

  body.append('div').append('pre').text(scale.steps.join(' '));

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
  }
  return cache.yellowish;
}



