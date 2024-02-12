'use strict';

import './channels.css';
import * as d3 from 'd3';
import '@fortawesome/fontawesome-free/css/all.css'
import chroma from 'chroma-js';


export default function addTo(parentD3) {
  const canvas = parentD3.append('canvas').attr('width', 800).attr('height', 64);
  const canvas2d = canvas.node().getContext('2d');
  const overflowIcon = parentD3.append('i')
      .classed('fa fa-caret-down channels-bottom-overflow-warn', true)
      .attr('title', 'Cannot fit all channels to the current display size')
      .style('display', 'none');

  // canvas size
  var cw = 800;
  var ch = 64;

  // global scaling and settins
  var initialMin = 0; // set for the component; used on reset
  var initialMax = 1;
  var min = initialMin; // tracked dynamically; discarded to initial value on reset
  var max = initialMax;
  var channels = undefined;
  var needsClear = false;

  // state for boxes (instantenous value) display
  var showBoxes = true;
  var boxWidth;
  var boxHsep;
  var boxX0;
  var boxValues;
  var boxesBars = true;

  // state for time series
  var showTimeSeries = true;
  var timeSeriesAscending = true;
  var vals;
  var nextCx = 0; // next X value to store
  var lastCx = 0; // last X value plotted
  var channelsY0 = undefined;
  var channelHeight = undefined;
  var channelSep = undefined;
  var timeSeriesBars = true;

  var wraparound; // wrap around happened: all data in buffers are valid

   const vToColor = chroma
    //.scale(['#300000', '#d41111', '#eded5e', '#ffffe6', '#ffffff'])
    // see https://colorbrewer2.org/#type=sequential&scheme=YlOrBr&n=9
    // .scale(['#ffffe5','#fff7bc','#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506'])
    .scale(['#fff7bc', '#fee391','#fec44f','#fe9929','#ec7014','#cc4c02','#993404','#662506'])
    .correctLightness();

  function aToColor(a) {
    if (a < 0) {
      a = 0;
    } else if (a > 1) {
      a = 1;
    }
    return vToColor(a);
  }

  function clear() {
    canvas2d.clearRect(0,0,cw,ch);
    channelsY0 = 0;


    if (channels) {
      var overflowDown = false;

      if (showBoxes) {
        boxHsep = Math.round( 0.15 * cw / channels );
        if (boxHsep < 1) {
          boxHsep = 1;
        } else if (boxHsep > 5) {
          boxHsep = 5;
        }

        boxWidth = Math.floor((cw - (channels - 1) * boxHsep ) / channels);
        if (boxWidth < 3) {
          boxWidth = 3;
        } else if (boxWidth > ch) {
          boxWidth = ch;
        }

        boxX0 = Math.round((cw - (channels - 1) * boxHsep - channels * boxWidth) / 2 );
        if (boxX0 < 0) {
          boxX0 = 0;
        }

        canvas2d.fillStyle = '#eee';
        for (var i = 0; i < channels; i++) {
          canvas2d.fillRect(boxX0 + i * (boxWidth + boxHsep), 0, boxWidth, boxWidth);
        }

        if (!boxValues || boxValues.length !== channels) {
          boxValues = new Array(channels);
        }

        channelsY0 = boxWidth + boxHsep;
      }

      if (showTimeSeries) {
        if (wraparound) {
          lastCx = (nextCx + 1) % cw;
        } else {
          lastCx = 0;
        }


        channelSep = Math.round(0.15 * (ch - channelsY0) / channels);
        if (channelSep < 1) {
          channelSep = 1;
        } else if (channelSep > 5) {
          channelSep = 5;
        }
        channelHeight = Math.floor((ch - channelsY0 - (channels - 1) * channelSep )/ channels);
        if (channelHeight < 3) {
          channelHeight = 3;
        }

        canvas2d.fillStyle = '#eee';
        for (var i = 0; i < channels; i++) {
          canvas2d.fillRect(0, channelsY0 + (channelHeight + channelSep) * i, cw, channelHeight);
        }

        if (!vals || vals.length !== channels || vals[0].length !== cw) {
          vals = [];
          for (var i = 0; i < channels; i++) {
            vals.push(new Array(cw));
          }
        }

        overflowDown = channelsY0 + channelHeight * channels + channelSep * (channels - 1) > ch;
      } else {
        wraparound = false;
        lastCx = 0;
        nextCx = 0;
      }

      overflowIcon.style('display',  overflowDown ? '' : 'none');
    }
  }

  function reset() {
    clear();
    wraparound = false;
    nextCx = 0;
    lastCx = 0;
    min = initialMin;
    max = initialMax;

    if (showBoxes && channels) {
      boxValues = new Array(channels);
    } else {
      boxValues = undefined;
    }

    if (showTimeSeries && channels) {
      vals = [];
      for (var i = 0; i < channels; i++) {
        vals.push(new Array(cw));
      }
    } else {
      vals = undefined;
    }

  }

  function updateCanvasSize(x, y) {

    cw = x;
    ch = y;
    canvas.attr('width', cw);
    canvas.attr('height', ch);

    reset();

  }
  updateCanvasSize(cw, ch);

  var fresh = true;
  const ret = {
    boxesBars : v => {
      if (boxesBars === !!v) {
        return ret;
      }
      boxesBars = !!v;
      clear();
      return ret;
    },
    timeSeriesBars : v => {
      if (timeSeriesBars === !!v) {
        return ret;
      }
      timeSeriesBars = !!v;
      clear();
      return ret;
    },
    timeSeriesAscending : v => {
      if (timeSeriesAscending === !!v) {
        return ret;
      }
      timeSeriesAscending = !!v;
      clear();
      return ret;
    },
    showTimeSeries : v => {
      if (showTimeSeries === !!v) {
        return ret;
      }
      showTimeSeries = !!v;
      clear();
      return ret;
    },
    showBoxes : v => {
      if (showBoxes === !!v) {
        return ret;
      }
      showBoxes = !!v;
      clear();
      return ret;
    },
    min : v => {
      initialMin = v;
      min = initialMin;;
      needsClear = true;
      return ret;
    },
    max : v => {
      initialMax = v;
      max = initialMax;
      needsClear = true;
      return ret;
    },
    ch : v => {
      updateCanvasSize(cw, Math.max(v, 10));
      return ret;
    },
    cw : v => {
      updateCanvasSize(Math.max(v, 10), ch);
      return ret;
    },
    add : values => {
      if (!channels || values.length !== channels) {
        channels = values.length;
        reset();
      }

      if (showBoxes) {
        for (var i = 0; i < channels; i++) {
          const v = values[i];
          if (fresh) {
            boxValues[i] = v;
          } else {
            boxValues[i] = Math.max(boxValues[i], v);
          }

          if (v > max) {
            max = v * 1.25;
            needsClear = true;
          }
        }
        fresh = false;
      }

      if (showTimeSeries) {
        for (var i = 0; i < channels; i++) {
          const v = values[i];
          vals[i][nextCx] = v;
          if (v > max) {
            max = v * 1.25;
            needsClear = true;
          }
        }

        nextCx = (nextCx + 1) % cw;
        if (nextCx === 0) {
          wraparound = true;
        }
        if (nextCx === lastCx) {
          lastCx = (lastCx + 1) % cw;
        }
      }
      return ret;
    },
    clear : () => {
      clear();
      return ret;
    },
    reset : () => {
      return ret;
    },
    render : () => {
      if (needsClear) {
        clear();
        needsClear = false;
      }
      fresh = true;
      if (showBoxes && boxValues) {
        for (var i = 0; i < channels; i++) {
          const v = boxValues[i];
          const x = boxX0 + i * (boxWidth + boxHsep);

          if (boxesBars) {
            var h = Math.round(boxWidth * (v - min) / (max - min));
            if (h < 1) {
              h = 1;
            } else if (h >= boxWidth) {
              h = boxWidth - 1;
            }

            canvas2d.fillStyle = '#eee';
            canvas2d.fillRect(x, 0, boxWidth, boxWidth - h);

            canvas2d.fillStyle = 'steelblue';
            canvas2d.fillRect(x, boxWidth - h, boxWidth, h);
          } else {

            canvas2d.fillStyle = aToColor((v - min) / (max - min));
            canvas2d.fillRect(x, 0, boxWidth, boxWidth);
          }
        }
      }
      if (showTimeSeries && vals) {
        while(lastCx !== nextCx && nextCx < cw) { // note possible race with resize
          for (var i = 0; i < channels; i++) {
            const cy0 = channelsY0 + (channelHeight + channelSep) * (timeSeriesAscending ? i : channels - i - 1);
            const v = (vals[i][lastCx] - min) / (max - min);
            const clearX = (lastCx + 20) % cw;
            canvas2d.fillStyle = '#eee';
            canvas2d.fillRect(clearX, channelsY0 + (channelHeight + channelSep) * i, 1, channelHeight);

            if (timeSeriesBars) {
              var h = Math.round(channelHeight * v);
              if (h < 1) {
                h = 1;
              } else if (h > channelHeight) {
                h = channelHeight;
              }

              const y0 = cy0 + channelHeight - h;

              canvas2d.fillStyle = 'steelblue';
              canvas2d.fillRect(lastCx, y0, 1, h);
            } else {
              canvas2d.fillStyle = aToColor(v);
              canvas2d.fillRect(lastCx, cy0, 1, channelHeight);
            }

          }
          lastCx = (lastCx + 1) % cw;
        }
      }
    }


  };
  return ret;

}
