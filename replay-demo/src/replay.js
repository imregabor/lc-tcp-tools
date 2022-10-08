"use strict";

/* See https://patorjk.com/software/taag/#p=display&h=0&v=0&f=Georgia11&t=replay ======================================

                               ,,
                             `7MM
                               MM
`7Mb,od8  .gP"Ya  `7MMpdMAo.   MM   ,6"Yb.  `7M'   `MF'
  MM' "' ,M'   Yb   MM   `Wb   MM  8)   MM    VA   ,V
  MM     8M""""""   MM    M8   MM   ,pm9MM     VA ,V
  MM     YM.    ,   MM   ,AP   MM  8M   MM      VVV
.JMML.    `Mbmmd'   MMbmmd'  .JMML.`Moo9^Yo.    ,V
                    MM                         ,V
                  .JMML.                    OOb"

 */

function replay(opts) {
  const lines = opts.lines;
  const callback = opts.cb;
  const onFinish = opts.onFinish;

  var timeoutId;
  const start = Date.now();
  var lastTs = start;
  var nextLine = 0;
  var running = true;

  function fetch() {
    timeoutId = undefined;
    var p = [];
    const nowDt = Date.now() - start;

    while (nextLine <  lines.length) {
      const s = lines[nextLine];
      if (s.startsWith('# dt ')) {
        var dt = +s.substring(5);
        if (dt > nowDt) {
          running = true;
          timeoutId = setTimeout(fetch, dt - nowDt);
          break;
        }
        lastTs = dt;
      }
      nextLine++;

      if (s.startsWith('S')) {
        p.push(s);
      }
    }

    if (nextLine >= lines.length) {
      if (onFinish) {
        onFinish();
      }
      running = false;
    }

    if (p.length > 0) {
      callback(p);
    }
  }

  var ret = {
    isRunning: () => running,
    getTs: () => lastTs,
    getPp: () => 100 * nextLine / lines.length,
    stop: () => {
      running = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  };
  fetch();
  return ret;
}

export default replay;
