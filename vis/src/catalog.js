'use strict';

import './catalog.css';
import * as d3 from 'd3';
import addTopNav from './top-nav.js';
import * as apiClient from './api-client.js';
import qrOverlay from './qr-overlay.js';

export function initPage() {
  d3.select('html')
    .style('overflow', 'hidden'); // in css it would pollute other pages
  const body = d3.select('body').classed('catalog-page', true);


  const topNav = addTopNav(body)
    .label('LC tools')
    .addButtonIcon({
      'style' : 'fa-solid fa-paper-plane',
      'title' : 'Send to mobile',
      'onClick' : () => {
        apiClient.getServerUrls().then(urls => {
          console.log('Show QR overlay for urls:', urls);
          const overlay = qrOverlay();
          for (const url of urls) {
            overlay.add(url.url, url.name, url.url);
          }
        });
      }
    });

  body.append('a')
      .attr('href', '#vis')
      .text('Effect machine + player');
  body.append('br');
  body.append('a')
      .attr('href', '#vis2')
      .text('Effect machine 2 + player');
  body.append('br');
  body.append('a')
      .attr('href', '#rc')
      .text('Remote controller');
  body.append('br');
  body.append('a')
      .attr('href', '/#2d')
      .text('2D visualize');
  body.append('br');
  body.append('a')
      .attr('href', '/#3d')
      .text('3D visualize');
  body.append('br');
  body.append('a')
      .attr('href', '#colorscale')
      .text('Color scale stuff');
  body.append('br');
}
