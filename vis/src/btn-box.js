'use strict';

import './btn-box.css';
import * as scw from './size-change-watcher.js';

export function addTo(parentD3) {
  const div = parentD3.append('div').classed('btn-box-container', true);

  var buttonCount = 0;
  const buttonDivs = [];
  const subBoxes = [];

  var cols = 0;
  var rows = 0;
  const sep = 15;
  var brdr = sep;
  var targetAr = 1.5;
  var shouldPoll = true;
  var polling = false;

  const ret = {
    setTargetAr : ar => {
      targetAr = ar;
      return ret;
    },
    setBorder : b => {
      brdr = b;
      return ret;
    },
    dontPoll : () => {
      shouldPoll = false;
      return ret;
    },
    setButtonCount : n => {
      if (buttonDivs.length) {
        throw new Error('Button count already set');
      }
      for (var i = 0; i < n; i++) {
        ret.addButton({});
      }
      return ret;
    },
    addSubBox : handler => {
      const subContainerDiv = div.append('div').classed('btn-box-sub-container', true);
      const f = addTo(subContainerDiv).dontPoll().setBorder(0);
      subBoxes.push(f);
      buttonDivs.push(subContainerDiv);
      buttonCount++;
      handler(f);
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
    layout : (doTransition, dims) => {
      if (!buttonDivs.length) {
        throw new Error('Button count is not already');
      }
      console.log('layout, buttonCount:', buttonCount);
      const bcr = dims ? dims : div.node().getBoundingClientRect();
      console.log('Bounding client rect', bcr);

      // aim for button aspect ratio closest to target
      var bestDiff = 999999;
      for (var cc = 1; cc <= buttonCount; cc++) {
        const rr = Math.ceil(buttonCount / cc);
        const ar = ((bcr.width - (cc - 1) * sep - 2 * brdr) * rr) / (cc * (bcr.height - (rr -1) * sep- 2 * brdr));
        const diff = Math.max(ar/targetAr, targetAr/ar);
        if (diff < bestDiff) {
          bestDiff = diff;
          cols = cc;
          rows = rr;
        }
        console.log(`${cc} x ${rr}; ar: ${ar}; diff: ${diff}`);
      }
      console.log(`Best: ${cols} x ${rows}`);

      const w = Math.round((bcr.width - (cols - 1) * sep - 2 * brdr) / cols);
      const h = Math.round((bcr.height - (rows - 1) * sep - 2 * brdr) / rows);
      const fs = Math.min(Math.round(bcr.height / (2 * rows)), Math.round(bcr.width / (15 * cols)));

      console.log(`w: ${w}, h: ${h}, brdr: ${brdr}, sep: ${sep}, fs: ${fs}`)

      for (var i = 0; i < buttonCount; i++) {
        const x = i % cols;
        const y = Math.floor(i / cols);
        (doTransition ? buttonDivs[i].transition().duration(200) : buttonDivs[i])
            .style('font-size', `${fs}px`)
            .style('width', `${w}px`)
            .style('height', `${h}px`)
            .style('left', `${Math.round(brdr + (w + sep) * x)}px`)
            .style('top',  `${Math.round(brdr + (h + sep) * y)}px`);
      }

      const subBoxDims = { width: w, height: h};
      subBoxes.forEach(b => b.layout(doTransition, subBoxDims));

      if (!polling && shouldPoll) {
        polling = true;
        scw.watchForSizeChange(div, () => ret.layout(true));
      }
    }
  };
  return ret;
}
