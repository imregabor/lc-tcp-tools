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

var mp3index;

function loadMp3List(srv) {
  fetch(`${srv}/index-mp3.json`)
    .then(response => response.json())
    .then(l => {
      console.log(`MP3 index from "${srv}" received`, l)
      if (!mp3index) {
        mp3index = { mp3s : [] };
      }
      for (var m of l.mp3s) {
        m.url = srv + '/' + m.url;

        // see https://stackoverflow.com/questions/6555182/remove-all-special-characters-except-space-from-a-string-using-javascript
        // see https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript
        m.sortBase = m.filename.toLowerCase()
          .normalize('NFKD').replace(/[\u0300-\u036f]/g, '') // remove accents, diacritics
          .replace(/'/g, '')  // collapse apostrophes
          .replace(/[^a-zA-Z0-9 ]/g, ' ') // all remainig non-alphanumeric characters to space
          .replace(/ +/g, ' ') // collapse multi space sequences
          .replace(/^ */g, ''); // remove trailing spaces

        mp3index.mp3s.push(m);
      }

      const cl = new Intl.Collator('en').compare;
      const s = (a, b) => cl(a.sortBase, b.sortBase);
      mp3index.mp3s.sort(s);


      console.log('after sort', mp3index);
    })

}

function loadMp3Index() {
  fetch("settings")
    .then(response => response.json())
    .then(s => {
      console.log('Settings arrived', s)
      if (s.mp3srv) {
        for(var s of s.mp3srv) {
          loadMp3List(s);
        }
      }
    });
}






export function chooseMp3() {
  return new Promise((resolve, reject) => {
    const body = d3.select('body');

    function cancel() {
        event.stopPropagation();
        m1.remove();
        reject();
    }

    const m1 = body.append('div').classed('modal-bg', true).on('click', cancel);
    const m2 = m1.append('div').classed('modal-dg', true).on('click', () => event.stopPropagation());

    m2.append('h1').text('Pick an mp3').append('i').classed('fa fa-times', true).on('click', cancel);

    const srcd = m2.append('div').classed('src', true);
    const srci = srcd.append('input').attr('type', 'text').on('input', e => {
      const v = srci.node().value;
      dosrc(v);
    });
    srci.node().focus();
    const clri = srcd.append('i').classed('fa fa-times disabled', true).on('click', () => {
      srci.node().value = '';
      dosrc('');
    });

    function dosrc(q) {
      clri.classed('disabled', q === '');
      lstd.selectAll('a')
        .style('display', d => {
          if (q === '') {
            return '';
          }
          return (d.sortBase.includes(q) || d.filename.includes(q)) ? '' : 'none';
        });
    }

    const lstd = m2.append('div').classed('lst', true);
    lstd.selectAll('a').data(mp3index.mp3s).enter().append('a')
        .attr('href', '#')
        .text(d => d.filename)
        .on('click', (e, d) => {
          console.log(d)
          event.preventDefault();
          m1.remove();
          resolve(`${d.url}`);
        })
        .append('br');

    // resolve(`${mp3srv}/${mp3index.mp3s[123].url}`);
  });

}


/**
 * Add playback.
 *
 * parentD3: D3 selection of parent element
 * opts: callbacks called with component facade when audio context is initiated (inside a user action)
 */
export function addSimplePlayback(parentD3, opts) {

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

  const b5 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Tone')
      .on('click', () => tone());

  const b6 = div.append('input')
      .attr('type', 'button')
      .attr('value', 'Audio')
      .on('click', () => {
        chooseMp3()
            .then(url => audio(url))
            .catch(e => {})
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

    audioContext = new AudioContext();

    sourceNode = audioContext.createMediaElementSource(a.node());
    sourceNode.connect(audioContext.destination);

    sampleRate = audioContext.sampleRate;
    if (opts.build) {
      opts.build(ret);
    }


    useAudio = true;
    ret.start();

  }

  function tone() {
    message('Play 440Hz sinewave');
    disableButtons();

    // A user interaction happened we can create the audioContext
    audioContext = new AudioContext();

    sourceNode = audioContext.createOscillator();
    sourceNode.connect(audioContext.destination);
    sampleRate = audioContext.sampleRate;

    if (opts.build) {
      opts.build(ret);
    }
    ret.start();
  }

  function stop() {
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
          ret.start();
        });
  }

  // TODO: reuse context, see https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
  // > It's recommended to create one AudioContext and reuse it instead of initializing a new one each time

  loadMp3Index();

  const ret = {
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
    seek : t => {
      console.log(t)
      if (t < 0 || !playing || !useAudio) {
        return;
      }

      a.node().currentTime = t;

      return ret;
    }
  };
  return ret;
}

