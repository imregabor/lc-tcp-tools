'use strict';

/*
 * Contents are based on repo https://github.com/mdn/webaudio-examples
 * published under `CC0-1.0 license` (see
 * https://github.com/mdn/webaudio-examples/blob/41775fb3e0dbaaf27f643b5e9937f1ec2993badd/LICENSE ).
 */

import './playback.css';
import * as u from './util.js';
import * as d3 from 'd3';
import '@fortawesome/fontawesome-free/css/all.css'
import * as mp3dialog from './mp3-select-dialog.js';
import * as apiClient from './api-client.js';

/**
 * Add playback.
 *
 * parentD3: D3 selection of parent element
 * opts: callbacks called with component facade when audio context is initiated (inside a user action)
 */
export function addSimplePlayback(parentD3, opts) {

  const div = parentD3.append('div').classed('playback-controls', true);

  const b0 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Listen')
      .on('click', () => {
        ensureAudioContext();
        b0.remove();
      });


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

  const b5 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Tone')
      .on('click', () => tone());

  const b6 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Audio')
      .on('click', () => {
        mp3dialog.chooseMp3()
            .then(url => audio(url))
            .catch(e => {
              console.log('Error in mp3 dialog', e);
            })
      });

  const bStop = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Stop')
      .attr('disabled', true)
      .on('click', () => stop());

  // const a = div.append('audio').attr('crossorigin', 'anonymous');

  const msgDiv = div.append('div').classed('message', true)
  const msg1 = msgDiv.append('span').text('Click on a play button');
  const msg2 = msgDiv.append('span');


  var audioContext;
  var sourceNode;
  var sampleRate;
  var playing = false;

  function ensureAudioContext() {
    if (!audioContext) {
      audioContext = new AudioContext();
    }
  }



  function disableButtons() {
    b1.attr('disabled', true);
    b2.attr('disabled', true);
    b3.attr('disabled', true);
    b4.attr('disabled', true);
    b5.attr('disabled', true);
    b6.attr('disabled', true);
  }

  function enableButtons() {
    b1.attr('disabled', null);
    b2.attr('disabled', null);
    b3.attr('disabled', null);
    b4.attr('disabled', null);
    b5.attr('disabled', null);
    b6.attr('disabled', null);
    bStop.attr('disabled', true);
  }

  var useAudio = false;

  var a;
  var adiv;

  var lastPlaybackInfo;

  function audio(url) {
    message(`Start playing from ${decodeURI(url)}`);
    disableButtons();
    adiv = div.append('div').classed('playback-player', true)
    a = adiv.append('audio').attr('crossorigin', 'anonymous').attr('controls', true);
    a.attr('src', url);

    const xctd = adiv.append('div').classed('playback-extra-controls', true);
    xctd.append('i').classed('fa fa-caret-left fa-fw', true).on('click', () => {
      const ct = a.node().currentTime;
      a.node().currentTime = Math.max(0, ct - 3);
      a.node().play();
    });

    xctd.append('i').classed('fa fa-caret-right fa-fw', true).on('click', () => {
      const ct = a.node().currentTime;
      a.node().currentTime = ct + 3;
      a.node().play();
    });

    //audioContext = new AudioContext();
    ensureAudioContext();

    sourceNode = audioContext.createMediaElementSource(a.node());
    sourceNode.connect(audioContext.destination);

    sampleRate = audioContext.sampleRate;
    if (opts.build) {
      opts.build(ret);
    }


    useAudio = true;

    lastPlaybackInfo = {
      audio : 'MP3',
      url : url
    };

    ret.start();

  }

  function tone() {
    message('Play 440Hz sinewave');
    disableButtons();

    // A user interaction happened we can create the audioContext
    // audioContext = new AudioContext();
    ensureAudioContext();

    sourceNode = audioContext.createOscillator();
    sourceNode.connect(audioContext.destination);
    sampleRate = audioContext.sampleRate;

    if (opts.build) {
      opts.build(ret);
    }

    lastPlaybackInfo = {
      audio : '440Hz sinewave'
    };

    ret.start();
  }

  function stop() {
    lastPlaybackInfo = undefined;
    if (!playing) {
      throw new Error('Not playing');
    }
    playing = false;
    if (useAudio) {
      useAudio = false;
      a.node().pause();
      adiv.remove();
      a = undefined;
      adiv = undefined;
    } else {
      sourceNode.stop(0);
    }
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
    // audioContext = new AudioContext();
    ensureAudioContext();

    message(`Loading audio from ${url}`);

    fetch(url)
        .then(response => response.arrayBuffer())
        .then(downloadedBuffer => {
          message(`Loaded ${downloadedBuffer.byteLength} bytes, start decoding`);
          return audioContext.decodeAudioData(downloadedBuffer)
        })
        .then((decodedBuffer) => {
          sampleRate = decodedBuffer.sampleRate;
          message(`Decoded ${u.niceRound(decodedBuffer.duration)} s, ${decodedBuffer.numberOfChannels} ch, with sample rate ${decodedBuffer.sampleRate}.`)

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
          lastPlaybackInfo = {
            audio : 'MP3 (decoded from buffer)',
            url : url
          };

          ret.start();
        });
  }

  // TODO: reuse context, see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
  // > It's recommended to create one AudioContext and reuse it instead of initializing a new one each time

  apiClient.getMp3Servers(mp3dialog.loadMp3ListFromServer);


  const ret = {
    tryToCreateAudioContext : () => ensureAudioContext(),
    startPlaybackFrom : url => {
      console.log('Start playback from', url)
      if (playing) {
        stop();
      }
      audio(url);
    },
    start : () => {
      if (playing) {
        throw new Error('Already playing');
      }
      if (!sourceNode) {
        throw new Error('No audio loaded');
      }
      bStop.attr('disabled', null);

      if (useAudio) {
        a.node().play();
      }  else {
        sourceNode.start(0);
      }


      playing = true;
      message2('Playback started');
      if (opts.onStart) {
        opts.onStart(ret);
      }
    },
    ensureStop : () => {
      if (!playing) {
        return;
      }
      stop();
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
    sampleRate : () => sampleRate,
    getCurrentTime : () => {
      if (!playing) {
        return 0;
      }
      if (useAudio) {
        return a.node().currentTime;
      }
      return 0;
    },
    getDuration : () => {
      if (!playing) {
        return 0;
      }
      if (useAudio) {
        const d = a.node().duration;
        if (d) {
          return d;
        }
      }
      return 0;
    },
    getPlaybackInfo : () => {
      if (!playing) {
        return undefined;
      }
      return lastPlaybackInfo;
    },
    isPlaying : () => playing,
    seek : t => {
      // console.log('Seek to ' + t);
      if (t < 0 || !playing || !useAudio) {
        return;
      }

      a.node().currentTime = t;

      return ret;
    }
  };
  return ret;
}
