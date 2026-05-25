#!/usr/bin/env node
// Generates public/markers/waikikiAR.patt from the ar-menu-marker geometry.
// Uses pure BLACK (#000000) design for maximum contrast in any lighting.

const W  = 512;        // total marker image size (px)
const CS = W / 16;     // cell size = 32 px
const IS = 70;         // inner white area start (px)
const IE = 442;        // inner white area end  (70 + 372)

const BLACK = 0;
const WHITE = 255;

// ── Point-in-shape helpers ─────────────────────────────────────────
function inTri(px,py, ax,ay, bx,by, cx,cy) {
  const s1 = (px-cx)*(ay-cy) - (ax-cx)*(py-cy);
  const s2 = (px-ax)*(by-ay) - (bx-ax)*(py-ay);
  const s3 = (px-bx)*(cy-by) - (cx-bx)*(py-by);
  return (s1>=0&&s2>=0&&s3>=0) || (s1<=0&&s2<=0&&s3<=0);
}
function inRect(x,y, rx,ry, rw,rh) {
  return x>=rx && x<=rx+rw && y>=ry && y<=ry+rh;
}
function inCircle(x,y, cx,cy, r) {
  return Math.hypot(x-cx, y-cy) <= r;
}

// ── Sample the grayscale value at (x, y) in the original 512×512 marker ──
function sample(x, y) {
  // Anything outside the inner white area = black border
  if (x < IS || x > IE || y < IS || y > IE) return BLACK;

  // Cocktail bowl  (inverted triangle, top of glass)
  if (inTri(x,y, 148,100, 364,100, 256,210)) return BLACK;

  // Stem — widened to 34 px so it straddles two 32-px cell centres
  if (inRect(x,y, 239,210, 34,88)) return BLACK;

  // Base foot
  if (inRect(x,y, 176,298, 160,18)) return BLACK;

  // Cherry / olive circle + thin stick
  if (inCircle(x,y, 340,96, 14)) return BLACK;
  if (inRect(x,y, 338,76, 4,20)) return BLACK;

  // "AR MENU" text bounding box (font 48, baseline y=358)
  // cap-top ≈ y=318, extends to baseline y=358
  if (inRect(x,y, 136,318, 240,40)) return BLACK;

  // Decorative line under text
  if (inRect(x,y, 118,368, 276,5)) return BLACK;

  // Asymmetry dot (bottom-right — gives orientation to AR.js)
  if (inRect(x,y, 358,382, 20,20)) return BLACK;

  return WHITE;
}

// ── Build the 16×16 sample grid ────────────────────────────────────
function makeGrid() {
  const grid = [];
  for (let row = 0; row < 16; row++) {
    const r = [];
    for (let col = 0; col < 16; col++) {
      r.push(sample((col + 0.5) * CS, (row + 0.5) * CS));
    }
    grid.push(r);
  }
  return grid;
}

// Rotate 16×16 grid 90° clockwise
function rot90(g) {
  const n = g.length, out = [];
  for (let r = 0; r < n; r++) {
    const row = [];
    for (let c = 0; c < n; c++) row.push(g[n-1-c][r]);
    out.push(row);
  }
  return out;
}

// Format one row as right-aligned 3-char numbers separated by spaces
function fmtRow(row) {
  return row.map(v => String(v).padStart(3, ' ')).join(' ');
}

// ── Generate all 4 rotations ───────────────────────────────────────
const g0 = makeGrid();
const g1 = rot90(g0);
const g2 = rot90(g1);
const g3 = rot90(g2);

const lines = [];
// Each rotation: 3 identical 16-row blocks (G, B, R — all same for grayscale design)
[g0, g1, g2, g3].forEach((g, i) => {
  [g, g, g].forEach(ch => ch.forEach(row => lines.push(fmtRow(row))));
  lines.push('');
});

const fs   = require('fs');
const path = require('path');
const dest = path.join(__dirname, 'public', 'markers', 'waikikiAR.patt');
fs.writeFileSync(dest, lines.join('\n'));

console.log('Generated', dest);

// Quick sanity check — print the grid with █ for dark, · for white
console.log('\nPattern preview (rotation 0):');
g0.forEach(row => {
  console.log(row.map(v => v < 128 ? '█' : '·').join(''));
});
