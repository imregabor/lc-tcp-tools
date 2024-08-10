'use strict';

import './catalog.css';
import * as d3 from 'd3';
import * as topNavs from './top-nav.js';
import * as apiClient from './api-client.js';
import qrOverlay from './qr-overlay.js';
import * as btnBox from './btn-box.js';

export function initPage() {
  d3.select('html')
    .classed('catalog-page', true);  // avoid css polluting other pages

  const body = d3.select('body');
  const ctr = body.append('div').classed('catalog-page-container', true);


  const topNav = topNavs.addTo(ctr)
    .label('LC tools');
  const restApiIcon = topNav.addStatusIcon({
    styles: topNav.statusIconStyles.network,
    titles : {
      unknown : 'REST API availability is unknown',
      warn : 'REST API availability is unknown',
      err : 'REST API is not reachable',
      ok : 'REST API is up',
    }
  });
  topNav
    .sep()
    .addButtonIcon({
      'style' : 'fa-solid fa-paper-plane',
      'title' : 'Send to mobile',
      'onClick' : () => {
        apiClient.getServerUrls().then(urls => {
          console.log('Show QR overlay for urls:', urls);
          const overlay = qrOverlay()
            .header('Server listening interfaces')
            .footer('Click/tap or ESC/SPACE/ENTER to close');
          for (const url of urls) {
            overlay.add(url.url, url.name, url.url);
          }
        });
      }
    });

  const buttons = btnBox.addTo(ctr.append('div').classed('catalog-page-main-area', true))
    .addButton({
      faclass : 'fa-music',
      text : 'Effects + player',
      onClick : () => window.location.href = '/vis/#vis2'
    })
    .addButton({
      faclass : 'fa-th',
      text : 'Remote controller',
      onClick : () => window.location.href = '/vis/#rc'
    })
    .addButton({
      faclass : 'fa-eye',
      text : '2D visualize',
      onClick : () => window.location.href = '/#2d'
    })
    .addButton({
      faclass : 'fa-eye',
      text : '3D visualize',
      onClick : () => window.location.href = '/#3d'
    })
    .addButton({
      faclass : 'fa-music',
      text : 'OLD Effects + player',
      onClick : () => window.location.href = '/vis/#vis'
    })
    .addButton({
      faclass : 'fa-tint',
      text : 'Color scale stuff',
      onClick : () => window.location.href = '/vis/#colorscale'
    })
    .layout();


  // Periodic status info update
  var lastSent;
  function updateStatusIconsSent() {
    lastSent = Date.now();
    restApiIcon.badge('fa-heart lightblue', 200);
  }
  function updateStatusIconsOk(statusInfo) {
    const dt = Date.now() - lastSent;
    restApiIcon
        .ok(`ping: ${dt} ms`)
        .badgeOff(500, 200);
  }
  function updateStatusIconsErr(statusInfo) {
    restApiIcon
        .err()
        .badgeOff(500, 200);
  }
  function pingStatusInfo() {
    updateStatusIconsSent();
    apiClient.getStatusInfo(updateStatusIconsOk, updateStatusIconsErr, 150);
  }
  function pollStatusInfo() {
    pingStatusInfo();
    setTimeout(pollStatusInfo, 2000);
  }
  pollStatusInfo();

}
