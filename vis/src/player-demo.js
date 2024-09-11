'use strict';

import * as d3 from 'd3';

const body = d3.select('body');

function log(s) {
  body.append('div').text(s);
}

export function initPage() {
  log('Page inited');

}
