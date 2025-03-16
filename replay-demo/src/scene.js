"use strict";

// inspired by https://keithclark.co.uk/labs/css-fps/


import * as d3 from 'd3';
import './scene.css';
import lightbulbPng from './lightbulb.png';



function normV2(v) {
  const l = Math.sqrt(v.x * v.x + v.y * v.y);
  if (l < 1e-6) {
    return;
  }
  v.x = v.x / l;
  v.y = v.y / l;
}

export function bind(parentD3, sceneGraph, matrix35) {
  // see more or less https://w3c.github.io/csswg-drafts/css-transforms-2/#3d-rendering-contexts
  // and https://dev.opera.com/articles/understanding-the-css-transforms-matrix/
  const sceneDiv = parentD3.append('div').classed('scene', true);
  const containerDiv = sceneDiv.append('div').classed('scene-container', true);
  const container2Div = containerDiv.append('div').classed('scene-container2', true);
  var scale = 0.2;
  // pixel per cm
  const ppcm = 3;

  var camera = { rv : 10, rh : 52, x : 500, y : 100, z : 1500, eye : 1500, eyeAlpha : 0.75 };

  // see https://codepen.io/billyysea/pen/nLroLY
  const g03 = [
      { c : '#020111', p : 0.3 },
      { c : '#3a3a52', p : 1.0 },
  ];

  const g19 = [
      { c : '#163C52', p : 0 },
      { c : '#4F4F47', p : 0.3 },
      { c : '#C5752D', p : 0.6 },
      { c : '#B7490F', p : 0.8 },
      { c : '#2F1107', p : 1.0 }
  ];
  const g21 = [
    { c : '#010A10', p : 0.3 },
    { c : '#59230B', p : 0.8 },
    { c : '#2F1107', p : 1.0 }
  ];

  const g22 = [
      { c : '#090401', p : 0.5 },
      { c : '#4B1D06', p : 1.0 },
  ];

  var horizon = {
    d : 5000,
    gradient : g21
  };
  var scene = { width : 1600, height: 1200 };

  // containerDiv.style('transform', 'translate3d(-10000, 180, 0) scale3d(0.2, 0.2, 0.2)');

  containerDiv.style('transform', 'translate(800px, 600px)');

  //container2Div.style('transform', 'scale3d(0.3, 0.3, 0.3)');

  function getMatrixForGround() {
    // see https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
    // see https://stackoverflow.com/questions/3432446/how-to-read-parse-individual-transform-style-values-in-javascript
    const matrix3d = window.getComputedStyle(container2Div.node()).transform;
    const matrix = matrix3d
        .split('(')[1]
        .split(')')[0]
        .split(',')
        .map(parseFloat);
    return matrix;
  }

  function getWindowSize() {
    // see https://stackoverflow.com/questions/3437786/get-the-size-of-the-screen-current-web-page-and-browser-window
    return {
      width : (window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth),
      height : (window.innerHeight|| document.documentElement.clientHeight|| document.body.clientHeight)
    };
  }


  function updateViewport() {
    const ws = getWindowSize();
    scene.width = ws.width;
    scene.height = ws.height;

    sceneDiv.style('width', scene.width + 'px');
    sceneDiv.style('height', scene.height + 'px');
    camera.eye = Math.max(scene.width, scene.height) * camera.eyeAlpha;

    containerDiv.style('transform', 'translate(' + (scene.width / 2) + 'px, ' + (scene.height / 2) + 'px)');
    bindCamera();
  }

  function bindCamera() {
    containerDiv.style('perspective', camera.eye + 'px');
    container2Div.style('transform-origin', camera.x * ppcm + 'px ' + (-camera.y) * ppcm + 'px ' + camera.z * ppcm + 'px');
    container2Div.style('transform',
      'translate3d(' + (-camera.x) * ppcm + 'px, ' + camera.y * ppcm + 'px, ' + (camera.eye - camera.z * ppcm) + 'px) ' +
      'rotate3d(1, 0, 0, ' + camera.rv + 'deg) ' +
      'rotate3d(0, 1, 0, ' + camera.rh + 'deg)'
    );
    const m = getMatrixForGround();
    if (Math.abs(m[5]) > 1e-6) {
      // real horizon in scene
      var hh = scene.height / 2 - m[6] * camera.eye / m[5];


      // near horizon where fading starts
      //var hth = camera.y * ( (horizon.k + 1) * horizon.d / (camera.eye + (horizon.k + 1) * horizon.d) - horizon.d / (camera.eye + horizon.d));
      var hth = hh - camera.y * ( 1 - horizon.d / (camera.eye + horizon.d));
      if (hh < 0) {
        // hh = 0;
      } else if (hh > scene.height) {
        hh = scene.height;
      }
      if (hth < 0) {
        // hth = 0;
      } else if (hth > scene.height) {
        hth = scene.height;
      }

      if (camera.y <= 0) {
        hh = scene.height;
        hth = scene.height;
      }

      // console.log(hh, hth); // m[4], m[5], m[6]);
      // old #06792d
      //const bgg = 'linear-gradient(to top, #03491b ' + hth + 'px, transparent ' + hh + 'px)';
      var bgg = 'linear-gradient(to top, #03491b ' + hth + 'px';
      for (var i = horizon.gradient.length - 1; i >= 0; i--) {
        const gi = horizon.gradient[i];
        const p = hh + (1 - gi.p) * scene.height / 2;
        bgg = bgg + ', ' + gi.c + ' ' + p + 'px';
        if (gi >= scene.height) {
          break;
        }
      }

      bgg = bgg + ')';
      // console.log(bgg)

      sceneDiv.style('background', bgg);
    }

  }

  updateViewport();
  setInterval(() => {
    const ws = getWindowSize();
    if (ws.width !== scene.width || ws.height !== scene.height) {
      updateViewport();
    }
  }, 500);


  function dragHeight(e) {
    camera.y -= e.dy;
    if (camera.y < 3) {
      camera.y = 3;
    }
    bindCamera();
  }

  function dragMove(e) {
    const matrix = getMatrixForGround();

    const vz = { x : matrix[8], y : matrix[10] };
    const vx = { x : matrix[0], y : matrix[2] };
    //normV2(vz);
    //normV2(vx);

    camera.x -= - 3 * e.dy * vz.x + e.dx * vx.x;
    camera.z += - 3 * e.dy * vz.y + e.dx * vx.y;

    bindCamera();
  }

  function dragRot(e) {
    camera.rv += e.dy / 3;
    camera.rh -= e.dx / 5;
    if (camera.rv > 89) {
      camera.rv = 89;
    } else if (camera.rv < -89) {
      camera.rv = -89;
    }
    bindCamera();
  }

  sceneDiv.call(d3.drag()
    //.on('start', e => console.log('start', e))
    //.on('end', e => console.log('end', e))
    .on('drag', e => {
        if (e.sourceEvent.shiftKey) {
          dragMove(e);
        } else if (e.sourceEvent.altKey) {
          dragHeight(e);
        } else {
          dragRot(e)
        }
    })
  );


  const modelContainer = container2Div.append('div').classed('model-container', true);



  const bulbs = container2Div.append('div').classed('matrix35-container', true).selectAll('div').data(matrix35).enter();

  bulbs.append('div').classed('element', true)
    .attr('title', 'LAMP socket')
    .classed('lamp lamp-socket', true)
    .style('width', `${5 * ppcm}px`)
    .style('height', `${2 * ppcm}px`)
    .style('transform', d => {
      var translate3d = `translate3d(${(d.x  - 2.5) * ppcm}px,${(-d.z - 7.3) * ppcm}px,${d.y * ppcm}px)`;
      return translate3d
    });

  const glass = bulbs.append('div').classed('element lightbulb', true)
    .attr('title', 'lightbulb')
    .style('width', `${8 * ppcm}px`)
    .style('height', `${9.24 * ppcm}px`)
    .style('background-image', `url(${lightbulbPng})`)
    .style('background-size', `${8 * ppcm}px ${9.24 * ppcm}px`)
    .style('transform', d => {
      var translate3d = `translate3d(${(d.x - 4) * ppcm}px,${(-d.z - 5.3) * ppcm}px,${d.y * ppcm}px)`;
      return translate3d
    });

  const sceneDivs = modelContainer.selectAll('div').data(sceneGraph).enter().append('div').classed('element', true);
  sceneDivs
    .attr('title', d => d.title)
    .style('transform', d => {
      const scale3d = '' ; // 'scale3d(' + scale + ',' + scale + ',' + scale + ')';

      var tilt3d = '';
      var translate3d = '';
      var rotate3d = '';

      if (d.tilt1) {
        tilt3d = ` translate3d(0, ${d.h * ppcm}px, 0) rotate3d(1,0,0,${d.tilt1}deg) translate3d(0, ${-d.h * ppcm}px, 0)`;
        //tilt3d = ` rotate3d(1,0,0,${d.tilt1}deg)`;
        // tilt3d = `translate3d(${-d.w * ppcm / 2}px, ${-d.h * ppcm / 2}px, 0) rotate3d(1,0,0,${d.tilt1}deg) translate3d(${d.w * ppcm / 2}px, ${d.h * ppcm / 2}px, 0) `;
      }

      if (d.plane === 'front') {
        translate3d = 'translate3d(' + d.coord.x * ppcm + 'px,' + (-d.coord.z-d.h) * ppcm + 'px,' + d.coord.y * ppcm+ 'px)';
        return translate3d + tilt3d;
      } else if (d.plane === 'side') {
        translate3d = 'translate3d(' + d.coord.x * ppcm + 'px,' + (-d.coord.z-d.h) * ppcm + 'px,' + d.coord.y * ppcm + 'px)';
        rotate3d = 'rotate3d(0,1,0,-90deg)';
        return translate3d + ' ' + rotate3d + tilt3d;
      }else if (d.plane === 'ground') {
        translate3d = 'translate3d(' + d.coord.x * ppcm + 'px,' + (-d.coord.z) * ppcm + 'px,' + d.coord.y * ppcm + 'px)';
        rotate3d = 'rotate3d(1,0,0,90deg)';
        return translate3d + ' ' + rotate3d + tilt3d;
      }
      //return rotate3d + ' ' + translate3d + ' ' + scale3d;
    })
    .style('background-color', d => d.backgroundColor )
    .style('width', d => d.w * ppcm + 'px')
    .style('height', d => d.h * ppcm  + 'px');
    //.style('opacity', '0.8');

  // see https://github.com/d3/d3-selection/blob/v3.0.0/README.md#selection_each
  sceneDivs.each(function(d, i) {

    if (!d.texture) {
      return;
    }
    // console.log(d, 'url(' + d.texture + ')', this)
    // See https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Backgrounds_and_Borders/Resizing_background_images
    var sw, sh;
    if (d.textureSw) {
      sw = d.textureSw * ppcm;
    } else {
      const rw = d.textureRw ? d.textureRw : 1;
      sw = ppcm * d.w / rw;
    }
    if (d.textureSh) {
      sh = d.textureSh * ppcm;
    } else {
      const rh = d.textureRh ? d.textureRh : 1;
      sh = ppcm * d.h / rh;
    }

    const rh = d.textureRh ? d.textureRh : 1;

    d3.select(this)
        .style('background-image', 'url(' + d.texture + ')')
        .style('background-size', sw + 'px ' + sh + 'px');
  });


  var controlCameraRequested;
  function controlCamera() {
    if (controlCameraRequested) {
      return;
    }
    if (keyIsDown.right && !keyIsDown.left) {
      camera.rh += 2;
      if (camera.rh > 360) {
        camera.rh -= 360;
      }
    }
    if (!keyIsDown.right && keyIsDown.left) {
      camera.rh -= 2;
      if (camera.rh < 0) {
        camera.rh += 360;
      }
    }

    if (keyIsDown.up && !keyIsDown.down) {
      camera.rv += 2;
      if (camera.rv > 89) {
        camera.rv = 89;
      }
    }

    if (!keyIsDown.up && keyIsDown.down) {
      camera.rv -= 2;
      if (camera.rv < -89) {
        camera.rv = -89;
      }
    }

    if (keyIsDown.pageUp && !keyIsDown.pageDown) {
      camera.y += 3;
    }

    if (!keyIsDown.pageUp && keyIsDown.pageDown) {
      camera.y -= 3;
      if (camera.y < 3) {
        camera.y = 3;
      }
    }


    const mx = 20 * (keyIsDown.a ? -1 : 0 + keyIsDown.d ? 1 : 0);
    const my = 20 * (keyIsDown.s ? -1 : 0 + keyIsDown.w ? 1 : 0);
    if (mx || my) {
      const matrix = getMatrixForGround();

      const vz = { x : matrix[8], y : matrix[10] };
      const vx = { x : matrix[0], y : matrix[2] };

      camera.x -= - my * vz.x - mx * vx.x;
      camera.z += - my * vz.y - mx * vx.y;
    }

    if (keyIsDown.plus && !keyIsDown.minus) {
      camera.eyeAlpha *= 1.01;
    }

    if (!keyIsDown.plus && keyIsDown.minus) {
      camera.eyeAlpha *= 0.99;
    }



    const didAnything =
      keyIsDown.right || keyIsDown.left || keyIsDown.up || keyIsDown.down ||
      keyIsDown.a || keyIsDown.s || keyIsDown.d || keyIsDown.w ||
      keyIsDown.plus || keyIsDown.minus || keyIsDown.pageUp || keyIsDown.pageDown;

    const updatedEye = keyIsDown.plus || keyIsDown.minus;

    if (didAnything) {
      if (updatedEye) {
        updateViewport();
      }
      bindCamera();
      controlCameraRequested = true;
      requestAnimationFrame(() => {
        controlCameraRequested = false;
        controlCamera();
      });

    }
  }

  const keyIsDown = {
    w : false,
    a : false,
    s : false,
    d : false,
    plus : false,
    minus : false,
    right : false,
    left : false,
    up : false,
    down : false,
    pageUp : false,
    pageDown : false
  };
  function handleKey(down, e) {
    if (e.code === 'KeyW') {
      keyIsDown.w = down;
    } else if (e.code === 'KeyA') {
      keyIsDown.a = down;
    } else if (e.code === 'KeyS') {
      keyIsDown.s = down;
    } else if (e.code === 'KeyD') {
      keyIsDown.d = down;
    } else if (e.code === 'ArrowRight') {
      keyIsDown.right = down;
    } else if (e.code === 'ArrowLeft') {

      keyIsDown.left = down;
    } else if (e.code === 'ArrowUp') {
      keyIsDown.up = down;
    } else if (e.code === 'ArrowDown') {
      keyIsDown.down = down;
    } else if (e.key === '+') {
      keyIsDown.plus = down;
    } else if (e.key === '-') {
      keyIsDown.minus = down;
    } else if (e.key === 'PageUp') {
      keyIsDown.pageUp = down;
    } else if (e.key === 'PageDown') {
      keyIsDown.pageDown = down;
    }

    controlCamera();
  }


  d3.select('body')
    .on('keydown', e => handleKey(true, e))
    .on('keyup', e => handleKey(false, e));


  const ret = {
    camera : (x, y, z) => {

    }
  };
  return ret;
}
