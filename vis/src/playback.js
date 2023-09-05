'use strict';

/*
 * Contents are based on repo https://github.com/mdn/webaudio-examples
 * published under `CC0-1.0 license` (see
 * https://github.com/mdn/webaudio-examples/blob/41775fb3e0dbaaf27f643b5e9937f1ec2993badd/LICENSE ).
 */

import './playback.css';

/**
 * Add playback.
 *
 * parentD3: D3 selection of parent element
 * opts: callbacks called with component facade when audio context is initiated (inside a user action)
 */
export default function addSimplePlayback(parentD3, opts) {

  const div = parentD3.append('div').classed('playback-controls', true);
  const b1 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Play Viper')
      .on('click', () => load('data/viper.mp3'));

  const b2 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Play Outfoxing')
      // track credit:
      // Outfoxing the Fox by Kevin MacLeod under Creative Commons
      .on('click', () => load('data/outfoxing.mp3'));

  const b3 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Play RetroFuture Dirty')
      // track credit:
      // RetroFuture Dirty Kevin MacLeod (incompetech.com)
      // Licensed under Creative Commons: By Attribution 3.0 License http://creativecommons.org/ licenses/by/3.0/
      .on('click', () => load('data/retrofuturedirty.mp3'));

  const b4 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Play Sneaky Snitch')
      // track credit:
      // "Sneaky Snitch" Kevin MacLeod (incompetech.com)
      // Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/
      .on('click', () => load('data/sneakysnitch.mp3'));


  const bStop = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Stop')
      .attr('disabled', true)
      .on('click', () => stop());

  const msgDiv = div.append('div').classed('message', true)
  const msg1 = msgDiv.append('span').text('Click on a play button');
  const msg2 = msgDiv.append('span');


  var audioContext;
  var sourceNode;
  var sampleRate;
  var playing = false;

  function disableButtons() {
    b1.attr('disabled', true);
    b2.attr('disabled', true);
    b3.attr('disabled', true);
    b4.attr('disabled', true);
  }

  function enableButtons() {
    b1.attr('disabled', null);
    b2.attr('disabled', null);
    b3.attr('disabled', null);
    b4.attr('disabled', null);
    bStop.attr('disabled', true);
  }

  function stop() {
    if (!playing) {
      throw new Error('Not playing');
    }
    playing = false;
    sourceNode.stop(0);
    enableButtons();
    message2('Playback stopped');
    if (opts.onStop) {
      opts.onStop(ret);
    }

  }

  function message(message) {
    msg1.text(message);
    msg2.text('');
  }

  function message2(message) {
    msg2.text(message);
  }


  function load(url) {
    disableButtons();

    // A user interaction happened we can create the audioContext
    audioContext = new AudioContext();

    message(`Loading audio from ${url}`);

    fetch(url)
        .then(response => response.arrayBuffer())
        .then(downloadedBuffer => {
          message(`Loaded ${downloadedBuffer.byteLength} bytes, start decoding`);
          return audioContext.decodeAudioData(downloadedBuffer)
        })
        .then((decodedBuffer) => {
          sampleRate = decodedBuffer.sampleRate;
          message(`Decoded ${decodedBuffer.duration} s, ${decodedBuffer.numberOfChannels} ch, with sample rate ${decodedBuffer.sampleRate}.`)

          sourceNode = new AudioBufferSourceNode(audioContext, {
            buffer: decodedBuffer,
            loop: true,
          });
          sourceNode.connect(audioContext.destination);

        })
        .then(() => {
          if (opts.build) {
            opts.build(ret);
          }
          ret.start();
        });
  }

  // TODO: reuse context, see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
  // > It's recommended to create one AudioContext and reuse it instead of initializing a new one each time

  const ret = {
    start : () => {
      if (playing) {
        throw new Error('Already playing');
      }
      if (!sourceNode) {
        throw new Error('No audio loaded');
      }
      bStop.attr('disabled', null);
      sourceNode.start(0);
      playing = true;
      message2('Playback started');
      if (opts.onStart) {
        opts.onStart(ret);
      }
    },
    newAnalyserNode : () => {
      if (!audioContext) {
        throw new Error('No audio loaded');
      }
      // see https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode
      const analyserNode = new AnalyserNode(audioContext);
      sourceNode.connect(analyserNode);
      return analyserNode;
    },
    sampleRate : () => sampleRate
  };
  return ret;
}

