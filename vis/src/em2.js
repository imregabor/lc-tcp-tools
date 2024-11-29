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
import * as apiClient from './api-client.js';
import qrOverlay from './qr-overlay.js';
import * as mp3SelectDialog from './mp3-select-dialog.js';
import * as pipelinePresets from './pipeline-presets.js';
import * as u from './util.js';
import * as atf from './doc-title-field.js';
import * as persist from './persist.js';

// see https://stackoverflow.com/questions/3665115/how-to-create-a-file-in-memory-for-user-to-download-but-not-through-server
function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

export function initPage() {
  const events = {
    // Nodes or edges added or removed; not fired on parametrization change
    topologyChanged : ed.ed(),

    // Parameter changed; not fired on topology change or node moves
    parameterChanged : ed.ed(),

    // Fired only on node label change
    labelChanged : ed.ed(),

    nodePositionChanged : ed.ed(),

    changed : ed.ed()
  };

  events.topologyChanged.add(graph => events.changed({
    topology : graph
  }));
  events.labelChanged.add(e => events.changed({
    label : e
  }));
  events.parameterChanged.add(e => events.changed({
    label : e
  }));
  events.nodePositionChanged.add(e => events.changed({
    nodePosition : e
  }));
  events.changed.add(e => console.log('changed', e));
  events.changed.add(e => {
    if (titleField.isEmpty()) {
      titleField.setWarn(!isGraphEmpty());
      return;
    }
    const eg = exportGraph(false, true);
    const egs = JSON.stringify(eg);
    persist.put(titleField.getText(), egs);
    titleField.setWarn(false);
  });

  function exportGraph(includeIds, includeLayout) {
    var ni = 0;
    return {
      title : titleField.getText(),
      nodes : nodes.map(n => {
        n.tmp_index = ni++;
        const gn = {
          type : n.type,
          label: n.label
          // index : n.tmp_index
        };
        if (includeIds) {
          gn.id = n.render.id;
        }
        if (n.params) {
          gn.params = {};
          n.params.forEach(p => gn.params[p.paramid] = p.value);
        }
        if (includeLayout) {
          gn.layout = {
            x : n.layout.x,
            y : n.layout.y
          };
        }
        return gn;
      }),
      edges : edges.map(e => {
        const ge = {
          n1index : e.n1.tmp_index,
          n2index : e.n2.tmp_index,
          p1 : e.p1,
          p2 : e.p2
        };
        if (includeIds) {
          ge.n1id = e.n1.render.id;
          ge.n2id = e.n2.render.id;
        }
        return ge;
      })
    };
  }

  function fireTopologyChanged() {
    const graph = exportGraph(true, false);
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


  const wsLink = apiClient.openWsLink({
    endpoint : '/ws-api/control2',
    onJson: o => {
      console.log('Control2 link message received', o);
    },
    onUp : () => {
      console.log('Control2 link is up');
    }
  });
  var remoteCalls = {
    sendToLr : (lb24, lm35) => {
      wsLink.send(`LRb100 ${lb24 ? u.channelsToBulk100(lb24) : '-'} ${lm35 ? u.channelsToBulk100(lm35) : '-'}`);
    },
    sendToWss : (rgb) => {
      wsLink.send(`WSSbFF ${u.channelsToBulkFF(rgb)}`);
    },
    getWssSize : () => 32
  };

  const p = panes.init().bottomPaneName('visualizations');

  const vp = vispane.init(p.bottomD3());
  const pipeline = pl.createPipeline().setRemoteCalls(remoteCalls);



  const svgdiv = p.topD3().append('div').classed('svg-ctr', true);
  const svg = svgdiv.append('svg').attr('width', '100%').attr('height', '100%').attr('preserveAspectRatio', 'none');


  const overlays = svgdiv.append('div').classed('pagebuttons-overlay', true);




  const pageButtonsOverlayDiv = overlays.append('div').classed('pagebuttons-leftblock playback-extra-controls', true);

  const docTitleFieldParent = overlays.append('div').classed('pagebuttons-leftblock', true);
  overlays.append('div').classed('pagebuttons-grower', true);

  const playerOverlayDiv = overlays.append('div').classed('player-overlay pagebuttons-rightblock', true);

  const titleField = atf.addTo(docTitleFieldParent);
  titleField.onChanged((to, from) => {
    if (!to) {
      return;
    }
    const eg = exportGraph(false, true);
    const egs = JSON.stringify(eg);
    if (from) {
      persist.rename(from, to, egs);
      notes.top('Updated name in local storage');
    } else {
      persist.put(to, egs);
      notes.top('Saved to local storage');
    }
    titleField.setWarn(false);
  });

  function selectGraphLoadDialog() {
    const keys = persist.keys();
    mp3SelectDialog.showModal({
      title : "Select graph",
      resolve : v => {
        const gs = persist.get(v);
        const g = JSON.parse(gs);
        importGraph(g);
        connDrag.registerListenersOnPorts(connDragOpts);
        titleField.setText(v);
      }
    })
      .appendH2("Saved graphs:")
      .appendResolvingList(keys, k => k);
  }

  function abandonGraphDialogWhenRequired(action) {
    if (!isGraphEmpty() && titleField.isWarn()) {
      mp3SelectDialog.showModal({
        title : "Warning",
        warn : true,
        resolve : () => {
          action();
        },
        ok : () => {},
        okLabel : 'yes',
        okWarn : true,
        cancel : true
      })
        .appendH2("Current graph is not saved. Do you want to abandon it?");
    } else {
      action();
    }
  }

  pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-home', true)
    .attr('title', 'Go to landing page')
    .on('click', () => {
      abandonGraphDialogWhenRequired(() => window.location.href = '/vis/#catalog');
    });

  pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-folder-open', true)
    .attr('title', 'Open saved graph from local storage')
    .on('click', () => {
      if (persist.isEmpty()) {
        mp3SelectDialog.showInfoModal('Storage is empty', 'No graph is available in local storage.');
      } else {
        abandonGraphDialogWhenRequired(() => selectGraphLoadDialog());
      }
    });

  pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-file', true)
    .attr('title', 'Clear graph')
    .on('click', () => {
      abandonGraphDialogWhenRequired(() => clearGraph(true));
    });

  pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-expand', true)
    .attr('title', 'Fit graph into viewport')
    .on('click', () => fitGraph(true));

  const showGridIcon = pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-table-cells', true)
    .attr('title', 'Show grid')
    .on('click', () => {
      const toShowGrid = !showGridIcon.classed('highlighted');
      showGridIcon.classed('highlighted', toShowGrid);
      if (toShowGrid) {
        var b = getGraphBounds();
        if (!b) {
          // TODO: consider zoom also; show grid when no graph is present
          showGridIcon.classed('highlighted', false);
          return;
        }
        const w = b[1][0] - b[0][0];
        const h = b[1][1] - b[0][1];

        const gridSize = 15;
        const x0 = Math.round((b[0][0] - 2 * w) / gridSize) * gridSize;
        const x1 = Math.round((b[1][0] + 2 * w) / gridSize) * gridSize;
        const y0 = Math.round((b[0][1] - 2 * h) / gridSize) * gridSize;
        const y1 = Math.round((b[1][1] + 2 * h) / gridSize) * gridSize;

        for(var x = x0; x <= x1; x+=gridSize) {
          gridLayerG.append('line')
            .attr('x1', x)
            .attr('y1', y0)
            .attr('x2', x)
            .attr('y2', y1);
        }
        for(var y = y0; y <= y1; y+=gridSize) {
          gridLayerG.append('line')
            .attr('x1', x0)
            .attr('y1', y)
            .attr('x2', x1)
            .attr('y2', y);
        }
      } else {
        gridLayerG.selectAll('*').remove();
      }
    });


  pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-file-code', true)
    .attr('title', 'Export/edit/import pipeline graph')
    .on('click', () => {
      const graph = exportGraph(false, true);
      const graphJson = JSON.stringify(graph, null, 2);
      const modal = mp3SelectDialog.showModal({
        title : 'Exported graph',
        resolve : d => {
          if (d.action === 'import') {
            const json = tai();
            importGraph(JSON.parse(json));
          }
        }
      });
      modal.appendResolvingList([{
        action : 'import',
        t1 : 'Import graph',
        t2 : 'Drop existing graph and import edited'
      }], i => i.t1, i => i.t2);
      const tai = modal.appendTextAreaInput('JSON:', graphJson);

    });

  pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-download', true)
    .attr('title', 'Download pipeline graph as JSON')
    .on('click', () => {
      const graph = exportGraph(false, true);
      const graphJson = JSON.stringify(graph, null, 2);
      download('graph.json', graphJson);
    });

  const tickLoopIcon = pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-person-running', true)
    .on('click', () => {
      if (isPipelineRunning()) {
        pipeline.stop();
        vp.stop();
      } else {
        pipeline.run();
        if (p.isOpen()) {
          vp.start();
        }
      }
      updateTickLoopIcon();
    });
  function isPipelineRunning() {
    return pipeline && pipeline.isRunning();
  }
  function updateTickLoopIcon() {
    const isRunning = isPipelineRunning();
    tickLoopIcon
      .attr(
        'title',
        isRunning ? 'Stop effect pipeline' : 'Start effect pipeline'
      )
      .classed(
        'highlighted',
        isRunning
      );
  }
  updateTickLoopIcon();



  pageButtonsOverlayDiv.append('i')
    .classed('fa fa-fw fa-solid fa-paper-plane', true)
    .attr('title', 'Send to mobile')
    .on('click', () => {
      apiClient.getServerUrls().then(urls => {
        console.log('Show QR overlay for urls:', urls);
        const overlay = qrOverlay()
          .header('Server listening interfaces')
          .footer('Click/tap or ESC/SPACE/ENTER to close');
        for (const url of urls) {
          overlay.add(url.url, url.name, url.url);
        }
      });
    });




  // const playback = pb.addPlaybackControls(playerOverlayDiv);
  const playback = pb.addSimplePlayback(
    playerOverlayDiv.append('div').classed('pb-controls', true),
    playerOverlayDiv.append('div').classed('pb-player', true),
    svgdiv.append('div').classed('pb-message', true));

  events.topologyChanged.add(() => {
    // no tracking of error markers; clean up canvas
    nodelayerg.selectAll('g.node-error-marked').classed('node-error-marked', false)
      .selectAll('g.node-err-mark').remove();
  });
  events.topologyChanged.add(pipeline.setGraph);

  events.parameterChanged.add(pipeline.updateParameter);

  events.labelChanged.add(pipeline.updateLabel);

  pipeline.onError(e => {
    console.log('PIPELINE ERROR EVENT', e);
    if (e.nodeId) {
      const nodeG = nodelayerg.select(`#${e.nodeId}`);
      if (nodeG) {
        nodeG.classed('node-error-marked', e.err);
        nodeG.select('g.node-err-mark').remove(); // might be an err update, make sure previous err mark is not left on

        if (e.err) {
          const markG = nodeG.append('g').classed('node-err-mark', true);
          markG.attr('transform', d => `translate(15, -20)`);
          markG.append('path')
              .attr('d', 'M -15 9 l 15 -26 l 15 26 l -30 0 Z');
          markG.append('text')
              .classed('xclm-icon', true)
              .attr('text-anchor', 'middle')
              .attr('alignment-baseline', 'middle')
              .attr('x', 0)
              .attr('y', 0)
              .text('!');
          markG.append('text')
              .attr('text-anchor', 'left')
              .attr('alignment-baseline', 'middle')
              .attr('x', 20)
              .attr('y', 0)
              .text(e.message);
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
    updateTickLoopIcon();
  });
  playback.onPlaybackStopped(() => {
    vp.stop();
    pipeline.stop();
    pipeline.reset();
    updateTickLoopIcon();
  });

  vp.setDataSource(pipeline);
  p.onOpened(() => {
    if (isPipelineRunning()) {
      vp.start();
    }
    pipeline.resumeVisData();
  });
  p.onClosed(() => {
    pipeline.pauseVisData();
    vp.stop();
  });


  p.open(0.25);
  setTimeout(() => fitGraph(true), 800);

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


  var nodes;
  var edges;

  var gridLayerG = maing.append('g').classed('grid-layer', true);
  var alignmentHintLayerG = maing.append('g').classed('alignment-hint-layer', true);
  const hoverPreviewG = maing.append('g').classed('hover-preview', true);
  var edgelayerg = maing.append('g');
  var eoverlayerg = maing.append('g').classed('eoverlayerg', true);
  var alignmentHintLayerG = maing.append('g').classed('alignment-hint-layer', true);
  var nodelayerg = maing.append('g');

  function annotateEdgeV(ed) {
    if (ed.annotatedV) {
      console.log('Edge is already annotated V', ed);
      return;
    }
    ed.annotatedV = true;


    // vertical line is at edge endpoint 1
    const at1 = ed.y1 < ed.y2;

    // vertical line is at edge endpoint 2
    const at2 = !at1;

    const p1LeftToP2 = ed.x1 <= ed.x2;
    // 5px x step from endpoint 1 to 2
    const dx1to2 = p1LeftToP2 ? 5 : -5;


    const x = at1 ? ed.x1 + 2 * dx1to2 : ed.x2 - 2 * dx1to2;
    const y1 = Math.min(ed.y1, ed.y2);
    const y2 = Math.max(ed.y1, ed.y2);

    alignmentHintLayerG.append('text')
      .classed('vertical-alignment-arrow-label', true)
      .classed('on-right', at1 !== p1LeftToP2)
      .attr('x', at1 ? x + dx1to2 : x - dx1to2)
      .attr('y', (y1 + y2) / 2)
      .text(ed.dy);


    alignmentHintLayerG.append('line')
      .attr('x1', ed.x1)
      .attr('y1', ed.y1)
      .attr('x2', x + dx1to2)
      .attr('y2', ed.y1);
    alignmentHintLayerG.append('line')
      .attr('x1', ed.x2)
      .attr('y1', ed.y2)
      .attr('x2', x - dx1to2)
      .attr('y2', ed.y2);


    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x)
      .attr('y1', y1)
      .attr('x2', x)
      .attr('y2', y2);

    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x)
      .attr('y1', y1)
      .attr('x2', x - 5)
      .attr('y2', y1 + 5);
    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x)
      .attr('y1', y1)
      .attr('x2', x + 5)
      .attr('y2', y1 + 5);
    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x)
      .attr('y1', y2)
      .attr('x2', x - 5)
      .attr('y2', y2 - 5);
    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x)
      .attr('y1', y2)
      .attr('x2', x + 5)
      .attr('y2', y2 - 5);


  }

  function annotateEdgeH(ed) {
    if (ed.annotatedH) {
      console.log('Edge is already annotated H', ed);
      return;
    }
    ed.annotatedH = true;

    const y = Math.min(ed.y1, ed.y2) - 10;
    const x1 = Math.min(ed.x1, ed.x2);
    const x2 = Math.max(ed.x1, ed.x2);
    const y1 = ed.x1 === x1 ? ed.y1 : ed.y2;
    const y2 = ed.x2 === x2 ? ed.y2 : ed.y1;

    alignmentHintLayerG.append('text')
      .classed('horizontal-alignment-arrow-label', true)
      .attr('x', (x1 + x2) / 2)
      .attr('y', y - 5)
      .text(ed.dx);


    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x1)
      .attr('y1', y)
      .attr('x2', x2)
      .attr('y2', y);

    alignmentHintLayerG.append('line')
      .attr('x1', x1)
      .attr('y1', y - 5)
      .attr('x2', x1)
      .attr('y2', y1);
    alignmentHintLayerG.append('line')
      .attr('x1', x2)
      .attr('y1', y - 5)
      .attr('x2', x2)
      .attr('y2', y2);


    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x1)
      .attr('y1', y)
      .attr('x2', x1 + 5)
      .attr('y2', y - 5);
    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x1)
      .attr('y1', y)
      .attr('x2', x1 + 5)
      .attr('y2', y + 5);
    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x2)
      .attr('y1', y)
      .attr('x2', x2 - 5)
      .attr('y2', y - 5);
    alignmentHintLayerG.append('line')
      .classed('edge-alignment-arrow', true)
      .attr('x1', x2)
      .attr('y1', y)
      .attr('x2', x2 - 5)
      .attr('y2', y + 5);
  }
  function updateAlignmentHintLayer(nd, translateX, translateY) {
    translateX = !!translateX ? translateX : 0;
    translateY = !!translateY ? translateY : 0;
    alignmentHintLayerG.selectAll('*').remove();

    const ndDef = nodeTypes[nd.type];
    const ownEdges = [];
    const otherEdgesByDx = {};
    const otherEdgesByDy = {};
    const ownEdgesByDx = {};
    const ownEdgesByDy = {};
    edges.forEach(e => {
      const n1def = nodeTypes[e.n1.type];
      const n2def = nodeTypes[e.n2.type];

      const ex1 = e.n1.layout.x + n1def.ports[e.p1].x + translateX;
      const ey1 = e.n1.layout.y + n1def.ports[e.p1].y + translateY;
      const ex2 = e.n2.layout.x + n2def.ports[e.p2].x + translateX;
      const ey2 = e.n2.layout.y + n2def.ports[e.p2].y + translateY;

      const edx = Math.round(Math.abs(ex2 - ex1));
      const edy = Math.round(Math.abs(ey2 - ey1));

      const edgeOfInterest = nd.render.id === e.n1.render.id || nd.render.id === e.n2.render.id;
      const edesc = {
        x1 : ex1,
        y1 : ey1,
        x2 : ex2,
        y2 : ey2,
        dx : edx,
        dy : edy,
        annotatedH : false,
        annotatedV : false
      };
      if (edgeOfInterest) {
        if (edx > 0 || edy > 0) {
          ownEdges.push(edesc);
        }
        if (edx > 0) {
          if (ownEdgesByDx[edx] === undefined) {
            ownEdgesByDx[edx] = [];
          }
          ownEdgesByDx[edx].push(edesc)
        }
        if (edy > 0) {
          if (ownEdgesByDy[edy] === undefined) {
            ownEdgesByDy[edy] = [];
          }
          ownEdgesByDy[edy].push(edesc)
        }
      } else {
        if (edx > 0) {
          if (otherEdgesByDx[edx] === undefined) {
            otherEdgesByDx[edx] = [];
          }
          otherEdgesByDx[edx].push(edesc);
        }
        if (edy > 0) {
          if (otherEdgesByDy[edy] === undefined) {
            otherEdgesByDy[edy] = [];
          }
          otherEdgesByDy[edy].push(edesc);
        }
      }
    });

    for (var ownE of ownEdges) {
      if (ownEdgesByDx[ownE.dx] && ownEdgesByDx[ownE.dx].length > 1) {
        annotateEdgeH(ownE);
      }
      if (ownEdgesByDy[ownE.dy] && ownEdgesByDy[ownE.dy].length > 1) {
        annotateEdgeV(ownE);
      }
      if (otherEdgesByDx[ownE.dx]) {
        annotateEdgeH(ownE);
        for (var otherE of otherEdgesByDx[ownE.dx]) {
          annotateEdgeH(otherE);
        }
      }
      if (otherEdgesByDy[ownE.dy]) {
        annotateEdgeV(ownE);
        for (var otherE of otherEdgesByDy[ownE.dy]) {
          annotateEdgeV(otherE);
        }
      }
    }

    var lfound = false;
    var lx = nd.layout.x + translateX;
    var ly1 = nd.layout.y + translateY;
    var ly2 = nd.layout.y + ndDef.h + translateY;
    var rfound = false;
    var rx = nd.layout.x + ndDef.w + translateX;
    var ry1 = nd.layout.y + translateY;
    var ry2 = nd.layout.y + ndDef.h + translateY;
    var tfound = false;
    var ty = nd.layout.y + translateY;
    var tx1 = nd.layout.x + translateX;
    var tx2 = nd.layout.x + ndDef.w + translateX;
    var bfound = false;
    var by = nd.layout.y + ndDef.h + translateY;
    var bx1 = nd.layout.x + translateX;
    var bx2 = nd.layout.x + ndDef.w + translateX;
    nodes.forEach(n => {
      if (n.render.id === nd.render.id) {
        return
      }

      const nDef = nodeTypes[n.type];
      if (Math.abs(n.layout.x - lx) < 1) {
        lfound = true;
        ly1 = Math.min(ly1, n.layout.y);
        ly2 = Math.max(ly2, n.layout.y + nDef.h);
      }
      if (Math.abs(n.layout.x + nDef.w - lx) < 1) {
        lfound = true;
        ly1 = Math.min(ly1, n.layout.y);
        ly2 = Math.max(ly2, n.layout.y + nDef.h);
      }
      if (Math.abs(n.layout.x - rx) < 1) {
        rfound = true;
        ry1 = Math.min(ry1, n.layout.y);
        ry2 = Math.max(ry2, n.layout.y + nDef.h);
      }
      if (Math.abs(n.layout.x + nDef.w - rx) < 1) {
        rfound = true;
        ry1 = Math.min(ry1, n.layout.y);
        ry2 = Math.max(ry2, n.layout.y + nDef.h);
      }
      if (Math.abs(n.layout.y - ty) < 1) {
        tfound = true;
        tx1 = Math.min(tx1, n.layout.x);
        tx2 = Math.max(tx2, n.layout.x + nDef.w);
      }
      if (Math.abs(n.layout.y + nDef.h - ty) < 1) {
        tfound = true;
        tx1 = Math.min(tx1, n.layout.x);
        tx2 = Math.max(tx2, n.layout.x + nDef.w);
      }
      if (Math.abs(n.layout.y - by) < 1) {
        bfound = true;
        bx1 = Math.min(bx1, n.layout.x);
        bx2 = Math.max(bx2, n.layout.x + nDef.w);
      }
      if (Math.abs(n.layout.y + nDef.h - by) < 1) {
        bfound = true;
        bx1 = Math.min(bx1, n.layout.x);
        bx2 = Math.max(bx2, n.layout.x + nDef.w);
      }
    });
    if (lfound) {
      alignmentHintLayerG.append('line')
        .attr('x1', lx)
        .attr('y1', ly1)
        .attr('x2', lx)
        .attr('y2', ly2);
      }
    if (rfound) {
      alignmentHintLayerG.append('line')
        .attr('x1', rx)
        .attr('y1', ry1)
        .attr('x2', rx)
        .attr('y2', ry2);
      }
    if (tfound) {
      alignmentHintLayerG.append('line')
        .attr('x1', tx1)
        .attr('y1', ty)
        .attr('x2', tx2)
        .attr('y2', ty);
      }
    if (bfound) {
      alignmentHintLayerG.append('line')
        .attr('x1', bx1)
        .attr('y1', by)
        .attr('x2', bx2)
        .attr('y2', by);
      }
  }



  var nodeDragTmpX0;
  var nodeDragTmpY0;
  var nodeDragTmpDx;
  var nodeDragTmpDy;
  const nodeDrag = d3.drag()
      .clickDistance(5)
      .on('start', function(e, nd) {
        updateSvgSize();
        removeAreaG.classed('hidden', false);
        removeAreaG.style('display', undefined);
        hNodeDragging.enter();
        nodeDragTmpX0 = nd.layout.x;
        nodeDragTmpY0 = nd.layout.y;
        nodeDragTmpDx = 0;
        nodeDragTmpDy = 0;
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
        } else {
          events.nodePositionChanged({
            id : d.id,
            label : d.label,
            x : d.layout.x,
            y : d.layout.y
          });
        }
        alignmentHintLayerG.selectAll('*').remove();
        hNodeDragging.exit();
      })
      .on('drag', function(e, nd) {
        nodeDragTmpDx += e.dx;
        nodeDragTmpDy += e.dy;
        const gridSize = 15;
        nd.layout.x = nodeDragTmpX0 + Math.round(nodeDragTmpDx / gridSize) * gridSize;
        nd.layout.y = nodeDragTmpY0 + Math.round(nodeDragTmpDy / gridSize) * gridSize;

        const c = d3.pointers(e, removeAreaG.node())[0];
        // not exact
        const inRemoveArea = Math.abs(c[0]) + Math.abs(c[1]) < 40;

        removeAreaG.classed('activated', inRemoveArea);

        const thisD3 = d3.select(this);
        const wasInRemoveArea = thisD3.classed('will-delete');

        if (inRemoveArea !== wasInRemoveArea) {
          edgelayerg.selectAll('path').filter(d => d.n1 == nd || d.n2 == nd).classed('will-delete', inRemoveArea);
          alignmentHintLayerG.selectAll('*').remove();
        } else {
          updateAlignmentHintLayer(nd);
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
    const parentD3 = d3.select(this.parentNode);
    const pd = parentD3.datum();
    if (thisD3.classed('titleg')) {
      console.log('Title of node', d);
      const modal = dg.showModal({
        title: 'Change node title',
        reject : () => {
          console.log('Rejected');
        },
        resolve : v => {
          console.log('Resolved; update title', v);
          d.label = v;
          updateNodeTitles();
          events.labelChanged({
            value: v,
            nodetype: pd.type,
            nodeid: pd.render.id
          });
        },
        ok : () => nvf()
      });
      modal.appendKV('Current value:', d.label);
      const nvf = modal.appendStrInput('New value:', d.label);
    } else if (d.paramid) {
      console.log('Param', d, pd);

      const modal = dg.showModal({
        title: `Change parameter "${d.def.label}" of "${pd.label}"`,
        reject : () => {
          console.log('Rejected');
        },
        resolve : v => {

          console.log('Resolved; update value', v);
          d.value = v;

          d.displayValue = d.value; // todo: factor out param display value / param / title binding
          if (d.def.type === 'string' && d.displayValue.length > 12) {
            d.displayValue = d.displayValue.substring(0, 8) + ' ...';
          }

          updateNodeParamValues();
          events.parameterChanged({
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
      var nvf;
      if (d.def.type && d.def.type === 'string') {
        nvf = modal.appendStrInput('New value:', d.value);
      } else {
        nvf = modal.appendNumInput('New value:', d.value);
      }

      if (d.def.descriptionMd) {
        modal.appendMarkdown(d.def.descriptionMd);
      }

    }
  }

  function updateNodeTitles() {
    nodelayerg.selectAll('g.titleg text').text(d => d.label);
  }

  function updateNodeParamValues() {
    const nodegs = nodelayerg.selectAll('g.nodeg');
    nodegs.each(function (d) {
      const sel = d3.select(this);
      if (!d.params) {
        return;
      }
      const paramvs = sel.selectAll('g.paramg text.param-value')
        .text(d => d.displayValue);
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
        .classed('white-box', d => !!nodeTypes[d.type].white)
        .attr('width', d => nodeTypes[d.type].w)
        .attr('height', d => nodeTypes[d.type].h)
        .attr('rx', d => nodeTypes[d.type].square ? 0 : 5);

    var titleg = nodesg.append('g').classed('paramg titleg', true);
    titleg.append('rect') // mask bottom corners with no radius
        .classed('param-bg-rect', true)
        .attr('display', d => nodeTypes[d.type].h < 24 ? 'none' : null) // port connection node is too small
        .attr('x', 0.5)
        .attr('y', 7.5)
        .attr('width', d => nodeTypes[d.type].w - 1)
        .attr('height', 16);
    titleg.append('rect') // all corners have radius to fit in outer box nicely on the top
        .classed('param-bg-rect', true)
        .attr('x', 0.5)
        .attr('y', 0.5)
        .attr('rx', d => nodeTypes[d.type].square ? 0 : 4.5)
        .attr('ry', d => nodeTypes[d.type].square ? 0 : 4.5)
        .attr('width', d => nodeTypes[d.type].w - 1)
        .attr('height', 19);


    titleg.append('text')
        .classed('node-label', true)
        .attr('text-anchor', 'middle')
        .attr('x', d => nodeTypes[d.type].w / 2)
        .attr('y', d => Math.min(nodeTypes[d.type].h / 2, 12))
        .text(d => d.label);

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
            .map(([k, v]) => {
              const ret = {
                domid : newId(),
                paramid : k,
                def : v,
                value : (d.params && d.params[k]) ? d.params[k] : v.initial
              };
              ret.displayValue = ret.value;
              if (v.type === 'string' && ret.displayValue.length > 12) {
                ret.displayValue = ret.displayValue.substring(0, 8) + ' ...';
              }
              return ret;
            });
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
            .attr('x', -3.5)
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
            .text(d => d.displayValue);
      }
    }); nodes = null;
  }

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

  function getGraphBounds() {
    if (nodes.length === 0) {
      return;
    }
    var first = true;
    var x0, y0, x1, y1;

    nodes.forEach(n => {
      const nodeDef = nodeTypes[n.type];

      if (first || n.layout.x < x0) { x0 = n.layout.x; }
      if (first || n.layout.x + nodeDef.w > x1) { x1 = n.layout.x + nodeDef.w; }
      if (first || n.layout.y < y0) { y0 = n.layout.y; }
      if (first || n.layout.y + nodeDef.h > y1) { y1 = n.layout.y + nodeDef.h; }
      first = false;
    });

    return [[x0, y0], [x1, y1]];
  }

  function fitGraph(doTransition) {
    const graphBounds = getGraphBounds();
    if (!graphBounds) {
      return;
    }

    var x0 = graphBounds[0][0];
    var y0 = graphBounds[0][1];
    var x1 = graphBounds[1][0];
    var y1 = graphBounds[1][1];

    const svgBb = svg.node().getBoundingClientRect();
    console.log(`SVG size: ${svgBb.width} x ${svgBb.height}`);
    console.log(`Graph bounding box: (${x0}, ${y0}) - (${x1}, ${y1})`);

    // maing.transition().duration(500).call()
    // see https://observablehq.com/@d3/programmatic-zoom

    //var t = d3.zoomIdentity.translate(svgBb.width / 2 - (x1 - x0) / 2, svgBb.height / 2 - (y1 - y0) / 2).scale(0.1);
    const scale = Math.min(svgBb.width / (x1 - x0), svgBb.height / (y1 - y0)) * 0.9;
    var t = d3.zoomIdentity.translate(svgBb.width / 2 - scale * (x1 + x0) / 2, svgBb.height / 2 - scale * (y1 + y0) / 2).scale(scale);

    (doTransition ? svg.transition().duration(600) : svg).call(svgZoom.transform, t);
  }

  function isGraphEmpty() {
    return !nodes.length;
  }

  function clearGraph(doTransition) {
    nodes = [];
    edges = [];
    titleField.setText("");
    renderNodes();
    renderEdges();
    fireTopologyChanged();

    var t = d3.zoomIdentity;
    (doTransition ? svg.transition().duration(600) : svg).call(svgZoom.transform, t);
  }



  function importGraph(g) {
    // avoid polluting incomming argument
    const gs = JSON.stringify(g);
    g = JSON.parse(gs);
    console.log('Import graph to UI ===================')
    console.log('Graph:', g)

    /*
    if (g.title) {
      const persisted = persist.get(g.title);
      if (persisted && persisted !== gs) {
        // mismatch
        return;
      } else if (!persisted) {
        // not yet saved
        persist.put(g.title, gs);
        notes.top(`Saved as "${g.title}"`);
      }
    }

    titleField.setText(g.title ? g.title : "");
    */

    nodes = g.nodes;
    const gridSize = 15;
    nodes.forEach(n => {
      const nodeDef = nodeTypes[selectedAddNodeType];
      const halfWidth = nodeDef.w / 2;
      // need to snap since node heights vary
      const halfHeight = Math.round(nodeDef.h / (2 * gridSize)) * gridSize;
      n.layout.x = Math.round((n.layout.x - halfWidth)/ gridSize) * gridSize + halfWidth;
      n.layout.y = Math.round((n.layout.y - halfHeight)/ gridSize) * gridSize + halfHeight;
    });
    edges = g.edges;
    edges.forEach(e => {
      e.n1 = nodes[e.n1index];
      e.n2 = nodes[e.n2index];
    });
    renderNodes();
    renderEdges();
    // connection drags are not registered, they should be here

    // Title field should be set by the caller if it is read from persistence
    titleField.clearText(); // otherwise topology changed would result in a save
    fireTopologyChanged(); // put title into warn (TODO: refine change events)
    titleField.setWarn(false);

    setTimeout(() => fitGraph(false), 0);
  }
  importGraph(pipelinePresets.vuAndSpectAndWss);

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
  const svgZoom = d3.zoom()
    .clickDistance(5)
    .on('zoom', e => maing.attr('transform', e.transform));
  svg.call(svgZoom);

  svg.on('click', e => {
    if (!addingNodeOnClick) {
      return;
    }
    const coords = d3.pointers(e, maing.node())[0];
    const nodeDef = nodeTypes[selectedAddNodeType];
    const gridSize = 15;
    const newNode = {
      type : selectedAddNodeType,
      label : hoverPreviewG.datum(),
      layout : {
        x : Math.round(coords[0] / gridSize) * gridSize - nodeDef.w / 2,
        y : Math.round(coords[1] / gridSize) * gridSize - Math.round(nodeDef.h / (2 * gridSize)) * gridSize
      }
    };
    nodes.push(newNode);
    renderNodes();
    connDrag.registerListenersOnPorts(connDragOpts);
    notes.top(`New ${nodeDef.title} node added`);
    updateAddingNodeOnClick();
    fireTopologyChanged();
    alignmentHintLayerG.selectAll('*').remove();
  });



  hoverPreviewG.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 10);

  var newNodeHoverPreview;
  function updateAddingNodeOnClick() {
    const nodeDef = nodeTypes[selectedAddNodeType];


    // use an unique name
    const labelBase = nodeDef.title;
    var newNodeLabel = labelBase;

    console.log(nodes);
    nodes.forEach(n => {
      const nlabel = n.label;
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
    const gridSize = 15;
    const newNode = {
      type : selectedAddNodeType,
      label : newNodeLabel,
      layout : {
        x : - nodeDef.w / 2,
        y : - Math.round(nodeDef.h / (2 * gridSize)) * gridSize
      }
    };
    hoverPreviewG.datum(newNodeLabel);
    renderNodesInto([newNode], hoverPreviewG, false);
    newNodeHoverPreview = newNode;
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
    const gridSize = 15;
    const x = Math.round(coords[0] / gridSize) * gridSize;
    const y = Math.round(coords[1] / gridSize) * gridSize;
    hoverPreviewG.attr('transform', `translate(${x}, ${y})`);

    if (hoverPreviewIsOnSvg) {
      updateAlignmentHintLayer(newNodeHoverPreview, x, y);
    } else {
      alignmentHintLayerG.selectAll('*').remove();
    }
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
  var hoverPreviewIsOnSvg;
  occh.onChange(onSvg => {
    if (!addingNodeOnClick) {
      return;
    }
    hoverPreviewIsOnSvg = onSvg;
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
  connDrag.registerListenersOnPorts(connDragOpts); // this should be in importGraph or in renderNodes
}
