"use strict";

import './light-matrix.css';
import chroma from 'chroma-js';
import * as d3 from 'd3';


/**
 * Light matrix visualization and interaction.
 */


/* See https://patorjk.com/software/taag/#p=display&h=0&v=0&f=Georgia11&t=addMatrix

                ,,         ,,                                              ,,
              `7MM       `7MM  `7MMM.     ,MMF'           mm               db
                MM         MM    MMMb    dPMM             MM
 ,6"Yb.    ,M""bMM    ,M""bMM    M YM   ,M MM   ,6"Yb.  mmMMmm  `7Mb,od8 `7MM  `7M'   `MF'
8)   MM  ,AP    MM  ,AP    MM    M  Mb  M' MM  8)   MM    MM      MM' "'   MM    `VA ,V'
 ,pm9MM  8MI    MM  8MI    MM    M  YM.P'  MM   ,pm9MM    MM      MM       MM      XMX
8M   MM  `Mb    MM  `Mb    MM    M  `YM'   MM  8M   MM    MM      MM       MM    ,V' VA.
`Moo9^Yo. `Wbmd"MML. `Wbmd"MML..JML. `'  .JMML.`Moo9^Yo.  `Mbmo .JMML.   .JMML..AM.   .MA.


 */

function addToggle(parentD3, faClass, faOnClass) {
  const icon = parentD3.append('i').classed('fa', true).classed(faClass, true);

  var toggleClassOn, toggleClass, onClick;
  function updateToggleClass() {
    if (!toggleClass || !toggleClassOn) {
      return;
    }
    toggleClassOn.classed(toggleClass, ret.isOn());
  }
  const ret = {
    title : title => {
      icon.attr('title', title);
      return ret;
    },
    toggleClassOn : (d3sel, clazz) => {
      toggleClassOn = d3sel;
      toggleClass = clazz;
      updateToggleClass();
      return ret;
    },
    isOn : () => icon.classed('on'),
    onClick : callback => { onClick = callback; return ret; }
  };
  icon.on('click', () => {
    const next = !ret.isOn();
    icon.classed('on', next);
    if (faOnClass) {
      if (next) {
        icon.classed(faClass, false);
        icon.classed(faOnClass, true);
      } else {
        icon.classed(faOnClass, false);
        icon.classed(faClass, true);
      }
    }
    updateToggleClass();
    if (onClick) {
      onClick(next);
    }
  });
  return ret;
}

function addControls(containerDivD3) {
  const ctrls = containerDivD3.append('div').classed('controls', true);
  const ret = {
    getDiv : () => ctrls,
    addToggle : (faClass, faOnClass) => addToggle(ctrls, faClass, faOnClass),
    addSep : () => { ctrls.append('span').classed('sep', true); return ret; }
  };
  return ret;
}

