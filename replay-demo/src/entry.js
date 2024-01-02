'use strict';

import * as i2d from './index-2d.js';
import * as i3d from './index-3d.js';

function loaded() {
  if (location.hash && location.hash === '#3d') {
    document.title = 'Overview 3D';
    i3d.initPage();
  } else {
    document.title = 'Overview';
    i2d.initPage();
  }
  window.onhashchange = () => window.location.reload();
}


document.addEventListener('DOMContentLoaded', loaded);
