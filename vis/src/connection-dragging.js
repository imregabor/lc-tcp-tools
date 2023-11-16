'use strict';

import * as d3 from 'd3';
import * as occ from './occ.js';


var lastOpts;
var hOnport;
var hDragging

export function registerListenersOnPorts(opts) {
  const portsD3 = opts.getPortsD3();
  const addTmpEdge = opts.addTmpEdge;
  const routeTmpEdge = opts.routeTmpEdge;
  const removeTmpEdge = opts.removeTmpEdge;
  const maing = opts.maing;
  lastOpts = opts;

  if (!hOnport) {
    const occh = occ.handler().enter();
    occh.onChange(o => opts.pointerOccupied(!o));
    hOnport = occh.newChild();
    hDragging = occh.newChild();
  }

  // work around flakyness - TODO investigate
  var inside;
  var insideD3;
  var leaveTo;
  portsD3
    .on('pointerdown', function(e) {
      // see https://stackoverflow.com/questions/70973822/no-pointerenter-event-if-you-touch-and-then-move-into-element
      e.target.releasePointerCapture(e.pointerId);
    })
    .on('pointerenter', function(e) {
      if (leaveTo) {
        clearTimeout(leaveTo);
        leaveTo = undefined;
        if (inside == this) {
          return;
        } else {
          exitPort(insideD3);
          inside = undefined;
          insideD3 = undefined;
        }
      }

      inside = this;
      insideD3 = d3.select(this);

      enterPort(insideD3);
    })
    .on('pointerleave', function(e) {
      leaveTo = setTimeout(() => {
        leaveTo = undefined;
        exitPort(insideD3);
        insideD3 = undefined;
        inside = undefined;
      }, 1);
    });

  var tmpeN;
  var tmpeD;

  portsD3.call(d3.drag()
    .on('start', function(e) {
      const portD3 = d3.select(this);
      portDragStarted(portD3);

      const portd = portD3.datum();
      const noded = d3.select(this.parentNode).datum();
      //console.log(this)
      //console.log(e.x, e.y, n1, n2)
      // console.log(n1, n2)
      const portt = portd.def.type;

      tmpeD = {
        t : portt,
        x1: 0,
        y1: 0,
        x2: 0,
        y2: 0
      };
      if (tmpeD.t === 'out') {
        tmpeD.x1 = portd.def.x + noded.layout.x,
        tmpeD.y1 = portd.def.y + noded.layout.y;
      } else {
        tmpeD.x2 = portd.def.x + noded.layout.x,
        tmpeD.y2 = portd.def.y + noded.layout.y;
      }

      tmpeN = addTmpEdge();
    })
    .on('drag', function(e) {

      //tmpeD.x2 = tmpeD.bx + e.x;
      //tmpeD.y2 = tmpeD.by + e.y;
      // console.log(d3.pointers(e.sourceEvent)[0])
      //console.log(d3.pointers(e, svg.node())[0])

      //console.log(e.x, e.y)

      const c = insideCompatiblePort ? compatiblePortCoords : d3.pointers(e, maing.node())[0];

      if (tmpeD.t === 'out') {
        tmpeD.x2 = c[0];
        tmpeD.y2 = c[1];
      } else {
        tmpeD.x1 = c[0];
        tmpeD.y1 = c[1];
      }

      routeTmpEdge(tmpeN, tmpeD.x1, tmpeD.y1, tmpeD.x2, tmpeD.y2);
      tmpeN.classed('snapped', insideCompatiblePort);

    })
    .on('end', function(e) {
      portDragEnded();
      removeTmpEdge(tmpeN);
      tmpeN = undefined;
      tmpeD = undefined
    })
  );

}

var insidePort = false;
var dragging = false;
var draggingPortType;
var draggingPortD3;
var compatiblePortCoords;
var insideCompatiblePort = false;
var compatiblePort;
var reroutingConnection;

/** Pointer enetered port area as hover or drag. */
export function enterPort(portD3) {
  insidePort = true;
  //handlePointerOcc();
  const enteredPortType = portD3.datum().def.type;


  if (dragging) {
    if (enteredPortType === draggingPortType) {
      portD3.classed('red', true);
    } else {
      insideCompatiblePort = true;
      compatiblePort = portD3;
      compatiblePortCoords = lastOpts.getPortCoordinates(portD3);
      portD3.classed('green', true);
    }
  } else {
    portD3.classed('green', true);
  }

  hOnport.enter();
}

export function exitPort(portD3) {
  insidePort = false;
  // handlePointerOcc();
  portD3.classed('green', false);
  portD3.classed('red', false);
  insideCompatiblePort = false;
  compatiblePort = undefined;
  compatiblePortCoords = undefined;

  hOnport.exit();
}

export function portDragStarted(portD3) {
  dragging = true;
  // handlePointerOcc();
  draggingPortD3 = portD3;
  draggingPortType = portD3.datum().def.type;
  // lastOpts.portsD3.classed('lightred', d => d.def.type === draggingPortType);
  lastOpts.getPortsD3().classed('lightgreen', d => d.def.type !== draggingPortType);

  reroutingConnection = undefined;
  if (draggingPortType === 'in') {
    reroutingConnection = lastOpts.firstConnection(portD3);
    if (reroutingConnection) {
      lastOpts.hideConnection(reroutingConnection);
    }
  }
  hDragging.enter();
}

export function portDragEnded() {
  if (reroutingConnection) {
    lastOpts.unhideConnection(reroutingConnection);
    if (insideCompatiblePort) {
      lastOpts.updateConnectionSource(reroutingConnection, compatiblePort);
    } else {
      lastOpts.removeConnection(reroutingConnection);
    }
  } else {
    if (insideCompatiblePort) {
      if (draggingPortD3.datum().def.type === 'out') {
        lastOpts.connect(draggingPortD3, compatiblePort);
      } else {
        lastOpts.connect(compatiblePort, draggingPortD3);
      }
    }
  }
  dragging = false;
  draggingPortD3 = undefined;
  // lastOpts.portsD3.classed('lightred', false);
  lastOpts.getPortsD3().classed('lightgreen', false);

  //handlePointerOcc();
  hDragging.exit();
}

/*
var lastOccupied = false;
function handlePointerOcc() {
  var occupied = insidePort || dragging;
  if (occupied !== lastOccupied) {
    lastOpts.pointerOccupied(occupied);
    lastOccupied = occupied;
  }
}
*/
