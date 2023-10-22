'use strict';

import * as d3 from 'd3';

export function initPage() {
  const body = d3.select('body');
  body.append('h1').text('Remote controller');
}
