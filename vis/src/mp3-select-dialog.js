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
  return fetch(`${srv}/index-mp3.json`)
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

export function addItemsTo(m2, select) {
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
          select(`${d.url}`);
        })

    entries.append('span')
        .classed('t1', true)
        .text(d => d.filename);

    entries.append('span')
        .classed('t2', true)
        .text(d => formatSize(d.size) + ' ' + d.ext + ' (' + d.dirs.join('/') + ')');

    updateMp3Count();

}

export function showModal(opts) {
  const body = d3.select('body');

  function cancel() {
    event.stopPropagation();
    m1.remove();
    body.on('keydown', oldeh);
    if (opts.reject) {
      opts.reject();
    }
  }

  function select(url) {
    m1.remove();
    body.on('keydown', oldeh);
    if (opts.resolve) {
      opts.resolve(url);
    }
  }

  const oldeh = body.on('keydown');
  body.on('keydown', e => {
    if (e.key === 'Escape') {
      cancel();
    }
    if (e.key === 'Enter' && opts.ok) {
      select(opts.ok());
    }
  });

  const m1 = body.append('div')
      .classed('modal-bg', true)
      .on('click', cancel);
  const m2 = m1.append('div')
      .classed('modal-dg', true)
      .on('click', () => event.stopPropagation());

  m2.append('h1')
      .text(opts.title)
      .append('i')
      .classed('fa fa-times', true)
      .on('click', cancel);

  const m2_body = m2.append('div');

  if (opts.ok) {
    const m2_ft = m2.append('div').classed('modal-dg-ftr', true);
    m2_ft.append('div')
        .classed('btn', true)
        .text('ok')
        .on('click', () => {
          select(opts.ok());
        });
  }
  //const m2_body = m2.append('div');


  const ret = {
    doResolve : value => select(value),
    doReject : () => cancel(),
    getDgD3 : () => { return m2; },
    appendKV : (k, v) => {
      const d1 = m2_body.append('div').classed('modal-kv-row', true);
      d1.append('div').classed('modal-kv-k', true).text(k);
      d1.append('div').classed('modal-kv-v', true).text(v);
      return ret;
    },
    appendStrInput : (k, v) => {
      const d1 = m2_body.append('div').classed('modal-kv-row', true);
      d1.append('div').classed('modal-kv-k', true).text(k);
      const i = d1.append('div').classed('modal-kv-v', true).append('input')
          .attr('value', v)
          .attr('size', 50);
      i.node().focus();
      i.node().select();
      return () => i.property('value');
    }
  };
  return ret;
}


export function chooseMp3() {
  return new Promise((resolve, reject) => {
    const modal = showModal({
      title : 'Pick an mp3',
      resolve : d => resolve(d),
      reject : () => reject()
    });
    addItemsTo(modal.getDgD3(), modal.doResolve);
  });
}
