'use strict';

import * as d3 from 'd3';
import './em2.css';
import * as connDrag from './connection-dragging.js';
import * as notes from './notes.js';
import * as nodeDefs from './node-definitions.js';
import * as occ from './occ.js';
import * as toolbar from './toolbar.js';
import * as dg from './mp3-select-dialog.js';
import * as pb from './playback.js';
import * as pl from './pipeline.js';
import * as ed from './ed.js';
import * as panes from './panes.js';
import * as vispane from './vispane.js';



export function initPage() {
  const events = {
    // Nodes or edges added or removed; not fired on parametrization change
    topologyChanged : ed.ed(),

    // Parameters changed; not fired on topology change or node moves
    parametersChanged : ed.ed()
  };


  function fireTopologyChanged() {
    var ni = 0;
    const graph = {
      nodes : nodes.map(n => {
        n.tmp_index = ni++;
        const gn = {
          type : n.type,
          label: n.layout.label,
          id : n.render.id,
          index : n.tmp_index
        };
        if (n.params) {
          gn.params = {};
          n.params.forEach(p => gn.params[p.paramid] = p.value);
        }
        return gn;
      }),
      edges : edges.map(e => {
        const ge = {
          n1index : e.n1.tmp_index,
          n2index : e.n2.tmp_index,
          n1id : e.n1.render.id,
          n2id : e.n2.render.id,
          p1 : e.p1,
          p2 : e.p2
        };
        return ge;
      })
    };
    console.log('Topology changed. UI nodes:', nodes, 'UI edges:', edges, 'Exported graph:', graph);
    events.topologyChanged(graph);
  }

  d3.select('html').style('overflow', 'hidden'); // in css it would pollute other pages
  const body = d3.select('body');

  body.on('keydown', e => {
    if (e.key === 'Escape') {
      tb.reset();
    }
  });

  var idct = 0;
  function newId() {
    idct += 1;
    return `id-${idct}`;
  }

  const p = panes.init().bottomPaneName('visualizations');

  const vp = vispane.init(p.bottomD3());


  const svgdiv = p.topD3().append('div').classed('svg-ctr', true);
  const svg = svgdiv.append('svg').attr('width', '100%').attr('height', '100%').attr('preserveAspectRatio', 'none');

  const playerOverlayDiv = svgdiv.append('div').classed('player-overlay', true);

  // const playback = pb.addPlaybackControls(playerOverlayDiv);
  const playback = pb.addSimplePlayback(
    playerOverlayDiv.append('div').classed('pb-controls', true),
    playerOverlayDiv.append('div').classed('pb-player', true),
    svgdiv.append('div').classed('pb-message', true));

  const pipeline = pl.createPipeline();
  events.topologyChanged.add(pipeline.setGraph);
  events.parametersChanged.add(pipeline.updateParameter);
  pipeline.onError(e => {
    console.log('PIPELINE ERROR EVENT', e);
    if (e.nodeId) {
      const nodeG = nodelayerg.select(`#${e.nodeId}`);
      if (nodeG) {
        nodeG.select('rect.box').classed('err', e.err);

        if (!e.err) {
          nodeG.select('g.node-err-mark').remove();
        } else {
          const markG = nodeG.append('g').classed('node-err-mark', true);
          markG.attr('transform', d => `translate(15, -20)`);
          markG.append('path')
              .attr('d', 'M -15 9 l 15 -26 l 15 26 l -30 0 Z');
          markG.append('text')
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('x', 0)
              .attr('y', 0)
              .text('!');
          markG.append('title').text(e.message);
          markG.on('click', () => {
            dg.showModal({
              title: 'Error',
              ok : () => {}
            })
            .appendKV('Node ID:', e.nodeId)
            .appendKV('Node label:', e.nodeLabel)
            .appendP('Error message:')
            .appendCode(e.message);
          });
        }
      }
    }
  });
  playback.onContextCreated(pipeline.setCtx);
  playback.onPlaybackStarted(() => {
    vp.softReset();
    if (p.isOpen()) {
      vp.start();
    }
    pipeline.run();
  });
  playback.onPlaybackStopped(() => {
    vp.stop();
    pipeline.stop();
    pipeline.reset();
  });

  vp.setDataSource(pipeline);
  p.onOpened(() => {
    if (playback.isPlaying()) {
      vp.start();
    }
    pipeline.resumeVisData();
  });
  p.onClosed(() => {
    pipeline.pauseVisData();
    vp.stop();
  });


  p.open();

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


  const nodeTypes = nodeDefs.nodeTypes;


  const tb = toolbar.addTo(uielementsg, {
    pointerOccupied : o => hToolbarPointerOver.overThisOrChild(o)
  });

  const pointerTool = tb.addTool({
    default : true,
    svgFrag : toolbar.svgFragPointer()
  });

  const addNodeTool = tb.addTool({
    svgFrag : toolbar.svgFragAddNode(),
    submenu : Object.entries(nodeTypes).map(([k, v]) => {
          return {
            nodeType : k,
            def : v
          };
        }),
    submenuLabel : d => `${d.def.title} (${d.nodeType})`,
    onSelect : (d1,d2) => {
      addingNodeOnClick = true;
      selectedAddNodeType = d1.nodeType;
      startAddingNodeOnClick();
      updateAddingNodeOnClick();
    },
    onDeselect : () => {
      stopAddingNodeOnClick();
      addingNodeOnClick = false; // otherwise removal of preview will short circuit
    }
  });

  const editParamsTool = tb.addTool({
    svgFrag : toolbar.svgFragEditParams(),
    onSelect : d => {
      maing.classed('param-editing', true);
      editingNodeParams = true;
    },
    onDeselect : d => {
      maing.classed('param-editing', false);
      editingNodeParams = false;
    }
  });



  var selectedAddNodeType = 'aa'; // shortcut do default
  var addingNodeOnClick = false;
  var editingNodeParams = false;


  var nodes = [
    {
      type : 'aa', // [0] audio analyzer
      layout : {
        label : 'Analyzer',
        x : 200,
        y : 200
      },
      pvals : {
        fftSize : 1024,
        targetFps : 200
      }
    },
    {
      type : 'aa', // [1]
      size: 256,
      layout : {
        label : 'Analyzer 2',
        x : 200,
        y : 400
      }
    },
    {
      type : 'dbm2linm', // [2]
      layout : {
        label : 'Spectrum to lin',
        x : 400,
        y : 400
      }
    },
    {
      type : 'aw', // [3]
      layout : {
        label : 'A-weights',
        x : 600,
        y : 400
      }
    },
    {
      type : 'fde', // [4]
      layout : {
        label : 'FD energy',
        x : 800,
        y : 400
      }
    },
    {
      type : 'vu', // [5]
      layout : {
        label : 'VU',
        x : 1000,
        y : 400
      },
      pvals : {
        channels: 35
      }
    },
    {
      type : 'tde', // [6] time domain energy
      layout : {
        label : 'TD energy',
        x : 400,
        y : 200
      },
    },
    {
      type : 'vu', // [7]
      layout : {
        label : 'VU 2',
        x : 600,
        y : 200
      }
    },
    {
      type : 'lr', // [8]
      layout : {
        label : 'Legacy router',
        x : 1200,
        y : 200
      }
    },
  ];

  var edges = [
    {
      n1: nodes[0],
      p1: 'tdo',
      n2: nodes[6],
      p2: 'tdi'
    },
    {
      n1: nodes[0],
      p1: 'spo',
      n2: nodes[2],
      p2: 'spi'
    },
    {
      n1: nodes[2],
      p1: 'spo',
      n2: nodes[3],
      p2: 'spi'
    },
    {
      n1: nodes[3],
      p1: 'spo',
      n2: nodes[4],
      p2: 'fdi'
    },
    {
      n1: nodes[4],
      p1: 'eo',
      n2: nodes[5],
      p2: 'ein'
    },
    {
      n1: nodes[5],
      p1: 'out',
      n2: nodes[8],
      p2: 'lm35'
    },
    {
      n1: nodes[6],
      p1: 'eo',
      n2: nodes[7],
      p2: 'ein'
    },
    {
      n1: nodes[7],
      p1: 'out',
      n2: nodes[8],
      p2: 'lb24'
    }

  ];

  const hoverPreviewG = maing.append('g').classed('hover-preview', true);
  var edgelayerg = maing.append('g');
  var eoverlayerg = maing.append('g').classed('eoverlayerg', true);
  var nodelayerg = maing.append('g');

  const nodeDrag = d3.drag()
      .clickDistance(5)
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
          fireTopologyChanged();
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

  function nodeParamClicked(e,d,n) {
    if (!editingNodeParams) {
      return;
    }
    const thisD3 = d3.select(this);
    if (thisD3.classed('titleg')) {
      console.log('Title of node', d);
      const modal = dg.showModal({
        title: 'Change node title',
        reject : () => {
          console.log('Rejected');
        },
        resolve : v => {
          console.log('Resolved; update title', v);
          d.layout.label = v;
          updateNodeTitles();
        },
        ok : () => nvf()
      });
      modal.appendKV('Current value:', d.layout.label);
      const nvf = modal.appendStrInput('New value:', d.layout.label);
    } else if (d.paramid) {
      const parentD3 = d3.select(this.parentNode);
      const pd = parentD3.datum();
      console.log('Param', d, pd);

      const modal = dg.showModal({
        title: `Change parameter "${d.def.label}" of "${pd.layout.label}"`,
        reject : () => {
          console.log('Rejected');
        },
        resolve : v => {

          console.log('Resolved; update value', v);
          d.value = v;
          updateNodeParamValues();
          events.parametersChanged({
            paramid: d.paramid,
            value: d.value,
            nodetype: pd.type,
            nodeid: pd.render.id
          });
        },
        ok : () => nvf()
      });
      modal.appendKV('Default value:', d.def.initial);
      modal.appendKV('Current value:', d.value);
      const nvf = modal.appendNumInput('New value:', d.value);

    }
  }

  function updateNodeTitles() {
    nodelayerg.selectAll('g.titleg text').text(d => d.layout.label);
  }

  function updateNodeParamValues() {
    const nodegs = nodelayerg.selectAll('g.nodeg');
    nodegs.each(function (d) {
      const sel = d3.select(this);
      if (!d.params) {
        return;
      }
      const paramvs = sel.selectAll('g.paramg text.param-value')
        .text(d => d.value);
    });
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

    var titleg = nodesg.append('g').classed('paramg titleg', true);
    titleg.append('rect')
        .classed('param-bg-rect', true)
        .attr('x', 5)
        .attr('y', 3)
        .attr('width', d => nodeTypes[d.type].w - 10)
        .attr('height', 15);


    titleg.append('text')
        .classed('node-label', true)
        .attr('text-anchor', 'middle')
        .attr('x', d => nodeTypes[d.type].w / 2)
        .attr('y', 14)
        .text(d => d.layout.label);

    if (registerDrag) {
      titleg.on('click', nodeParamClicked);
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

      if (registerDrag) {
        portgs.on('click', nodeParamClicked);
      }


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
              value : (d.pvals && d.pvals[k]) ? d.pvals[k] : v.initial
            };});
        d.params = params;
        const paramsctr = sel.append('g');
        const paramgs = paramsctr.selectAll('g.paramg').data(params).enter().append('g')
            .attr('id', d => d.domid)
            .classed('paramg', true)
            .attr('transform', d => `translate(${d.def.x}, ${d.def.y})`);

        if (registerDrag) {
          paramgs.on('click', nodeParamClicked);
        }

        paramgs.append('rect')
            .classed('param-bg-rect', true)
            .attr('x', -3)
            .attr('y', -8)
            .attr('width', d => d.def.len + 7)
            .attr('height', 14);

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


  fireTopologyChanged();

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
        label : hoverPreviewG.datum(),
        x : coords[0] - nodeDef.w / 2,
        y : coords[1] - nodeDef.h / 2
      }
    };
    nodes.push(newNode);
    renderNodes();
    connDrag.registerListenersOnPorts(connDragOpts);
    notes.top(`New ${nodeDef.title} node added`);
    updateAddingNodeOnClick();
    fireTopologyChanged();
  });



  hoverPreviewG.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 10);

  function updateAddingNodeOnClick() {
    const nodeDef = nodeTypes[selectedAddNodeType];


    // use an unique name
    const labelBase = nodeDef.title;
    var newNodeLabel = labelBase;

    console.log(nodes);
    nodes.forEach(n => {
      const nlabel = n.layout.label;
      if (n.type !== selectedAddNodeType) {
        return;
      }
      const labelSuffix = nlabel.split(" ").pop();
      const v = parseInt(labelSuffix);
      if (nlabel === labelBase) {
        newNodeLabel = labelBase + " 2";
      } else if (v > 0) {
        newNodeLabel = labelBase + " " + (v + 1);
      }
    });
    console.log(newNodeLabel)

    hoverPreviewG.selectAll('*').remove();
    const newNode = {
      type : selectedAddNodeType,
      layout : {
        label : newNodeLabel,
        x : - nodeDef.w / 2,
        y : - nodeDef.h / 2
      }
    };
    hoverPreviewG.datum(newNodeLabel);
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
      fireTopologyChanged();
    },
    removeConnection : e => {
      const eindex = edges.indexOf(e);
      if (eindex < 0) {
        notes.topErr('Edge to be removed not found');
        return;
      }
      edges.splice(eindex, 1);
      renderEdges();
      fireTopologyChanged();
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
      fireTopologyChanged();
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
