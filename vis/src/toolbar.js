'use strict';

import './toolbar.css';
import * as d3 from 'd3';

/**
 * uielementsg: D3 selection of top level SVG G
 */
export function addTo(uielementsg, opts) {

  const toolBarG = uielementsg.append('g').classed('toolbar', true).attr('transform', d => 'translate(5.5, 5.5)');

  if (opts.pointerOccupied) {
    // To hide under-cursor hover images
    toolBarG.on('pointerenter', e => opts.pointerOccupied(true));
    toolBarG.on('pointerleave', e => opts.pointerOccupied(false));
  }

  toolBarG.call(d3.drag().clickDistance(5)); // Avoid dragging underlying content; allow slight cursor move to register as click

  const toolbarBacgroundRect = toolBarG.append('rect')
      .classed('toolbar-bg', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 42)
      .attr('height', 2);

  var toolCount = 0;
  var defaultToolG;

  function selectTool(toolOpts) {
    toolBarG.selectAll('g.tool').each(function(d) {
      const thisD3 = d3.select(this);
      const thisSelected = thisD3.classed('activated');

      if (d == toolOpts) {
        if (thisSelected) {
          return;
        }
        thisD3.classed('activated', true);
        if (toolOpts.onSelect) {
          if (toolOpts.submenu) {
            toolOpts.onSelect(d.selectedSubmenuItem, d);
          } else {
            toolOpts.onSelect(d);
          }
        }
      } else {
        if (!thisSelected) {
          return;
        }
        if (toolOpts.onDeselect) {
          toolOpts.onDeselect(d);
        }
        thisD3.classed('activated', false);
      }
    });
  }

  const ret = {
    reset : () => selectTool(toolBarG.select('g.tool').datum()),
    addTool : toolOpts => {
      const toolG = toolBarG.append('g').classed('tool', true).attr('transform', d => `translate(1, ${1 + toolCount * 40})`);
      toolG.append('rect')
          .classed('tool-border', true)
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 40)
          .attr('height', 40);
      toolG.append('g').classed('tool-icon', true).html(toolOpts.svgFrag);
      toolG.datum(toolOpts);
      toolG.on('click', (e, d) => {
        e.stopPropagation();
        selectTool(d);
      });

      if (toolOpts.submenu) {
        toolOpts.selectedSubmenuItem = toolOpts.submenu[0];
        const submenuG = toolG.append('g').classed('tool-submenu', true).attr('transform', 'translate(41, 0)');
        submenuG.append('rect')
          .classed('tool-popup-box', true)
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', 220)
          .attr('height', toolOpts.submenu.length * 25);


        const menuItemGs = submenuG.selectAll('g.tool-popup-menuitem').data(toolOpts.submenu)
            .enter()
            .append('g')
            .classed('tool-popup-menuitem', true)
            .classed('activated', d => d == toolOpts.selectedSubmenuItem)
            .attr('transform', (d, i) => `translate(0, ${i * 25})`);
        menuItemGs.append('rect')
            .attr('x', 0)
            .attr('y', 0)
            .attr('width', 220)
            .attr('height', 25);
        menuItemGs.append('text')
            .attr('x', 5)
            .attr('y', 12.5)
            .attr('alignment-baseline', 'middle')
            .text(toolOpts.submenuLabel);

        menuItemGs.on('click', function (e, clickd) {
          e.stopPropagation();
          if (toolOpts.selectedSubmenuItem == clickd) {
            return;
          }
          if (toolOpts.onSelect) {
            toolOpts.onSelect(clickd, toolOpts);
          }
          toolOpts.selectedSubmenuItem = clickd;
          menuItemGs.classed('activated', id => id == clickd);
          // updateAddingNodeOnClick();
        });

      }

      toolCount = toolCount + 1;
      toolbarBacgroundRect.attr('height', 2 + 40 * toolCount);

      if (toolOpts.default) {
        defaultToolG = toolG;
        selectTool(toolOpts);
      }
    }

  };
  return ret;
}

export function svgFragPointer() {
  return `<path
        style="fill: #25748e; stroke: none;"
        d="m 9.6408685,10.076836 20.8687265,9.375455 -8.915308,2.666163 -3.142362,9.023487 z"/>`;
}