export function addMatrix(parentD3, opts) {
  const containerPaddingH = (opts.padh ? opts.padh : 1.0) * 30;
  const containerPaddingV = (opts.padv ? opts.padv : 1.0) * 30;
  const dotSeparationH = (opts.seph ? opts.seph : 1.0) * 40;
  const dotSeparationV = (opts.sepv ? opts.sepv : 1.0) * 40;
  const halfDotSeparationH = Math.round(dotSeparationH / 2);
  const halfDotSeparationV = Math.round(dotSeparationV / 2);
  const dotSizeH = 30;
  const dotSizeV = 30;

  function toIndex(col, row) {
    return row * opts.cols + col;
  }

  const vToColor = chroma
    .scale(['#300000', '#d41111', '#eded5e', '#ffffe6', '#ffffff'])
    .correctLightness();

  var dots = [];
  for (var y = 0; y < opts.rows; y++) {
    for (var x = 0; x < opts.cols; x++) {
      var dot = {
        x : x,
        y : y,
        i : toIndex(x, y),
        v: 0,
        t: 0,
        infoText: x + ':' + y
      }
      dots.push(dot);
    }
  }

  var cnt = parentD3.append('div')
    .classed('matrix-container', true)
    .style('width', (opts.cols * ( dotSizeH + dotSeparationH) + 2 * containerPaddingH - dotSeparationH) + 'px')
    .style('height', (opts.rows * (dotSizeV + dotSeparationV) + 2 * containerPaddingV - dotSeparationV) + 'px');


  // labels ===========================================================================

  var topLabel = cnt.append('span').classed('container-label top', true).text('top label');
  var bottomLabel = cnt.append('span').classed('container-label bottom', true).text('bottom label');
  var leftLabel = cnt.append('span').classed('container-label left', true).text('left label');
  var rightLabel = cnt.append('span').classed('container-label right', true).text('right label');
  var titleLabel = cnt.append('span').classed('container-label title', true).text('title label');

  // controls =========================================================================
  var controls = addControls(cnt);
  controls.addToggle('fa-circle-info')
    .title('Show/hide address/direction annotations')
    .toggleClassOn(cnt, 'show-info');

  controls.addSep();



  var ctrls = controls.getDiv();


  ctrls.append('i').classed('fa fa-rotate-right', true).attr('title', 'Rotate display right');
  ctrls.append('i').classed('fa fa-rotate-left', true).attr('title', 'Rotate display left');
  ctrls.append('i').classed('fa fa-left-right', true).attr('title', 'Flip display horizontally');
  ctrls.append('i').classed('fa fa-up-down', true).attr('title', 'Flip display vertically');

  controls.addSep();

  var lighupOnHover = false;
  controls.addToggle('fa-regular fa-lightbulb', 'fa-solid fa-lightbulb')
    .title('Light up on hover')
    .toggleClassOn(cnt, 'highlighting')
    .onClick(on => {
      lighupOnHover = on;
      if (!on) {
        ddivs.classed('mark', false);
      }
    });

  ctrls.append('i').classed('fa-solid fa-arrows-up-to-line fa-rotate-270', true).attr('title', 'Light up left block on hover');
  ctrls.append('i').classed('fa-solid fa-arrows-up-to-line fa-rotate-90', true).attr('title', 'Light up left block on hover');
  ctrls.append('i').classed('fa-solid fa-arrows-up-to-line', true).attr('title', 'Light up top block on hover');
  ctrls.append('i').classed('fa-solid fa-arrows-up-to-line fa-rotate-180', true).attr('title', 'Light up bottom block on hover');





  var dotOuterDivs = cnt.selectAll('.matrix-dot').data(dots).enter().append('div')
    .classed('matrix-dot-outer', true)
    .style('width', (dotSizeH + dotSeparationH) + 'px')
    .style('height', (dotSizeV + dotSeparationV) + 'px')
    .style('left', d => (d.x * (dotSizeH + dotSeparationH) + containerPaddingH - halfDotSeparationH) + 'px')
    .style('top', d => (d.y * (dotSizeV + dotSeparationV) + containerPaddingV - halfDotSeparationV) + 'px')

  var ddivs = dotOuterDivs.append('div')
    .classed('matrix-dot', true)
    .style('width', dotSizeH + 'px')
    .style('height', dotSizeV + 'px')
    .style('left', halfDotSeparationH + 'px')
    .style('top', halfDotSeparationV + 'px')
    .attr('title', d => 'Index: ' + d.i);

  dotOuterDivs.on('mouseenter', (e, d) => {
    if (!lighupOnHover) {
      return;
    }
    d3.select(e.target).classed('mark', true);
    if (opts.hover) {
      opts.hover(d.x, d.y, 1.0);
    }
  });
  dotOuterDivs.on('mouseleave', (e, d) => {
    if (!lighupOnHover) {
      return;
    }
    d3.select(e.target).classed('mark', false);
    if (opts.hover) {
      opts.hover(d.x, d.y, 0.0);
    }
  });

  var infoTexts = ddivs.append('div').classed('info-detail', true);
  function bindInfoText() {
    infoTexts.text(d => d.infoText);
  }
  bindInfoText();

  function render() {
    for (var d of dots) {
      if (d.v < d.t) {
        d.v = d.t;
      } else {
        d.v = d.v - (d.v - d.t) * 0.5;
      }
    }
    ddivs.style('background-color', d => vToColor(d.v * d.v));
  }

  render();

  var ret = {
    call : f => f(ret),
    titleLabelText : t => { titleLabel.text(t); return ret; },
    topLabelText : t => { topLabel.text(t); return ret; },
    bottomLabelText : t => { bottomLabel.text(t); return ret; },
    leftLabelText : t => { leftLabel.text(t); return ret; },
    rightLabelText : t => { rightLabel.text(t); return ret; },
    infoText : (x, y, text) => { dots[ toIndex(x, y) ].infoText = text; bindInfoText(); return ret; },
    setValue : function(x, y, v) {
      if (v < 0) {
        v = 0;
      } else if (v > 1) {
        v = 1;
      }
      // v = v * v;
      dots[ toIndex(x, y) ].t = v;
    },
    getValue : function(x, y) {
      return dots[ toIndex(x, y) ].v;
    },
    render : function() {
      render();
    },
    cols: () => opts.cols,
    rows: () => opts.rows
  };
  return ret;
}

