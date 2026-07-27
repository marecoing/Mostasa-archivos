/**
 * Hoja de prueba de la Fase 1. No es parte del juego: es el instrumento con el
 * que se aprueba la puerta de la fase. Dibuja a Mostasa con el rig procedural,
 * usando exclusivamente los números de la biblia de arte y los colores de la
 * paleta cerrada, para que la decisión se tome mirando y no leyendo.
 */

import {
  HERO_HEIGHT_M,
  OBJECT_HEIGHT_M,
  PIXELS_PER_METRE,
  WEAPON_LENGTH_M,
} from '../src/game/art/ArtBible';
import * as P from '../src/game/art/Palette';
import { ATTACK_1, IDLE, WALK, clipDuration, samplePose } from '../src/game/art/Poses';
import { MOSTASA_SKIN, drawRig, type Shape } from '../src/game/art/RigDraw';
import { skeletonToScreen, solveSkeleton } from '../src/game/art/Skeleton';

const canvas = document.getElementById('proof') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

/** Traza un contorno cerrado, suavizado con spline de Catmull-Rom. */
function trace(points: { x: number; y: number }[], smooth: boolean): void {
  const n = points.length;
  ctx.beginPath();
  if (!smooth || n < 3) {
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    return;
  }
  const at = (i: number): { x: number; y: number } => points[((i % n) + n) % n]!;
  ctx.moveTo(at(0).x, at(0).y);
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    ctx.bezierCurveTo(
      p1.x + (p2.x - p0.x) / 6,
      p1.y + (p2.y - p0.y) / 6,
      p2.x - (p3.x - p1.x) / 6,
      p2.y - (p3.y - p1.y) / 6,
      p2.x,
      p2.y,
    );
  }
  ctx.closePath();
}

/**
 * Pinta un personaje en dos pasadas.
 *
 * Pasada 1: todas las piezas de silueta, engordadas y en tinta, se funden en
 * un contorno externo único. Pasada 2: el color, sin contorno propio.
 *
 * Contornear cada pieza por separado es lo que convertía al personaje en un
 * muñeco articulado de placas: se veían las juntas del hombro, del codo y de
 * la rodilla como si fuera una armadura.
 */
function paintRig(parts: Shape[], outlineWidth: number, silhouetteOnly: boolean): void {
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.fillStyle = P.toCss(P.INK);
  ctx.strokeStyle = P.toCss(P.INK);
  ctx.lineWidth = outlineWidth * 2;
  for (const part of parts) {
    if (!part.outline) continue;
    trace(part.points, part.smooth);
    ctx.stroke();
    ctx.fill();
  }
  if (silhouetteOnly) return;
  for (const part of parts) {
    trace(part.points, part.smooth);
    ctx.fillStyle = P.toCss(part.fill);
    ctx.fill();
  }
}

function character(
  pose: ReturnType<typeof samplePose>,
  feetX: number,
  feetY: number,
  scale = 1,
  facing: 1 | -1 = 1,
  silhouetteOnly = false,
): void {
  const skin = { ...MOSTASA_SKIN, heightM: HERO_HEIGHT_M * scale };
  const screen = skeletonToScreen(solveSkeleton(pose, facing), feetX, feetY, skin.heightM);
  const { parts, outlineWidth } = drawRig(screen, skin, facing);
  paintRig(parts, outlineWidth, silhouetteOnly);
}

