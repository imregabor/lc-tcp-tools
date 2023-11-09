'use strict';

/* non-bubbling pointer enter/exit */

export function handler() {
  var over;
  var listeners = [];
  var overChildCount = 0;

  function mightChange(operation) {
    const oldOver = ret.isOver();
    operation();
    const newOver = ret.isOver();
    if (oldOver !== newOver) {
      listeners.forEach(listener => listener(newOver));
    }
  }

  function childChangeListener(overChild) {
    mightChange(() => { overChildCount += overChild ? 1 : -1; });
    return ret;
  }

  function overChangeListener(overThis) {
    if (over === !!overThis) {
      return;
    }
    mightChange(() => { over = !!overThis; });
    return ret;
  }

  const ret = {
    overThisOrChild : o => overChangeListener(!!o),
    enter : () => overChangeListener(true),
    exit : () => overChangeListener(false),
    onChange : listener => {
      listeners.push(listener);
      return ret;
    },
    newChild : () => handler().onChange(childChangeListener),
    isOver : () => over && overChildCount == 0,
  };
  return ret;
}
