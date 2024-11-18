'use strict';

// See see https://en.wikipedia.org/wiki/Piano_key_frequencies

/**
 * Create 88 key layout.
 *
 * @param w    Area width in pixels
 * @param h    Area height in pixels
 * @param spaceForExtended keep space around for extended 108 key piano keys (but still render 88 keys)
 */
export function layout88keys(w, h, spaceForExtended) {
  var whiteKeyCount = 52;
  var whiteKeyWidth = Math.floor((w - 1) / (spaceForExtended ? whiteKeyCount + 12 : whiteKeyCount));
  var blackKeyWidth = Math.floor(whiteKeyWidth / 2);
  if (blackKeyWidth % 2 === 0) {
    blackKeyWidth = blackKeyWidth + 1;
  }
  var whiteKeyHeight = whiteKeyWidth * 3;
  if (h < whiteKeyHeight * 3) {
    whiteKeyHeight = Math.round(h / 3);
  }
  const key0x = Math.floor((w - whiteKeyWidth * whiteKeyCount - 1) / 2);
  const ret = {
    whiteKeyCount : whiteKeyCount,
    whiteKeyWidth : whiteKeyWidth,
    blackKeyWidth : blackKeyWidth,
    whiteKeyHeight : whiteKeyHeight,
    blackKeyHeight : Math.round(whiteKeyHeight / 2),
    keyAreaHeight : whiteKeyHeight + 15,
    key0x : key0x,
    lastx : key0x + whiteKeyCount * whiteKeyWidth,
    cw : w,
    ch : h,

    firstKeyNote : 5, // 0-based 7 note index 0..6 for C..B(aka H)
    firstKeyOctave : 0 // first (partial) octave on a 88 key piano is 0
  };
  return ret;
}

export function renderKeys(k, canvas2d) {
  canvas2d.fillStyle = 'black';
  canvas2d.fillRect(
      k.key0x, 0,
      k.whiteKeyWidth * k.whiteKeyCount + 1, k.whiteKeyHeight
  );

  canvas2d.fillStyle = 'white';

  for (var i = 0; i < k.whiteKeyCount; i++) {
    canvas2d.fillRect(
        k.key0x + 1 + i * k.whiteKeyWidth, 0,
        k.whiteKeyWidth - 1, k.whiteKeyHeight - 1
    );
  }

  canvas2d.fillStyle = 'black';
  for (var i = 0; i < k.whiteKeyCount - 1; i++) {
    const note = (k.firstKeyNote + i) % 7;
    if (note === 2 || note === 6) {
      continue;
    }

    // plot black key for this white key
    canvas2d.fillRect(
        k.key0x + (1 + i) * k.whiteKeyWidth - (k.blackKeyWidth - 1) / 2, 0,
        k.blackKeyWidth, k.blackKeyHeight
    );
  }
}