/** Sombra de contacto: anillos concéntricos, el recurso ya validado del motor. */
function contactShadow(x: number, y: number, halfW: number): void {
  for (let i = 6; i > 0; i--) {
    ctx.fillStyle = `rgba(10,13,20,${0.09})`;
    ctx.beginPath();
    ctx.ellipse(x, y, (halfW * i) / 6, ((halfW * i) / 6) * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function ground(y: number, from: number, to: number): void {
  ctx.fillStyle = P.toCss(P.ASPHALT);
  ctx.fillRect(from, y, to - from, 6);
  ctx.fillStyle = P.toCss(P.ASPHALT_DEEP);
  ctx.fillRect(from, y + 6, to - from, 3);
}

function label(text: string, x: number, y: number, color = P.SODIUM): void {
  ctx.fillStyle = P.toCss(color);
  ctx.font = '600 15px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(text, x, y);
}

function caption(text: string, x: number, y: number): void {
  ctx.fillStyle = P.toCss(P.PAVEMENT_LIT);
  ctx.font = '13px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(text, x, y);
}

/** Prop de calle: bloque plano a su altura REAL, con contorno de tinta. */
function prop(x: number, feetY: number, heightM: number, widthM: number, fill: number): void {
  const h = heightM * PIXELS_PER_METRE;
  const w = widthM * PIXELS_PER_METRE;
  contactShadow(x, feetY, w * 0.62);
  ctx.fillStyle = P.toCss(P.INK);
  ctx.fillRect(x - w / 2 - 3, feetY - h - 3, w + 6, h + 3);
  ctx.fillStyle = P.toCss(fill);
  ctx.fillRect(x - w / 2, feetY - h, w, h);
  ctx.fillStyle = P.toCss(P.SODIUM_DEEP);
  ctx.fillRect(x - w / 2, feetY - h, w * 0.22, h);
}

// ---------------------------------------------------------------------------

ctx.fillStyle = P.toCss(P.ASPHALT_DEEP);
ctx.fillRect(0, 0, canvas.width, canvas.height);

// --- Banda A: escala declarada --------------------------------------------
const gA = 520;
label('A · ESCALA DECLARADA — todo medido en metros, nada ajustado a ojo', 40, 60);
caption('Mostasa 1.76 m · 150 px por metro · los objetos miden lo que miden en la calle', 40, 84);
ground(gA, 40, 1240);

contactShadow(180, gA, 46);
character(samplePose(IDLE, 0), 180, gA);
caption('Mostasa · 1.76 m', 118, gA + 34);

prop(360, gA, OBJECT_HEIGHT_M.tacho_basura, 0.56, P.CLOTH_OLIVE);
caption('tacho · 0.90 m', 300, gA + 34);

prop(500, gA, OBJECT_HEIGHT_M.cajon_verduleria, 0.5, P.SODIUM_DEEP);
caption('cajón · 0.34 m', 440, gA + 34);

prop(660, gA, OBJECT_HEIGHT_M.banco_plaza, 1.5, P.CLOTH_GREY);
caption('banco · 0.85 m', 600, gA + 34);

prop(850, gA, OBJECT_HEIGHT_M.telefono_publico, 0.4, P.NEON_TEAL);
caption('teléfono · 1.35 m', 782, gA + 34);

prop(1040, gA, OBJECT_HEIGHT_M.vidriera, 1.6, P.CLOTH_BLUE);
caption('vidriera · 2.40 m', 972, gA + 34);

// Arma en la mano, a su largo real y en el eje declarado.
{
  const screen = skeletonToScreen(solveSkeleton(samplePose(IDLE, 0)), 180, gA, HERO_HEIGHT_M);
  const len = WEAPON_LENGTH_M.tubo_metalico * PIXELS_PER_METRE;
  const hand = screen.handR;
  ctx.strokeStyle = P.toCss(P.INK);
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hand.x - len * 0.18, hand.y + len * 0.1);
  ctx.lineTo(hand.x + len * 0.78, hand.y - len * 0.28);
  ctx.stroke();
  ctx.strokeStyle = P.toCss(P.PAVEMENT_LIT);
  ctx.lineWidth = 7;
  ctx.stroke();
  caption('caño · 0.82 m', 196, gA + 54);
}

// --- Banda B: ciclo de caminata -------------------------------------------
const gB = 900;
label('B · CICLO DE CAMINATA — 8 claves, un solo esqueleto, ningún cuadro redibujado', 40, 646);
caption('el volumen del cuerpo es idéntico en los 8: sólo cambian los ángulos', 40, 670);
ground(gB, 40, 1240);
for (let i = 0; i < 8; i++) {
  const t = (i / 8) * clipDuration(WALK);
  const x = 118 + i * 148;
  contactShadow(x, gB, 34);
  character(samplePose(WALK, t, false), x, gB, 0.74);
  caption(`${i + 1}`, x - 4, gB + 30);
}

// --- Banda C: golpe --------------------------------------------------------
const gC = 1230;
label('C · GOLPE — anticipación, extensión, impacto sostenido, recuperación', 40, 986);
caption('la clave de impacto dura menos que las otras: por eso el golpe se siente', 40, 1010);
ground(gC, 40, 1240);
{
  const marks = [0.0, 0.09, 0.13, 0.2, 0.32];
  marks.forEach((t, i) => {
    const x = 200 + i * 220;
    contactShadow(x, gC, 34);
    character(samplePose(ATTACK_1, t, false), x, gC, 0.74);
    caption(['anticipa', 'golpea', 'impacta', 'recupera', 'reposo'][i], x - 34, gC + 30);
  });
}

// --- Banda D: prueba de silueta -------------------------------------------
const gD = 1520;
label('D · PRUEBA DE SILUETA — reconocible en tinta plana, sin ningún detalle', 40, 1316);
caption('si la silueta no se lee, el combate no se lee: es la regla que faltaba', 40, 1340);
// Fondo claro: una prueba de silueta sobre asfalto oscuro no prueba nada.
ctx.fillStyle = P.toCss(P.BONE);
ctx.fillRect(40, 1360, 1200, gD - 1360 + 12);
{
  const poses: [string, number, 1 | -1][] = [
    ['reposo', 0, 1],
    ['camina', clipDuration(WALK) * 0.25, 1],
    ['golpea', 0.13, 1],
    ['espejado', 0.13, -1],
  ];
  poses.forEach(([name, t, facing], i) => {
    const x = 260 + i * 250;
    const clip = i === 1 ? WALK : i === 0 ? IDLE : ATTACK_1;
    contactShadow(x, gD, 40);
    character(samplePose(clip, t, false), x, gD, 0.7, facing, true);
    caption(name, x - 24, gD + 30);
  });
}
