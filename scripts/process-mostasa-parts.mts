/**
 * Convierte las fuentes RGBA de ImageGen en la entrega exacta del pliego.
 *
 * La etapa creativa vive en `assets/source/mostasa-parts/alpha`. Esta etapa es
 * deliberadamente determinista: ajusta cada silueta al lienzo oficial, aplica
 * el contorno de 13 px y reduce todos los colores a la paleta cerrada.
 *
 *   npm run arte:procesar
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  ASPHALT,
  ASPHALT_LIT,
  BONE,
  CLOTH_BLUE,
  CLOTH_BLUE_LIT,
  CLOTH_GREY,
  INK,
  INK_SOFT,
  MUSTARD,
  MUSTARD_DARK,
  MUSTARD_LIT,
  SKIN,
  SKIN_LIT,
  SKIN_SHADE,
  type Hex,
} from '../src/game/art/Palette';
import { AUTHORING_OUTLINE_PX, PART_SPECS } from '../src/game/art/PartSpec';

// @ts-expect-error — codec JS del repositorio, sin declaraciones de tipo.
import { decodePng, encodePng } from './png-lib.mjs';

interface Png {
  width: number;
  height: number;
  rgba: Uint8Array;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface PartConfig {
  palette: readonly Hex[];
  /** El torso se entrega pelvis→hombros: es la fuente normal invertida en Y. */
  flipY?: boolean;
  /** Limpia moteado de cuantización sin borrar detalle identitario fino. */
  colourSmoothingPasses?: number;
  /** Descarta islotes cromáticos menores que este tamaño. */
  minColourIslandPixels?: number;
}

const SOURCE_DIR = resolve('assets/source/mostasa-parts/alpha');
const OUTPUT_DIR = resolve('assets/entrega-mostasa');
const ALPHA_THRESHOLD = 24;
const FINAL_MARGIN_PX = 18;

/*
 * El trazo se reparte 6 px fuera y 7 px dentro de la silueta. La suma da los
 * 13 px que exige el pliego. Por eso la fuente se ubica 24 px del borde:
 * 24 - 6 = los 18 px de aire finales.
 */
const OUTER_OUTLINE_RADIUS = 6;
const INNER_OUTLINE_RADIUS = AUTHORING_OUTLINE_PX - OUTER_OUTLINE_RADIUS;
const SOURCE_INSET_PX = FINAL_MARGIN_PX + OUTER_OUTLINE_RADIUS;

if (AUTHORING_OUTLINE_PX !== 13) {
  throw new Error(
    `El procesador fue calibrado para 13 px de tinta; el pliego declara ${AUTHORING_OUTLINE_PX}.`,
  );
}

const CONFIG: Readonly<Record<string, PartConfig>> = {
  cabeza: {
    palette: [INK, INK_SOFT, SKIN, SKIN_LIT, SKIN_SHADE, BONE],
  },
  torso: {
    palette: [
      INK,
      INK_SOFT,
      MUSTARD,
      MUSTARD_LIT,
      MUSTARD_DARK,
      SKIN,
      SKIN_LIT,
      SKIN_SHADE,
      CLOTH_GREY,
    ],
    flipY: true,
    colourSmoothingPasses: 6,
    minColourIslandPixels: 12,
  },
  brazo: {
    palette: [INK, INK_SOFT, MUSTARD, MUSTARD_LIT, MUSTARD_DARK],
  },
  antebrazo: {
    palette: [INK, INK_SOFT, MUSTARD, MUSTARD_LIT, MUSTARD_DARK],
    colourSmoothingPasses: 1,
    minColourIslandPixels: 6,
  },
  mano: {
    palette: [INK, INK_SOFT, SKIN, SKIN_LIT, SKIN_SHADE],
  },
  muslo: {
    palette: [INK, INK_SOFT, CLOTH_BLUE, CLOTH_BLUE_LIT],
    colourSmoothingPasses: 2,
    minColourIslandPixels: 8,
  },
  pantorrilla: {
    palette: [INK, INK_SOFT, CLOTH_BLUE, CLOTH_BLUE_LIT],
    colourSmoothingPasses: 1,
    minColourIslandPixels: 6,
  },
  borcegui: {
    palette: [INK, INK_SOFT, ASPHALT, ASPHALT_LIT, CLOTH_GREY],
  },
};

