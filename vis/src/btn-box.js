'use strict';

import './btn-box.css';

export function addTo(parentD3) {
  const div = parentD3.append('div').classed('btn-box-container', true);

  var buttonCount = 0;
  const buttonDivs = [];

  var cols = 0;
  var rows = 0;
  const sep = 15;

  const ret = {
    setButtonCount : n => {
      if (buttonDivs.length) {
        throw new Error('Button count already set');
      }
      for (var i = 0; i < n; i++) {
        ret.addButton({});
      }
      return ret;
    },
    addButton : opts => {
      buttonCount ++;
      const btnDiv = div.append('div').classed('btn-box-button', true);
      if (opts.faclass) {
        btnDiv.append('i').classed('fa', true).classed(opts.faclass, true);
      }
      if (opts.text) {
        btnDiv.append('span').text(opts.text);
      }
      if (opts.onClick) {
        btnDiv.on('click', opts.onClick);
      }
      buttonDivs.push(btnDiv);
      return ret;
    },
    layout : () => {
      if (!buttonDivs.length) {
        throw new Error('Button count is not already');
      }
      console.log('layout, buttonCount:', buttonCount);
      const bcr = div.node().getBoundingClientRect();
      console.log('Bounding client rect', bcr);

      // aim for button aspect ratio closest to target
      var bestDiff = 999999;
      const targetAr = 1.5;
      for (var cc = 1; cc <= buttonCount; cc++) {
        const rr = Math.ceil(buttonCount / cc);
        const ar = ((bcr.width - (cc + 1) * sep) * rr) / (cc * (bcr.height - (rr + 1) * sep));
        const diff = Math.max(ar/targetAr, targetAr/ar);
        if (diff < bestDiff) {
          bestDiff = diff;
          cols = cc;
          rows = rr;
        }
        console.log(`${cc} x ${rr}; ar: ${ar}; diff: ${diff}`);
      }
      console.log(`Best: ${cols} x ${rows}`);

      const w = Math.round((bcr.width - (cols + 1) * sep) / cols);
      const h = Math.round((bcr.height - (rows + 1) * sep) / rows);
      const fs = Math.min(Math.round(bcr.height / (2 * rows)), Math.round(bcr.width / (15 * cols)));
      for (var i = 0; i < buttonCount; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        buttonDivs[i]
            .style('font-size', `${fs}px`)
            .style('width', `${w}px`)
            .style('height', `${h}px`)
            .style('left', `${Math.round(sep + (bcr.width  - sep) * x / cols)}px`)
            .style('top',  `${Math.round(sep + (bcr.height - sep) * y / rows)}px`);
      }
    }
  };
  return ret;
}
