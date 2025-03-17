"use strict";

import houseFrontPng from './house-front.png';
import houseSidePng from './house-side.png';
import thujasPng from './thujas.png';
import tilePng from './tile.png';
// based on https://www.publicdomainpictures.net/en/view-image.php?image=186620&picture=abstract-background-water-blue
// licensed under CC0 Public Domain
import waterPng from './water.png';
// generated
import roofTilePng from './roof-tile.png'
// http://www.clker.com/clipart-66043.html
import fenceSegmentPng from './fence-segment.png';
// based on https://opengameart.org/content/tileable-grass-textures-set-1
// licensed under CC0 Public Domain
import grassPng from './grass.png';
// based on https://www.freepik.com/free-vector/wooden-texture-background_851099.htm
// "Designed by Freepik" http://www.freepik.com/
import woodPng from './wood.png';

const matrix35 = [];

function getSceneGraph() {
  // Scene graph
  //
  // Scene graph and world coordinate system use different axes.
  //
  // In the scene graph:
  //   - (X-Y) plane is the ground plane ground
  //   - (Z) direction is height above ground level
  //   - coordinates are measured in cm units
  //
  // Specification of elements
  //   - front face: anchor is lowest (min Z) / leftmost (min X)
  //   - side face: anchor is lowest (min Z) / furthermost (from default viewer) (min Y)
  //   - ground face: anchor is the leftmost (min X) furthermost (from default viewer) (min Y)
  //

  const ret = [];
  // Ground and fences ============================================

  for(var x = 0; x < 16; x++) {
    for(var y = 0; y < 8; y++) {
      ret.push( {
        title: `ground ${y * 16 + x + 1}`,
        w : 250,
        h : 250,
        texture : grassPng,
        textureSw : 250,
        textureSh : 250,
        plane: 'ground',
        coord : { x : x * 250, y : y * 250, z: 0 }
      });
    }
  }

  for (var x = 0; x < 16; x++) {
    ret.push({
      title: 'fence',
      w : 250,
      h : 160,
      // backgroundColor : 'rgba(1,1,1,0.3)',
      texture : fenceSegmentPng,
      textureSw : 250 / 25,
      textureSh : 10,
      plane: 'front',
      coord : { x : x * 250, y : 0, z: 0 }
    });
    ret.push({
      title: 'fence',
      w : 250,
      h : 160,
      // backgroundColor : 'rgba(1,1,1,0.3)',
      texture : fenceSegmentPng,
      textureSw : 250 / 28,
      textureSh : 10,
      plane: 'front',
      coord : { x : x * 250, y : 2000, z: 0 }
    });
  }
  for (var y = 0; y < 8; y++) {
    ret.push({
      title: 'fence',
      w : 250,
      h : 160,
      // backgroundColor : 'rgba(1,1,1,0.3)',
      texture : fenceSegmentPng,
      textureSw : 250 / 28,
      textureSh : 10,
      plane: 'side',
      coord : { x : 0, y : y * 250, z: 0 }
    });
    ret.push({
      title: 'fence',
      w : 250,
      h : 160,
      // backgroundColor : 'rgba(1,1,1,0.3)',
      texture : fenceSegmentPng,
      textureSw : 250 / 28,
      textureSh : 10,
      plane: 'side',
      coord : { x : 4000, y : y * 250, z: 0 }
    });
  }

  // House ==============================================================
  ret.push({
    title: 'terrace floor',
    w : 230,
    h : 658,
    backgroundColor : '#524431',
    plane: 'ground',
    coord : { x : 2224, y : 235, z: 34.4 }
  });
  ret.push({
    title: 'terrace roof',
    w : 230,
    h : 658,
    backgroundColor : '#85745c',
    plane: 'ground',
    coord : { x : 2224, y : 235, z: 280 }
  });
  ret.push({
    title : 'roof upper triangle',
    w : 210,
    h : 90,
    plane: 'side',
    coord : { x : 2224, y : (234 + 893 - 210) / 2, z : 500},
    texture: woodPng,
    backgroundColor: 'rgba(255,255,255,0.5)',
    textureRotate: 90, // only 90 is supported
    textureSw: 100,
    textureSh: 100
  });
  ret.push({
    title: 'terrace back wall',
    w : 658,
    h : 278.6,
    backgroundColor : '#7a664b',
    plane: 'side',
    coord : { x : 2454, y : 235, z: 34.4 }
  });
  ret.push({
    title: 'house front (with door)',
    w : 658,
    h : 435,
    // backgroundColor : '#ffffff',
    plane: 'side',
    coord : { x : 2224, y : 235, z: 0 },
    texture : houseFrontPng
  });
  ret.push({
    title: 'house side',
    w : 755,
    h : 313,
    // backgroundColor : '#ffffff',
    plane: 'front',
    coord : { x : 2224, y : 893, z: 0 },
    texture : houseSidePng
  });
  ret.push({
    title: 'house back side',
    w : 755,
    h : 313,
    backgroundColor : '#615e42',
    plane: 'front',
    coord : { x : 2224, y : 235, z: 0 }
  });
  ret.push({
    title: 'house roof 1',
    w : 755,
    h : 429.47899819031966091114091917158,
    // backgroundColor : '#ffffff',
    plane: 'front',
    coord : { x : 2224, y : 893, z: 313 },
    tilt1 : 50,
    texture : roofTilePng,
    textureSw : 25,
    textureSh : 40
  });
  ret.push({
    title: 'house roof 1 backside',
    w : 755,
    h : 429.47899819031966091114091917158,
    plane: 'front',
    coord : { x : 2224, y : 893, z: 312 },
    tilt1 : 50,
    texture: woodPng,
    textureSw: 100,
    textureSh: 100
  });
  ret.push({
    title: 'house roof 2',
    w : 755,
    h : 429.47899819031966091114091917158,
    // backgroundColor : '#ffffff',
    plane: 'front',
    coord : { x : 2224, y : 235, z: 313 },
    tilt1 : -50,
    texture : roofTilePng,
    textureSw : 25,
    textureSh : 40
  });
  ret.push({
    title: 'house roof 2 backside',
    w : 755,
    h : 429.47899819031966091114091917158,
    plane: 'front',
    coord : { x : 2224, y : 235, z: 312 },
    tilt1 : -50,
    texture: woodPng,
    textureSw: 100,
    textureSh: 100
  });


  // Steel stuff 1 =======================================================
  const poleX = 1155;
  const pole1Y = 200;
  const polePitch = 460;
  const poleHeight = 430;
  const poleCentralHeight = 600;
  const poleCrossbarHeight = 400;
  const firstLightX = 2174; // 50 cm from house front
  const lampHeight = 330;
  const bulbCenterShift = 7.3; // distance from box surface to bulb center

  for (var i = 0; i < 5; i++) {
    const poleName = (i == 4) ? 'pole CENTER' : 'pole ' + (i + 1);
    const poleOffset = (i == 4) ? (polePitch * 1.5) : (polePitch * i);
    const height = (i == 4) ? poleCentralHeight : poleHeight;
    ret.push({
      title: poleName,
      w : 4,
      h : height,
      backgroundColor : '#000000',
      plane: 'side',
      coord : { x : poleX, y : pole1Y + poleOffset - 2, z: 0 }
    });
  }
  ret.push({
      title: 'Pole cross',
      w : 3 * polePitch + 4,
      h : 4,
      backgroundColor : '#000000',
      plane: 'side',
      coord : { x : poleX, y : pole1Y - 2, z: poleCrossbarHeight }
    });

  // matrix
  for (var string = 0; string < 7; string ++) {
    for (var pos = 0; pos < 5; pos ++) {
      const lx = firstLightX - 230 * pos;
      const ly = pole1Y + 230 * string;

      matrix35.push({
        x : lx,
        y : ly,
        z : lampHeight - bulbCenterShift
      });

      ret.push({ // box bottom
        title : 'String ' + (string + 1) + ' lamp ' + (pos + 1),
        w : 10,
        h : 10,
        backgroundColor: '#aaa',
        plane : 'ground',
        coord : { x : lx - 5, y : ly - 5, z : lampHeight }
      });
      ret.push({ // box top
        title : 'String ' + (string + 1) + ' lamp ' + (pos + 1),
        w : 10,
        h : 10,
        backgroundColor: '#666',
        plane : 'ground',
        coord : { x : lx - 5, y : ly - 5, z : lampHeight + 5 }
      });
      ret.push({ // box front1
        title : 'String ' + (string + 1) + ' lamp ' + (pos + 1),
        w : 10,
        h : 5,
        backgroundColor: '#777',
        plane : 'front',
        coord : { x : lx - 5, y : ly - 5, z : lampHeight }
      });
      ret.push({ // box front2
        title : 'String ' + (string + 1) + ' lamp ' + (pos + 1),
        w : 10,
        h : 5,
        backgroundColor: '#777',
        plane : 'front',
        coord : { x : lx - 5, y : ly + 5, z : lampHeight }
      });
      ret.push({ // box side1
        title : 'String ' + (string + 1) + ' lamp ' + (pos + 1),
        w : 10,
        h : 5,
        backgroundColor: '#888',
        plane : 'side',
        coord : { x : lx - 5, y : ly - 5, z : lampHeight }
      });
      ret.push({ // box side2
        title : 'String ' + (string + 1) + ' lamp ' + (pos + 1),
        w : 10,
        h : 5,
        backgroundColor: '#888',
        plane : 'side',
        coord : { x : lx + 5, y : ly - 5, z : lampHeight }
      });
    }
  }


  // Pool ====================================================
  ret.push({
    title: 'pool perimeter 1',
    w : 500,
    h : 50,
    // backgroundColor : '#afb6b6',
    texture: tilePng,
    textureRw: 10,
    textureRh: 1,
    plane: 'ground',
    coord : { x : 1502, y : 893, z: 3 }
  });
  ret.push({
    title: 'pool perimeter 2',
    w : 500,
    h : 50,
    // backgroundColor : '#afb6b6',
    texture: tilePng,
    textureRw: 10,
    textureRh: 1,
    plane: 'ground',
    coord : { x : 1502, y : 1193, z: 3 }
  });
  ret.push({
    title: 'pool perimeter 3',
    w : 50,
    h : 250,
    // backgroundColor : '#afb6b6',
    texture: tilePng,
    textureRw: 1,
    textureRh: 5,
    plane: 'ground',
    coord : { x : 1502, y : 943, z: 3 }
  });
  ret.push({
    title: 'pool perimeter 4',
    w : 50,
    h : 250,
    // backgroundColor : '#afb6b6',
    texture: tilePng,
    textureRw: 1,
    textureRh: 5,
    plane: 'ground',
    coord : { x : 1952, y : 943, z: 3 }
  });
  /*
  ret.push({
    title: 'pool top',
    w : 400,
    h : 250,
    backgroundColor : '#75d1f0',
    plane: 'ground',
    coord : { x : 1552, y : 943, z: 18 }
  });
  */
  ret.push({
    title: 'water',
    w : 350,
    h : 200,
    texture : waterPng,
    plane: 'ground',
    coord : { x : 1577, y : 968, z: 8 }
  });
  ret.push({
    title: 'pool top 1',
    w : 400,
    h : 25,
    backgroundColor : '#75d1f0',
    plane: 'ground',
    coord : { x : 1552, y : 943, z: 18 }
  });
  ret.push({
    title: 'pool top 2',
    w : 25,
    h : 201,
    backgroundColor : '#75d1f0',
    plane: 'ground',
    coord : { x : 1552, y : 968, z: 18 }
  });
  ret.push({
    title: 'pool top 3',
    w : 400,
    h : 25,
    backgroundColor : '#75d1f0',
    plane: 'ground',
    coord : { x : 1552, y : 1168, z: 18 }
  });
  ret.push({
    title: 'pool top 4',
    w : 25,
    h : 201,
    backgroundColor : '#75d1f0',
    plane: 'ground',
    coord : { x : 1927, y : 968, z: 18 }
  });
  ret.push({
    title: 'pool front outer 1',
    w : 400,
    h : 15,
    backgroundColor : '#30bae8',
    plane: 'front',
    coord : { x : 1552, y : 1193, z: 3 }
  });
  ret.push({
    title: 'pool front inner 1',
    w : 350,
    h : 10,
    backgroundColor : '#30bae8',
    plane: 'front',
    coord : { x : 1577, y : 1168, z: 8 }
  });
  ret.push({
    title: 'pool front outer 2',
    w : 400,
    h : 15,
    backgroundColor : '#30bae8',
    plane: 'front',
    coord : { x : 1552, y : 943, z: 3 }
  });
  ret.push({
    title: 'pool front inner 2',
    w : 350,
    h : 10,
    backgroundColor : '#30bae8',
    plane: 'front',
    coord : { x : 1577, y : 968, z: 8 }
  });
  ret.push({
    title: 'pool side outer 1',
    w : 250,
    h : 15,
    backgroundColor : '#148fb8',
    plane: 'side',
    coord : { x : 1552, y : 943, z: 3 }
  });
  ret.push({
    title: 'pool side inner 1',
    w : 200,
    h : 10,
    backgroundColor : '#148fb8',
    plane: 'side',
    coord : { x : 1577, y : 968, z: 8 }
  });
  ret.push({
    title: 'pool side outer 2',
    w : 250,
    h : 15,
    backgroundColor : '#148fb8',
    plane: 'side',
    coord : { x : 1952, y : 943, z: 3 }
  });
  ret.push({
    title: 'pool side inner 2',
    w : 200,
    h : 10,
    backgroundColor : '#148fb8',
    plane: 'side',
    coord : { x : 1927, y : 968, z: 8 }
  });


  // Other ==========================================
  ret.push({
    title: 'thujas',
    w : 520,
    h : 300,
    // backgroundColor : '#33cc66',
    texture: thujasPng,
    plane: 'front',
    coord : { x : 1602, y : 200, z: 0 }
  });
  ret.push({
    title: 'hut',
    w : 300,
    h : 300,
    backgroundColor : '#33cc66',
    plane: 'front',
    coord : { x : 1202, y : 518, z: 0 }
  });

  return ret;

}

const ret = {
  sceneGraph : getSceneGraph(),
  matrix35 : matrix35
};

export default ret;
