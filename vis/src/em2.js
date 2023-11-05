'use strict';

import * as d3 from 'd3';
import './em2.css';
import * as connDrag from './connection-dragging.js';
import * as notes from './notes.js';
import * as nodeDefs from './node-definitions.js';

export function initPage() {
  d3.select('html').style('overflow', 'hidden'); // in css it would pollute other pages
  const body = d3.select('body');

  var idct = 0;
  function newId() {
    idct += 1;
    return `id-${idct}`;
  }

  const svgdiv = body.append('div').classed('svg-ctr', true);
  const svg = svgdiv.append('svg').attr('width', '100%').attr('height', '100%').attr('preserveAspectRatio', 'none');
  const maing = svg.append('g');

  var nodeTypes = nodeDefs.nodeTypes;

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

  var edgelayerg = maing.append('g');
  var eoverlayerg = maing.append('g').classed('eoverlayerg', true);
  var nodelayerg = maing.append('g');

  var nodesg = nodelayerg.selectAll('g.nodeg').data(nodes).enter().append('g').classed('nodeg', true);

  nodesg.attr('transform', d => `translate(${d.layout.x}, ${d.layout.y})`);
  nodesg.attr('id', d => { d.render = { id : newId() }; return d.render.id; } );
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

  var sel = nodesg.filter(d => d.type && d.type === 'aa');
  // port('out', sel, 'time domain', 150, 40);
  // port('out', sel, 'spectrum', 150, 70);
  param(sel, 'fftSize', d => d.size);

  var sel = nodesg.filter(d => d.type && d.type === 'tde');
  // port('out', sel, 'energy', 150, 40);
  // port('in', sel, 'TD', -20, 40);

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

  });


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

  function param(selection, label, value) {
    selection.append('text')
        .classed('param-label', true)
        .attr('text-anchor', 'start')
        .attr('alignment-baseline', 'middle')
        .attr('x', 5)
        .attr('y', 40)
        .text(label + ':');
    selection.append('text')
        .classed('param-value', true)
        .attr('text-anchor', 'end')
        .attr('alignment-baseline', 'middle')
        .attr('x', 80)
        .attr('y', 40)
        .text(value);
  }

  function port(t, selection, label, tx, ty) {
    const g = sel.append('g')
        .classed('portg', true)
        .attr('transform', `translate(${tx}, ${ty})`);
    g.append('path')
        .attr('d', t === 'out'
          ? 'M 0 0 l -10 -10 l -70 0 l 0 20 l 70 0 l 10 -10 Z'
          : 'M 0 0 l 10 -10 l 70 0 l 0 20 l -70 0 l -10 -10 Z'
        );
    g.append('text')
        .classed('port-label', true)
        .attr('text-anchor', t === 'out' ? 'end' : 'start')
        .attr('alignment-baseline', 'middle')
        .attr('x', t === 'out' ? -10 : 10)
        .attr('y', 0)
        .text(label);
  }



  // see https://www.d3indepth.com/zoom-and-pan/
  // see https://d3js.org/d3-zoom#zoom_transform
  svg.call(
    d3.zoom()
        .on('zoom', e => maing.attr('transform', e.transform))
  );

  nodesg.call(d3.drag()
    .on('drag', function(e) {
      e.subject.layout.x += e.dx;
      e.subject.layout.y += e.dy;
      // see https://stackoverflow.com/questions/14167863/how-can-i-bring-a-circle-to-the-front-with-d3
      d3.select(this).raise().attr('transform', d => `translate(${d.layout.x}, ${d.layout.y})`);
      routeEdges();
    })
  );

  function firstConnection(nodeData, portData) {
    return edges.find(e => e.n2 == nodeData && e.p2 === portData.portid);
  }

  connDrag.registerListenersOnPorts({
    portsD3 : nodelayerg.selectAll('g.portg'),
    maing : maing,
    addTmpEdge : () => eoverlayerg.append('path'),
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
    }
  });

}