function rgb(hex: Hex): readonly [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function nearestColour(r: number, g: number, b: number, palette: readonly Hex[]): Hex {
  let best = palette[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const colour of palette) {
    const [pr, pg, pb] = rgb(colour);
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const distance = dr * dr + dg * dg + db * db;
    if (distance < bestDistance) {
      best = colour;
      bestDistance = distance;
    }
  }
  return best;
}

function alphaBounds(png: Png): Bounds {
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const a = png.rgba[(y * png.width + x) * 4 + 3]!;
      if (a < ALPHA_THRESHOLD) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('la fuente no contiene píxeles opacos');
  return { minX, minY, maxX, maxY };
}

function samplePremultiplied(
  png: Png,
  x: number,
  y: number,
): readonly [number, number, number, number] {
  const x0 = Math.max(0, Math.min(png.width - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(png.height - 1, Math.floor(y)));
  const x1 = Math.min(png.width - 1, x0 + 1);
  const y1 = Math.min(png.height - 1, y0 + 1);
  const tx = Math.max(0, Math.min(1, x - x0));
  const ty = Math.max(0, Math.min(1, y - y0));
  const samples = [
    [x0, y0, (1 - tx) * (1 - ty)],
    [x1, y0, tx * (1 - ty)],
    [x0, y1, (1 - tx) * ty],
    [x1, y1, tx * ty],
  ] as const;

  let alpha = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const [sx, sy, weight] of samples) {
    const i = (sy * png.width + sx) * 4;
    const a = png.rgba[i + 3]! / 255;
    const weightedAlpha = a * weight;
    alpha += weightedAlpha;
    red += png.rgba[i]! * weightedAlpha;
    green += png.rgba[i + 1]! * weightedAlpha;
    blue += png.rgba[i + 2]! * weightedAlpha;
  }
  if (alpha <= 1e-6) return [0, 0, 0, 0];
  return [
    Math.round(red / alpha),
    Math.round(green / alpha),
    Math.round(blue / alpha),
    Math.round(alpha * 255),
  ];
}

/**
 * Muestreo de área 3×3. Las fuentes son mucho mayores que la entrega: tomar un
 * solo punto conserva ruido subpíxel de la generación y lo convierte en
 * salpicado al cuantizar. Promediar el área que ocupa cada píxel final elimina
 * ese ruido sin desenfocar el contorno, que se reconstruye después.
 */
function sampleAreaPremultiplied(
  png: Png,
  x: number,
  y: number,
  footprintX: number,
  footprintY: number,
): readonly [number, number, number, number] {
  let alpha = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const oy of [-0.3, 0, 0.3]) {
    for (const ox of [-0.3, 0, 0.3]) {
      const [r, g, b, aByte] = samplePremultiplied(
        png,
        x + ox * footprintX,
        y + oy * footprintY,
      );
      const a = aByte / 255;
      alpha += a;
      red += r * a;
      green += g * a;
      blue += b * a;
    }
  }
  if (alpha <= 1e-6) return [0, 0, 0, 0];
  return [
    Math.round(red / alpha),
    Math.round(green / alpha),
    Math.round(blue / alpha),
    Math.round((alpha / 9) * 255),
  ];
}

function maxFilter(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 0;
      for (let yy = Math.max(0, y - radius); yy <= Math.min(height - 1, y + radius); yy++) {
        for (let xx = Math.max(0, x - radius); xx <= Math.min(width - 1, x + radius); xx++) {
          value = Math.max(value, src[yy * width + xx]!);
          if (value === 255) break;
        }
        if (value === 255) break;
      }
      out[y * width + x] = value;
    }
  }
  return out;
}

function minFilter(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let value = 255;
      for (let yy = y - radius; yy <= y + radius; yy++) {
        for (let xx = x - radius; xx <= x + radius; xx++) {
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) {
            value = 0;
            break;
          }
          value = Math.min(value, src[yy * width + xx]!);
          if (value === 0) break;
        }
        if (value === 0) break;
      }
      out[y * width + x] = value;
    }
  }
  return out;
}

