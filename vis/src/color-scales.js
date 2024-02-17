'use strict';

import chroma from 'chroma-js';

const cache = {};

export function yellowish() {
  if (!cache.yellowish) {
    const vToColor = chroma
        //.scale(['#300000', '#d41111', '#eded5e', '#ffffe6', '#ffffff'])
        // see https://colorbrewer2.org/#type=sequential&scheme=YlOrBr&n=9
        // .scale(['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506'])
        .scale(['#fff7bc', '#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506'])
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
  }
  return cache.yellowish;
}



