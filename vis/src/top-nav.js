'use strict';

import './top-nav.css';
import '@fortawesome/fontawesome-free/css/all.css'
import * as statusIcons from './top-nav-status-icons.js';

export function addTo(parentD3) {

  const div = parentD3.append('div').classed('top-nav-cnt', true);
  const left = div.append('div').classed('top-nav-cell', true);
  const right = div.append('div').classed('top-nav-cell', true);

  const ret = {
    statusIconStyles : statusIcons.statusIconStyles,
    label : t => {
      left.append('div').classed('top-nav-label', true).text(t);
      return ret;
    },
    kv : (k, title) => {
      const cd = left.append('div').classed('top-nav-kv-cont', true).attr('title', title);
      const kd = cd.append('div').classed('top-nav-kv-key', true).text(k);
      const vd = cd.append('div').classed('top-nav-kv-value', true);
      return vd;
    },
    sep : () => {
      right.append('span').classed('top-nav-sep', true);
      return ret;
    },
    addStatusIcon(opts) {
      return statusIcons.addStatusIcon(right, opts);
    },
    addButtonIcon(opts) {
      const icon = right.append('i')
        .classed('top-nav-btn-icon', true)
        .classed('fa', true)
        .classed(opts.style, true);
      if (opts.title) {
        icon.attr('title', opts.title);
      }
      if (opts.onClick) {
        icon.on('click', opts.onClick);
      }
      return ret;
    }
  };
  return ret;
}

export const statusIconStyles = statusIcons.statusIconStyles;
