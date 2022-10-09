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

function addButtonIcon(d3sel, opts) {
  const icon = d3sel.append('i')
      .classed('fa', true)
      .classed(opts.styles.common, true);

  if (opts.title) {
    icon.attr('title', opts.title);
  }

  const ret = {
    isOn : () => icon.classed('on'),
    on : () => {
      icon
          .classed(opts.styles.off, false)
          .classed(opts.styles.on, true)
          .classed('on', true);
      if (opts.titles) {
        icon.attr('title', opts.titles.on);
      }
    },
    off : () => {
      icon
          .classed(opts.styles.on, false)
          .classed(opts.styles.off, true)
          .classed('on', false);
      if (opts.titles) {
        icon.attr('title', opts.titles.off);
      }
    }
  };
  ret.off();
  icon.on('click', () => {
    const toOn = !icon.classed('on');
    toOn ? ret.on() : ret.off();
    if (opts.onChange) { opts.onChange(toOn); }
    if (opts.onToOn) { opts.onToOn(); }
    if (opts.onToOff) { opts.onToOff(); }
  });
  return ret;
}

export function addTo(d3sel) {
  const div = d3sel.append('div').classed('page-controls', true);

  const ret = {
    addLinkIcon : opts => addLinkIcon(div, opts),
    addButtonIcon : opts => addButtonIcon(div, opts),
    getDiv : () => div,
    sep : () => {
      div.append('span').classed('sep', true);
      return ret;
    }
  };

  return ret;
}

export const buttonStyles = {
  info : {
    common : 'fa-circle-info',
    on : '',
    off : ''
  },
  playStop : {
    common : '',
    on : 'fa-solid fa-circle-stop',
    off : 'fa-regular fa-circle-play'
  },
  clock : {
    common : 'fa-clock',
    on : 'fa-solid',
    off : 'fa-regular'
  }
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
