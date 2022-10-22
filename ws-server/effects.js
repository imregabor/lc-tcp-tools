"use strict";

function on(matrix) {
  matrix.getState().fill(1.0);
}

function off(matrix) {
  matrix.getState().fill(0.0);
}

function gradient(matrix) {
  const state = matrix.getState();
  for (var i = 0; i < state.length; i++) {
    state[i] = i / (state.length - 1);
  }
}


function effectChaseOn(m) {
  const dims = m.getDimensions();
  var p = 0;
  return {
    step : () => {
      const state = m.getState();
      for (var i = 0; i < dims.size; i++) {
        if (state[i] > 0.05) {
          state[i] -= 0.05;
        } else {
          state[i] -= 0;
        }
      }
      state[p] = 1.0;
      p = (p + 1) % dims.size;
    }
  };
}

function effectRiderOn(m) {
  const dims = m.getDimensions();
  var p = 0;
  var fwd = true;
  return {
    step : () => {
      const state = m.getState();
      for (var i = 0; i < dims.size; i++) {
        if (state[i] > 0.05) {
          state[i] -= 0.05;
        } else {
          state[i] -= 0;
        }
      }
      state[p] = 1.0;
      if (p === dims.size) {
        fwd = false;
      } else if (p === 0) {
        fwd = true;
      }
      p+= fwd ? 1 : -1;
    }
  };
}


function effectBreatheOn(m) {
  const dims = m.getDimensions();
  var p = 0;
  var d = 0.1;
  return {
    step : () => {
      const state = m.getState();
      p = p + d;
      if (p >= 0.999999) {
        p = 1.0;
        d = -d;
      } else if (p < 0.000001) {
        p = 0.0;
        d = -d;
      }
      for (var i = 0; i < dims.size; i++) {
        state[i] = p;
      }
    }
  }
}


function getEffectByName(name) {
  if (name === 'chase') {
    return effectChaseOn;
  } else if (name === 'breathe') {
    return effectBreatheOn;
  } else if (name === 'rider') {
    return effectRiderOn;
  } else {
    throw "Unknown effect name " + name;
  }
}


function getSceneByName(name) {
  if (name === 'on') {
    return on;
  } else if (name === 'off') {
    return off;
  } else if (name === 'gradient') {
    return gradient;
  } else {
    throw "Unknown scene name " + name;
  }
}

function createEffectsMachine(opts) {
  const send = opts.send;

  const runningEffects = {};
  var pingRunningEffectsInterval;

  function pingRunningEffects() {
    var hasEffect = false;

    for (const e in runningEffects) {
      if (!runningEffects.hasOwnProperty(e)) {
        continue;
      }
      const effect = runningEffects[e];

      if (!effect) {
        continue;
      }

      hasEffect = true;
      effect.step();
    }
    if (hasEffect) {
      send();
    } else {
      clearInterval(pingRunningEffectsInterval);
      pingRunningEffectsInterval = undefined;
    }
  }

  function startEffect(module, effect) {
    runningEffects[module.getName()] = effect(module);
    if (!pingRunningEffectsInterval) {
      pingRunningEffectsInterval = setInterval(pingRunningEffects, 20)
    }
  }

  function stopEffect(module) {
    runningEffects[module.getName()] = undefined;
  }

  return {
    start : (module, effect) => startEffect(module, effect),
    stop : module => stopEffect(module)
  };
}

module.exports.createEffectsMachine = createEffectsMachine;
module.exports.getSceneByName = getSceneByName;
module.exports.getEffectByName = getEffectByName;
module.exports.scenes = {
  on : on,
  off : off,
  gradient : gradient
}
module.exports.effects = {
  chase : effectChaseOn,
  rider : effectRiderOn,
  breathe : effectBreatheOn
}

