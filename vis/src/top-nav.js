'use strict';

import './top-nav.css';
import '@fortawesome/fontawesome-free/css/all.css'


export default function addToPage(parentD3) {

  const div = parentD3.append('div').classed('top-nav-cnt', true);
  const left = div.append('div');
  const right = div.append('div');

  const ret = {
    label : t => {
      left.append('div').classed('top-nav-label', true).text(t);
      return ret;
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
