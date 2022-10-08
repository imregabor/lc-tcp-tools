"use strict";


import * as d3 from 'd3';
import './frame-counter.css';

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
      shown = !!show;
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

export default addFrameCounter;
