/**
 * Sprite sheet normalizer for MOSTASA'S RAGE.
 *
 * The uploaded character sheets are NOT aligned to the fixed 140px grid the
 * game assumed: each art row holds ~9-14 figures at irregular positions and
 * row bands have irregular heights. Slicing on a fixed grid produced cut-off
 * bodies and slivers of neighbouring frames — the "broken sprites" bug.
 *
 * This tool re-slices the keyed sheets and repacks them into a clean grid:
 *   1. find figures as connected components (5×5 neighbourhood bridges
 *      anti-aliasing gaps, so a figure is one blob);
 *   2. re-attach small orphan blobs (an extended fist, a shoe) to the
 *      nearest figure instead of letting them become bogus frames;
 *   3. cluster figures into animation rows by vertical centre;
 *   4. repack every figure bottom-centre into uniform cells, cycling frames
 *      to fill every column so any clip length lands on real art.
 *
 * Input : public/assets/characters/{id}.png  (keyed output of sprites:process)
 * Output: public/assets/characters/{id}.png  (normalized, overwritten)
 * Prints a TS-ready CHARACTER_GRIDS snippet plus per-row frame counts.
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { decodePng, encodePng } from './png-lib.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const DIR = join(ROOT, 'public', 'assets', 'characters');

const SHEETS = [
  'mostasa',
  'enemy_001', 'enemy_002', 'enemy_003', 'enemy_004', 'enemy_005',
  'enemy_006', 'enemy_007', 'enemy_008', 'enemy_009', 'enemy_010',
];

const ALPHA_MIN = 40;   // pixel counts as content above this alpha
const BRIDGE = 2;       // components connect across gaps up to this many px
const MIN_KEEP_AREA = 140;   // blobs smaller than this are noise, dropped
const ATTACH_DIST = 52;      // orphan blobs attach to a figure within this
const PAD_X = 8;
const PAD_TOP = 4;
const PAD_BOTTOM = 3;   // feet anchored this close to the cell bottom

function idx(x, y, width) { return (y * width + x) * 4; }

/** Connected components over the opacity mask with small-gap bridging. */
function findComponents(width, height, rgba) {
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) mask[i] = rgba[i * 4 + 3] > ALPHA_MIN ? 1 : 0;

  const labels = new Int32Array(width * height).fill(-1);
  const comps = [];
  const stack = [];

  for (let start = 0; start < width * height; start++) {
    if (mask[start] === 0 || labels[start] !== -1) continue;
    const label = comps.length;
    const comp = { x0: width, y0: height, x1: 0, y1: 0, area: 0, pixels: [] };
    stack.length = 0;
    stack.push(start);
    labels[start] = label;
    while (stack.length > 0) {
      const p = stack.pop();
      const px = p % width, py = (p / width) | 0;
      comp.area++;
      comp.pixels.push(p);
      if (px < comp.x0) comp.x0 = px;
      if (px > comp.x1) comp.x1 = px;
      if (py < comp.y0) comp.y0 = py;
      if (py > comp.y1) comp.y1 = py;
      for (let dy = -BRIDGE - 1; dy <= BRIDGE + 1; dy++) {
        const ny = py + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -BRIDGE - 1; dx <= BRIDGE + 1; dx++) {
          const nx = px + dx;
          if (nx < 0 || nx >= width) continue;
          const np = ny * width + nx;
          if (mask[np] === 1 && labels[np] === -1) {
            labels[np] = label;
            stack.push(np);
          }
        }
      }
    }
    comps.push(comp);
  }
  return comps;
}

/** Distance between two bboxes (0 when overlapping). */
function bboxDist(a, b) {
  const dx = Math.max(0, Math.max(a.x0, b.x0) - Math.min(a.x1, b.x1));
  const dy = Math.max(0, Math.max(a.y0, b.y0) - Math.min(a.y1, b.y1));
  return Math.max(dx, dy);
}

/**
 * A component much taller than the median is two vertically-touching figures
 * from adjacent animation rows (their pixels bridged the gutter). Split it at
 * the thinnest horizontal seam and recurse.
 */
function splitTallComponents(comps, width) {
  const heights = comps.map((c) => c.y1 - c.y0 + 1).sort((a, b) => a - b);
  const medianH = heights[Math.floor(heights.length / 2)] ?? 0;
  if (medianH === 0) return comps;
  const limit = medianH * 1.55;

  const out = [];
  const queue = [...comps];
  while (queue.length > 0) {
    const c = queue.shift();
    const h = c.y1 - c.y0 + 1;
    if (h <= limit) { out.push(c); continue; }
    // occupancy per pixel-row inside the component
    const profile = new Map();
    for (const p of c.pixels) {
      const py = (p / width) | 0;
      profile.set(py, (profile.get(py) ?? 0) + 1);
    }
    let best = -1, bestVal = Infinity;
    const from = c.y0 + Math.floor(h * 0.25), to = c.y1 - Math.floor(h * 0.25);
    for (let y = from; y <= to; y++) {
      const v = profile.get(y) ?? 0;
      if (v < bestVal) { bestVal = v; best = y; }
    }
    if (best < 0) { out.push(c); continue; }
    const top = { x0: c.x1, y0: c.y1, x1: c.x0, y1: c.y0, area: 0, pixels: [] };
    const bottom = { x0: c.x1, y0: c.y1, x1: c.x0, y1: c.y0, area: 0, pixels: [] };
    for (const p of c.pixels) {
      const px = p % width, py = (p / width) | 0;
      const t = py <= best ? top : bottom;
      t.pixels.push(p);
      t.area++;
      if (px < t.x0) t.x0 = px;
      if (px > t.x1) t.x1 = px;
      if (py < t.y0) t.y0 = py;
      if (py > t.y1) t.y1 = py;
    }
    if (top.area > 0 && bottom.area > 0 && top.y1 - top.y0 > 10 && bottom.y1 - bottom.y0 > 10) {
      queue.push(top, bottom);
    } else {
      out.push(c);
    }
  }
  return out;
}

