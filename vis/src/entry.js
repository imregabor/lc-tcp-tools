'use strict';

import * as index from './index.js';

function loaded() {
  index.initPage();
}

document.addEventListener('DOMContentLoaded', loaded);
