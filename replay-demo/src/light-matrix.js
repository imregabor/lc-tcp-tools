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

function addButton(parentD3, faClass) {
  const icon = parentD3.append('i').classed('fa', true).classed(faClass, true);
  const ret = {
    title : title => {
      icon.attr('title', title);
      return ret;
    },
    onClick : callback => {
      icon.on('click', callback);
      return ret;
    }
  };
  return ret;
}

function addToggle(parentD3, faClass, faOnClass) {
  const icon = parentD3.append('i').classed('fa', true).classed(faClass, true);

  var toggleClassOn, toggleClass, hideWith
  var titleText = '';
  const onClicks = [];
  function updateToggleClass() {
    if (!toggleClass || !toggleClassOn) {
      return;
    }
    toggleClassOn.classed(toggleClass, ret.isOn());
  }
  const ret = {
    title : title => {
      titleText = title;
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
    isOff : () => !icon.classed('on'),
    onClick : callback => { onClicks.push(callback); return ret; },
    hideWith : iconApi => {
      hideWith = iconApi;
      iconApi.onClick(on => {
        icon
            .classed('hide-icon', !on)
            .attr('title', on?titleText:'');
      });
      icon
        .classed('hide-icon', hideWith.isOff())
        .attr('title', hideWith.isOn()?titleText:'');
      return ret;
    }
  };
  icon.on('click', () => {
    if (hideWith && hideWith.isOff()) {
      return;
    }
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
    for (const callback of onClicks) {
      callback(next);
    }
  });
  return ret;
}

function addControls(containerDivD3) {
  const ctrls = containerDivD3.append('div').classed('controls', true);
  const ret = {
    getDiv : () => ctrls,
    addToggle : (faClass, faOnClass) => addToggle(ctrls, faClass, faOnClass),
    addButton : (faClass) => addButton(ctrls, faClass),
    addSep : () => { ctrls.append('span').classed('sep', true); return ret; }
  };
  return ret;
}

function removeHighlight(dots) {
  for (var dot of dots) {
    dot.toHighlight = false;
  }
}

function setHighlight(dots, toggles, x, y) {
  const b_u = toggles.blockUp.isOn();
  const b_d = toggles.blockDown.isOn();
  const b_l = toggles.blockLeft.isOn();
  const b_r = toggles.blockRight.isOn();
  const l_u = toggles.lineUp.isOn();
  const l_d = toggles.lineDown.isOn();
  const l_l = toggles.lineLeft.isOn();
  const l_r = toggles.lineRight.isOn();
  for (var dot of dots) {
    const xs = Math.sign(dot.rx - x);
    const ys = Math.sign(dot.ry - y);
    var s = false;

    if (xs == -1 && ys == -1) {
      s = b_l || b_u;
    } else if (xs == -1 && ys == 0) {
      s = b_l || b_u || b_d || l_l;
    } else if (xs == -1 && ys == 1) {
      s = b_l || b_d;
    } else if (xs == 0 && ys == -1) {
      s = b_l || b_r || b_u || l_u;
    } else if (xs == 0 && ys == 0) {
      s = true;
    } else if (xs == 0 && ys == 1) {
      s = b_l || b_r || b_d || l_d;
    } else if (xs == 1 && ys == -1) {
      s = b_r || b_u;
    } else if (xs == 1 && ys == 0) {
      s = b_r || b_d || b_u || l_r;
    } else if (xs == 1 && ys == 1) {
      s = b_r || b_d;
    }

    dot.toHighlight = s;
  }
}

function bindHighlight(sel) {
  sel.classed('mark', d => d.toHighlight);
}

function sendHighlightUpdates(dots, sendSingle) {
  for (var dot of dots) {
    if (dot.toHighlight) {
      if (dot.lastHighlightSent == 1) {
        continue;
      }
      dot.lastHighlightSent = 1;
      sendSingle(dot.x, dot.y, 1);
    } else {
      if (dot.lastHighlightSent == 0) {
        continue;
      }
      dot.lastHighlightSent = 0;
      sendSingle(dot.x, dot.y, 0);
    }
  }
}

function setLayout(cnt, layout, doTransition) {
  var labels;
  if (doTransition) {
    labels = cnt.selectAll('.container-label.top,.container-label.right,.container-label.bottom,.container-label.left');
    labels.transition().duration(10).style('opacity', 0);
  }

  var cntT = cnt;
  if (doTransition) { cntT = cntT.transition().duration(400); }
  cntT
    .style('width', (layout.cols * (layout.dotSizeH + layout.dotSeparationH) + 2 * layout.containerPaddingH - layout.dotSeparationH) + 'px')
    .style('height', (layout.rows * (layout.dotSizeV + layout.dotSeparationV) + 2 * layout.containerPaddingV - layout.dotSeparationV) + 'px');

  var outerT = cnt.selectAll('.matrix-dot-outer')
  if (doTransition) { outerT = outerT.transition().duration(400); }
  outerT
    .style('width', (layout.dotSizeH + layout.dotSeparationH) + 'px')
    .style('height', (layout.dotSizeV + layout.dotSeparationV) + 'px')
    .style('left', d => (d.rx * (layout.dotSizeH + layout.dotSeparationH) + layout.containerPaddingH - layout.halfDotSeparationH) + 'px')
    .style('top', d => (d.ry * (layout.dotSizeV + layout.dotSeparationV) + layout.containerPaddingV - layout.halfDotSeparationV) + 'px');

  var dotT = cnt.selectAll('.matrix-dot')
  if (doTransition) { dotT = dotT.transition().duration(400); }
  dotT
    .style('width', layout.dotSizeH + 'px')
    .style('height', layout.dotSizeV + 'px')
    .style('left', layout.halfDotSeparationH + 'px')
    .style('top', layout.halfDotSeparationV + 'px');

  cnt.selectAll('.container-label.top').text(layout.labels[0]);
  cnt.selectAll('.container-label.right').text(layout.labels[1]);
  cnt.selectAll('.container-label.bottom').text(layout.labels[2]);
  cnt.selectAll('.container-label.left').text(layout.labels[3]);

  if (doTransition) {
    labels.transition().delay(150).duration(200).style('opacity', 1);
  }
}

function rotateLayoutGeometry(layout) {
  var i;
  i = layout.rows;               layout.rows =               layout.cols;               layout.cols = i;
  i = layout.containerPaddingH ; layout.containerPaddingH =  layout.containerPaddingV;  layout.containerPaddingV = i;
  i = layout.dotSeparationH;     layout.dotSeparationH =     layout.dotSeparationV;     layout.dotSeparationV = i;
  i = layout.halfDotSeparationH; layout.halfDotSeparationH = layout.halfDotSeparationV; layout.halfDotSeparationV = i;
  i = layout.dotSizeH;            layout.dotSizeH =          layout.dotSizeV;           layout.dotSizeV = i;

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

  const layout = {
    rows : opts.rows,
    cols : opts.cols,
    containerPaddingH : containerPaddingH,
    containerPaddingV : containerPaddingV,
    dotSeparationH : dotSeparationH,
    dotSeparationV : dotSeparationV,
    halfDotSeparationH : halfDotSeparationH,
    halfDotSeparationV : halfDotSeparationV,
    dotSizeH : dotSizeH,
    dotSizeV : dotSizeV,
    labels : [ 'top', 'right', 'bottom', 'left' ]
  };


  const vToColor = chroma
    .scale(['#300000', '#d41111', '#eded5e', '#ffffe6', '#ffffff'])
    .correctLightness();

  var dots = [];
  for (var y = 0; y < opts.rows; y++) {
    for (var x = 0; x < opts.cols; x++) {
      var dot = {
        // Position and metadata
        x : x, // original position
        y : y,
        i : toIndex(x, y),
        infoText: x + ':' + y,

        // position to render
        rx : x,
        ry : y,

        // Current value
        v: 0,

        // Value target
        t: 0,

        // Should send higlight
        toHighlight : false,

        // last sent value due to highlight
        lastHighlightSent: 0

      }
      dots.push(dot);
    }
  }

  var cnt = parentD3.append('div')
    .classed('matrix-container', true);


  // labels ===========================================================================

  var topLabel = cnt.append('span').classed('container-label top', true);
  var bottomLabel = cnt.append('span').classed('container-label bottom', true);
  var leftLabel = cnt.append('span').classed('container-label left', true);
  var rightLabel = cnt.append('span').classed('container-label right', true);
  var titleLabel = cnt.append('span').classed('container-label title', true);

  // controls =========================================================================
  var controls = addControls(cnt);
  controls.addToggle('fa-circle-info')
      .title('Show/hide address/direction annotations')
      .toggleClassOn(cnt, 'show-info');

  controls.addSep();

  controls.addButton('fa-rotate-right')
      .title('Rotate display right')
      .onClick(() => {
          for (const d of dots) {
            const orx = d.rx;
            const ory = d.ry;
            d.rx = layout.rows - ory - 1;
            d.ry = orx;
          }
          rotateLayoutGeometry(layout);
          var i = layout.labels[3];
          layout.labels[3] = layout.labels[2];
          layout.labels[2] = layout.labels[1];
          layout.labels[1] = layout.labels[0];
          layout.labels[0] = i;
          setLayout(cnt, layout, true);
      });
  controls.addButton('fa-rotate-left')
      .title('Rotate display left')
      .onClick(() => {
          for (const d of dots) {
            const orx = d.rx;
            const ory = d.ry;
            d.rx = ory;
            d.ry = layout.cols - orx -1;
          }
          rotateLayoutGeometry(layout);
          var i = layout.labels[0];
          layout.labels[0] = layout.labels[1];
          layout.labels[1] = layout.labels[2];
          layout.labels[2] = layout.labels[3];
          layout.labels[3] = i;
          setLayout(cnt, layout, true);
      });
  controls.addButton('fa-left-right')
      .title('Flip display horizontally')
      .onClick(() => {
          for (const d of dots) {
            d.rx = layout.cols - d.rx - 1;
          }
          var i = layout.labels[1];
          layout.labels[1] = layout.labels[3];
          layout.labels[3] = i;
          setLayout(cnt, layout, true);
      });
  controls.addButton('fa-up-down')
      .title('Flip display vertically')
      .onClick(() => {
          for (const d of dots) {
            d.ry = layout.rows - d.ry - 1;
          }
          var i = layout.labels[0];
          layout.labels[0] = layout.labels[2];
          layout.labels[2] = i;
          setLayout(cnt, layout, true);
      });

  controls.addSep();

  var lighupOnHover = false;
  var offTimeout = undefined;
  const lightupIcon = controls.addToggle('fa-regular fa-lightbulb', 'fa-solid fa-lightbulb')
    .title('Light up on hover')
    .toggleClassOn(cnt, 'highlighting')
    .onClick(on => {
      lighupOnHover = on;
      if (!on) {
        ddivs.classed('mark', false);
      }
    });

  const hoverToggles = {
    blockLeft : controls.addToggle('fa-solid fa-arrows-up-to-line fa-rotate-270')
      .title('Light up left block on hover')
      .hideWith(lightupIcon),
    blockUp: controls.addToggle('fa-solid fa-arrows-up-to-line')
      .title('Light up top block on hover')
      .hideWith(lightupIcon),
    blockRight : controls.addToggle('fa-solid fa-arrows-up-to-line fa-rotate-90')
      .title('Light up right block on hover')
      .hideWith(lightupIcon),
    blockDown : controls.addToggle('fa-solid fa-arrows-up-to-line fa-rotate-180')
      .title('Light up bottom block on hover')
      .hideWith(lightupIcon),

    lineUp : controls.addToggle('fa-solid fa-arrow-up')
      .title('Light up line above hover')
      .hideWith(lightupIcon),
    lineDown : controls.addToggle('fa-solid fa-arrow-down')
      .title('Light up line below hover')
      .hideWith(lightupIcon),
    lineLeft : controls.addToggle('fa-solid fa-arrow-left')
      .title('Light up line left to hover')
      .hideWith(lightupIcon),
    lineRight : controls.addToggle('fa-solid fa-arrow-right')
      .title('Light up line right to hover')
      .hideWith(lightupIcon)
  }

  var dotOuterDivs = cnt.selectAll('.matrix-dot').data(dots).enter().append('div')
    .classed('matrix-dot-outer', true);

  var ddivs = dotOuterDivs.append('div')
    .classed('matrix-dot', true)
    .attr('title', d => 'Index: ' + d.i);

  setLayout(cnt, layout);

  function highlightEnter(e, d) {
    if (!lighupOnHover) {
      return;
    }
    setHighlight(dots, hoverToggles, d.rx, d.ry);
    bindHighlight(dotOuterDivs);
    if (offTimeout) {
      clearTimeout(offTimeout);
      offTimeout = undefined;
    }

    // d3.select(e.target).classed('mark', true);
    if (opts.hover) {
      // opts.hover(d.x, d.y, 1.0);
      sendHighlightUpdates(dots, opts.hover);
    }
  }

  function highlightLeave(e, d) {
    if (!lighupOnHover) {
      return;
    }
    if (offTimeout) {
      clearTimeout(offTimeout);
      offTimeout = undefined;
    }
    offTimeout = setTimeout(() => {
      removeHighlight(dots);
      bindHighlight(dotOuterDivs);

      // d3.select(e.target).classed('mark', false);

      if (opts.hover) {
        // opts.hover(d.x, d.y, 0.0);
        sendHighlightUpdates(dots, opts.hover);
      }
    }, 100);
  }

  // See https://stackoverflow.com/questions/27908339/js-touch-equivalent-for-mouseenter
  dotOuterDivs.on('pointerdown', function(e) { this.releasePointerCapture(e.pointerId); });
  dotOuterDivs.on('mouseenter', highlightEnter);
  dotOuterDivs.on('pointerenter', highlightEnter);
  dotOuterDivs.on('mouseleave', highlightLeave);
  dotOuterDivs.on('pointerleave', highlightLeave);


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
    topLabelText : t => { topLabel.text(t); layout.labels[0] = t; return ret; },
    bottomLabelText : t => { bottomLabel.text(t); layout.labels[2] = t; return ret; },
    leftLabelText : t => { leftLabel.text(t); layout.labels[3] = t; return ret; },
    rightLabelText : t => { rightLabel.text(t); layout.labels[1] = t; return ret; },
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