function modeFilterColours(
  src: Uint32Array,
  alpha: Uint8Array,
  width: number,
  height: number,
): Uint32Array {
  const out = new Uint32Array(src);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (alpha[i]! < ALPHA_THRESHOLD) continue;
      const counts = new Map<number, number>();
      for (let yy = y - 1; yy <= y + 1; yy++) {
        for (let xx = x - 1; xx <= x + 1; xx++) {
          const ni = yy * width + xx;
          if (alpha[ni]! < ALPHA_THRESHOLD) continue;
          const colour = src[ni]!;
          counts.set(colour, (counts.get(colour) ?? 0) + 1);
        }
      }
      let selected = src[i]!;
      let selectedCount = counts.get(selected) ?? 0;
      for (const [colour, count] of counts) {
        if (count > selectedCount) {
          selected = colour;
          selectedCount = count;
        }
      }
      out[i] = selected;
    }
  }
  return out;
}

function removeSmallColourIslands(
  src: Uint32Array,
  alpha: Uint8Array,
  width: number,
  height: number,
  minimumPixels: number,
): Uint32Array {
  const out = new Uint32Array(src);
  const visited = new Uint8Array(src.length);
  const neighbours4 = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const;

  for (let seed = 0; seed < src.length; seed++) {
    if (visited[seed] || alpha[seed]! < ALPHA_THRESHOLD) continue;
    const colour = src[seed]!;
    const component: number[] = [];
    const queue = [seed];
    visited[seed] = 1;

    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]!;
      component.push(current);
      const x = current % width;
      const y = Math.floor(current / width);
      for (const [dx, dy] of neighbours4) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const ni = ny * width + nx;
        if (
          visited[ni] ||
          alpha[ni]! < ALPHA_THRESHOLD ||
          src[ni]! !== colour
        ) {
          continue;
        }
        visited[ni] = 1;
        queue.push(ni);
      }
    }

    if (component.length >= minimumPixels) continue;
    const neighbourCounts = new Map<number, number>();
    for (const current of component) {
      const x = current % width;
      const y = Math.floor(current / width);
      for (let yy = Math.max(0, y - 1); yy <= Math.min(height - 1, y + 1); yy++) {
        for (let xx = Math.max(0, x - 1); xx <= Math.min(width - 1, x + 1); xx++) {
          const ni = yy * width + xx;
          if (alpha[ni]! < ALPHA_THRESHOLD || src[ni]! === colour) continue;
          const neighbour = src[ni]!;
          neighbourCounts.set(neighbour, (neighbourCounts.get(neighbour) ?? 0) + 1);
        }
      }
    }
    let replacement = colour;
    let replacementCount = 0;
    for (const [candidate, count] of neighbourCounts) {
      if (count > replacementCount) {
        replacement = candidate;
        replacementCount = count;
      }
    }
    if (replacement !== colour) {
      for (const current of component) out[current] = replacement;
    }
  }
  return out;
}

function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

