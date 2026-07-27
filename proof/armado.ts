/**
 * Monta el arte entregado sobre el esqueleto y lo muestra en reposo, en el
 * ciclo de caminata y en el golpe. Es la puerta visual de la fase: acá se ve
 * si el arte y el rig encajan de verdad.
 */

import { HERO_HEIGHT_M } from '../src/game/art/ArtBible';
import * as P from '../src/game/art/Palette';
import { ATTACK_1, IDLE, WALK, clipDuration, samplePose } from '../src/game/art/Poses';
import { placeParts, specFor } from '../src/game/art/PartRig';
import { skeletonToScreen, solveSkeleton } from '../src/game/art/Skeleton';

const canvas = document.getElementById('armado') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const IDS = ['cabeza','torso','brazo','antebrazo','mano','muslo','pantorrilla','borcegui'];

/** Copia oscurecida para el lado lejano: da profundidad sin cambiar el tamaño. */
function darken(img: HTMLImageElement, factor: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d')!;
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < d.data.length; i += 4) {
    d.data[i] = d.data[i]! * factor;
    d.data[i + 1] = d.data[i + 1]! * factor;
    d.data[i + 2] = d.data[i + 2]! * factor;
  }
  g.putImageData(d, 0, 0);
  return c;
}

async function load(): Promise<Record<string, { near: HTMLImageElement; far: HTMLCanvasElement }>> {
  const out: Record<string, { near: HTMLImageElement; far: HTMLCanvasElement }> = {};
  await Promise.all(
    IDS.map(
      (id) =>
        new Promise<void>((res, rej) => {
          const img = new Image();
          img.onload = () => {
            out[id] = { near: img, far: darken(img, 0.62) };
            res();
          };
          img.onerror = () => rej(new Error(`no cargo ${id}`));
          img.src = `/assets/mostasa/${id}.png`;
        }),
    ),
  );
  return out;
}

function contactShadow(x: number, y: number, halfW: number): void {
  for (let i = 6; i > 0; i--) {
    ctx.fillStyle = 'rgba(10,13,20,0.09)';
    ctx.beginPath();
    ctx.ellipse(x, y, (halfW * i) / 6, ((halfW * i) / 6) * 0.34, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

const art = await load();

function draw(
  pose: ReturnType<typeof samplePose>,
  feetX: number,
  feetY: number,
  scale = 1,
  facing: 1 | -1 = 1,
): void {
  const heightM = HERO_HEIGHT_M * scale;
  const screen = skeletonToScreen(solveSkeleton(pose, facing), feetX, feetY, heightM);
  contactShadow(feetX, feetY, 44 * scale);
  for (const p of placeParts(screen, heightM, facing)) {
    const spec = specFor(p.id);
    const img = art[p.id];
    if (!spec || !img) continue;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.scale(p.flip ? -p.scale : p.scale, p.scale);
    ctx.drawImage(p.far ? img.far : img.near, -spec.pivotX, -spec.pivotY);
    ctx.restore();
  }
}

function label(text: string, x: number, y: number, colour = P.SODIUM): void {
  ctx.fillStyle = P.toCss(colour);
  ctx.font = '600 15px ui-monospace, Menlo, monospace';
  ctx.fillText(text, x, y);
}

function caption(text: string, x: number, y: number): void {
  ctx.fillStyle = P.toCss(P.PAVEMENT_LIT);
  ctx.font = '12px ui-monospace, Menlo, monospace';
  ctx.fillText(text, x, y);
}

function ground(y: number): void {
  ctx.fillStyle = P.toCss(P.ASPHALT);
  ctx.fillRect(40, y, 1200, 5);
}

ctx.fillStyle = P.toCss(P.ASPHALT_DEEP);
ctx.fillRect(0, 0, canvas.width, canvas.height);

label('MOSTASA ARMADO — arte entregado montado sobre el esqueleto', 40, 42);
caption(
  'ocho piezas · ningun cuadro redibujado · el volumen del cuerpo es el mismo en todas las poses',
  40,
  64,
);

// --- Reposo, a tamaño real -------------------------------------------------
const gA = 380;
ground(gA);
draw(samplePose(IDLE, 0), 160, gA);
caption('reposo', 128, gA + 26);
draw(samplePose(IDLE, 0), 380, gA, 1, -1);
caption('espejado', 340, gA + 26);
caption('1.76 m · 264 px de alto', 560, gA - 130);
caption('el mismo arte espejado: no cambia de volumen', 560, gA - 108);

// --- Caminata --------------------------------------------------------------
label('CICLO DE CAMINATA — 8 claves', 40, 470);
const gB = 690;
ground(gB);
for (let i = 0; i < 8; i++) {
  const t = (i / 8) * clipDuration(WALK);
  draw(samplePose(WALK, t, false), 110 + i * 148, gB, 0.72);
  caption(`${i + 1}`, 106 + i * 148, gB + 24);
}

// --- Golpe -----------------------------------------------------------------
label('GOLPE — anticipacion, extension, impacto, recuperacion', 40, 780);
const gC = 990;
ground(gC);
[0.0, 0.09, 0.13, 0.2, 0.32].forEach((t, i) => {
  draw(samplePose(ATTACK_1, t, false), 180 + i * 220, gC, 0.72);
  caption(['anticipa', 'golpea', 'impacta', 'recupera', 'reposo'][i]!, 146 + i * 220, gC + 24);
});
