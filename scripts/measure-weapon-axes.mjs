/**
 * Measures the principal axis of every weapon's opaque silhouette.
 *
 * Held weapons are rotated from "where the art puts the long axis" to "where
 * the hand should hold it" (see src/game/data/WeaponPose.ts). That only works
 * if the art's axis is measured rather than guessed, so this prints the values
 * to paste into WEAPON_POSES. Re-run it whenever a weapon PNG is replaced.
 *
 *   node scripts/measure-weapon-axes.mjs
 *
 * Angles are degrees, 0 = horizontal, positive = descending to the right.
 * `elongation` is the ratio of major to minor axis: above ~2 the silhouette
 * reads as a rod and is worth re-orienting.
 */

import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { decodePng } from './png-lib.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'assets', 'weapons');
const ALPHA_MIN = 40;

/** Second-moment principal axis of the opaque pixels. */
function measure(file) {
  const { width, height, rgba } = decodePng(readFileSync(join(DIR, file)));
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] > ALPHA_MIN) { n++; sx += x; sy += y; }
    }
  }
  if (n === 0) return null;
  const mx = sx / n, my = sy / n;
  let xx = 0, yy = 0, xy = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] <= ALPHA_MIN) continue;
      const dx = x - mx, dy = y - my;
      xx += dx * dx; yy += dy * dy; xy += dx * dy;
    }
  }
  xx /= n; yy /= n; xy /= n;
  const axisDeg = (0.5 * Math.atan2(2 * xy, xx - yy) * 180) / Math.PI;
  const mid = (xx + yy) / 2;
  const spread = Math.sqrt(((xx - yy) / 2) ** 2 + xy * xy);
  const elongation = Math.sqrt((mid + spread) / Math.max(1e-6, mid - spread));
  return { axisDeg, elongation };
}

console.log('Measured weapon axes (paste into WEAPON_POSES):\n');
for (const file of readdirSync(DIR).filter((f) => f.endsWith('.png')).sort()) {
  const m = measure(file);
  if (!m) continue;
  const id = file.replace(/\.png$/, '');
  const rod = m.elongation >= 2 ? 'rod    ' : 'compact';
  console.log(
    `  ${id.padEnd(20)} axis ${m.axisDeg.toFixed(1).padStart(6)}°  ` +
    `elongation ${m.elongation.toFixed(2).padStart(5)}  ${rod}`,
  );
}
