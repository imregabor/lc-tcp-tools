'use strict';

import * as i2d from './index-2d.js';
import * as i3d from './index-3d.js';

function loaded() {
  if (location.hash && location.hash === '#3d') {
    document.title = 'Overview 3D';
    i3d.initPage();
  } else if (location.hash && location.hash === '#2d') {
    document.title = 'Overview 2D';
    i2d.initPage();
  } else {
    // Redirect to global landing
    window.location.replace('/vis/#catalog');
  }
  window.onhashchange = () => window.location.reload();
}


document.addEventListener('DOMContentLoaded', loaded);
