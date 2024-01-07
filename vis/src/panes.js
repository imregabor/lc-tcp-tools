'use strict';

import * as d3 from 'd3';
import './panes.css';
import * as pb from './playback.js';
import * as ed from './ed.js';


export function init() {
  const events = {
    opened : ed.ed(),

    // Parameters changed; not fired on topology change or node moves
    closed : ed.ed()
  };


  const body = d3.select('body').style('overflow', 'hidden'); // in css it would pollute other pages;
  const ctr = body.append('div').classed('panes-ctr', true);
  const topp = ctr.append('div').classed('panes-ctr', true);
  const topc = topp.append('div').classed('panes-ctr', true);
  const btmp = ctr.append('div').classed('panes-ctr', true);
  const btmc = btmp.append('div').classed('panes-ctr', true);
  var bottomPaneName = 'bottom pane';

  btmp.style('top', 'unset'); // height is set in adjust()

  function getPageHeight() {
    return ctr.node().getBoundingClientRect().height;
  }

  var lastOpenH;
  var minOpenH = 50;

  topp.append('div').classed('panes-tab-border', true);
  const d = topp.append('div').classed('playback-extra-controls playback-extra-controls-toptab panes-to-bottom', true);
  const i1 = d.append('i')
      .classed('fa fa-chevron-up fa-fw', true)
      .on('click', () => {
        const pageHeight = getPageHeight();
        if (ph > 0) {
          lastOpenH = Math.max(minOpenH, ph);
          ph = 0;
        } else {
          if (!lastOpenH) {
            lastOpenH = Math.round(pageHeight * 0.4);
          } else if (lastOpenH > pageHeight * 0.85) {
            lastOpenH = pageHeight * 0.85;
          }
          ph = Math.round(lastOpenH);
        }
        adjust();
      });

  var ph = 0;
  var lastPh = 0;
  adjust();

  var maxh;
  d.call(d3.drag()
      .clickDistance(5)
      .container(ctr)
      .on('start', () => {
        maxh = Math.round(getPageHeight() * 0.85);
        topp.classed('dragging', true);
        btmp.classed('dragging', true);
      })
      .on('end', () => {
        topp.classed('dragging', false);
        btmp.classed('dragging', false);
        if (ph > 0) {
          lastOpenH = Math.max(minOpenH, ph);
        }
      })
      .on('drag', function(e, nd) {
        if (e.dy > 0 && ph > 0) {
          ph = Math.max(0, ph - e.dy);
          if (ph < minOpenH) {
            ph = 0;
          }
          adjust();
        } else if (e.dy < 0 && ph < maxh) {
          ph = Math.min(maxh, ph - e.dy);
          ph = Math.max(minOpenH, ph);
          adjust();
        }
      })
  );

  function adjust() {
    topp.style('bottom', `${ph}px`);
    btmp.style('height', `${ph}px`);
    i1
        .attr('title', ph == 0 ? `Open ${bottomPaneName}` : `Close ${bottomPaneName}`)
        .classed('fa-chevron-up', ph == 0)
        .classed('fa-chevron-down', ph > 0);
    if (lastPh == 0 && ph > 0) {
      events.opened();
    }
    if (lastPh > 0 && ph == 0) {
      events.closed();
    }
    lastPh = ph;
  }


  const ret = {
    bottomPaneName : s => {
      bottomPaneName = s;
      adjust();
      return ret;
    },
    topD3 : () => topc,
    bottomD3 : () => btmc,
    isOpen : () => ph > 0,
    onOpened : h => { events.opened.add(h); return ret; },
    onClosed : h => { events.closed.add(h); return ret; },
  };
  return ret;
}

/**
 * Demo page
 */
export function initPage() {
  const p = init();

  p.onOpened(() => p.topD3().append('div').text('Opened\n'));
  p.onClosed(() => p.topD3().append('div').text('Closed\n'));
  p.topD3().append('div').text('Top pane');
  p.bottomD3().append('div').text('Bottom pane');

}
