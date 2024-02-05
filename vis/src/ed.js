'use strict';

export function ed() {
  const handlers = [];

  function dispatch(o) {
    for (var h of handlers) {
      // TODO: consider enqueing microtasks
      // see https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API/Microtask_guide
      h(o);
    }
  }


  const ret = o => dispatch(o);
  ret.add = h => handlers.push(h);
  ret.addWhenSpecified = h => h && handlers.push(h);
  ret.remove = h => {
    const i = handlers.indexOf(h);
    if (i >= 0) {
      handlers.splice(i, 1);
    }
  }
  return ret;
}
