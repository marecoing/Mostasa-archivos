/**
 * Hoja de referencia del pliego de arte. Dibuja cada pieza dentro de su lienzo
 * exacto, con el pivote y la articulación hija marcados, para que quien dibuje
 * vea en una sola imagen qué se pide y dónde va cada punto de anclaje.
 *
 * Las formas salen de los mismos módulos que usa el motor, así que la hoja no
 * puede mostrar algo distinto de lo que el juego espera recibir.
 */

import * as P from '../src/game/art/Palette';
import * as B from '../src/game/art/BodyShapes';
import {
  AUTHORING_OUTLINE_PX,
  AUTHORING_PPM,
  PART_SPECS,
  type PartSpec,
} from '../src/game/art/PartSpec';
import { HEAD_RADIUS_M } from '../src/game/art/Skeleton';

const canvas = document.getElementById('hoja') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function trace(points: { x: number; y: number }[]): void {
  const n = points.length;
  const at = (i: number): { x: number; y: number } => points[((i % n) + n) % n]!;
  ctx.beginPath();
  ctx.moveTo(at(0).x, at(0).y);
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6,
      p2.x, p2.y,
    );
  }
  ctx.closePath();
}

/** Contorno de miembro: el hueso baja recto desde el pivote. */
function limbPoints(c: readonly B.UV[], px: number, py: number, lenPx: number, s: number) {
  return c.map(({ u, v }) => ({ x: px - u * AUTHORING_PPM * s, y: py + v * lenPx }));
}

function headPoints(c: readonly B.XY[], px: number, py: number, r: number) {
  return c.map(({ x, y }) => ({ x: px + x * r, y: py - y * r }));
}

function footPoints(c: readonly B.XY[], px: number, py: number, s: number) {
  return c.map(({ x, y }) => ({ x: px + x * AUTHORING_PPM * s, y: py - y * AUTHORING_PPM * s }));
}

function shapesFor(spec: PartSpec, px: number, py: number, s: number) {
  const len = (spec.boneLengthM ?? 0) * AUTHORING_PPM * s;
  const r = HEAD_RADIUS_M * AUTHORING_PPM * s;
  const L = (c: readonly B.UV[]) => limbPoints(c, px, py, len, s);
  switch (spec.id) {
    case 'cabeza':
      return [
        { pts: headPoints(B.HEAD, px, py, r), fill: P.SKIN, ink: true },
        { pts: headPoints(B.HEAD_LIGHT, px, py, r), fill: P.SKIN_LIT, ink: false },
        { pts: headPoints(B.HAIR, px, py, r), fill: P.INK, ink: true },
        { pts: headPoints(B.BROW, px, py, r), fill: P.INK, ink: false },
        { pts: headPoints(B.EYE, px, py, r), fill: P.INK, ink: false },
        { pts: headPoints(B.MOUSTACHE, px, py, r), fill: P.INK_SOFT, ink: false },
      ];
    case 'torso':
      return [
        { pts: L(B.JACKET), fill: P.MUSTARD, ink: true },
        { pts: L(B.NECK), fill: P.SKIN_SHADE, ink: false },
        { pts: L(B.LAPEL), fill: P.MUSTARD_DARK, ink: false },
      ];
    case 'brazo':
      return [{ pts: L(B.UPPER_ARM), fill: P.MUSTARD, ink: true }];
    case 'antebrazo':
      return [
        { pts: L(B.FOREARM), fill: P.MUSTARD, ink: true },
        { pts: L(B.CUFF), fill: P.MUSTARD_DARK, ink: false },
      ];
    case 'mano':
      return [{ pts: L(B.FIST), fill: P.SKIN, ink: true }];
    case 'muslo':
      return [{ pts: L(B.THIGH), fill: P.CLOTH_BLUE, ink: true }];
    case 'pantorrilla':
      return [{ pts: L(B.CALF), fill: P.CLOTH_BLUE, ink: true }];
    case 'borcegui':
      return [
        { pts: footPoints(B.BOOT, px, py, s), fill: P.INK_SOFT, ink: true },
        { pts: footPoints(B.SOLE, px, py, s), fill: P.INK, ink: false },
      ];
    default:
      return [];
  }
}

function cross(x: number, y: number, colour: string, label: string): void {
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y);
  ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = colour;
  ctx.font = '10px ui-monospace, Menlo, monospace';
  ctx.fillText(label, x + 12, y + 3);
}

ctx.fillStyle = P.toCss(P.ASPHALT_DEEP);
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = P.toCss(P.SODIUM);
ctx.font = '600 16px ui-monospace, Menlo, monospace';
ctx.fillText('HOJA DE PIEZAS — así se entrega el arte de Mostasa', 40, 44);
ctx.fillStyle = P.toCss(P.PAVEMENT_LIT);
ctx.font = '13px ui-monospace, Menlo, monospace';
ctx.fillText(
  'Lienzo exacto · pivote naranja = articulación padre · pivote celeste = articulación hija · el personaje mira a la derecha',
  40, 66,
);

const COLS = 4;
const CELL_W = 300;
const CELL_H = 360;
const OX = 40;
const OY = 100;

PART_SPECS.forEach((spec, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const s = Math.min((CELL_W - 90) / spec.canvasW, (CELL_H - 120) / spec.canvasH);
  const w = spec.canvasW * s;
  const h = spec.canvasH * s;
  const x0 = OX + col * CELL_W + (CELL_W - w) / 2;
  const y0 = OY + row * CELL_H + 40;

  // Lienzo
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = P.toCss(P.PAVEMENT);
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, h);
  ctx.setLineDash([]);

  const px = x0 + spec.pivotX * s;
  const py = y0 + spec.pivotY * s;

  for (const { pts, ink } of shapesFor(spec, px, py, s)) {
    if (!ink) continue;
    trace(pts);
    ctx.fillStyle = P.toCss(P.INK);
    ctx.strokeStyle = P.toCss(P.INK);
    ctx.lineJoin = 'round';
    ctx.lineWidth = AUTHORING_OUTLINE_PX * s * 2;
    ctx.stroke();
    ctx.fill();
  }
  for (const { pts, fill } of shapesFor(spec, px, py, s)) {
    trace(pts);
    ctx.fillStyle = P.toCss(fill);
    ctx.fill();
  }

  cross(px, py, P.toCss(P.SODIUM), 'pivote');
  if (spec.childX !== null && spec.childY !== null) {
    cross(x0 + spec.childX * s, y0 + spec.childY * s, P.toCss(P.NEON_TEAL), 'hija');
  }

  ctx.fillStyle = P.toCss(P.BONE);
  ctx.font = '600 13px ui-monospace, Menlo, monospace';
  ctx.fillText(`${spec.id}.png`, OX + col * CELL_W + 10, OY + row * CELL_H + 22);
  ctx.fillStyle = P.toCss(P.PAVEMENT_LIT);
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillText(
    `${spec.canvasW} × ${spec.canvasH} px · pivote ${spec.pivotX},${spec.pivotY}`,
    OX + col * CELL_W + 10,
    y0 + h + 20,
  );
});
