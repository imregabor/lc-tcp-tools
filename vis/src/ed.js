'use strict';

export function ed() {
  const handlers = [];

  function dispatch(o) {
    for (var h of handlers) {
      h(o);
    }
  }

  const ret = o => dispatch(o);
  ret.add = h => handlers.push(h);
  ret.addWhenSpecified = h => h && handlers.push(h);
  return ret;
}
