"use strict";

import './qr-overlay.css';
import * as d3 from 'd3';
import QRCode from 'qrcode';

export default function show() {
  const div = d3.select('body').append('div').classed('qr-overlay', true);

  div.on('click', () => div.remove());
  d3.select('body').on('keydown', e => {
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
      d3.select('body').on('keydown', null);
      div.remove();
    }
  });

  const ret = {
    add : (qr, label1, label2) => {
      const item = div.append('div').classed('qr-item', true);
      if (label1) {
        item.append('div').classed('qr-label-1', true).text(label1);
      }

      const img = item.append('img');

      if (label2) {
        item.append('div').classed('qr-label-2', true).text(label2);
      }

      QRCode
            .toDataURL(qr, {
              errorCorrectionLevel: 'H',
              scale: 10
            })
            .then(dataUrl => {
              img.attr('src', dataUrl);
            })
            .catch(err => {
              console.error(err)
            });
    }
  };
  return ret;
}
