'use strict';

import * as d3 from 'd3';
import './vispane.css';
import scalar from './scalar.js';
import * as poll from './poll.js';

export function init(parentD3) {

  var renderDelayDisplay;

  const visComponents = [];
  const animationLoop = poll.animationLoop(dt => {
    if (renderDelayDisplay) {
      renderDelayDisplay.add(dt);
    }
    visComponents.forEach(c => c.render());
  }, 1);

  var dataSource;

  parentD3.classed('pane-for-visualizations', true);
  const bd = parentD3.append('div').classed('display-buttons', true);

  function addTicksDelay() {
    const s = scalar(parentD3, 'Ticks delay')
      .autoScale()
      .valueFormat(d => `${d} ms (${Math.round(10000 / d) / 10} fps)`);
    dataSource.onTick(dt => {
      s.add(dt);
    });
    visComponents.push(s);
  }

  function addRenderDelay() {
    const s = scalar(parentD3, 'Render delay')
      .autoScale()
      .valueFormat(d => `${d} ms (${Math.round(10000 / d) / 10} fps)`);
    renderDelayDisplay = s;
    visComponents.push(s);
  }


  bd.append('a')
    .attr('href', '#')
    .attr('title', 'Add ticks delay display')
    .on('click', () => { event.preventDefault(); addTicksDelay(); })
    .text('Add ticks delay');
  bd.append('br');
  bd.append('a')
    .attr('href', '#')
    .attr('title', 'Add render delay display')
    .on('click', () => { event.preventDefault(); addRenderDelay(); })
    .text('Add render delay');
  bd.append('br');

  const ret = {
    setDataSource : s => {
      dataSource = s;
      return ret;
    },
    start : () => {
      animationLoop.start();
      return ret;
    },
    stop : () => {
      animationLoop.stop();
      return ret;

    },
    reset : () => {
      visComponents.forEach(c => c.reset());
      return ret;
    }
  };
  return ret;
}