export function svgFragAddNode() {
  return `<rect
         style="fill:#ffffff;fill-opacity:1;stroke:#5db7d5;stroke-width:1;stroke-dasharray:none;stroke-opacity:1"
         width="18.520832"
         height="25.135418"
         x="15.875"
         y="11.906251" />
      <path
         style="fill:#ffffff;fill-opacity:1;stroke:#5db7d5;stroke-width:1;stroke-dasharray:none;stroke-opacity:1"
         d="m 26.458332,18.520835 9.15081,-1e-6 2.75544,2.645834 -2.645833,2.645834 h -9.260417 z"/>
      <path
         style="fill:#ffffff;fill-opacity:1;stroke:#5db7d5;stroke-width:1;stroke-dasharray:none;stroke-opacity:1"
         d="m 23.812499,18.520833 -9.15081,-1e-6 -2.75544,2.645834 2.645833,2.645834 h 9.260417 z"/>
      <path
         style="fill:#ffffff;fill-opacity:1;stroke:#5db7d5;stroke-width:1;stroke-dasharray:none;stroke-opacity:1"
         d="m 26.458332,26.458335 9.15081,-1e-6 2.75544,2.645834 -2.645833,2.645834 h -9.260417 z"/>
      <rect
         style="fill:#25748e;fill-opacity:1;stroke:none;stroke-width:0.966092;stroke-dasharray:none;stroke-opacity:1"
         width="5.2916665"
         height="18.520834"
         x="9.260416"
         y="2.6458342" />
      <rect
         style="fill:#25748e;fill-opacity:1;stroke:none;stroke-width:0.966092;stroke-dasharray:none;stroke-opacity:1"
         width="5.2916665"
         height="18.520834"
         x="9.260417"
         y="-21.166666"
         transform="rotate(90)"/>`;
}

export function svgFragEditParams() {
  return `<rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="1.9948076"
         height="29.58145"
         x="28.100634"
         y="8.4200668" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="32.195236"
         y="8.4713335" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="32.190884"
         y="36.768253" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="32.190884"
         y="32.718105" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="32.243378"
         y="28.87303" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="32.190884"
         y="24.669081" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="32.13839"
         y="20.772738" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="32.190884"
         y="16.620056" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="32.190884"
         y="12.518643" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="20.803839"
         y="8.4763994" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="20.799484"
         y="36.773315" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         id="rect3-7-6"
         width="5.1445022"
         height="0.97408575"
         x="20.799484"
         y="32.723171" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="20.85198"
         y="28.878096" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="20.799484"
         y="24.674147" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="20.74699"
         y="20.777803" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="20.799484"
         y="16.625124" />
      <rect
         style="fill:#5db7d5;stroke-width:1.02586"
         width="5.1445022"
         height="0.97408575"
         x="20.799484"
         y="12.523709" />
      <rect
         style="fill:#25748e;stroke-width:1.01146"
         width="14.646082"
         height="3.9988782"
         x="21.748749"
         y="14.572186"
         ry="1.230424" />
      <text
         style="font-size:24.6208px;fill:#25748e;stroke-width:1.02586"
         x="4.892168"
         y="23.045992"
         transform="scale(1.0118982,0.98824169)"><tspan
           style="font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;font-size:24.6208px;font-family:Monospace;-inkscape-font-specification:'Monospace Bold';stroke-width:1.02586"
           x="4.892168"
           y="23.045992">5</tspan></text>
      <path
         style="fill:#25748e;stroke:#25748e;stroke-width:2.05173;stroke-dasharray:none;stroke-opacity:1"
         d="m 5.107861,3.344566 v 23.53186"/>
      <path
         style="fill:#25748e;stroke:#25748e;stroke-width:2.05173;stroke-dasharray:none;stroke-opacity:1"
         d="m 1.8251686,26.795574 6.4568745,-10e-7"/>
      <path
         style="fill:#25748e;stroke:#25748e;stroke-width:2.05173;stroke-dasharray:none;stroke-opacity:1"
         d="m 1.9131434,3.4327168 6.4568746,-4e-7"/>`;
}
