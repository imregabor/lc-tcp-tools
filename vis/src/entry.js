'use strict';

import * as em from './em.js';
import * as em2 from './em2.js';
import * as catalog from './catalog.js';
import * as rc from './rc.js';
import * as panes from './panes.js';
import * as colorscales from './color-scales.js';

function loaded() {
  if (location.hash && location.hash === '#p') {
    document.title = 'Dynamic pane layout demo';
    panes.initPage();
  } else if (location.hash && location.hash === '#rc') {
    document.title = 'Remote controller';
    rc.initPage();
  } else if (location.hash && location.hash === '#vis') {
    document.title = 'Effects machine';
    em.initPage();
  } else if (location.hash && location.hash === '#vis2') {
    document.title = 'Effects machine 2';
    em2.initPage();
  } else if (location.hash && location.hash === '#colorscale') {
    document.title = 'Color scale stuff';
    colorscales.initPage();
  } else {
    document.title = 'LC pages';
    catalog.initPage();
  }
  window.onhashchange = () => window.location.reload();
}

document.addEventListener('DOMContentLoaded', loaded);
