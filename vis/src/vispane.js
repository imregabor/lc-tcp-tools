'use strict';

import * as d3 from 'd3';
import './vispane.css';
import visbox from './visbox.js';
import scalar from './scalar.js';
import waveform from './waveform.js';
import spectrum from './spectrum2.js';
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

    var chnlBoxesIcon;
    var chnlTimeSeriesIcon;
    var chnlTimeSeriesAscendingIcon;
    var chnlTimeSeriesAscending = true;
    var chnlBoxesBarsIcon;
    var chnlBoxesBars;
    var chnlTimeSeriesBarsIcon;
    var chnlTimeSeriesBars;
    var pauseIcon;
    var spctMaxfIcon;
    var spctNotesIcon;

    vb.addIcon(
      'fa-music',
      'Display log (musical) frequency scale',
      () => {
        const newState = !spctNotesIcon.isHighlighted();
        spctNotesIcon.setHighlighted(newState);
        spct && spct.setLogScale(newState);
      },
      facade => {
        spctNotesIcon = facade;
        spctNotesIcon.shown(false);
      }
    );

    vb.addIcon(
      '', // text based icon
      'Max displayed frequency',
      () => {
        const oldData = spctMaxfIcon.getData();
        var freq;
        if (!oldData) {
          freq = 1000;
          spctMaxfIcon.text('\u00A01kHz'); // see https://stackoverflow.com/questions/12882885/how-to-add-nbsp-using-d3-js-selection-text-method
        } else if (oldData == 1000) {
          freq = 2000;
          spctMaxfIcon.text('\u00A02kHz');
        } else if (oldData == 2000) {
          freq = 4000;
          spctMaxfIcon.text('\u00A04kHz');
        } else {
          freq = undefined;
          spctMaxfIcon.text('24kHz');
        }
        spctMaxfIcon.setData(freq);
        spct && spct.freqLimit(freq);
      },
      facade => {
        spctMaxfIcon = facade;
        spctMaxfIcon.text('24kHz');
        spctMaxfIcon.shown(false);
      }
    );
    vb.addIcon(
      '', // icon fa class will be overriden
      '', // title will be overriden
      () => {
        chnlBoxesBars = !chnlBoxesBars;
        chnl && chnl.boxesBars(chnlBoxesBars);
        chnlBoxesBarsIcon
            .faclass(chnlBoxesBars ? 'fa-signal' : 'fa-barcode')
            .title(chnlBoxesBars ? 'Change boxes display - now bars' : 'Change boxes display - now colors');
      },
      facade => {
        chnlBoxesBarsIcon = facade;
        chnlBoxesBarsIcon.shown(false);
      });
    vb.addIcon(
      '', // icon fa class will be overriden
      '', // title will be overriden
      () => {
        chnlTimeSeriesBars = !chnlTimeSeriesBars;
        chnl && chnl.timeSeriesBars(chnlTimeSeriesBars);
        chnlTimeSeriesBarsIcon
            .faclass(chnlTimeSeriesBars ? 'fa-signal' : 'fa-barcode')
            .title(chnlTimeSeriesBars ? 'Change time series display - now bars' : 'Change time series display - now colors');
      },
      facade => {
        chnlTimeSeriesBarsIcon = facade;
        chnlTimeSeriesBarsIcon.shown(false);
      });


    vb.addIcon(
      'fa-sort-asc',
      '', // title will be overriden
      () => {
        chnlTimeSeriesAscending = !chnlTimeSeriesAscending;
        chnl && chnl.timeSeriesAscending(chnlTimeSeriesAscending);
        chnlTimeSeriesAscendingIcon
            .faclass(chnlTimeSeriesAscending ? 'fa-sort-asc' : 'fa-sort-desc')
            .title(chnlTimeSeriesAscending ? 'Change time series order - now zero first' : 'Change time series order - now zero last');
      },
      facade => {
        chnlTimeSeriesAscendingIcon = facade;
        chnlTimeSeriesAscendingIcon.shown(false);
      });
    vb.addIcon(
      'fa-ellipsis-h',
      'Show boxes display',
      () => {
        const newState = !chnlBoxesIcon.isHighlighted();
        chnlBoxesIcon.setHighlighted(newState);
        chnl && chnl.showBoxes(newState);
      },
      facade => {
        chnlBoxesIcon = facade;
        chnlBoxesIcon.shown(false);
      });
    vb.addIcon(
      'fa-align-justify',
      'Show time series chart',
      () => {
        const newState = !chnlTimeSeriesIcon.isHighlighted();
        chnlTimeSeriesIcon.setHighlighted(newState);
        chnl && chnl.showTimeSeries(newState);
      },
      facade => {
        chnlTimeSeriesIcon = facade;
        chnlTimeSeriesIcon.shown(false);
      });
    vb.addIcon(
      'fa-pause',
      'Pause',
      () => {
        const newState = !pauseIcon.isHighlighted();
        pauseIcon.setHighlighted(newState);
      },
      facade => {
        pauseIcon = facade;
      });



    const pane = vb.getContentD3();
    var state;
    var sclr;
    var chnl;
    var wave;
    var spct;

    const visComponent = {
      clear : () => {
        pane.selectAll('*').remove();
        sclr = undefined;
        chnl = undefined;
        wave = undefined;
        spct = undefined;

        chnlBoxesIcon.shown(false);
        chnlBoxesBarsIcon.shown(false);
        chnlTimeSeriesBarsIcon.shown(false);
        chnlTimeSeriesIcon.shown(false);
        chnlTimeSeriesAscendingIcon.shown(false);
        spctMaxfIcon.shown(false);
        spctNotesIcon.shown(false);

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
        } else if (wave) {
          wave.render();
        } else if (spct) {
          spct.render();
        }
      },
      cw : w => {
        if (sclr) {
          sclr.cw(w);
        } else if (chnl) {
          chnl.cw(w);
        } else if (wave) {
          wave.cw(w);
        } else if (spct) {
          spct.cw(w);
        }
        return visComponent;
      },
      ch : h => {
        if (sclr) {
          sclr.ch(h);
        } else if (chnl) {
          chnl.ch(h);
        } else if (wave) {
          wave.ch(h);
        } else if (spct) {
          spct.ch(h);
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
            .min(0).max(1)
            .showTimeSeries(true)
            .showBoxes(true)
            .timeSeriesAscending(true)
            .boxesBars(true)
            .timeSeriesBars(true);

          chnlBoxesIcon.shown(true).setHighlighted(true);
          chnlTimeSeriesIcon.shown(true).setHighlighted(true);
          chnlTimeSeriesAscending = true;
          chnlTimeSeriesAscendingIcon
              .shown(true)
              .faclass('fa-sort-asc')
              .title('Change time series order - now zero first');
          chnlBoxesBars = true;
          chnlBoxesBarsIcon
              .shown(true)
              .faclass('fa-signal')
              .title('Change boxes display - now bars');
          chnlTimeSeriesBars = true;
          chnlTimeSeriesBarsIcon
              .shown(true)
              .faclass('fa-signal')
              .title('Change time series display - now bars');
          vb.fireResize();
        }
        chnl.add(values);
      },
      wave: values => {
        if (state !== 'wave') {
          visComponent.clear();
          state = 'wave';
          wave = waveform(pane);
          vb.fireResize();
        }
        wave.add(values);
      },
      spct: (values, maxf) => {
        if (state !== 'spct') {
          visComponent.clear();
          spctMaxfIcon.shown(true).text('24kHz');
          spctNotesIcon.shown(true).setHighlighted(false);
          state = 'spct';
          spct = spectrum(pane);
          vb.fireResize();
        }
        spct.add(values, maxf);
      }

    };
    visComponent.reset();

    const tickHandler = dt => {
      if (pauseIcon.isHighlighted()) {
        return;
      }
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
      if (portState.type === 'samples') {
        visComponent.wave(portState.samples);
        return
      }
      if (portState.type === 'spectrum') {
        visComponent.spct(portState.bins, portState.maxf);
        return;
      }

      visComponent.unsupported(portState.type);
    };
    vb.autoPlace()
      .onResize(() => {
        const w = vb.getContentWidth();
        const h = vb.getContentHeight();
        if (!w || !h) { // TODO investigate
          console.log('Invalid resizes size; w:', w, 'h:', h);
        } else {
          visComponent.cw(w).ch(h);
        }
      })
      .addIcon('fa-refresh', 'Reset this chart', () => visComponent.reset())
      .setCloseable()
      .onClose(() => {
        sclr = undefined;
        chnl = undefined;
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
