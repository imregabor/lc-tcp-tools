'use strict';

import * as em from './em.js';
import * as em2 from './em2.js';
import * as catalog from './catalog.js';
import * as rc from './rc.js';

function loaded() {
  if (location.hash && location.hash === '#rc') {
    rc.initPage();
  } else if (location.hash && location.hash === '#vis') {
    em.initPage();
  } else if (location.hash && location.hash === '#vis2') {
    em2.initPage();
  } else {
    catalog.initPage();
  }
  window.onhashchange = () => window.location.reload();
}

document.addEventListener('DOMContentLoaded', loaded);
