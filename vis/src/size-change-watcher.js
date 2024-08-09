'use strict';

export function watchForSizeChange(elementD3, callback) {
  var base = elementD3.node().getBoundingClientRect();

  function poll() {
    const current = elementD3.node().getBoundingClientRect();
    var sizeChanged = false;
    if (current.width > 0 && current.height > 0) {
      if (current.width != base.width || current.height != base.height) {
        sizeChanged = true;
      }
    }
    if (sizeChanged) {
      base = current;
      try {
        callback();
      } finally {
        // follow continuous size changes more frequently
        setTimeout(poll, 100);
      }
    } else {
      setTimeout(poll, 400);
    }
  }
  poll();
}