function processPart(
  spec: (typeof PART_SPECS)[number],
  config: PartConfig,
): {
  id: string;
  source: string;
  output: string;
  canvas: readonly [number, number];
  pivot: readonly [number, number];
  child: readonly [number, number] | null;
  opaqueBounds: readonly [number, number, number, number];
  colours: string[];
  sourceSha256: string;
  outputSha256: string;
} {
  const sourcePath = join(SOURCE_DIR, `${spec.id}.png`);
  if (!existsSync(sourcePath)) throw new Error(`falta la fuente ${sourcePath}`);

  const sourceBytes = readFileSync(sourcePath);
  const source = decodePng(sourceBytes) as Png;
  const bounds = alphaBounds(source);
  const width = spec.canvasW;
  const height = spec.canvasH;
  const innerW = width - SOURCE_INSET_PX * 2;
  const innerH = height - SOURCE_INSET_PX * 2;
  if (innerW <= 0 || innerH <= 0) throw new Error(`lienzo inválido para ${spec.id}`);

  const baseAlpha = new Uint8Array(width * height);
  let baseColour = new Uint32Array(width * height);
  const sourceW = bounds.maxX - bounds.minX + 1;
  const sourceH = bounds.maxY - bounds.minY + 1;
  const footprintX = sourceW / innerW;
  const footprintY = sourceH / innerH;

  for (let dy = 0; dy < innerH; dy++) {
    const v = innerH === 1 ? 0.5 : dy / (innerH - 1);
    const sourceV = config.flipY ? 1 - v : v;
    const sy = bounds.minY + sourceV * (sourceH - 1);
    for (let dx = 0; dx < innerW; dx++) {
      const u = innerW === 1 ? 0.5 : dx / (innerW - 1);
      const sx = bounds.minX + u * (sourceW - 1);
      const [r, g, b, a] = sampleAreaPremultiplied(
        source,
        sx,
        sy,
        footprintX,
        footprintY,
      );
      if (a === 0) continue;
      const x = SOURCE_INSET_PX + dx;
      const y = SOURCE_INSET_PX + dy;
      const i = y * width + x;
      baseAlpha[i] = a;
      baseColour[i] = nearestColour(r, g, b, config.palette);
    }
  }

  for (let pass = 0; pass < (config.colourSmoothingPasses ?? 0); pass++) {
    baseColour = modeFilterColours(baseColour, baseAlpha, width, height);
  }
  if (config.minColourIslandPixels) {
    baseColour = removeSmallColourIslands(
      baseColour,
      baseAlpha,
      width,
      height,
      config.minColourIslandPixels,
    );
  }

  const outer = maxFilter(baseAlpha, width, height, OUTER_OUTLINE_RADIUS);
  const inner = minFilter(baseAlpha, width, height, INNER_OUTLINE_RADIUS);
  const out = new Uint8Array(width * height * 4);
  const usedColours = new Set<number>();
  const [inkR, inkG, inkB] = rgb(INK);

  for (let i = 0; i < width * height; i++) {
    const a = outer[i]!;
    if (a === 0) continue;
    let colour = INK;
    if (inner[i]! >= ALPHA_THRESHOLD && baseAlpha[i]! >= ALPHA_THRESHOLD) {
      colour = baseColour[i]!;
    }
    const [r, g, b] = colour === INK ? [inkR, inkG, inkB] : rgb(colour);
    out[i * 4] = r;
    out[i * 4 + 1] = g;
    out[i * 4 + 2] = b;
    out[i * 4 + 3] = a;
    if (a >= ALPHA_THRESHOLD) usedColours.add(colour);
  }

  const finalPng: Png = { width, height, rgba: out };
  const finalBounds = alphaBounds(finalPng);
  const encoded = encodePng(width, height, out) as Uint8Array;
  const outputPath = join(OUTPUT_DIR, `${spec.id}.png`);
  writeFileSync(outputPath, encoded);

  return {
    id: spec.id,
    source: `assets/source/mostasa-parts/alpha/${spec.id}.png`,
    output: `assets/entrega-mostasa/${spec.id}.png`,
    canvas: [width, height],
    pivot: [spec.pivotX, spec.pivotY],
    child:
      spec.childX === null || spec.childY === null ? null : [spec.childX, spec.childY],
    opaqueBounds: [finalBounds.minX, finalBounds.minY, finalBounds.maxX, finalBounds.maxY],
    colours: [...usedColours].sort((a, b) => a - b).map((c) => `#${c.toString(16).padStart(6, '0')}`),
    sourceSha256: sha256(sourceBytes),
    outputSha256: sha256(encoded),
  };
}

mkdirSync(OUTPUT_DIR, { recursive: true });
const entries = PART_SPECS.map((spec) => {
  const config = CONFIG[spec.id];
  if (!config) throw new Error(`falta configuración para ${spec.id}`);
  const entry = processPart(spec, config);
  console.log(
    `OK ${spec.id.padEnd(11)} ${entry.canvas[0]}×${entry.canvas[1]} ` +
      `bbox ${entry.opaqueBounds.join(',')} · ${entry.colours.length} colores`,
  );
  return entry;
});

const manifest = {
  schemaVersion: 1,
  artBrief: 'docs/PLIEGO-DE-ARTE.md',
  pipeline: 'scripts/process-mostasa-parts.mts',
  authoringPixelsPerMetre: 600,
  outlinePx: AUTHORING_OUTLINE_PX,
  minimumTransparentMarginPx: FINAL_MARGIN_PX,
  entries,
};
writeFileSync(join(OUTPUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`\nEntrega escrita en ${OUTPUT_DIR}`);
