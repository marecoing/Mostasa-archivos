/**
 * Valida una entrega de piezas de personaje contra el pliego.
 *
 *   npm run arte:validar -- assets/entrega-mostasa
 *
 * Ésta es la puerta que antes no existía. Hasta ahora el arte entraba al juego
 * como viniera y los defectos se compensaban después desde el código, con
 * multiplicadores y anclajes a ojo — que es exactamente la causa de raíz R-3.
 * Acá lo que no cumple se rechaza antes de entrar.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { CLOSED_PALETTE } from '../src/game/art/Palette';
import { AUTHORING_PPM, MARGIN_M, PART_SPECS } from '../src/game/art/PartSpec';

// @ts-expect-error — utilidad JS existente del repo, sin tipos.
import { decodePng } from './png-lib.mjs';

interface Png {
  width: number;
  height: number;
  rgba: Uint8Array;
}

const MARGIN_PX = Math.round(MARGIN_M * AUTHORING_PPM);
/** Tolerancia por canal al comparar contra la paleta cerrada. */
const COLOUR_TOLERANCE = 26;
/** Un píxel cuenta como opaco a partir de acá. */
const ALPHA_THRESHOLD = 24;

const PALETTE_RGB = CLOSED_PALETTE.map((c) => [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff]);

function nearPalette(r: number, g: number, b: number): boolean {
  return PALETTE_RGB.some(
    ([pr, pg, pb]) =>
      Math.abs(r - pr!) <= COLOUR_TOLERANCE &&
      Math.abs(g - pg!) <= COLOUR_TOLERANCE &&
      Math.abs(b - pb!) <= COLOUR_TOLERANCE,
  );
}

interface Report {
  part: string;
  errors: string[];
  warnings: string[];
}

function hasOpaqueNear(
  png: Png,
  anchorX: number,
  anchorY: number,
  radius = 5,
): boolean {
  for (let y = Math.max(0, anchorY - radius); y <= Math.min(png.height - 1, anchorY + radius); y++) {
    for (let x = Math.max(0, anchorX - radius); x <= Math.min(png.width - 1, anchorX + radius); x++) {
      if (png.rgba[(y * png.width + x) * 4 + 3]! >= ALPHA_THRESHOLD) return true;
    }
  }
  return false;
}

