'use strict';

export function containsKey(key) {
  const i = window.localStorage.getItem(key);
  return !!i;
}

export function get(key) {
  return window.localStorage.getItem(key);
}

export function put(key, value) {
  return window.localStorage.setItem(key, value);
}

export function rename(fromKey, toKey, newValue) {
  const value = newValue ? newValue : get(fromKey);
  put(toKey, value);
  if (fromKey) {
    window.localStorage.removeItem(fromKey);
  }
}

export function keys() {
  const ret = [];
  const sl = window.localStorage.length;
  for( var i = 0; i < sl; i++) {
    ret.push(window.localStorage.key(i));
  }
  return ret;
}

export function isEmpty() {
  return !window.localStorage.length;
}
