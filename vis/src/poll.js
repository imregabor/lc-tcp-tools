'use strict';

export function animationLoop(callback, scale) {
  if (!(scale >= 1)) {
    scale = 1;
  }

  var n = 0;
  var willCall = false;
  var running = false;
  var lastCall = Date.now();
  function f() {
    willCall = false;
    if (!running) {
      return;
    }
    n++;
    if (n >= scale) {
      const now = Date.now();
      callback(now - lastCall);
      lastCall = now;
      n = 0;
    }
    willCall = true;
    requestAnimationFrame(f);
  }

  const ret = {
    start : () => {
      running = true;
      if (!willCall) {
        n = 0;
        lastCall = Date.now();
        f();
      }
      return ret;
    },
    stop : () => {
      running = false;
      return ret;
    }
  };
  return ret;
}


export function newPoll(delay, callback) {

  var lastTimeout = undefined;
  var count = 0;
  var lastNow = 0;
  var lastDt = 0;
  var callbacks = [];
  var delayToUse = delay;

  if (callback) {
    callbacks.push(callback);
  }

  function poll() {
    count ++;
    const now = Date.now();
    lastDt = lastNow ? now - lastNow : 0;
    lastNow = now;
    lastTimeout = setTimeout(poll, delayToUse);

    for (var cb of callbacks) {
      cb();
    }

  }


  const ret = {
    addThrottled : (delay, cb) => {
      var d = 0;
      callbacks.push(() => {
        d += lastDt;
        if (d < delay) {
          return;
        }
        d = 0;
        cb();
      });
    },
    start : () => {
      if (ret.isRunning()) {
        return;
      }
      count = 0;
      lastNow = 0;
      poll();
      return ret;
    },
    stop : () => {
      if (!ret.isRunning()) {
        return;
      }
      clearTimeout(lastTimeout);
      lastTimeout = 0;
      return ret;
    },
    isRunning : () => {
      return !!lastTimeout;
    },
    lastDt : () => lastDt,
    setDelay : d => {
      delayToUse = d;
      return ret;
    }
  };
  return ret;
}