function checkPart(dir: string, spec: (typeof PART_SPECS)[number]): Report {
  const errors: string[] = [];
  const warnings: string[] = [];
  const file = join(dir, `${spec.id}.png`);

  if (!existsSync(file)) {
    return { part: spec.id, errors: [`falta el archivo ${spec.id}.png`], warnings };
  }

  let png: Png;
  try {
    png = decodePng(readFileSync(file)) as Png;
  } catch (e) {
    return { part: spec.id, errors: [`no se pudo leer el PNG: ${String(e)}`], warnings };
  }

  if (png.width !== spec.canvasW || png.height !== spec.canvasH) {
    errors.push(
      `lienzo ${png.width}×${png.height}, el pliego pide ${spec.canvasW}×${spec.canvasH}`,
    );
  }

  const { width, height, rgba } = png;
  let opaque = 0;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  let offPalette = 0;
  let fullyOpaqueAlpha = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const a = rgba[i + 3]!;
      if (a >= 255) fullyOpaqueAlpha++;
      if (a < ALPHA_THRESHOLD) continue;
      opaque++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (!nearPalette(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!)) offPalette++;
    }
  }

  const total = width * height;
  if (opaque === 0) {
    errors.push('la imagen está completamente vacía');
    return { part: spec.id, errors, warnings };
  }

  if (fullyOpaqueAlpha === total) {
    errors.push('el PNG no tiene transparencia: el fondo está relleno');
  }

  if (opaque / total < 0.04) {
    errors.push(
      `casi no hay dibujo: sólo ${((opaque / total) * 100).toFixed(1)} % del lienzo es opaco`,
    );
  }

  const gaps = {
    izquierda: minX,
    derecha: width - 1 - maxX,
    arriba: minY,
    abajo: height - 1 - maxY,
  };
  for (const [side, gap] of Object.entries(gaps)) {
    if (gap < MARGIN_PX) {
      errors.push(
        `el dibujo queda a ${gap} px del borde ${side}; el pliego exige ${MARGIN_PX} px de aire`,
      );
    }
  }

  if (spec.pivotX >= width || spec.pivotY >= height || spec.pivotX < 0 || spec.pivotY < 0) {
    errors.push(`el pivote (${spec.pivotX}, ${spec.pivotY}) cae fuera del lienzo`);
  } else if (!hasOpaqueNear(png, spec.pivotX, spec.pivotY)) {
    errors.push(`el dibujo no cubre el pivote (${spec.pivotX}, ${spec.pivotY})`);
  }

  if (
    spec.childX !== null &&
    spec.childY !== null &&
    !hasOpaqueNear(png, spec.childX, spec.childY)
  ) {
    errors.push(`el dibujo no cubre la articulación hija (${spec.childX}, ${spec.childY})`);
  }

  if (spec.id === 'mano' || spec.id === 'borcegui') {
    const expectedEndOffset =
      spec.id === 'borcegui'
        ? Math.round(0.09 * AUTHORING_PPM)
        : Math.round((spec.boneLengthM ?? 0) * AUTHORING_PPM);
    const actualEndOffset = maxY - spec.pivotY;
    if (Math.abs(actualEndOffset - expectedEndOffset) > 4) {
      errors.push(
        `el extremo queda a ${actualEndOffset} px del pivote; ` +
          `el pliego pide ${expectedEndOffset} px (tolerancia ±4)`,
      );
    }
  }

  const offRatio = offPalette / opaque;
  if (offRatio > 0.12) {
    errors.push(
      `${(offRatio * 100).toFixed(1)} % de los píxeles usan colores fuera de la paleta cerrada`,
    );
  } else if (offRatio > 0.02) {
    warnings.push(
      `${(offRatio * 100).toFixed(1)} % de los píxeles se apartan de la paleta; revisar`,
    );
  }

  // Un degradado deja muchísimos colores distintos. El pliego pide planos.
  const distinct = new Set<number>();
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3]! < ALPHA_THRESHOLD) continue;
    distinct.add((rgba[i]! << 16) | (rgba[i + 1]! << 8) | rgba[i + 2]!);
    if (distinct.size > 4000) break;
  }
  if (distinct.size > 3000) {
    warnings.push(
      `${distinct.size}+ colores distintos: parece tener degradados o textura, y el pliego pide planos`,
    );
  }

  return { part: spec.id, errors, warnings };
}

const dir = resolve(process.cwd(), process.argv[2] ?? '');
if (!process.argv[2] || !existsSync(dir)) {
  console.error('Uso: npm run arte:validar -- <carpeta con las piezas>');
  process.exit(2);
}

console.log(`Validando ${dir} contra el pliego (${PART_SPECS.length} piezas)\n`);

const reports = PART_SPECS.map((spec) => checkPart(dir, spec));
let failed = 0;

for (const r of reports) {
  if (r.errors.length === 0 && r.warnings.length === 0) {
    console.log(`  OK       ${r.part}`);
    continue;
  }
  if (r.errors.length > 0) failed++;
  console.log(`  ${r.errors.length > 0 ? 'RECHAZO ' : 'AVISO   '} ${r.part}`);
  for (const e of r.errors) console.log(`             ✗ ${e}`);
  for (const w of r.warnings) console.log(`             ! ${w}`);
}

const extra = existsSync(dir)
  ? readdirSync(dir).filter(
      (f) => f.endsWith('.png') && !PART_SPECS.some((s) => `${s.id}.png` === f),
    )
  : [];
if (extra.length > 0) {
  console.log(`\n  Archivos que el pliego no pide: ${extra.join(', ')}`);
}

console.log(
  failed === 0
    ? '\nEntrega aceptada: todas las piezas cumplen el pliego.'
    : `\nEntrega rechazada: ${failed} pieza(s) no cumplen.`,
);
process.exit(failed === 0 ? 0 : 1);
