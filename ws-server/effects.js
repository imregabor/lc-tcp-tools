"use strict";

function on(matrix) {
  matrix.getState().fill(1.0);
}

function off(matrix) {
  matrix.getState().fill(0.0);
}

function getSceneByName(name) {
  if (name === 'on') {
    return on;
  } else if (name === 'off') {
    return off;
  } else {
    throw "Unknown scene name " + name;
  }
}

module.exports.getSceneByName = getSceneByName;
module.exports.scenes = {
  on : on,
  off : off
}
