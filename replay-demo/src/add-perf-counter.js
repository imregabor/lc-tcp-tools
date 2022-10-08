"use strict";

import * as d3 from 'd3';


function attachPerfCounter(d3sel, formatSpec) {
  const maxBufSize = 100;
  const timestamps = Array(maxBufSize).fill(0);
  const counts = Array(maxBufSize).fill(0);
  const format = d3.format(formatSpec ?  formatSpec : '.0f');


  var nextToWrite = 0;
  var oldestValid = 0;
  var validCount = 0;
  var countsSum = 0;
  var lastTime ;

  function render() {
    const now = Date.now();
    while (validCount > 0 && timestamps[oldestValid] < now - 1000) {
      countsSum -= counts[oldestValid];
      oldestValid = (oldestValid + 1) % maxBufSize;
      validCount --;
    }

    if (validCount < 1) {
      d3sel.text('-----');
    } else if (validCount < 10) {
      const s = Math.round(validCount / 2);
      d3sel.text('*****'.substring(5 - s));
    } else {
      const oldestTime = timestamps[oldestValid];
      const oldestCount = counts[oldestValid];
      if (lastTime == oldestTime) {
        d3sel.text('?');
      } else {
        d3sel.text(format(1000 * (countsSum - oldestCount) / (lastTime - oldestTime)));
      }
    }
  }

  const ret = {
    tick : (count) => {
      if (count <= 0) {
        console.log('Invalid count ' + count);
      }
      const now = Date.now();
      lastTime = now;
      if (validCount == maxBufSize) {
        countsSum -= counts[nextToWrite];
      }
      countsSum += count;
      timestamps[nextToWrite] = now;
      counts[nextToWrite] = count;

      nextToWrite = (nextToWrite + 1) % maxBufSize;
      if (validCount == maxBufSize) {
        oldestValid = nextToWrite;
      } else {
        validCount ++;
      }
    },
    render : () => render()
  };
  ret.render();
  return ret;
}


export default attachPerfCounter;