export function renderGrid(k, h, canvas2d) {
  canvas2d.fillStyle = '#ddd';
  canvas2d.font = "14px monospace";

  for (var i = 0; i <= k.whiteKeyCount; i++) {
    const note = (k.firstKeyNote + i) % 7;
    const octave = Math.floor((k.firstKeyNote + i) / 7) + k.firstKeyOctave;
    const gh = h + 15; //  k.ch - k.whiteKeyHeight - 15;
    const x0 = k.key0x + i * k.whiteKeyWidth;
    if (note === 0) {
      canvas2d.fillStyle = '#bbb';
      canvas2d.fillText(octave, x0 + 4, 15 + k.whiteKeyHeight);
      canvas2d.fillStyle = '#ddd';
    }

    canvas2d.fillRect(
      note === 0 ? x0 - 1 : x0,
      k.whiteKeyHeight,
      note === 0 ? 3 : 1,
      gh
    );
  }

  canvas2d.fillStyle = '#bbb';
  var firstDrawn = false;
  for (var d = 10; d <= 10000; d = d * 10) {
    for (var b = 1; b <= 9; b++) {
      const f = d * b;
      const x = f2x(k, f);
      if (x < 0 /* k.key0x */) {
        continue;
      }
      if (x >= k.cw /* k.lastx */) {
        return;
      }
      if (!firstDrawn || b === 1) {
        firstDrawn = true;
        const l = f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`;
        canvas2d.fillText(l, x + 6, k.ch - 2);
      }
      canvas2d.fillRect(
        b === 1 ? x - 1 : x,
        k.ch - 15,
        b === 1 ? 3 : 1,
        15
      );
    }
  }
}

/** Frequency of a 88-key piano key (1-based index). */
export function key2f(key) {
  return Math.pow(2, (key - 49) / 12) * 440;
}

/** Screen X coordinate of a 88-key piano key (1-based index). */
export function key2x(k, n) {
  // on 88 key piano
  const pianoOctave = Math.floor((n + 8) / 12);

  // 12 key based note (0..11) for (C..B aka H) on piano
  const note = n + 8 - 12 * pianoOctave;

  // 7-based white key offset within the octave on piano, 0-based
  var pianoWko;
  if (note < 5) {
    pianoWko = Math.floor(note / 2);
  } else  {
    pianoWko = Math.ceil(note / 2);
  }

  // 0.5 for black key
  var bko = 0;
  if (note < 5 && note % 2 === 1) {
    bko = 0.5;
  } else if (note > 5 && note % 2 === 0) {
    bko = 0.5;
  }

  const screenOctave = pianoOctave - k.firstKeyOctave;

  const x = k.key0x + (screenOctave * 7 + pianoWko - k.firstKeyNote + bko + 0.5) * k.whiteKeyWidth;
  return x;
}

// Interpolated screen X coordinate of a frequency
export function f2x(k, f) {
  // key number on a 88-key piano; 1-based
  //
  //          |   ###   |   ###  ###   |   ###  ###  ###   |
  //          |   ###   |   ###  ###   |   ###  ###  ###   |
  //          |   ###   |   ###  ###   |   ###  ###  ###   |
  //          |    |    |    |    |    |    |    |    |    |
  //          |    |    |    |    |    |    |    |    |    |
  //          +----+----+----+----+----+----+----+----+----+--
  // key n:     1  2  3 |  4 5  6 7  8    9 10 11 ....     |
  // note12:    9  10 11|  0 1  2 3  4    5 6  7 8  9 10 11|
  // wko:       5     6 |  0    1    2    3    4    5    6 |
  // ovtave:  ---- 0 -->|<-------------- 1 --------------->|
  // note:      A     B |  C    D    E    F    G    A    B

  const n = 12 * Math.log2(f / 440) + 49; // A440 / A4 is key 49

  const n0 = Math.floor(n);
  const n1 = Math.ceil(n);

  if (n0 === n1) {
    // hit note
    return key2x(k, n0);
  }

  // need interpolation
  const x0 = key2x(k, n0);
  const x1 = key2x(k, n1);
  const f0 = key2f(n0);
  const f1 = key2f(n1);
  return Math.round(x0 + (x1 - x0) * (f - f0) / (f1 - f0));
}

export function layoutFftBins(keys, binCount, maxf) {
  const ret = {
    wideBarCount : 0,
    wideBarBinIndex : [],
    wideBarX : [],
    narrowBarCount : 0,
    narrowBarX : [],
    narrowBarFirstBin : [],
    narrowBarLastBin : []
  };

  const binWidth = maxf / binCount;
  const halfBinWidth = binWidth / 2;



  var x0 = 0; // Math.round(f2x(keys, halfBinWidth));
  var wideBars = true;
  for (var bin = 0; bin < binCount; bin++) {
    const centerFreq = bin * binWidth;
    const upperFreq = centerFreq + halfBinWidth;
    const x1 = Math.round(f2x(keys, upperFreq));

    if (x1 < 0) {
      // outside screen
      x0 = x1;
      continue;
    }

    if (x0 >= keys.cw) {
      // outside screen
      break;
    }

    if (wideBars) {
      if (ret.wideBarCount === 0) {
        ret.wideBarX[0] = Math.max(0, x0);
      }

      if (x1 - x0 > 1) {
        // wide bin
        ret.wideBarX.push(x1);
        ret.wideBarBinIndex.push(bin);
        ret.wideBarCount++;
      } else {
        wideBars = false;
      }
    }
    if (!wideBars) { // might be set in the previous if; cannot be an else branch
      if (ret.narrowBarCount == 0 || x1 > ret.narrowBarX[ret.narrowBarCount - 1]) {
        // first narrow bar or new X coordinate
        ret.narrowBarX.push(x1);
        ret.narrowBarFirstBin.push(bin);
        ret.narrowBarLastBin.push(bin);
        ret.narrowBarCount++;
      } else {
        // add to the previous
        ret.narrowBarLastBin[ret.narrowBarCount - 1] = bin;
      }
    }

    x0 = x1;
  }


  return ret;
}

export function renderWfallLine(keys, y, bars, buffer, min, max, aToColor, displayedBinCount, canvas2d) {
  for (var i = 0; i < bars.wideBarCount; i++) {
    const bin = bars.wideBarBinIndex[i];
    if (displayedBinCount && displayedBinCount <= bin) {
      return;
    }
    var a = (buffer[bin] - min) / (max - min);
    canvas2d.fillStyle = aToColor(a);
    canvas2d.fillRect(bars.wideBarX[i], y, bars.wideBarX[i + 1] - bars.wideBarX[i], 1);
  }
  var nextX = bars.wideBarCount ? bars.wideBarX[bars.wideBarCount] : 0;
  for (var i = 0; i < bars.narrowBarCount; i++) {
    const x = bars.narrowBarX[i];
    const firstBin = bars.narrowBarFirstBin[i];
    const lastBin = bars.narrowBarLastBin[i]; // inclusive

    if (displayedBinCount && displayedBinCount <= firstBin) {
      return;
    }

    var maxa = 0;

    for (var bin = firstBin; bin <= lastBin; bin++) {
      var a = (buffer[bin] - min) / (max - min);
      maxa = Math.max(a, maxa);
    }
    canvas2d.fillStyle = aToColor(maxa);

    canvas2d.fillRect(nextX, y, x - nextX + 1, 1);
    nextX = x + 1;
  }

}

export function renderBins(keys, y0, y1, ah, bars, buffer, min, max, displayedBinCount, canvas2d) {
  canvas2d.fillStyle = 'steelblue';
  for (var i = 0; i < bars.wideBarCount; i++) {
    const bin = bars.wideBarBinIndex[i];
    if (displayedBinCount && displayedBinCount <= bin) {
      return;
    }
    var h = Math.round(ah * (buffer[bin] - min) / (max - min));
    if (h < 1) {
      h = 1;
    }
    canvas2d.fillRect(bars.wideBarX[i], y1 - h, bars.wideBarX[i + 1] - bars.wideBarX[i], h);
  }
  var nextX = bars.wideBarCount ? bars.wideBarX[bars.wideBarCount] : 0;
  for (var i = 0; i < bars.narrowBarCount; i++) {
    const x = bars.narrowBarX[i];
    const firstBin = bars.narrowBarFirstBin[i];
    const lastBin = bars.narrowBarLastBin[i]; // inclusive

    if (displayedBinCount && displayedBinCount <= firstBin) {
      return;
    }

    var maxh = 1;

    for (var bin = firstBin; bin <= lastBin; bin++) {
      var h = Math.round(ah * (buffer[bin] - min) / (max - min));
      maxh = Math.max(h, maxh);
    }

    canvas2d.fillRect(nextX, y1 - maxh, x - nextX + 1, maxh);
    nextX = x + 1;
  }
}
