'use strict';

import * as poll from './poll.js';
import * as ed from './ed.js';
import * as u from './util.js';
import * as nodeDefs from './node-definitions.js';
import * as d3 from 'd3';
import * as colorScales from './color-scales.js';

export function a() {
  return 4;
}

export function createPipeline() {
  // AudioContext frontend; currently playback instance is passed
  //  - can create analyzerNode
  //  - can tell sample rate
  // Dumb frontend to allow run without real playback
  var ctxFrontend = {
    sampleRate : () => 48000,
    newAnalyserNode : () => {
      return {
        _fftSize : 2048,
        frequencyBinCount : 1024,
        get fftSize() {
          return this._fftSize;
        },
        set fftSize(val) {
          // be consistent with AudioContext error handling to ensure proper error messages before context creation
          if (val < 32 || val > 32768) {
            throw new Error(`Failed to set the 'fftSize' property on 'AnalyserNode': The FFT size provided (${val}) is outside the range [32, 32768].`);
          }
          if (Math.log2(val) % 1 !== 0) {
            throw new Error(`Failed to set the 'fftSize' property on 'AnalyserNode': The value provided (${val}) is not a power of two.`);
          }
          this.frequencyBinCount = val / 2;
          this._fftSize = val;
        },
        getFloatFrequencyData : b => b.fill(-1e9),
        getFloatTimeDomainData : b => b.fill(0)
      };
    }
  };

  // Processing graph
  var graph;

  var visDataEnabled = false;

  // default: use REST API endpoints
  var remoteCalls = {
    sendToLr : (lb24, lm35) => {
      var url = '/api/setBulk100';
      var sepChar = '?';
      if (lb24) {
        url = url + sepChar + 'm1=' + u.channelsToBulk100(lb24);
        sepChar = '&';
      }
      if (lm35) {
        url = url + sepChar + 'm2=' + u.channelsToBulk100(lm35);
        sepChar = '&';
      }

      d3.text(url, {
        method : 'POST',
      }).then(() => {}, () => {});
    },
    sendToWss : (rgb) => {
      url = url + sepChar + 'd=' + u.channelsToBulk100(rgb);

      d3.text(url, {
        method : 'POST',
      }).then(() => {}, () => {});
    },
    getWssSize : () => 512
  };

  // map of analyzer ID to node defined in createAnalyzers()
  var analyzers;

  // map of port outport ID (nodeID + '/' + outPortID) to port state
  //  - found: used temporarily when topology changed
  //  - updated: when new value is present in a tick
  var portStates;

  const apoll = poll.newPoll(20, tick);
  var lastTick;


  const nodeFunctions = nodeDefs.nodeFunctions;
  const nodeTypes = nodeDefs.nodeTypes;

  // invoked with milliseconds since last call
  const tickEvent = ed.ed();

  const errEvent = ed.ed();


  function tick() {
    const now = Date.now();
    const sampleRate = ctxFrontend.sampleRate();

    for (var id in portStates) {
      if (!portStates.hasOwnProperty(id)) {
        continue;
      }
      const p = portStates[id];
      p.updated = false;
    }

    for (var id in analyzers) {

      if (!analyzers.hasOwnProperty(id)) {
        continue;
      }

      const a = analyzers[id];

      if (a.err) {
        continue;
      }

      const shouldCall = !a.lastCall || (a.lastCall + a.targetDelayMs <= now);
      if (!shouldCall) {
        continue;
      }
      a.lastCall = now;
      if (graph.nodeIds[id].portStateIds.spo) {
        const psId = graph.nodeIds[id].portStateIds.spo;
        const ps = portStates[psId];
        ps.type = 'spectrum';
        ps.maxf = sampleRate / 2;

        if (!ps.bins || ps.bins.length !== a.analyzerNode.frequencyBinCount) {
          ps.bins = new Float32Array(a.analyzerNode.frequencyBinCount);
        }
        a.analyzerNode.getFloatFrequencyData(ps.bins);         // fftdb - spectrum magnitudes in dB

        // until audio node starts the playback bins are -Infinity, avoid overshooting a downstream D node
        ps.updated = isFinite(ps.bins[0]);
      }
      if (graph.nodeIds[id].portStateIds.tdo) {
        const psId = graph.nodeIds[id].portStateIds.tdo;
        const ps = portStates[psId];
        ps.type = 'samples';
        ps.updated = true;
        if (!ps.samples || ps.samples.length !== a.analyzerNode.fftSize) {
          ps.samples = new Float32Array(a.analyzerNode.fftSize);
        }
        a.analyzerNode.getFloatTimeDomainData(ps.samples);
      }
    }

    graph.dagOrderIds.forEach(id => {
      const node = graph.nodeIds[id];
      const state = node.state;

      const f = {
        node : node,
        state : state,
        input : (portLabel, expectedType) => {
          const psid = node.portStateIds[portLabel];
          if (!psid) {
            // input port is not connected
            return null;
          }
          const ps = portStates[psid];
          if (expectedType && ps.type && ps.type !== expectedType) {
            throw new Error(`Expected "${expectedType}" as input, got "${ps.type}"`);
          }
          return ps;
        },
        outputScalar : portLabel => {
          const psid = node.portStateIds[portLabel];
        }
      };


      switch (node.type) {
        case 'aa':
          // analyzers already processed
          break;
        case 'fde':
          var ips;
          var ops;
          if (node.portStateIds.fdi) {
            ips = portStates[node.portStateIds.fdi];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.eo) {
            ops = portStates[node.portStateIds.eo];
            if (ops.type !== 'scalar') {
              ops.type = 'scalar';
              ops.value = 0;
            }
          }
          if (ips && ops && ips.updated) {
            ops.value = u.avgSqr1(ips.bins);
            ops.updated = true;
          }
          break;
        case 'tde':
          var ips;
          var ops;
          if (node.portStateIds.tdi) {
            ips = portStates[node.portStateIds.tdi];
            if (ips.type !== 'samples') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "samples" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.eo) {
            ops = portStates[node.portStateIds.eo];
            if (ops.type !== 'scalar') {
              ops.type = 'scalar';
              ops.value = 0;
            }
          }
          if (ips && ops && ips.updated) {
            ops.value = u.calcTimeDomainEnergy(ips.samples);
            ops.updated = true;
          }

          break;
        case 'dbm2linm':
          var ips;
          var ops;
          if (node.portStateIds.spi) {
            ips = portStates[node.portStateIds.spi];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.spo && ips) {
            ops = portStates[node.portStateIds.spo];
            ops.type = 'spectrum';
            if (!ops.bins || ops.bins.length !== ips.bins.length) {
              ops.bins = new Float32Array(ips.bins.length);
            }
          }
          if (ips && ops && ips.updated) {
            ops.maxf = ips.maxf;
            u.calcMagnitudeFromDb(ips.bins, ops.bins);
            ops.updated = true;
          }
          break;
        case 'aw':
          var ips;
          var ops;
          if (node.portStateIds.spi) {
            ips = portStates[node.portStateIds.spi];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.spo && ips) {
            ops = portStates[node.portStateIds.spo];
            ops.type = 'spectrum';
            ops.maxf = ips.maxf;
            if (!ops.bins || ops.bins.length !== ips.bins.length) {
              ops.bins = new Float32Array(ips.bins.length);
            }
          }
          if (ips && (!state.weights || state.weights.length !== ips.bins.length)) {
            state.weights = u.calcAWeights(ips.bins.length, sampleRate);
          }

          if (ips && ops && ips.updated) {
            u.calcWeightedMagnitudes(ips.bins, state.weights, ops.bins);
            ops.updated = true;
          }
          break;
        case 'mh':
          var ips;
          var ops;
          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'scalar' && ips.type !== 'spectrum' && ips.type !== 'channels') {
              // TODO: better error handling; in graph init time
              console.log(`Max hold: Expected "scalar", "spectrum" or "channels" as input, got "${ips.type}"`);
              break;
            }
          }
          if (node.portStateIds.out && ips) {
            ops = portStates[node.portStateIds.out];
            ops.type = ips.type;

            switch (ips.type) {
              case 'scalar':
                if (!ops.value) {
                  ops.value = 0;
                  ops.channels = undefined;
                  ops.bins = undefined;
                  state.holdFrom = 0;
                }
                break;
              case 'channels':
                if (!ops.channels || ops.channels.length !== ips.channels.length || !state.holdFrom || state.holdFrom.length !== ips.channels.length) {
                  ops.value = undefined;
                  ops.channels = new Float32Array(ips.channels.length);
                  ops.bins = undefined;
                  state.holdFrom = new Array(ips.channels.length);
                }
                break;
              case 'spectrum':
                ops.maxf = ips.maxf;
                if (!ops.bins || ops.bins.length !== ips.bins.length || !state.holdFrom || state.holdFrom.length !== ips.bins.length) {
                  ops.value = undefined;
                  ops.channels = undefined;
                  ops.bins = new Float32Array(ips.bins.length);
                  state.holdFrom = new Array(ips.bins.length);
                }
                break;
            }
          }
          if (ips && ops && ips.updated) {
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation
            const decay = node.params.decay ? Math.exp( -state.decayL * dt) : 0.0;
            const attack = node.params.attack ? Math.exp( -state.attackL * dt) : 0.0;
            switch (ips.type) {
              case 'channels':
              case 'spectrum':
                const ia = ips.type === 'channels' ? ips.channels : ips.bins;
                const oa = ips.type === 'channels' ? ops.channels : ops.bins;
                for (var i = 0; i < oa.length; i++) {
                  if (!Number.isFinite(oa[i])) {
                    oa[i] = ia[i];
                  }
                  const larger = ia[i] > oa[i];
                  if (!node.params.sustain || (state.holdFrom[i] + node.params.sustain) <= now) {
                    if (!larger) {
                      oa[i] = oa[i] * decay;
                    }
                  }
                  if (larger) {
                    oa[i] = ia[i] - (ia[i] - oa[i]) * attack;
                    if (node.params.sustain) {
                      state.holdFrom[i] = now;
                    }
                  }
                }
                break;
              case 'scalar':
                if (!Number.isFinite(ops.value)) {
                  ops.value = ips.value;
                }

                const larger = ips.value > ops.value;
                if (!node.params.sustain || (state.holdFrom + node.params.sustain) <= now) {
                  if (!larger) {
                    ops.value = ops.value * decay;
                  }
                }
                if (larger) {
                  ops.value = ips.value - (ips.value - ops.value) * attack;
                  if (node.params.sustain) {
                    state.holdFrom = now;
                  }
                }
                break;
            }
            ops.updated = true;
          }

          break;
        case 'normalize':
          var ips;
          var ops;
          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'scalar' && ips.type !== 'spectrum' && ips.type !== 'channels') {
              // TODO: better error handling; in graph init time
              console.log(`Max hold: Expected "scalar", "spectrum" or "channels" as input, got "${ips.type}"`);
              break;
            }
          }
          if (node.portStateIds.out && ips) {
            ops = portStates[node.portStateIds.out];
            ops.type = ips.type;

            switch (ips.type) {
              case 'scalar':
                if (!ops.value) {
                  ops.value = 0;
                  ops.channels = undefined;
                  ops.bins = undefined;
                  state.holdTill = 0;
                  state.max = 0;
                }
                break;
              case 'channels':
                if (
                  !ops.channels ||
                  ops.channels.length !== ips.channels.length ||
                  !state.holdTill ||
                  state.holdTill.length !== (node.params.globalNorm ? 1 : ips.channels.length) ||
                  !state.max ||
                  state.max.length !== (node.params.globalNorm ? 1 : ips.channels.length)
                ) {
                  ops.value = undefined;
                  ops.channels = new Float32Array(ips.channels.length);
                  ops.bins = undefined;
                  state.holdTill = new Array(node.params.globalNorm ? 1 : ips.channels.length).fill(0);
                  state.max = new Array(node.params.globalNorm ? 1 : ips.channels.length).fill(0);
                }
                break;
              case 'spectrum':
                ops.maxf = ips.maxf;
                if (
                  !ops.bins ||
                  ops.bins.length !== ips.bins.length ||
                  !state.holdTill ||
                  state.holdTill.length !== (node.params.globalNorm ? 1 : ips.bins.length) ||
                  !state.max ||
                  state.max.length !== (node.params.globalNorm ? 1 : ips.bins.length)) {
                  ops.value = undefined;
                  ops.channels = undefined;
                  ops.bins = new Float32Array(ips.bins.length);
                  state.holdTill = new Array(node.params.globalNorm ? 1 : ips.bins.length).fill(0);
                  state.max = new Array(node.params.globalNorm ? 1 : ips.bins.length).fill(0);
                }
                break;
            }
          }
          if (ips && ops && ips.updated) {
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation
            const maxDecay = node.params.maxDecayH ? Math.exp( -state.maxDecayL * dt) : 0.0;
            switch (ips.type) {
              case 'channels':
              case 'spectrum':
                const ia = ips.type === 'channels' ? ips.channels : ips.bins;
                const oa = ips.type === 'channels' ? ops.channels : ops.bins;

                for (var i = 0; i < (node.params.globalNorm ? 1 : oa.length); i++) {
                  if (state.holdTill[i] < now) {
                    state.max[i] = (state.max[i] - node.params.maxFloor) * maxDecay + node.params.maxFloor;
                    if (state.max[i] < node.params.maxFloor) {
                      state.max[i] = node.params.maxFloor;
                    }
                  }
                }
                for (var i = 0; i < oa.length; i++) {
                  const maxIndex = node.params.globalNorm ? 0 : i;
                  if (state.max[maxIndex] < ia[i]) {
                    state.max[maxIndex] = ia[i];
                    state.holdTill[maxIndex] = now + node.params.sustain;
                  }
                }
                for (var i = 0; i < oa.length; i++) {
                  oa[i] = ia[i] / state.max[node.params.globalNorm ? 0 : i];
                }
                break;
              case 'scalar':
                if (state.holdTill < now) {
                  state.max = (state.max - node.params.maxFloor) * maxDecay + node.params.maxFloor;
                }
                if (state.max < ips.value) {
                  state.max = ips.value;
                  state.holdTill = now + node.params.sustain;
                  if (state.max < node.params.maxFloor) {
                    state.max = node.params.maxFloor;
                  }
                }
                ops.value = ips.value / state.max;
                break;
            }
            ops.updated = true;
          }

          break;
        case 'linScale':
          var ips;
          var ops;
          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'scalar' && ips.type !== 'spectrum' && ips.type !== 'channels') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "scalar", "spectrum" or "channels" as input, got "${ips.type}"`);
            }
          }
          if (node.portStateIds.out && ips) {
            ops = portStates[node.portStateIds.out];
            ops.type = ips.type;

            switch (ips.type) {
              case 'scalar':
                if (!ops.value) {
                  ops.value = 0;
                  ops.channels = undefined;
                  ops.bins = undefined;
                }
                break;
              case 'channels':
                if (!ops.channels || ops.channels.length !== ips.channels.length) {
                  ops.value = undefined;
                  ops.channels = new Float32Array(ips.channels.length);
                  ops.bins = undefined;
                }
                break;
              case 'spectrum':
                ops.maxf = ips.maxf;
                if (!ops.bins || ops.bins.length !== ips.bins.length) {
                  ops.value = undefined;
                  ops.channels = undefined;
                  ops.bins = new Float32Array(ips.bins.length);
                }
                break;
            }
          }
          if (ips && ops && ips.updated) {
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation
            switch (ips.type) {
              case 'channels':
              case 'spectrum':
                const ia = ips.type === 'channels' ? ips.channels : ips.bins;
                const oa = ips.type === 'channels' ? ops.channels : ops.bins;
                for (var i = 0; i < oa.length; i++) {
                  oa[i] = node.params.scaleA * ia[i] + node.params.scaleB;
                  if (node.params.clip !== 0) {
                    if (oa[i] < 0) {
                      oa[i] = 0;
                    } else if (oa[i] > 1) {
                      oa[i] = 1;
                    }
                  }
                }
                break;
              case 'scalar':
                ops.value = node.params.scaleA * ips.value + node.params.scaleB;
                if (node.params.clip !== 0) {
                  if (ops.value < 0) {
                    ops.value = 0;
                  } else if (ops.value > 1) {
                    ops.value = 1;
                  }
                }
                break;
            }
            ops.updated = true;
          }
          break;
        case 'linCombine':
          var ipsa;
          var ips0;
          var ips1;
          var ops;
          if (node.portStateIds.a) {
            ipsa = portStates[node.portStateIds.a];
            if (ipsa.type !== 'scalar') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "scalar" as input "a", got "${ipsa.type}"`);
            }
          }
          if (node.portStateIds.in0) {
            ips0 = portStates[node.portStateIds.in0];
            if (ips0.type !== 'scalar' && ips0.type !== 'spectrum' && ips0.type !== 'channels') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "scalar", "spectrum" or "channels" as input 0, got "${ips0.type}"`);
            }
          }
          if (node.portStateIds.in1) {
            ips1 = portStates[node.portStateIds.in1];
            if (ips1.type !== 'scalar' && ips1.type !== 'spectrum' && ips1.type !== 'channels') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "scalar", "spectrum" or "channels" as input 1, got "${ips1.type}"`);
            }
          }
          if (ips0 && ips1) {
            if (ips0.type !== ips1.type) {
              throw new Error(`Expected matching input types, got input 0 type "${ips0.type}", input 1 type: "${ips1.type}"`);
            }
            if (ips0.type === 'spectrum') {
              // be restrictive with merging spectrums
              if (ips0.maxf !== ips1.maxf) {
                throw new Error(`Expected matching spectrum max freqs, got input 0 maxf "${ips0.maxf}", input 1 maxf: "${ips1.maxf}"`);
              }
              if (ips0.bins.length !== ips1.bins.length) {
                throw new Error(`Expected matching spectrum bins, got input 0 bins "${ips0.bins.length}", input 1 bins: "${ips1.bins.length}"`);
              }
            }
          }

          if (node.portStateIds.out && (ips0 || ips1)) {
            ops = portStates[node.portStateIds.out];

            const refps0 = ips0 ? ips0 : ips1;
            const refps1 = ips1 ? ips1 : ips0;

            ops.type = refps0.type;

            switch (refps0.type) {
              case 'scalar':
                if (!ops.value) {
                  ops.value = 0;
                  ops.channels = undefined;
                  ops.bins = undefined;
                  state.holdFrom = 0;
                }
                break;
              case 'channels':
                const channelCount = Math.max(refps0.channels.length, refps1.channels.length);
                if (!ops.channels || ops.channels.length !== channelCount) {
                  ops.value = undefined;
                  ops.channels = new Float32Array(channelCount);
                  ops.bins = undefined;
                }
                break;
              case 'spectrum':
                // note that spectrums are expected to match
                ops.maxf = refps0.maxf;
                if (!ops.bins || ops.bins.length !== refps0.bins.length) {
                  ops.value = undefined;
                  ops.channels = undefined;
                  ops.bins = new Float32Array(refps0.bins.length);
                }
                break;
            }
          }
          if ((ips0 || ips1) && ops && ((ips0 && ips0.updated) || (ips1 && ips1.updated) || (ipsa && ipsa.updated))) {
            const refps0 = ips0 ? ips0 : ips1;
            const refps1 = ips1 ? ips1 : ips0;
            var a = ipsa ? ipsa.value : 0;
            if (a < 0) {
              a = 0;
            } else if (a > 1) {
              a = 1;
            }
            state.lastUpdate = now; // todo - common implementation
            switch (refps0.type) {
              case 'channels':
              case 'spectrum':
                const ia0 = refps0.type === 'channels' ? refps0.channels : refps0.bins;
                const ia1 = refps0.type === 'channels' ? refps1.channels : refps1.bins;
                const oa =  refps0.type === 'channels' ? ops.channels : ops.bins;

                for (var i = 0; i < oa.length; i++) {
                  const v0 = i < ia0.length ? ia0[i] : 0;
                  const v1 = i < ia1.length ? ia1[i] : 0;
                  oa[i] = (1 - a) * v0 + a * v1;
                }
                break;
              case 'scalar':
                ops.value = (1 - a) * refps0.value + a * refps1.value;
                break;
            }
            ops.updated = true;
          }
          break;
        case 'channelRemap':
          var ips;
          var ops;
          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'channels') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "channels" as input, got "${ips.type}"`);
            }
          }
          if (node.portStateIds.out && ips) {
            ops = portStates[node.portStateIds.out];
            ops.type = 'channels';

            if (!ops.channels || ops.channels.length !== ips.channels.length || !state.map || state.map.length !== ips.channels.length) {
              ops.value = undefined;
              ops.channels = new Float32Array(ips.channels.length);
              ops.bins = undefined;
              state.map = [];
              switch (node.params.mode) {
                case 1: // last to first
                  for (var i = 0; i < ips.channels.length; i++) {
                    state.map.push(ips.channels.length - i - 1);
                  }
                  break;
                case 2: // center to side
                  const mid = Math.floor(ips.channels.length / 2);
                  const dir1 = (ips.channels.length % 2 === 0) ? -1 : 1;

                  for (var i = 0; i < ips.channels.length; i++) {
                    const step = Math.ceil(i / 2);
                    const dir2 = (i % 2 === 0) ? -1 : 1;
                    const mapped = mid + dir1 * dir2 * step;
                    state.map.push(mapped);
                  }
                  break;
                case 8: // 7x5 spiral center start
                  if (ips.channels.length === 35) {
                    /*
                         +----------+----------+----------+----------+----------+----------+----------+
                         |  0 <= 24    1 <= 23    2 <= 22    3 <= 21    4 <= 20    5 <= 19    6 <= 18 |
                         +          +----------+----------+----------+----------+----------+          +
                         |  7 <= 25 |  8 <=  8    9 <=  7   10 <=  6   11 <=  5   12 <=  4 | 13 <= 17 |
                         +          +          +----------+----------+----------+          +          +
                         | 14 <= 26 | 15 <=  9 | 16 <=  0   17 <=  1   18 <=  2   19 <=  3 | 20 <= 16 |
                         +          +          +----------+----------+----------+----------+          +
                         | 21 <= 27 | 22 <= 10   23 <= 11   24 <= 12   25 <= 13   26 <= 14   27 <= 15 |
                         +          +----------+----------+----------+----------+----------+----------+
                         | 28 <= 28   29 <= 29   30 <= 30   31 <= 31   32 <= 32   33 <= 33   34 <= 34 |
                         +----------+----------+----------+----------+----------+----------+----------+
                    */
                    state.map = [ 16, 17, 18, 19, 12, 11, 10, 9, 8, 15, 22, 23, 24, 25, 26, 27, 20, 13, 6, 5, 4, 3, 2, 1, 0, 7, 14, 21, 28, 29, 30, 31, 32, 33, 34 ];
                    break;
                  }
                  // when not 35 channels fall through to default
                case 9: // 7x5 spiral corner start
                  if (ips.channels.length === 35) {
                    /*
                         +----------+----------+----------+----------+----------+----------+----------+
                         |  0 <=  0    1 <=  1    2 <=  2    3 <=  3    4 <=  4    5 <=  5    6 <=  6 |
                         +----------+----------+----------+----------+----------+----------+          +
                         |  7 <= 19    8 <= 20    9 <= 21   10 <= 22   11 <= 23   12 <= 24 | 13 <=  7 |
                         +          +----------+----------+----------+----------+          +          +
                         | 14 <= 18 | 15 <= 31   16 <= 32   17 <= 33   18 <= 34 | 19 <= 25 | 20 <=  8 |
                         +          +          +----------+----------+----------+          +          +
                         | 21 <= 17 | 22 <= 30   23 <= 29   24 <= 28   25 <= 27   26 <= 26 | 27 <=  9 |
                         +          +----------+----------+----------+----------+----------+          +
                         | 28 <= 16   29 <= 15   30 <= 14   31 <= 13   32 <= 12   33 <= 11   34 <= 10 |
                         +----------+----------+----------+----------+----------+----------+----------+
                    */
                    state.map = [ 0, 1, 2, 3, 4, 5, 6, 13, 20, 27, 34, 33, 32, 31, 30, 29, 28, 21, 14, 7, 8, 9, 10, 11, 12, 19, 26, 25, 24, 23, 22, 15, 16, 17, 18 ];
                    break;
                  }
                  // when not 35 channels fall through to default
                default :
                  state.map = [];
                  for (var i = 0; i < ips.channels.length; i++) {
                    state.map.push(i);
                  }
                  break;
              }
            }
          }
          if (ips && ops && ips.updated) {
            state.lastUpdate = now; // todo - common implementation
            for (var i = 0; i < ips.channels.length; i++) {
              ops.channels[state.map[i]] = ips.channels[i];
            }
            ops.updated = true;
          }

          break;
        case 'vu':
          var ips;
          var ops;
          if (node.portStateIds.ein) {
            ips = portStates[node.portStateIds.ein];
            if (ips.type !== 'scalar') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "scalar" as input, got "${ips.type}"`);
            }
          }
          if (node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];
            ops.type = 'channels';

            if (!ops.channels || ops.channels.length !== node.params.channels) {
              ops.channels = new Float32Array(node.params.channels);
            }
          }
          if (ips && ops && ips.updated) {
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation

            const value = +ips.value;


            const maxDecay = Math.exp( -state.maxDecayL * dt);
            const minDecay = Math.exp( -state.minDecayL * dt);
            const vh = value * 1.25; // todo - option
            const vl = value / 1.5;

            state.max = maxDecay * (state.max - vh) + vh;
            if (node.params.maxFloor > state.max) {
              state.max = node.params.maxFloor;
            }
            if (value > state.max) {
              state.max = vh;
            }

            state.min = minDecay * (state.min - vl) + vl;
            if (value < state.min) {
              state.min = vl;
            }

            const normalized = (value - state.min) / (state.max - state.min);


            var onValue = node.params.onValueA * normalized + node.params.onValueB;
            if (onValue < 0) {
              onValue = 0;
            } else if (onValue > 1) {
              onValue = 1;
            }

            var on = node.params.channels * normalized * onValue;

            for (var i = 0; i < node.params.channels; i++) {
              if (on >= onValue) {
                ops.channels[i] = onValue;
                on = on - onValue;
              } else if (on > 0) {
                ops.channels[i] = on;
                on = 0;
              } else {
                ops.channels[i] = 0;
              }
            }
            ops.updated = true;
          }
          break;
        case 'sb':
          var ips;
          var ops;
          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];
            ops.type = 'channels';

            if (!ops.channels || ops.channels.length !== node.params.channels) {
              ops.channels = new Float32Array(node.params.channels);
            }
          }
          if (ips && ops && ips.updated) {
            if (state.binCount !== ips.bins.length || state.maxFreq !== ips.maxf) {
              console.log('Subbands bin layout');
              // TODO: parameter validation, corner cases
              //  - invalid frequencies, freq out of range, hi <= lo (except for 2 ch)
              //  - 1 or 2 ch

              const binWidth = ips.maxf / ips.bins.length;

              state.binCount = ips.bins.length;
              state.maxFreq = ips.maxf;

              state.max = new Float32Array(node.params.channels);
              state.chBin0 = [];
              state.chBin1 = [];
              state.chBin0a = [];
              state.chBin1a = [];

              // middle channel count:           mcc = channels - 2

              // channel width (ratio of freqs): cw
              // channels are equal widths, so   (hi / lo) = cw ^ mcc
              //                                 cw = (hi / lo) ^ 1/mcc
              const cw = Math.pow(node.params.hf / node.params.lf, 1 / (node.params.channels - 2));


              console.log('binWidth:', binWidth, 'binCount:', state.binCount, 'maxFreq:', state.maxFreq, 'cw:', cw);

              // position to first channel (LPF) cutoff
              var lastFreq = node.params.lf;
              var lastPartialBin = lastFreq / binWidth;
              var lastBinUpper = Math.ceil(lastPartialBin);
              var lastBinLower = Math.floor(lastPartialBin);
              var lastLowerPart = lastPartialBin - lastBinLower;
              var lastUpperPart = lastBinUpper - lastPartialBin;

              if (node.params.doLpf) {
                // first channel: LPF
                state.chBin0.push(0)
                state.chBin1.push(lastBinUpper); // inclusve
                state.chBin0a.push(lastBinUpper === 0 ? 0 : 1); // for single bin channel last "a" is used
                state.chBin1a.push(lastLowerPart); // for single bin channel last "a" is used
              }


              var innerChCount = node.params.channels;
              if (node.params.doHpf) {
                innerChCount = innerChCount - 1;
              }
              if (node.params.doLpf) {
                innerChCount = innerChCount - 1;
              }

              // step through inner channels
              for (var i = 0; i < innerChCount; i++) {
                // next freq is current middle channel upper end
                const nextFreq = lastFreq * cw;
                const nextPartialBin = nextFreq / binWidth;
                const nextBinUpper = Math.ceil(nextPartialBin);
                const nextBinLower = Math.floor(nextPartialBin);
                const nextLowerPart = nextPartialBin - nextBinLower;
                const nextUpperPart = nextBinUpper - nextPartialBin;

                state.chBin0.push(lastBinLower);
                state.chBin1.push(nextBinUpper);
                state.chBin0a.push(lastBinLower === nextBinUpper ? 0 : lastUpperPart); // for single bin channel last "a" is used
                state.chBin1a.push(lastBinLower === nextBinUpper ? lastUpperPart + nextLowerPart : nextLowerPart); // for single bin channel last "a" is used

                lastFreq = nextFreq;
                lastPartialBin = nextPartialBin;
                lastBinUpper = nextBinUpper;
                lastBinLower = nextBinLower;
                lastLowerPart = nextLowerPart;
                lastUpperPart = nextUpperPart;

                console.log('Next upper freq for intermediate bin:', nextFreq);
              }

              if (node.params.doHpf) {
                // last channel: HPF
                state.chBin0.push(lastBinLower)
                state.chBin1.push(state.binCount - 1);
                state.chBin0a.push(lastUpperPart);
                state.chBin1a.push(1);
              }

              //const b1 = node.params.hf / binWidth;
              console.log('subbands bins layouted. Params: ', node.params, 'state:', state);
            }

            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation


            const maxDecay = Math.exp( -state.maxDecayL * dt);


            for (var i = 0; i < state.chBin0.length; i++) {
              const firstBinIndex = state.chBin0[i];
              const lastBinIndex = state.chBin1[i];
              var d = 0;
              var sume = 0;
              for (var bin = firstBinIndex; bin <= lastBinIndex; bin++) {
                var a = 1;
                if (bin === lastBinIndex) {
                  a = state.chBin1a[i];
                } else if (bin === firstBinIndex) {
                  a = state.chBin0a[i];
                }
                const e = a * ips.bins[bin] * ips.bins[bin];
                sume = sume + e;
                d = d + a;
              }
              const chi = node.params.doAvg ? sume / d : sume;
              ops.channels[i] = chi;

              state.max[i] = maxDecay * state.max[i];
              if (node.params.maxFloor > state.max[i]) {
                state.max[i] = node.params.maxFloor;
              }
              if (chi > state.max[i]) {
                state.max[i] = chi;
              }
            }
            if (node.params.maxSpillHbc) {
              for (var i = 0; i < state.max.length; i++) {
                const mi = state.max[i];
                const s1 =
                    ((i > 0) && (node.params.spillXpf || !node.params.doLpf))
                    ? state.max[i - 1] * state.maxSpill
                    : 0;
                const s2 =
                    ((i < state.max.length - 1) && (node.params.spillXpf || !node.params.doHpf))
                    ? state.max[i + 1] * state.maxSpill
                    : 0;
                if (mi < s1) {
                  state.max[i] = s1;
                }
                if (mi < s2) {
                  state.max[i] = s2;
                }
              }
            }
            for (var i = 0; i < state.chBin0.length; i++) {
              ops.channels[i] = ops.channels[i] / state.max[i];
            }
            ops.updated = true;
          }
          break;
        case 'vsb':
          var ips;
          var ops;
          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'spectrum') {
              // TODO: better error handling; in graph init time
              throw new Error(`Expected "spectrum" as input, got ${ips.type}`);
            }
          }
          if (node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];
            ops.type = 'channels';

            if (!ops.channels || ops.channels.length !== state.channels) {
              ops.channels = new Float32Array(state.channels);
            }
          }
          if (ips && ops && ips.updated) {
            if (state.binCount !== ips.bins.length || state.maxFreq !== ips.maxf || !state.max || state.max.length !== state.channels || !state.channelBinCounts || state.channelBinCounts.length !== state.channels) {
              console.log('Variable subbands bin layout');

              const binWidth = ips.maxf / ips.bins.length;

              state.binCount = ips.bins.length;
              state.maxFreq = ips.maxf;

              state.max = new Float32Array(state.channels);
              state.channelBinCounts = [];

              // iterate from the LPF band
              var bc = 0;
              for (var i = 0; i < state.freqs.length; i++) {
                const fi = state.freqs[i];
                const bini = Math.round(fi * state.binCount / state.maxFreq);
                const chw = bini - bc;
                if (!!i === 0 || node.params.doLpf) {
                  // capture LPF band only when requested
                  state.channelBinCounts.push(chw);
                  state.firstChannelFirstBin = 0;
                } else {
                  state.firstChannelFirstBin = chw;
                }
                bc = bc + chw;
              }
              if (node.params.doHpf) {
                state.channelBinCounts.push(state.binCount - bc);
              }

              console.log('Variable subbands bins layouted. Params: ', node.params, 'state:', state);
            }

            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation

            var firstBinIndex = state.firstChannelFirstBin;
            for (var i = 0; i < state.channels; i++) {
              const lastBinIndex = firstBinIndex + state.channelBinCounts[i];
              var sume = 0;
              for (var bin = firstBinIndex; bin < lastBinIndex; bin++) {
                const e = ips.bins[bin] * ips.bins[bin];
                sume = sume + e;
              }
              firstBinIndex = lastBinIndex;
              const chi = node.params.doAvg ? sume / state.channelBinCounts[i] : sume;
              ops.channels[i] = chi;
            }

            if (node.params.doNormalize) {
              const maxDecay = Math.exp( -state.maxDecayL * dt);
              for (var i = 0; i < state.channels; i++) {
                state.max[i] = maxDecay * state.max[i];
                if (node.params.maxFloor > state.max[i]) {
                  state.max[i] = node.params.maxFloor;
                }
                if (ops.channels[i] > state.max[i]) {
                  state.max[i] = ops.channels[i];
                }
              }
              for (var i = 0; i < state.channels; i++) {
                ops.channels[i] = ops.channels[i] / state.max[i];
              }
            }

            ops.updated = true;
          }
          break;
        case 'hhc':
          var ips;
          var ops;

          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'channels' && ips.type !== 'scalar') {
              // TODO: better error handling; in graph init time
              console.log(`Half Hanning: Expected "channels" or "scalar" as input, got ${ips.type}`);
              break;
            }
          }

          if (ips && node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];

            if (ips.type === 'channels') {
              ops.type = 'channels';
              if (!ops.channels || ops.channels.length !== ips.channels.length) {
                ops.channels = new Float32Array(ips.channels);
              }
            } else {
              ops.type = 'scalar';
              ops.value = 0;

            }
          }

          if (ops && ips && ips.updated) {
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 0;
            state.lastUpdate = now; // todo - common implementation

            const channelCount = ips.type === 'channels' ? ips.channels.length : 1;

            if (!state.dts || state.dts.length * 3 < node.params.width) {
              state.dts = new Array(Math.round(node.params.width / 3)).fill(0);
              state.dtsp = 0;
            }
            if (!state.chv || state.chv.length !== channelCount || state.chv[0].length !== state.dts.length) {
              state.chv = [];
              for (var i = 0; i < channelCount; i++) {
                state.chv.push(new Array(state.dts.length).fill(0));
              }
            }

            state.dts[state.dtsp] = dt;
            for (var chi = 0; chi < channelCount; chi++) {
              var chv;
              if (ips.type === 'channels') {
                chv = ips.channels[chi];
              } else {
                chv = ips.value;
              }
              state.chv[chi][state.dtsp] = chv;

              var sum = 0;
              var t = 0;
              var pos = state.dtsp;
              while (true) {
                sum = sum + state.chv[chi][pos] * state.c[t] * state.dts[pos];

                t = t + state.dts[pos];
                if (t >= node.params.width) {
                  break;
                }

                pos = pos - 1;
                if (pos < 0) {
                  pos = state.chv[chi].length - 1;
                }
                if (pos === state.dtsp) {
                  break;
                }
              }

              const v = sum / state.a;
              if (ips.type === 'channels') {
                ops.channels[chi] = v;
              } else {
                ops.value = v;
              }
            }
            state.dtsp = (state.dtsp + 1) % state.dts.length;
            ops.updated = true;
          }
          break;
        case 'pid':
          var ips;
          var ops;

          if (node.portStateIds.in) {
            ips = portStates[node.portStateIds.in];
            if (ips.type !== 'channels' && ips.type !== 'scalar') {
              // TODO: better error handling; in graph init time
              console.log(`PID: Expected "channels" or "scalar" as input, got ${ips.type}`);
              break;
            }
          }

          if (ips && node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];

            if (ips.type === 'channels') {
              ops.type = 'channels';
              if (!ops.channels || ops.channels.length !== ips.channels.length) {
                ops.channels = new Float32Array(ips.channels);
              }
            } else {
              ops.type = 'scalar';
              ops.value = 0;
            }
          }

          if (ops && ips && ips.updated) {
            const dt = state.lastUpdate ? (now - state.lastUpdate) : 5;
            state.lastUpdate = now; // todo - common implementation

            const channelCount = ips.type === 'channels' ? ips.channels.length : 1;
            const iDecay = node.params.i ? Math.exp( -state.iDecayL * dt) : 0;

            if (node.params.i && (!state.i || state.i.length !== channelCount)) {
              state.i = new Array(channelCount).fill(0);
            }
            if (node.params.d && (!state.dt || state.dt.length !== node.params.width || !state.v || state.v.length !== channelCount || state.v[0].length !== node.params.width)) {
              state.pos = 0;
              state.v = [];
              state.dt = new Array(node.params.width).fill(0);
              for (var i = 0; i < channelCount; i++) {
                state.v.push(new Array(node.params.width).fill(0));
              }
            }

            var fp = 0;
            var ddt = 0;
            if (node.params.d) {
              state.dt[state.pos] = dt;
              fp = (state.pos + node.params.width - 1) % node.params.width;
              for (var i = 0; i < node.params.width; i++) {
                ddt = ddt + state.dt[i];
              }
            }


            for (var chi = 0; chi < channelCount; chi++) {
              var chv;
              if (ips.type === 'channels') {
                chv = ips.channels[chi];
              } else {
                chv = ips.value;
              }
              if (!isFinite(chv)) {
                chv = 0;
              }
              var ov = 0;

              if (node.params.p) {
                ov = ov + chv * node.params.p;
              }

              if (node.params.i) {
                state.i[chi] = state.i[chi] * iDecay + chv * dt;
                ov = ov + state.i[chi] * node.params.i;
              }

              if (node.params.d) {
                state.v[chi][state.pos] = chv;
                const fchv = state.v[chi][fp];
                if (state.buffull) {
                  // avoid injecting spurious values after parameter change
                  const dv = (chv - fchv) / ddt;
                  if (!node.params.dClip0 || dv > 0) {
                    ov = ov + node.params.d * dv;
                  }
                }
              }

              if (ips.type === 'channels') {
                ops.channels[chi] = ov;
              } else {
                ops.value = ov;
              }
            }

            if (node.params.d) {
              state.pos = (state.pos + 1) % node.params.width;
              if (state.pos === 0) {
                state.buffull = true;
              }
            }
            ops.updated = true;
          }
          break;
        case 'lr':
          var ipsLb24;
          var ipsLm35;
          if (node.portStateIds.lb24) {
            ipsLb24 = portStates[node.portStateIds.lb24];
            if (ipsLb24.type !== 'channels') {
              // TODO: better error handling; in graph init time
              console.log(`LR: Expected "channels" as input of bar24, got ${ipsLb24.type}`);
              break;
            }
          }
          if (node.portStateIds.lm35) {
            ipsLm35 = portStates[node.portStateIds.lm35];
            if (ipsLm35.type !== 'channels') {
              // TODO: better error handling; in graph init time
              console.log(`LR: Expected "channels" as input of matrix 7x5, got ${ipsLm35.type}`);
              break;
            }
          }

          var maybeSend = false;
          if (ipsLb24 && ipsLb24.updated) {
            const channelCount = Math.min(24, state.lb24.length);
            for (var i = 0; i < channelCount; i++) {
              state.lb24[i] = Math.max(state.lb24[i], ipsLb24.channels[i]);
            }
            state.lb24valid = true;
            maybeSend = true;
          }

          if (ipsLm35 && ipsLm35.updated) {
            const channelCount = Math.min(35, state.lm35.length);
            for (var i = 0; i < channelCount; i++) {
              state.lm35[i] = Math.max(state.lm35[i], ipsLm35.channels[i]);
            }
            state.lm35valid = true;
            maybeSend = true;
          }

          const send = maybeSend && (!state.lastSend || ((now - state.lastSend) >= state.targetDelayMs));
          if (send) {
            state.lastSend = now;

            var lb24 = undefined;
            var lm35 = undefined;

            if (ipsLb24 && state.lb24valid) {
              lb24 = state.lb24;
            }
            if (ipsLm35 && state.lm35valid) {
              lm35 = state.lm35;
            }

            remoteCalls.sendToLr(lb24, lm35);

            if (lb24) {
              state.lb24.fill(0);
              state.lb24valid = false;
            }
            if (lm35) {
              state.lm35.fill(0);
              state.lm35valid = false;
            }
          }
          break;
        case 'wss':
          var ipsChannels;
          if (node.portStateIds.channels) {
            ipsChannels = portStates[node.portStateIds.channels];
            if (ipsChannels.type !== 'channels') {
              // TODO: better error handling; in graph init time
              console.log(`WSS: Expected "channels" as input of channels, got ${ipsChannels.type}`);
              break;
            }
          }

          if (ipsChannels && ipsChannels.updated) {
            state.channelCount = Math.min(remoteCalls.getWssSize() * 3, ipsChannels.channels.length);

            if (state.channelCount != state.chs.length) {
              const oldChs = state.chs;
              state.chs = new Float32Array(state.channelCount);
              for (var i = 0; i < Math.min(state.channelCount, oldChs.length); i++) {
                state.chs[i] = oldChs[i];
              }
            }

            for (var i = 0; i < ipsChannels.channels.length; i++) {
              state.chs[i] = Math.max(state.chs[i], ipsChannels.channels[i]);
            }
            state.maybeSend = true;
          }

          const sendw = state.maybeSend && (!state.lastSend || ((now - state.lastSend) >= state.targetDelayMs));
          if (sendw) {
            state.maybeSend = false;
            state.lastSend = now;

            var url = '/api/setWsStrip100';
            var sepChar = '?';
            if (node.params.gamma !== 1) {
              for (var i = 0; i < state.channelCount; i++) {
                if (state.chs[i] < 0) {
                  state.chs[i] = 0;
                } else if (state.chs[i] > 1) {
                  state.chs[i] = 1;
                }
                state.chs[i] = Math.pow(state.chs[i], node.params.gamma) * node.params.scale;
              }
            } else {
              for (var i = 0; i < state.channelCount; i++) {
                if (state.chs[i] < 0) {
                  state.chs[i] = 0;
                } else if (state.chs[i] > 1) {
                  state.chs[i] = 1;
                }
                state.chs[i] = state.chs[i] * node.params.scale;
              }
            }

            remoteCalls.sendToWss(state.chs);

            state.chs.fill(0);
          }
          break;
        case 'rgbmap':
          var ips1;
          var ips2;
          var ops;

          if (node.portStateIds.in1) {
            ips1 = portStates[node.portStateIds.in1];
            if (ips1.type !== 'channels' && ips1.type !== 'scalar') {
              // TODO: better error handling; in graph init time
              console.log(`RGBmap: Expected "channels" or "scalar" as input 1, got ${ips1.type}`);
              break;
            }
          }
          if (node.portStateIds.in2) {
            ips2 = portStates[node.portStateIds.in2];
            if (ips2.type !== 'channels' && ips2.type !== 'scalar') {
              // TODO: better error handling; in graph init time
              console.log(`RGBmap: Expected "channels" or "scalar" as input 2, got ${ips2.type}`);
              break;
            }
          }

          var inputChannels = 0;
          if (ips1) {
            if (ips1.type === 'scalar') {
              inputChannels = 1;
            } else {
              inputChannels = ips1.channels.length;
            }
          }
          if (ips2) {
            if (ips2.type === 'scalar') {
              inputChannels = Math.max(inputChannels, 1);
            } else {
              inputChannels = Math.max(inputChannels, ips2.channels.length);
            }
          }

          if (node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];
            ops.type = 'channels';

            if (!ops.channels || ops.channels.length !== inputChannels * 3) {
              ops.channels = new Float32Array(inputChannels * 3);
            }
          }

          if (ops && ((ips1 && ips1.updated) || (ips2 && ips2.updated))) {
            var scale;
            switch (node.params.mode) {
              case 1:
                scale = colorScales.yellowishr();
                break;
              case 2:
                scale = colorScales.incandescent();
                break;
              case 3:
                scale = colorScales.incandescent2();
                break;
              case 4:
                scale = colorScales.incandescent3();
                break;
              case 0:
              default:
                scale = colorScales.white();
            }

            for (var i = 0; i < inputChannels; i++) {
              var i1 = 0;
              if (ips1 && ips1.type === 'scalar' && i === 0) {
                i1 = ips1.value;
              } else if (ips1 && ips1.type === 'channels' && ips1.channels.length > i) {
                i1 = ips1.channels[i];
              }
              var i2 = 0;
              if (ips2 && ips2.type === 'scalar' && i === 0) {
                i2 = ips2.value;
              } else if (ips2 && ips2.type === 'channels' && ips2.channels.length > i) {
                i2 = ips2.channels[i];
              }
              scale.writeRgb(i1, ops.channels, 3 * i);
            }
            ops.updated = true;
          }
          break;
        case 'lfo':
          var ops;
          if (node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];
            ops.type = 'scalar';
          }
          if (ops) {
            const pos = ((now + state.shift) % state.period) / state.period;
            switch (node.params.waveform) {
              case 1:
                // sine
                ops.value = node.params.a * (0.5 + 0.5 * Math.sin(pos * 6.28318));
                break;
              case 2:
                // square
                ops.value = pos < node.params.dc ? node.params.a : 0.0;
                break;
              case 3:
                // sawtooth
                ops.value = pos < node.params.dc
                  ? node.params.a * pos / node.params.dc
                  : node.params.a * (1 - pos) / (1 - node.params.dc);
                  break;
              case 4:
                // 1-cos pulse
                ops.value = pos < node.params.dc
                  ? (0.5 - 0.5 * Math.cos(pos * 6.28318 / node.params.dc)) * node.params.a
                  : 0;
                break;
              case 0:
              default:
                // sawtooth
                ops.value = pos * node.params.a;
            }
            ops.updated = true;
          }

          break;
        case 'fixedEffect':
          var ops;
          if (node.portStateIds.out) {
            ops = portStates[node.portStateIds.out];
            ops.type = 'channels';

            if (!ops.channels || ops.channels.length !== node.params.channels) {
              ops.value = undefined;
              ops.channels = new Float32Array(node.params.channels);
              ops.bins = undefined;
            }
          }
          if (ops) {
            state.lastUpdate = now; // todo - common implementation
            switch (node.params.mode) {
              case 1: // antialiased symmetric chase
              case 2: { // antialiased asymmetric
                /*
                  0.0                                           1.0
                   |---------------------------------------------|
                   |     |     |     |     .....     |     |     |
                      ^     ^     ^                     ^     ^
                     ch0   ch1   ch2                        ch(n-1)
                */
                // position inside animation scaled to 0..1
                const p = (now % (node.params.dt * 1000)) / (node.params.dt * 1000);
                // fractional position of the point
                const x = p * ops.channels.length;
                for (var i = 0; i < ops.channels.length; i++) {
                  // distance of the point
                  var d;
                  if (node.params.mode === 1) {
                    // symmetric case
                    d = Math.min(Math.abs(x - i + 0.5), Math.abs(x - i + 0.5 - ops.channels.length));
                    d = Math.min(d, Math.abs(x - i + 0.5 + ops.channels.length));
                  } else {
                    // asymmetric case, only left distance is considered
                    var d1 = x - i + 0.5;
                    if (d1 < -1) {
                      d1 = 999999;
                    }
                    var d2 = x - i - ops.channels.length + 0.5;
                    if (d2 < -1) {
                      d2 = 999999;
                    }
                    var d3 = x - i + ops.channels.length + 0.5;
                    if (d2 < -1) {
                      d2 = 999999;
                    }
                    if (d1 < 0) {
                      d1 = - d1 * node.params.dotsize;
                    }
                    if (d2 < 0) {
                      d2 = - d2 * node.params.dotsize;
                    }
                    if (d3 < 0) {
                      d3 = - d3 * node.params.dotsize;
                    }
                    d = Math.min(d1, d2);
                    d = Math.min(d, d3);
                  }
                  var l = d > node.params.dotsize ? 0 : 1 - d / node.params.dotsize;
                  ops.channels[i] = node.params.value1 + l * (node.params.value2 - node.params.value1) ;
                }
                break;
              }
              case 3: { // one way antialiased dot chaser
                // position inside animation scaled to 0..1
                const p = (now % (node.params.dt * 1000)) / (node.params.dt * 1000);
                // fractional position of the point
                const x = p * ops.channels.length;

                var x1 = Math.floor(x)
                var x2 = Math.ceil(x)
                const v1 = node.params.value1 + (1 - x + x1) * (node.params.value2 - node.params.value1);
                const v2 = node.params.value1 + (1 - x2 + x) * (node.params.value2 - node.params.value1);

                if (x2 === ops.channels.length) {
                  x2 = 0;
                }
                ops.channels.fill(node.params.value1)
                ops.channels[x1] = v1;
                ops.channels[x2] = v2;
                break;
              }
              case 4: { // one way not antialiased dot chaser
                // position inside animation scaled to 0..1
                const p = (now % (node.params.dt * 1000)) / (node.params.dt * 1000);
                // fractional position of the point
                const x = p * (ops.channels.length - 1);

                var x1 = Math.round(x)
                ops.channels.fill(node.params.value1)
                ops.channels[x1] = node.params.value2;
                break;
              }
              case 5:
              case 6: { // ping pong antialiased linear / sin-eased dot chaser
                // position inside animation scaled to 0..1
                const p = (now % (node.params.dt * 1000)) / (node.params.dt * 1000);
                // fractional position of the point
                var x;
                if (node.params.mode === 5) {
                  // ping pong
                  x =(p > 0.5 ? 1 - p : p) * 2 * (ops.channels.length - 1);
                } else {
                  // sin
                  x = (0.5 + 0.5 * Math.sin(p * 2 * 3.14159)) * (ops.channels.length - 1);
                }

                var x1 = Math.floor(x)
                var x2 = Math.ceil(x)
                const v1 = node.params.value1 + (1 - x + x1) * (node.params.value2 - node.params.value1);
                const v2 = node.params.value1 + (1 - x2 + x) * (node.params.value2 - node.params.value1);

                ops.channels.fill(node.params.value1)
                ops.channels[x1] = v1;
                ops.channels[x2] = v2;
                break;
              }
              case 7:
              case 8: { // ping pong not antialiased linear / sin-eased dot chaser
                // position inside animation scaled to 0..1
                const p = (now % (node.params.dt * 1000)) / (node.params.dt * 1000);
                // fractional position of the point
                var x;
                if (node.params.mode === 7) {
                  // ping pong
                  x =(p > 0.5 ? 1 - p : p) * 2 * (ops.channels.length - 1);
                } else {
                  // sin
                  x = (0.5 + 0.5 * Math.sin(p * 2 * 3.14159)) * (ops.channels.length - 1);
                }

                var x1 = Math.round(x)

                ops.channels.fill(node.params.value1)
                ops.channels[x1] = node.params.value2;
                break;
              }
              case 9: // DVD screensaver for 7x5 matrix / 35 ch mode
                if (node.params.channels === 35) {
                  if (now - state.lastStep >= node.params.dt * 1000) {
                    state.lastStep = now;
                    if (state.dx !== 1 && state.dx !== -1) {
                      state.dx = 1;
                    }
                    if (state.dy !== 1 && state.dy !== -1) {
                      state.dy = 1;
                    }
                    state.x = state.x + state.dx;
                    if (state.dx === 1 && state.x === 5) {
                      state.dx = -1;
                    }
                    if (state.dx === -1 && state.x === 0) {
                      state.dx = 1;
                    }
                    state.y = state.y + state.dy;
                    if (state.dy === 1 && state.y === 3) {
                      state.dy = -1;
                    }
                    if (state.dy === -1 && state.y === 0) {
                      state.dy = 1;
                    }
                    for (var i = 0; i < ops.channels.length; i++) {
                      ops.channels[i] = node.params.value1;
                    }
                  }
                  ops.channels[state.x + 0 + (state.y + 0) * 7] = node.params.value2;
                  ops.channels[state.x + 0 + (state.y + 1) * 7] = node.params.value2;
                  ops.channels[state.x + 1 + (state.y + 0) * 7] = node.params.value2;
                  ops.channels[state.x + 1 + (state.y + 1) * 7] = node.params.value2;
                  break;
                }
                // intentionally fall through default when not 35 ch mode
              case 0:
              default: // default fixed intensiy
                for (var i = 0; i < ops.channels.length; i++) {
                  ops.channels[i] = node.params.value1;
                }
            }
            ops.updated = true;
          }

      }
    });

    if (visDataEnabled) {
      tickEvent(now - lastTick);
    }
    lastTick = now;
  }

  function updatePortStates() {
    console.log('Update port states');
    if (!graph) {
      return;
    }

    portStates = portStates || {};

    for (var id in portStates) {
      if (!portStates.hasOwnProperty(id)) {
        continue;
      }
      const p = portStates[id];
      p.found = false;
    }


    graph.nodes.forEach(n => {
      for (var portId in n.portStateIds) {
        if (!n.portStateIds.hasOwnProperty(portId)) {
          continue;
        }
        const psId = n.portStateIds[portId];
        var ps;
        if (!portStates[psId]) {
          ps = {};
          portStates[psId] = ps;
        } else {
          ps = portStates[psId];
        }
        ps.found = true;
      }
    });

    for (var id in portStates) {
      if (!portStates.hasOwnProperty(id)) {
        continue;
      }
      const p = portStates[id];
      if ( !p.found ) {
        delete portStates[id];
      }
    }

    console.log('PortStates:', portStates);
  }


  function updateAnalyzers() {
    console.log('Create / update analyzers');
    if (!ctxFrontend || !graph) {
      return;
    }
    analyzers = analyzers || {};
    var maxFps = 5;

    for (var id in analyzers) {
      if (!analyzers.hasOwnProperty(id)) {
        continue;
      }
      const a = analyzers[id];
      a.found = false;
    }

    graph.nodes.forEach(n => {
      if (n.params && n.params.targetFps) {
        // consider targetFps from all nodes
        maxFps = Math.max(maxFps, n.params.targetFps);
      }
      if (n.type !== 'aa') {
        return;
      }
      var na;
      if (!analyzers[n.id]) {
        na = {
          analyzerNode : ctxFrontend.newAnalyserNode(),
        };
        na.analyzerNode.smoothingTimeConstant = 0;
        analyzers[n.id] = na;
      } else {
        na = analyzers[n.id];
      }
      na.graphNode = n;
      na.found = true;
      na.targetFps = n.params.targetFps;
      na.targetDelayMs = 1000 / n.params.targetFps;
      try {
        na.analyzerNode.fftSize = n.params.fftSize;
        if (na.err && na.err.err) {
          na.err.err = false;
          console.log('Fixed', na.err);
          errEvent(na.err);
        }
        na.err = false;
      } catch (e) {
        na.err = {
          err : true,
          nodeId : n.id,
          nodeLabel : n.label,
          message: e.message
        };
        console.log('Error:', e);
        errEvent(na.err);
      }
    });

    for (var id in analyzers) {
      if (!analyzers.hasOwnProperty(id)) {
        continue;
      }
      const a = analyzers[id];
      if ( !a.found ) {
        delete analyzers[id];
      };
    }

    console.log('Analyzers:', analyzers, 'maxFps:', maxFps);

    if (maxFps > 1000) {
      maxFps = 1000;
    }
    if (maxFps < 5) {
      maxFps = 5;
    }

    const pollDelay = Math.round(1000 / maxFps);
    apoll.setDelay(pollDelay);
  }

  var additionalEdges = [];
  var connectionLabels = {};
  function processConnectionNodes(g) {
    additionalEdges = [];
    connectionLabels = {};

    // check for empty label
    g.nodes.forEach(n => {
      if (n.type !== 'connection') {
        return;
      }
      if (!connectionLabels[n.label]) {
        connectionLabels[n.label] = {
          connectedOutput : undefined,
          connectedInputs : [],
          errMsgs : []
        };
        if (!n.label) {
          connectionLabels[n.label].errMsgs.push('No label specified');
        }
      }
    });

    // capture connected ports
    // check for invariants (no links between connections, at most one input)
    g.edges.forEach(e => {
      const n1 = g.nodes[e.n1index];
      const n2 = g.nodes[e.n2index];
      const n1type = n1.type;
      const n2type = n2.type;
      const n1label = n1.label;
      const n2label = n2.label;
      if (n1type !== 'connection' && n2type !== 'connection') {
        return;
      }
      e.skipFromDag = true;
      if (n1type === 'connection' && n2type === 'connection') {
        if (e.n1index === e.n2index) {
          // should be recognized earlier (no loops allowed)
          connectionLabels[n1label].errMsgs.push(`Circular self link`);
        } else {
          const s = 'Multiple connection nodes are linked';
          if (!connectionLabels[n1label].errMsgs.find(e => e === s)) {
            connectionLabels[n1label].errMsgs.push(s);
          }
          if (!connectionLabels[n2label].errMsgs.find(e => e === s)) {
            connectionLabels[n2label].errMsgs.push(s);
          }
        }
        return;
      }
      if (n2type === 'connection') {
        // an output is connected
        const conn = connectionLabels[n2label];
        if (conn.connectedOutput) {
          conn.errMsgs.push(`Multiple outputs are connected with "${n2label}"`);
        } else {
          conn.connectedOutput = {
            nindex : e.n1index,
            nid : e.n1id,
            p : e.p1
          };
        }
      } else {
        const conn = connectionLabels[n1label];
        conn.connectedInputs.push({
          nindex : e.n2index,
          nid : e.n2id,
          p : e.p2
        });
      }
    });

    // check for output connection when output is connected
    // enumerate additional connections
    for (var connectionLabel in connectionLabels) {
      if (!connectionLabels.hasOwnProperty(connectionLabel)) {
        continue;
      }
      const conn = connectionLabels[connectionLabel];
      if (!conn.connectedOutput && conn.connectedInputs.length > 0) {
        conn.errMsgs.push(`No output is feeding "${connectionLabel}"`);
      }
    }

    // enumerate additional connections
    for (var connectionLabel in connectionLabels) {
      if (!connectionLabels.hasOwnProperty(connectionLabel)) {
        continue;
      }
      const conn = connectionLabels[connectionLabel];
      if (conn.errMsgs.length > 0) {
        continue;
      }
      if (!conn.connectedOutput) {
        continue;
      }
      conn.connectedInputs.forEach(i => {
        additionalEdges.push({
          n1index : conn.connectedOutput.nindex,
          n1id : conn.connectedOutput.nid,
          p1 : conn.connectedOutput.p,

          n2index : i.nindex,
          n2id : i.nid,
          p2 : i.p
        });
      });
    }

    // emit errors/error fixes
    g.nodes.forEach(n => {
      if (n.type !== 'connection') {
        return;
      }
      if (connectionLabels[n.label].errMsgs.length > 0) {
        n.err = {
          err : true,
          nodeId : n.id,
          nodeLabel : n.label,
          message: connectionLabels[n.label].errMsgs.join(' / ')
        };
        errEvent(n.err);
      } else if (n.err && n.err.err) {
        n.err.err = false;
        console.log('Fixed', n.err);
        errEvent(n.err);
      }
    });

    console.log('Process connection nodes:');
    console.log('additional edges:', additionalEdges);
    console.log('connectionLabels:', connectionLabels);
  }

  function updateTopology(g) {
    // note that passed graph is extended / updated
    //   g.nodeIds:     map of ID to nodes
    //   g.dagOrderIds: Array of DAG ordered node IDs to be traverse for ticks
    //   g.nodes[].isConnected: true when there is an in/out edge
    //   g.nodes[].portStateIds: map of port ID to ID in portStates (when connected)
    //   g.nodes[].err: last error event (optional)
    //   g.edges[].skipFromDag: edges not to be considered for DAF or during ticks
    g.nodeIds = {};

    processConnectionNodes(g);

    g.nodes.forEach(n => {
      n.isConnected = false;
      g.nodeIds[n.id] = n;
      n.portStateIds = {};
      if (nodeFunctions[n.type] && nodeFunctions[n.type].initState) {
        n.state = nodeFunctions[n.type].initState(n.params);
      }
    });

    const dagEdges = g.edges.filter(e => !e.skipFromDag).concat(additionalEdges);
    console.log('DAG edges:', dagEdges);

    dagEdges.forEach(e => {
      g.nodeIds[e.n1id].isConnected = true;
      g.nodeIds[e.n2id].isConnected = true;
      g.nodeIds[e.n1id].portStateIds[ e.p1 ] = `${e.n1id}/${e.p1}`;
      g.nodeIds[e.n2id].portStateIds[ e.p2 ] = `${e.n1id}/${e.p1}`;
    });

    const dagLevels = {};
    g.nodes.forEach(n => { dagLevels[n.id] = 0; });
    var nextRound = true;
    var loopFound = false;
    while (nextRound && !loopFound) {
      nextRound = false;
      dagEdges.forEach(e => {
        const minDagLevel = dagLevels[e.n1id] + 1;
        if (dagLevels[e.n2id] < minDagLevel) {
          nextRound = true;
          dagLevels[e.n2id] = minDagLevel;
          if (minDagLevel > g.nodes.lenght || minDagLevel > g.edges.length) {
            // TODO: This will leave editor in an inconsistent state
            // better error handling / reporting is needed
            loopFound = true;
          }
        }
      });
    }

    if (loopFound) {
      throw new Error('Loop found');
    }

    g.dagOrderIds = [];
    g.nodes.forEach(n => g.dagOrderIds.push(n.id));
    g.dagOrderIds.sort((a, b) => dagLevels[a] - dagLevels[b]);
    console.log('Processing graph set', g);

    graph = g;
    updatePortStates();
    updateAnalyzers();
  }

  const ret = {
    onError : h => {
      errEvent.add(h);
      return ret;
    },
    setCtx : ctxFe => {
      console.log('AudioContext frontend set');
      ctxFrontend = ctxFe;
      analyzers = undefined;
      updateAnalyzers();
      return ret;
    },
    setRemoteCalls : rc => {
      remoteCalls = rc;
      return ret;
    },
    setGraph : g => {
      updateTopology(g);
      return ret;
    },
    updateLabel : l => {
      console.log('Label update', l);
      const node = graph.nodeIds[l.nodeid];
      node.label = l.value;
      if (node.type === 'connection') {
        // processConnectionNodes(graph);
        updateTopology(graph);
      }
      return ret;
    },
    updateParameter : p => {
      console.log('Parameter update', p);
      const node = graph.nodeIds[p.nodeid];
      node.params[p.paramid] = p.value;
      if (node.type === 'aa' || p.paramid === 'targetFps') {
        // also max FPS for poll is identified in updateAnalyzers()
        updateAnalyzers();
      }

      if (nodeFunctions[node.type] && nodeFunctions[node.type].initState) {
        if (nodeFunctions[node.type].updateState) {
          nodeFunctions[node.type].updateState(node.params, node.state);
        } else {
          node.state = nodeFunctions[node.type].initState(node.params);
        }
      }

      return ret;
    },
    run : () => {
      console.log('[pipeline] Run');
      lastTick = Date.now(); // avoid reporting large first dt value
      apoll.start();
      return ret;
    },
    stop : () => {
      console.log('[pipeline] Stop');
      apoll.stop();
      return ret;
    },
    isRunning : () => apoll.isRunning(),
    reset : () => {
      console.log('[pipeline] Reset');
      graph && graph.nodes.forEach(n => {
        if (nodeFunctions[n.type] && nodeFunctions[n.type].initState) {
          n.state = nodeFunctions[n.type].initState(n.params);
        }
      });
      if (portStates) {
        for (var id in portStates) {
          if (!portStates.hasOwnProperty(id)) {
            continue;
          }
          const p = portStates[id];
          p.value = undefined;
          p.bins = undefined;
          p.channels = undefined;
          p.maxf = undefined;
          p.updated = false;
        }
      }
      return ret;
    },
    // Interface for visualizations
    /**
     * No visualization callbacks will be invoked.
     */
    pauseVisData : () => {
      console.log('[pipeline] Pause visualization');
      visDataEnabled = false;
      return ret;
    },
    /**
     * Invoke visualization callbacks.
     */
    resumeVisData : () => {
      console.log('[pipeline] Resume visualization');
      visDataEnabled = true;
      return ret;
    },
    /**
     * Invoked with time in milliseconds since last tick.
     */
    onTick : h => {
      tickEvent.add(h);
      return ret;
    },
    getPortState : portId => portStates[portId],
    getPortStateInfos : () => {
      if (!graph) {
        return;
      }
      const ret = [];
      graph.nodes.forEach(n => {
        const ports = nodeTypes[n.type].ports;
        for (var pid in ports) {
          if (!ports.hasOwnProperty(pid)) {
            continue;
          }
          if (ports[pid].type === 'out' && n.portStateIds[pid]) {
            ret.push({
              portStateId : n.portStateIds[pid],
              nodeId : n.id,
              nodeLabel : n.label,
              portLabel : ports[pid].label
            });
          }
        }
      });
      return ret;
    }
  };
  return ret;
}
