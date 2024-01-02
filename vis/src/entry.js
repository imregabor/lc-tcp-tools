'use strict';

import * as em from './em.js';
import * as em2 from './em2.js';
import * as catalog from './catalog.js';
import * as rc from './rc.js';

function loaded() {
  if (location.hash && location.hash === '#rc') {
    document.title = 'Remote controller';
    rc.initPage();
  } else if (location.hash && location.hash === '#vis') {
    document.title = 'Effects machine';
    em.initPage();
  } else if (location.hash && location.hash === '#vis2') {
    document.title = 'Effects machine 2';
    em2.initPage();
  } else {
    document.title = 'LC pages';
    catalog.initPage();
  }
  window.onhashchange = () => window.location.reload();
}

document.addEventListener('DOMContentLoaded', loaded);
