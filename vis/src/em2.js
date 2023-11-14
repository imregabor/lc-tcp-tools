'use strict';

import * as d3 from 'd3';
import './em2.css';
import * as connDrag from './connection-dragging.js';
import * as notes from './notes.js';
import * as nodeDefs from './node-definitions.js';
import * as occ from './occ.js';

export function initPage() {
  d3.select('html').style('overflow', 'hidden'); // in css it would pollute other pages
  const body = d3.select('body');

  body.on('keydown', e => {
    console.log(e);
    if (e.key === 'Escape') {
      pointerToollIconClicked();
    }
  });

  var idct = 0;
  function newId() {
    idct += 1;
    return `id-${idct}`;
  }

  const svgdiv = body.append('div').classed('svg-ctr', true);
  const svg = svgdiv.append('svg').attr('width', '100%').attr('height', '100%').attr('preserveAspectRatio', 'none');
  const maing = svg.append('g');

  const uielementsg = svg.append('g');


  const removeAreaG = uielementsg.append('g')
      .classed('remove-area', true)
      .classed('hidden', true);
  removeAreaG.append('circle')
      .attr('cx', 0)
      .attr('cy', 0)
      .attr('r', 25);
  removeAreaG.append('line')
      .attr('x1', -10)
      .attr('y1', -10)
      .attr('x2',  10)
      .attr('y2',  10);
  removeAreaG.append('line')
      .attr('x1',  10)
      .attr('y1', -10)
      .attr('x2', -10)
      .attr('y2',  10);
  function updateSvgSize() {
    const bcr = svg.node().getBoundingClientRect();
    const w = bcr.width;
    const h = bcr.height;
    const removeAreaCx = w / 2;
    const removeAreaCy = h - 40;
    removeAreaG.attr('transform', `translate(${removeAreaCx}, ${removeAreaCy})`);
  }
  updateSvgSize();






  const toolBarG = uielementsg.append('g').classed('toolbar', true).attr('transform', d => 'translate(5.5, 5.5)');
  toolBarG.on('pointerenter', e => hToolbarPointerOver.enter());
  toolBarG.on('pointerleave', e => hToolbarPointerOver.exit());
  toolBarG.call(d3.drag().clickDistance(5)); // Avoid dragging underlying content; allow slight cursor move to register as click
  toolBarG.append('rect')
      .classed('toolbar-bg', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 42)
      .attr('height', 122);

  const pointerToolG = toolBarG.append('g').classed('tool', true).attr('transform', d => 'translate(1, 1)');
  pointerToolG.append('rect')
      .classed('tool-border', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 40)
      .attr('height', 40);
  pointerToolG.append('g').classed('tool-icon', true).html(`<path
      style="fill: #25748e; stroke: none;"
      d="m 9.6408685,10.076836 20.8687265,9.375455 -8.915308,2.666163 -3.142362,9.023487 z"/>`);

  const addNodeToolG = toolBarG.append('g').classed('tool', true).attr('transform', d => 'translate(1, 41)');
  addNodeToolG.append('rect')
      .classed('tool-border', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 40)
      .attr('height', 40);
  addNodeToolG.append('g').classed('tool-icon', true).html(`<rect
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
       transform="rotate(90)"/>`);
  pointerToolG.classed('activated', true);


  const editParamToolG = toolBarG.append('g').classed('tool', true).attr('transform', d => 'translate(1, 81)');
  editParamToolG.append('rect')
      .classed('tool-border', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 40)
      .attr('height', 40);
  editParamToolG.append('g').classed('tool-icon', true).html(`<g>
    <rect
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
       d="m 1.9131434,3.4327168 6.4568746,-4e-7"/>
  </g>`);


  function pointerToollIconClicked() {
    if (pointerToolG.classed('activated')) {
      return;
    }
    if (addNodeToolSubmenuG) {
      addNodeToolSubmenuG.remove();
    }


    stopAddingNodeOnClick();
    pointerToolG.classed('activated', true);
    addNodeToolG.classed('activated', false);
    addingNodeOnClick = false; // otherwise removal of preview will short circuit
  }

  pointerToolG.on('click', (e) => {
    e.stopPropagation();
    pointerToollIconClicked();
  });

  const nodeTypes = nodeDefs.nodeTypes;
  var addNodeToolSubmenuG = undefined;

  var selectedAddNodeType = 'aa'; // shortcut do default
  var addingNodeOnClick = false;

  addNodeToolG.on('click', (e) => {
    e.stopPropagation();
    if (addNodeToolG.classed('activated')) {
      return;
    }
    pointerToolG.classed('activated', false);
    addNodeToolG.classed('activated', true);

    addingNodeOnClick = true;
    startAddingNodeOnClick();

    addNodeToolSubmenuG = addNodeToolG.append('g').attr('transform', 'translate(41, 0)');


    const nodeTypeArr = Object.entries(nodeTypes)
        .map(([k, v]) => {
          return {
            nodeType : k,
            def : v
          };
        });

    addNodeToolSubmenuG.append('rect')
      .classed('tool-popup-box', true)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 220)
      .attr('height', nodeTypeArr.length * 25);


    const menuItemGs = addNodeToolSubmenuG.selectAll('g.tool-popup-menuitem').data(nodeTypeArr)
        .enter()
        .append('g')
        .classed('tool-popup-menuitem', true)
        .classed('activated', d => d.nodeType === selectedAddNodeType)
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
        .text(d => `${d.def.title} (${d.nodeType})`);


    menuItemGs.on('click', function (e, clickd) {
      selectedAddNodeType = clickd.nodeType;
      menuItemGs.classed('activated', id => id.nodeType === clickd.nodeType);
      updateAddingNodeOnClick();
    });

  });




  var nodes = [
    {
      type : 'aa', // audio analyzer
      size : 1024,
      layout : {
        label : 'Analyzer 1',
        x : 200,
        y : 200
      }
    },
    {
      type : 'aa',
      size: 256,
      layout : {
        label : 'Analyzer 2',
        x : 200,
        y : 400
      }
    },
    {
      type : 'aw',
      layout : {
        label : 'Fletcher a-weights',
        x : 400,
        y : 400
      }
    },
    {
      type : 'tde', // time domain energy
      size: 256,
      layout : {
        label : 'TD energy',
        x : 400,
        y : 200
      }
    }
  ];

  var edges = [
    {
      n1: nodes[0],
      p1: 'tdo',
      n2: nodes[3],
      p2: 'tdi'
    }
  ];

  const hoverPreviewG = maing.append('g').classed('hover-preview', true);
  var edgelayerg = maing.append('g');
  var eoverlayerg = maing.append('g').classed('eoverlayerg', true);
  var nodelayerg = maing.append('g');

  const nodeDrag = d3.drag()
      .on('start', function(e) {
        updateSvgSize();
        removeAreaG.classed('hidden', false);
        removeAreaG.style('display', undefined);
        hNodeDragging.enter();
      })
      .on('end', function(e, d) {
        removeAreaG.style('display', 'none');
        removeAreaG.classed('hidden', true);
        removeAreaG.classed('activated', false);
        if (d3.select(this).classed('will-delete')) {

          const ni = nodes.indexOf(d);
          if (ni < 0) {
            notes.topErr('Node to delete descriptor not found')
          }
          nodes.splice(ni, 1);
          notes.top('Delete node and connecting edges')

          edges = edges.filter(e => e.n1 != d && e.n2 != d);
          renderNodes();
          renderEdges();
        }
        hNodeDragging.exit();
      })
      .on('drag', function(e, nd) {
        nd.layout.x += e.dx;
        nd.layout.y += e.dy;

        const c = d3.pointers(e, removeAreaG.node())[0];
        // not exact
        const inRemoveArea = Math.abs(c[0]) + Math.abs(c[1]) < 40;

        removeAreaG.classed('activated', inRemoveArea);

        const thisD3 = d3.select(this);
        const wasInRemoveArea = thisD3.classed('will-delete');

        if (inRemoveArea !== wasInRemoveArea) {
          edgelayerg.selectAll('path').filter(d => d.n1 == nd || d.n2 == nd).classed('will-delete', inRemoveArea);
        }

        // see https://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
        thisD3
          .raise()
          .classed('will-delete', inRemoveArea)
          .attr('transform', d => `translate(${d.layout.x}, ${d.layout.y})`);
        routeEdges();
      });

  function renderNodes() {
    renderNodesInto(nodes, nodelayerg, true);
  }

  function renderNodesInto(nodes, nodelayerg, registerDrag) {
    // Node specifications will be extended
    // d.render.id - Unique ID, associated to g.nodeg representing the node


    nodes.forEach(e => {
      if (!e.render) {
        e.render = { id : newId() };
      }
    });

    var nsd = nodelayerg.selectAll('g.nodeg').data(nodes, d => d.render.id);
    nsd.exit().remove();

    var nodesg = nsd.enter().append('g').classed('nodeg', true);
    nodesg.attr('id', d => d.render.id);
    nodesg.attr('transform', d => `translate(${d.layout.x}, ${d.layout.y})`);

    nodesg.append('rect')
        .classed('box', true)
        .attr('width', d => nodeTypes[d.type].w)
        .attr('height', d => nodeTypes[d.type].h)
        .attr('rx', 5);
    nodesg.append('text')
        .classed('node-label', true)
        .attr('text-anchor', 'middle')
        .attr('x', d => nodeTypes[d.type].w / 2)
        .attr('y', 14)
        .text(d => d.layout.label);

    if (registerDrag) {
      nodesg.on('click', e => e.stopPropagation());
      nodesg.call(nodeDrag);
      nodesg.on('pointerenter', e => hNodePointerOver.enter());
      nodesg.on('pointerleave', e => hNodePointerOver.exit());
    }

    nodesg.each(function (d) {
      const sel = d3.select(this);

      const ports = Object.entries(nodeTypes[d.type].ports)
          .map(([k, v]) => { return {
            domid : newId(),
            portid : k,
            def : v
          };});

      const portgs = sel.selectAll('g.portg').data(ports).enter().append('g')
          .attr('id', d => d.domid)
          .classed('portg', true)
          .attr('transform', d => `translate(${d.def.x}, ${d.def.y})`);
      portgs.append('path')
          .attr('d', d => d.def.type === 'out'
              ? `M 0 0 l -10 -10 l -${d.def.l} 0 l 0 20 l ${d.def.l} 0 l 10 -10 Z`
              : `M 0 0 l 10 -10 l ${d.def.l} 0 l 0 20 l -${d.def.l} 0 l -10 -10 Z`
          );
      portgs.append('text')
          .classed('port-label', true)
          .attr('text-anchor', d => d.def.type === 'out' ? 'end' : 'start')
          .attr('alignment-baseline', 'middle')
          .attr('x', d => d.def.type === 'out' ? -10 : 10)
          .attr('y', 0)
          .text(d => d.def.label);


      if (nodeTypes[d.type].params) {
        const params = Object.entries(nodeTypes[d.type].params)
            .map(([k, v]) => { return {
              domid : newId(),
              paramid : k,
              def : v,
              value : v.initial
            };});
        const paramgs = sel.selectAll('g.paramg').data(params).enter().append('g')
            .attr('id', d => d.domid)
            .classed('paramg', true)
            .attr('transform', d => `translate(${d.def.x}, ${d.def.y})`);
        paramgs.append('text')
            .classed('param-label', true)
            .attr('text-anchor', 'start')
            .attr('alignment-baseline', 'middle')
            .attr('x', 0)
            .attr('y', 0)
            .text(d => d.def.label + ':');
        paramgs.append('text')
            .classed('param-value', true)
            .attr('text-anchor', 'end')
            .attr('alignment-baseline', 'middle')
            .attr('x', d => d.def.len)
            .attr('y', 0)
            .text(d => d.value);
      }
    }); nodes = null;
  }
  renderNodes();

  var edgePaths;
  function renderEdges() {
    edges.forEach(e => {
      if (!e.render) {
        e.render = { id : newId() };
      }
    });

    var esd = edgelayerg.selectAll('g.edgeg').data(edges, e => e.render.id);
    esd.exit().remove();
    var edgesg = esd.enter().append('g').classed('edgeg', true);

    edgesg.attr('id', d => d.render.id );
    edgesg.append('path');

    edgePaths = edgelayerg.selectAll('g.edgeg path');

    routeEdges();
  }
  renderEdges();

  function routeEdges() {
    edgePaths.each(function (d) {
      var g1d = d3.select(`#${d.n1.render.id}`).datum();
      var g2d = d3.select(`#${d.n2.render.id}`).datum();
      const n1type = d.n1.type;
      const n2type = d.n2.type;


      var x1 = g1d.layout.x + nodeTypes[n1type].ports[d.p1].x;
      var y1 = g1d.layout.y + nodeTypes[n1type].ports[d.p1].y;
      var x2 = g2d.layout.x + nodeTypes[n2type].ports[d.p2].x;
      var y2 = g2d.layout.y + nodeTypes[n2type].ports[d.p2].y;

      // d3.select(this).attr('d', `M ${x1} ${y1} L ${x2} ${y2}`);
      d3.select(this).attr('d', edgePathD(x1, y1, x2, y2));
    });
  }


  function edgePathD(x1, y1, x2, y2) {
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);

    var bcpl; // bezier control point length
    if (dx > 40) {
      // large separation: softer the curve
      bcpl = dx;
    } else {
      // for small x and small y separation use progressively smaller parameter
      var t = dy < 30 ? dy : 30;
      if (dx > 30) {
        // transition zone
        bcpl = t + (dx - 30) * (dx - t) / 10;
      } else {
        bcpl = t;
      }
    }
    return `M ${x1} ${y1} C ${x1 + bcpl} ${y1} , ${x2 - bcpl} ${y2} , ${x2} ${y2}`;
  }

  // see https://www.d3indepth.com/zoom-and-pan/
  // see https://d3js.org/d3-zoom#zoom_transform
  svg.call(d3.zoom()
      .clickDistance(5)
      .on('zoom', e => maing.attr('transform', e.transform))
  );

  svg.on('click', e => {
    if (!addingNodeOnClick) {
      return;
    }
    const coords = d3.pointers(e, maing.node())[0];
    const nodeDef = nodeTypes[selectedAddNodeType];
    const newNode = {
      type : selectedAddNodeType,
      layout : {
        label : nodeDef.title,
        x : coords[0] - nodeDef.w / 2,
        y : coords[1] - nodeDef.h / 2
      }
    };
    nodes.push(newNode);
    renderNodes();
    connDrag.registerListenersOnPorts(connDragOpts);
    notes.top(`New ${nodeDef.title} node added`);
  });



  hoverPreviewG.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 10);

  function updateAddingNodeOnClick() {
    hoverPreviewG.selectAll('*').remove();
    const nodeDef = nodeTypes[selectedAddNodeType];
    const newNode = {
      type : selectedAddNodeType,
      layout : {
        label : nodeDef.title,
        x : - nodeDef.w / 2,
        y : - nodeDef.h / 2
      }
    };
    renderNodesInto([newNode], hoverPreviewG, false);
  }

  function startAddingNodeOnClick() {
    occh.enter();
    // hoverPreviewG.classed('shown', true);
    updateAddingNodeOnClick();

  }

  function stopAddingNodeOnClick() {
    occh.exit();
    // hoverPreviewG.classed('shown', false);

  }

  svg.on('pointermove', e => {
    if (!addingNodeOnClick) {
      return;
    }

    const coords = d3.pointers(e, maing.node())[0];
    hoverPreviewG.attr('transform', `translate(${coords[0]}, ${coords[1]})`);
  });
  svg.on('pointerenter', e => {
    hOutsideSvg.exit();
    /*
    if (!addingNodeOnClick) {
      return;
    }
    hoverPreviewG.classed('shown', true);
    */
  });
  svg.on('pointerleave', e => {
    hOutsideSvg.enter();
    //hoverPreviewG.classed('shown', false);
  });

  function firstConnection(nodeData, portData) {
    return edges.find(e => e.n2 == nodeData && e.p2 === portData.portid);
  }


  const occh = occ.handler().enter(); // pointer over svg
  const hOutsideSvg = occh.newChild().enter();
  const hNodeDragging = occh.newChild();
  const hNodePointerOver = occh.newChild();
  const hToolbarPointerOver = occh.newChild();
  occh.onChange(onSvg => {
    if (!addingNodeOnClick) {
      return;
    }
    hoverPreviewG.classed('shown', onSvg);
  });

  const connDragOpts = {
    getPortsD3 : () => nodelayerg.selectAll('g.portg'),
    maing : maing,
    addTmpEdge : () => eoverlayerg.append('path').classed('tmp-preview-edge', true),
    routeTmpEdge : (e, x1, y1, x2, y2) => e.attr('d', edgePathD(x1, y1, x2, y2)),
    removeTmpEdge : e => e.remove(),
    getPortCoordinates : portD3 => {
      const portData = portD3.datum();
      const nodeData = d3.select(portD3.node().parentNode).datum();
      const portDesc = nodeTypes[nodeData.type].ports[portData.portid];
      const x = nodeData.layout.x + portDesc.x;
      const y = nodeData.layout.y + portDesc.y;
      return [x, y];
    },
    firstConnection : portD3 => {
      const portData = portD3.datum();
      const nodeData = d3.select(portD3.node().parentNode).datum();
      return firstConnection(nodeData, portData);
    },
    hideConnection : e => {
      d3.select(`#${e.render.id}`).classed('lifting', true);
    },
    unhideConnection : e => {
      d3.select(`#${e.render.id}`).classed('lifting', false);
    },
    updateConnectionSource : (e, portD3src) => {
      const srcPortData = portD3src.datum();
      const srcNodeData = d3.select(portD3src.node().parentNode).datum();
      if (e.n1 == srcNodeData && e.p1 === srcPortData.portid) {
        notes.top('Connection not changed');
        return;
      }
      e.n1 = srcNodeData;
      e.p1 = srcPortData.portid;
      notes.top('Connection source updated');
      renderEdges();
    },
    removeConnection : e => {
      const eindex = edges.indexOf(e);
      if (eindex < 0) {
        notes.topErr('Edge to be removed not found');
        return;
      }
      edges.splice(eindex, 1);
      renderEdges();
      notes.top('Connection removed');
    },
    connect : (portD3src, portD3dst) => {
      // console.log(portD3src.datum(), portD3dst.datum());


      const srcPortData = portD3src.datum();
      const srcNodeData = d3.select(portD3src.node().parentNode).datum();
      const dstPortData = portD3dst.datum();
      const dstNodeData = d3.select(portD3dst.node().parentNode).datum();

      if (srcPortData.def.type !== 'out' || dstPortData.def.type !== 'in') {
        notes.topErr('Connected ports type mismatch')
        return;
      }

      if (firstConnection(dstNodeData, dstPortData)) {
        notes.topErr('Multiple connections to the same destination are not allowed.');
        return;
      }

      const newEdge = {
        n1: srcNodeData,
        p1: srcPortData.portid,
        n2: dstNodeData,
        p2: dstPortData.portid,
      };

      edges.push(newEdge);
      notes.top('Connection added');
      renderEdges();
    },
    pointerOccupied : occh.newChild().overThisOrChild
    /*pointerOccupied : (occ) => {
      lastOcc = occ;
      seeOcc();
    }*/

  };

  /*
  var lastOcc = false;
  function seeOcc() {
    if (!addingNodeOnClick) {
      return;
    }
    hoverPreviewG.classed('shown', !lastOcc);
  }
  */
  connDrag.registerListenersOnPorts(connDragOpts);

}
