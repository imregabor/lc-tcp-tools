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
      return ret;
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
      return ret;
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
      return ret;
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
      return ret;
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
  },
  ear : {
    common : '',
    ok : 'fa-ear-listen',
    err : 'fa-ear-deaf',
    warn : 'fa-ear-deaf',
    unknown : 'fa-ear-deaf'
  },
  plug : {
    common : '',
    ok : 'fa-plug-circle-check',
    err : 'fa-plug-circle-xmark',
    warn : 'fa-plug-circle-exclamation',
    unknown : 'fa-plug-circle-exclamation'
  }
};
