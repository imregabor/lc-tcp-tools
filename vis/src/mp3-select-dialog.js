'use strict';

import * as d3 from 'd3';
import './mp3-select-dialog.css'

var mp3index;

function formatSize(size) {
  if (size > 1024 * 1024) {
    return Math.round(10 * size / (1024 * 1024)) / 10 + ' MiB';
  } else if (size > 1024) {
    return Math.round(10 * size / 1024) / 10 + ' KiB';
  }
  return size + ' B';
}

export function loadMp3ListFromServer(srv) {
  fetch(`${srv}/index-mp3.json`)
    .then(response => response.json())
    .then(l => {
      //console.log(`MP3 index from "${srv}" received`, l)
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
      //console.log('after sort', mp3index);
    })
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

    const hi = m2.append('div').classed('header-info', true).append('span');

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

    function updateMp3Count() {
      var visibles = 0;
      var hiddens = 0;
      // See https://riptutorial.com/d3-js/example/27637/using--this--with-an-arrow-function
      lstd.selectAll('.list-entry').each((d, i, nodes) => {
        if (d3.select(nodes[i]).style('display') === 'none') {
          hiddens++;
        } else {
          visibles ++;
        }
      });
      if (hiddens === 0) {
        hi.text(`Displayed all ${visibles} items`);
      } else if (visibles !== 0) {
        hi.text(`Displayed ${visibles} items`);
      } else {
        hi.text(`No result found`);
      }
    }

    function dosrc(q) {
      clri.classed('disabled', q === '');
      lstd.selectAll('.list-entry')
        .style('display', d => {
          if (q === '') {
            return '';
          }
          return (d.sortBase.includes(q) || d.filename.includes(q)) ? '' : 'none';
        });
      updateMp3Count();
    }

    const lstd = m2.append('div').classed('lst', true);
    const entries = lstd.selectAll('.list-entry').data(mp3index.mp3s).enter().append('div')
        .classed('list-entry', true)
        .on('click', (e, d) => {
          console.log(d)
          event.preventDefault();
          m1.remove();
          resolve(`${d.url}`);
        })

    entries.append('span')
        .classed('t1', true)
        .text(d => d.filename);

    entries.append('span')
        .classed('t2', true)
        .text(d => formatSize(d.size) + ' ' + d.ext + ' (' + d.dirs.join('/') + ')');

    updateMp3Count();

    // resolve(`${mp3srv}/${mp3index.mp3s[123].url}`);
  });
}
