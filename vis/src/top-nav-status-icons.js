'use strict';

import './top-nav-status-icons.css';
import '@fortawesome/fontawesome-free/css/all.css'

export function addStatusIcon(d3sel, opts) {
  const icon = d3sel.append('i')
      .classed('fa fa-fw top-nav-status', true)
      .classed(opts.styles.common, true);
  const badge = icon.append('i')
      .classed('fa fa-fw top-nav-status-badge', true)
      .style('opacity', 0);

  const ret = {
    badgeOff : (transitionDuration, transitionDelay) => {
      (transitionDuration
          ? badge.transition().duration(transitionDuration).delay(transitionDelay ? transitionDelay : 0)
          : badge
      )
        .style('opacity', 0);
      return ret;
    },
    badge : (faclass, transitionDuration, transitionDelay) => {
      badge
        .attr('class', null)
        .classed(faclass, true)
        .classed('fa fa-fw top-nav-status-badge', true);
      (transitionDuration
          ? badge.transition().duration(transitionDuration).delay(transitionDelay ? transitionDelay : 0)
          : badge
      )
        .style('opacity', 1);
      return ret;
    },
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
    ok : titleExtra => {
      icon
          .classed(opts.styles.err, false)
          .classed(opts.styles.warn, false)
          .classed(opts.styles.unknown, false)
          .classed(opts.styles.ok, true)
          .classed('err warn', false)
          .classed('ok', true);
      const title = titleExtra ? `${opts.titles.ok} ${titleExtra}` : opts.titles.ok;
      icon.attr('title', title);
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

export const statusIconStyles = {
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
  },
  network : {
    common : 'fa-solid fa-network-wired',
    ok : '',
    err : '',
    warn : '',
    unknown : ''
  }
};
