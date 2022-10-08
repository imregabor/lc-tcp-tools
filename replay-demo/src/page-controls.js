"use strict";

import './page-controls.css';
import './fa.js';

/**
 * Page control and status feedback icons.
 */

function addLinkIcon(d3sel, opts) {
  const icon = d3sel.append('i')
      .classed('fa fa-fw stat', true)
      .classed(opts.styles.common, true);

  const ret = {
    unknown : () => {
      icon
          .classed(opts.styles.ok, false)
          .classed(opts.styles.err, false)
          .classed(opts.styles.warn, false)
          .classed(opts.styles.unknown, true)
          .classed('err ok warn', false);
      icon.attr('title', opts.titles.unknown);
    },
    ok : () => {
      icon
          .classed(opts.styles.err, false)
          .classed(opts.styles.warn, false)
          .classed(opts.styles.unknown, false)
          .classed(opts.styles.ok, true)
          .classed('err warn', false)
          .classed('ok', true);
      icon.attr('title', opts.titles.ok);

    },
    err : () => {
      icon
          .classed(opts.styles.ok, false)
          .classed(opts.styles.warn, false)
          .classed(opts.styles.unknown, false)
          .classed(opts.styles.err, true)
          .classed('ok warn', false)
          .classed('err', true);
      icon.attr('title', opts.titles.err);
    },
    warn : () => {
      icon
          .classed(opts.styles.ok, false)
          .classed(opts.styles.err, false)
          .classed(opts.styles.unknown, false)
          .classed(opts.styles.warn, true)
          .classed('err ok', false)
          .classed('warn', true);
        icon.attr('title', opts.titles.warn);
    }
  };
  ret.unknown();
  return ret;

}

export function addTo(d3sel) {
  const div = d3sel.append('div').classed('page-controls', true);

  const ret = {
    addLinkIcon : opts => addLinkIcon(div, opts),
    getDiv : () => div
  };

  return ret;
}

export const iconStyles = {
  link : {
    common : 'fa-link-slash',
    ok : 'fa-link',
    err : 'fa-link-slash',
    warn : 'fa-link-slash',
    unknown : 'fa-link-slash'
  }
};
