'use strict';

import * as d3 from 'd3';
import './vispane.css';
import scalar from './scalar.js';
import * as poll from './poll.js';

export function init(parentD3) {

  const visComponents = [];
  const animationLoop = poll.animationLoop(() => {
    visComponents.forEach(c => c.render());
  }, 1);

  var dataSource;

  parentD3.classed('pane-for-visualizations', true);
  const bd = parentD3.append('div').classed('display-buttons', true);

  function addTps() {
    const s = scalar(parentD3, 'Ticks delay').autoScale();
    dataSource.onTick(dt => {
      s.add(dt);
    });
    visComponents.push(s);
  }


  bd.append('a')
    .attr('href', '#')
    .attr('title', 'Add tick/s display')
    .on('click', () => { event.preventDefault(); addTps(); })
    .text('Add tps');
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

    }
  };
  return ret;
}
