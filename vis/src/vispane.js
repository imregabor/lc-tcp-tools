'use strict';

import * as d3 from 'd3';
import './vispane.css';
import visbox from './visbox.js';
import scalar from './scalar.js';
import channels from './channels.js';
import * as poll from './poll.js';
import { showModal } from './mp3-select-dialog.js';
import * as ed from './ed.js';

export function init(parentD3) {

  var renderDelayDisplay;
  var tickDelayDisplay;
  const events = {
    // invoked with tick delay
    tick : ed.ed()
  };


  const visComponents = [];
  function addVisComponent(c) {
    visComponents.push(c);
  }
  function removeVisComponent(c) {
    const i = visComponents.indexOf(c);
    if (i >= 0) {
      visComponents.splice(i, 1);
    }
  }

  const animationLoop = poll.animationLoop(dt => {
    if (renderDelayDisplay) {
      renderDelayDisplay.add(dt);
    }
    visComponents.forEach(c => c.render());
  }, 1);

  var dataSource;

  parentD3.classed('pane-for-visualizations', true);

  const bd = visbox(parentD3, 'Add...')
      .width(170)
      .height(120)
      .autoPlace()
      .setHelpContent('Add various visualization components.')
      .getContentD3();
  // const bd = parentD3.append('div').classed('display-buttons', true).call(d3.drag().clickDistance(5));

  function addTicksDelay() {
    if (tickDelayDisplay) {
      return;
    }
    const vb = visbox(parentD3, 'Tick delay')
      .width(170)
      .height(120);

    const s = scalar(vb.getContentD3(), undefined, true)
      .autoScale()
      .highlightOutliers()
      .valueFormat(d => `${d} ms (${Math.round(10000 / d) / 10} fps)`);

    vb.autoPlace()
      .onResize(() => {
        s.cw(vb.getContentWidth()).ch(vb.getContentHeight());
      })
      .addIcon('fa-refresh', 'Reset this chart', () => s.reset())
      .setHelpContent('Effect pipeline tick loop delay / framerate')
      .setCloseable()
      .onClose(() => {
        tickDelayDisplay = undefined;
        removeVisComponent(s);
      })
      .zoomIn(true)

    tickDelayDisplay = s;
    addVisComponent(s);
  }

  function addRenderDelay() {
    if (renderDelayDisplay) {
      return;
    }
    const vb = visbox(parentD3, 'Render delay')
      .width(170)
      .height(120);

    const s = scalar(vb.getContentD3(), undefined, true)
      .autoScale()
      .highlightOutliers()
      .valueFormat(d => `${d} ms (${Math.round(10000 / d) / 10} fps)`);

    vb.autoPlace()
      .onResize(() => {
        s.cw(vb.getContentWidth()).ch(vb.getContentHeight());
      })
      .addIcon('fa-refresh', 'Reset this chart', () => s.reset())
      .setHelpContent('Browser rendering loop delay / framerate display.')
      .setCloseable()
      .onClose(() => {
        renderDelayDisplay = undefined;
        removeVisComponent(s);
      })
      .zoomIn(true)

    renderDelayDisplay = s;
    addVisComponent(s);
  }

  function selectPortDialog(handler) {
    if (!dataSource) {
      return;
    }
    const ports = dataSource.getPortStateInfos();
    showModal({
      title: 'Select port',
      resolve : e => handler(e)
    }).appendResolvingList(ports, p => p.nodeLabel, p => p.portLabel);
  }

  function addPortState(portDesc) {
    console.log('Add port state visualization', portDesc);
    const vb = visbox(parentD3, `${portDesc.nodeLabel}/${portDesc.portLabel}`)
      .width(170)
      .height(120);


    const pane = vb.getContentD3();
    var state;
    var sclr;
    var chnl;

    const visComponent = {
      clear : () => {
        pane.selectAll('*').remove();
        sclr = undefined;
        chnl = undefined;
      },
      reset : () => {
        if (state === 'init') {
          return
        }
        visComponent.clear();
        pane.append('span').text('?');
        state = 'init';
      },
      render : () => {
        if (sclr) {
          sclr.render();
        } else if (chnl) {
          chnl.render();
        }
      },
      cw : w => {
        if (sclr) {
          sclr.cw(w);
        } else if (chnl) {
          chnl.cw(w);
        }
        return visComponent;
      },
      ch : h => {
        if (sclr) {
          sclr.ch(h);
        } else if (chnl) {
          chnl.ch(h);
        }
        return visComponent;
      },
      noPort : () => {
        if (state === 'noPort') {
          return
        }
        visComponent.clear();
        pane.append('span').text('Port not found');
        state = 'noPort';
      },
      unsupported: kind => {
        if (state === 'unsupported') {
          return
        }
        visComponent.clear();
        pane.append('span').text('Unsupported type: ' + kind);
        state = 'unsupported';
      },
      scalar : value => {
        if (state !== 'scalar') {
          visComponent.clear();
          state = 'scalar';
          sclr = scalar(pane, undefined, true)
            .min(0).max(0)
            .autoScale();
          vb.fireResize();
        }
        sclr.add(value);
      },
      channels : values => {
        if (state !== 'channels') {
          visComponent.clear();
          state = 'channels';
          chnl = channels(pane)
            .min(0).max(1);
          vb.fireResize();
        }
        chnl.add(values);
      }

    };
    visComponent.reset();

    const tickHandler = dt => {
      const portState = dataSource.getPortState(portDesc.portStateId);
      if (!portState) {
        visComponent.noPort();
        return;
      }
      if (portState.type === 'scalar') {
        visComponent.scalar(portState.value);
        return;
      }
      if (portState.type === 'channels') {
        visComponent.channels(portState.channels);
        return
      }

      visComponent.unsupported(portState.type);
    };
    vb.autoPlace()
      .onResize(() => {
        visComponent.cw(vb.getContentWidth()).ch(vb.getContentHeight());
      })
      .addIcon('fa-refresh', 'Reset this chart', () => visComponent.reset())
      .setCloseable()
      .onClose(() => {
        renderDelayDisplay = undefined;
        sclr = undefined;
        removeVisComponent(visComponent);
        events.tick.remove(tickHandler);
      })
      .zoomIn(true);


    addVisComponent(visComponent);
    events.tick.add(tickHandler);

  }

  function resetAll() {
    visComponents.forEach(c => c.reset());
  }


  /*
  bd.append('a')
    .attr('href', '#')
    .attr('title', 'Add a visbox')
    .on('click', () => {
      event.preventDefault();
      visbox(parentD3, 'This is visbox')
          .setCloseable()
          .width(300)
          .height(125)
          .autoPlace()
          .zoomIn();
    })
    .text('Add a visbox');
  bd.append('br');
  */

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
  bd.append('a')
    .attr('href', '#')
    .attr('title', 'Add a port state visualization')
    .on('click', () => {
      event.preventDefault();
      selectPortDialog(d => addPortState(d));
    })
    .text('Add port state');
  bd.append('br');
  bd.append('a')
    .attr('href', '#')
    .attr('title', 'Reset all')
    .on('click', () => { event.preventDefault(); resetAll(); })
    .text('Reset all displays');
  bd.append('br');

  const ret = {
    setDataSource : s => {
      dataSource = s;
      dataSource.onTick(dt => {
        if (tickDelayDisplay) {
          tickDelayDisplay.add(dt);
        }
        events.tick(dt);
      });
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
      resetAll();
      return ret;
    }
  };
  return ret;
}
