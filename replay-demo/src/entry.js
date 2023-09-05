'use strict';

import * as i2d from './index-2d.js';
import * as i3d from './index-3d.js';

function loaded() {
  if (location.hash && location.hash === '#3d') {
    i3d.initPage();
  } else {
    i2d.initPage();
  }
  window.onhashchange = () => window.location.reload();
}


document.addEventListener('DOMContentLoaded', loaded);
