'use strict';

export function watchForSizeChange(elementD3, callback) {
  var base = elementD3.node().getBoundingClientRect();

  function poll() {
    const current = elementD3.node().getBoundingClientRect();
    if (current.width > 0 && current.height > 0) {
      if (current.width != base.width || current.height != base.height) {
        base = current;
        try {
          callback();
        } finally {
        }
      }
    }
    setTimeout(poll, 400);
  }
  setTimeout(poll, 400);
}