function normalizeSheet(id) {
  const path = join(DIR, `${id}.png`);
  const { width, height, rgba } = decodePng(readFileSync(path));

  let comps = findComponents(width, height, rgba).filter((c) => c.area >= MIN_KEEP_AREA);
  if (comps.length === 0) throw new Error('no content found');
  comps = splitTallComponents(comps, width);

  // Figures vs fragments: a figure has a substantial share of the median area.
  const areas = comps.map((c) => c.area).sort((a, b) => a - b);
  const medianArea = areas[Math.floor(areas.length / 2)];
  const figures = comps.filter((c) => c.area >= medianArea * 0.28);
  const fragments = comps.filter((c) => c.area < medianArea * 0.28);

  // Re-attach fragments (fists, shoes, hair) to the nearest figure.
  let attached = 0, dropped = 0;
  for (const f of fragments) {
    let best = null, bestDist = Infinity;
    for (const fig of figures) {
      const d = bboxDist(f, fig);
      if (d < bestDist) { bestDist = d; best = fig; }
    }
    if (best && bestDist <= ATTACH_DIST) {
      best.pixels.push(...f.pixels);
      best.area += f.area;
      best.x0 = Math.min(best.x0, f.x0); best.x1 = Math.max(best.x1, f.x1);
      best.y0 = Math.min(best.y0, f.y0); best.y1 = Math.max(best.y1, f.y1);
      attached++;
    } else {
      dropped++;
    }
  }

  // Cluster figures into animation rows by vertical centre.
  const withCentre = figures.map((c) => ({ ...c, cy: (c.y0 + c.y1) / 2 }));
  withCentre.sort((a, b) => a.cy - b.cy);
  const medianH = [...figures].map((c) => c.y1 - c.y0 + 1).sort((a, b) => a - b)[
    Math.floor(figures.length / 2)
  ];
  const rowsOfFigures = [];
  for (const c of withCentre) {
    const row = rowsOfFigures[rowsOfFigures.length - 1];
    if (row && Math.abs(c.cy - row.meanCy) <= medianH * 0.55) {
      row.figures.push(c);
      row.meanCy = row.figures.reduce((s, f) => s + f.cy, 0) / row.figures.length;
    } else {
      rowsOfFigures.push({ figures: [c], meanCy: c.cy });
    }
  }
  for (const row of rowsOfFigures) row.figures.sort((a, b) => a.x0 - b.x0);

  // Uniform cell size across the sheet.
  let maxW = 0, maxH = 0, maxCols = 0;
  for (const row of rowsOfFigures) {
    maxCols = Math.max(maxCols, row.figures.length);
    for (const f of row.figures) {
      maxW = Math.max(maxW, f.x1 - f.x0 + 1);
      maxH = Math.max(maxH, f.y1 - f.y0 + 1);
    }
  }
  const cellW = Math.ceil((maxW + PAD_X) / 2) * 2;
  const cellH = Math.ceil((maxH + PAD_TOP + PAD_BOTTOM) / 2) * 2;
  const rows = rowsOfFigures.length;
  const cols = maxCols;

  // Repack bottom-centre, cycling each row's frames to fill all columns.
  const outW = cols * cellW, outH = rows * cellH;
  const out = new Uint8Array(outW * outH * 4);
  for (let r = 0; r < rows; r++) {
    const figs = rowsOfFigures[r].figures;
    for (let c = 0; c < cols; c++) {
      const f = figs[c % figs.length];
      const fh = f.y1 - f.y0 + 1;
      const fw = f.x1 - f.x0 + 1;
      const baseX = c * cellW + Math.floor((cellW - fw) / 2) - f.x0;
      const baseY = r * cellH + (cellH - PAD_BOTTOM - fh) - f.y0;
      for (const p of f.pixels) {
        const px = p % width, py = (p / width) | 0;
        const si = idx(px, py, width);
        const dx = baseX + px, dy = baseY + py;
        const di = idx(dx, dy, outW);
        out[di] = rgba[si]; out[di + 1] = rgba[si + 1];
        out[di + 2] = rgba[si + 2]; out[di + 3] = rgba[si + 3];
      }
    }
  }

  writeFileSync(path, encodePng(outW, outH, out));
  return {
    id, cellW, cellH, cols, rows, attached, dropped,
    framesPerRow: rowsOfFigures.map((r) => r.figures.length),
  };
}

console.log('Normalizing character sheets (connected components + repack)…\n');
const results = [];
for (const id of SHEETS) {
  try {
    const r = normalizeSheet(id);
    results.push(r);
    console.log(
      `  ✓ ${r.id.padEnd(10)} → ${r.cols}×${r.rows} cells of ${r.cellW}×${r.cellH}` +
      `  (+${r.attached} attached, -${r.dropped} dropped)  frames/row: [${r.framesPerRow.join(', ')}]`,
    );
  } catch (e) {
    console.log(`  ✗ ${id}: ${e.message}`);
  }
}

console.log('\nCHARACTER_GRIDS snippet:\n');
for (const r of results) {
  console.log(
    `  ${r.id}: { frameWidth: ${r.cellW}, frameHeight: ${r.cellH}, cols: ${r.cols}, rows: ${r.rows} },`,
  );
}
