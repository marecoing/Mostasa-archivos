/**
 * DIBUJO DEL RIG — Fase 1 de la reconstrucción.
 *
 * Convierte un esqueleto resuelto en una lista ordenada de formas. No dibuja:
 * emite geometría. Eso permite que el mismo código alimente al motor (Phaser),
 * a la página de prueba y a los tests, sin que ninguno de los tres pueda
 * dibujar algo distinto de lo que verifican los otros.
 *
 * El estilo es plano y de silueta fuerte, con contorno de tinta uniforme. El
 * contorno se consigue con una pasada previa: se dibujan las mismas formas
 * engordadas y en tinta, y encima las formas rellenas. Eso da un contorno
 * externo continuo y ningún contorno interno, que es lo que distingue una
 * ilustración vectorial de un muñeco de piezas pegadas.
 */

import { OUTLINE_WIDTH_M, PIXELS_PER_METRE, SHADE_STEP } from './ArtBible';
import type { Hex, ToneRamp } from './Palette';
import { INK, INK_SOFT, RAMPS } from './Palette';
import type { JointName, Point, Skeleton } from './Skeleton';
import { ANKLE_HEIGHT_M, HEAD_RADIUS_M, boneOf, screenScaleFor } from './Skeleton';
import { HERO_HEIGHT_M } from './ArtBible';

export type Shape =
  | { kind: 'capsule'; a: Point; b: Point; width: number; fill: Hex }
  | { kind: 'circle'; c: Point; r: number; fill: Hex }
  | { kind: 'poly'; points: Point[]; fill: Hex };

export interface RigDrawing {
  /** Pasada de tinta: formas engordadas que producen el contorno externo. */
  ink: Shape[];
  /** Pasada de color, en orden de fondo a frente. */
  fill: Shape[];
}

/**
 * Cómo se viste un personaje. Todo sale de rampas de la paleta cerrada, así
 * que es imposible autorar un personaje que "no combine" con el resto.
 */
export interface CharacterSkin {
  jacket: ToneRamp;
  trousers: ToneRamp;
  skin: ToneRamp;
  hair: Hex;
  /** Estatura en metros. Define la escala; no hay multiplicadores por familia. */
  heightM: number;
  /** Gorra, pelo al ras, melena: cambia la silueta de la cabeza. */
  headwear: 'none' | 'cap' | 'beanie';
}

/** Mostasa. El mostaza es suyo y de nadie más: nunca se pierde en pantalla. */
export const MOSTASA_SKIN: CharacterSkin = {
  jacket: RAMPS.mustard,
  trousers: RAMPS.clothBlue,
  skin: RAMPS.skin,
  hair: INK,
  heightM: HERO_HEIGHT_M,
  headwear: 'none',
};

function capsule(a: Point, b: Point, width: number, fill: Hex): Shape {
  return { kind: 'capsule', a, b, width, fill };
}

/**
 * Cuadrilátero entre dos segmentos de distinto ancho. Sirve para el torso, que
 * es más ancho en los hombros que en la cadera y no puede dibujarse con una
 * cápsula de ancho constante sin perder la forma de la figura.
 */
function taperedQuad(a: Point, b: Point, widthA: number, widthB: number, fill: Hex): Shape {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const ha = widthA / 2;
  const hb = widthB / 2;
  return {
    kind: 'poly',
    fill,
    points: [
      { x: a.x + nx * ha, y: a.y + ny * ha },
      { x: b.x + nx * hb, y: b.y + ny * hb },
      { x: b.x - nx * hb, y: b.y - ny * hb },
      { x: a.x - nx * ha, y: a.y - ny * ha },
    ],
  };
}

/** Engorda una forma para la pasada de tinta. */
function inked(shape: Shape, grow: number): Shape {
  switch (shape.kind) {
    case 'capsule':
      return { ...shape, width: shape.width + grow * 2, fill: INK };
    case 'circle':
      return { ...shape, r: shape.r + grow, fill: INK };
    case 'poly': {
      const cx = shape.points.reduce((s, p) => s + p.x, 0) / shape.points.length;
      const cy = shape.points.reduce((s, p) => s + p.y, 0) / shape.points.length;
      return {
        kind: 'poly',
        fill: INK,
        points: shape.points.map((p) => {
          const dx = p.x - cx;
          const dy = p.y - cy;
          const len = Math.hypot(dx, dy) || 1;
          return { x: p.x + (dx / len) * grow, y: p.y + (dy / len) * grow };
        }),
      };
    }
  }
}

function widthPx(joint: JointName, scale: number): number {
  const bone = boneOf(joint);
  return bone ? bone.widthM * PIXELS_PER_METRE * scale : 0;
}

/**
 * Los miembros del lado lejano se dibujan un escalón más oscuros. Es el
 * recurso que le da profundidad a una figura plana sin romper el estilo, y es
 * la misma dirección de luz que declara la biblia de arte para todo el juego.
 */
function farTone(ramp: ToneRamp): Hex {
  return ramp.shade;
}

function nearTone(ramp: ToneRamp): Hex {
  return ramp.base;
}

/**
 * Emite el dibujo completo de un personaje.
 *
 * `screen` tiene que venir ya proyectado a píxeles con `skeletonToScreen`. El
 * orden de la pasada de color va de atrás hacia adelante: miembros lejanos,
 * torso, miembros cercanos, cabeza.
 */
export function drawRig(screen: Skeleton, skin: CharacterSkin, facing: 1 | -1 = 1): RigDrawing {
  const scaleFactor = screenScaleFor(skin.heightM) / PIXELS_PER_METRE;
  const px = (metres: number): number => metres * PIXELS_PER_METRE * scaleFactor;
  const w = (joint: JointName): number => widthPx(joint, scaleFactor);

  // Con la figura de perfil tres cuartos, el lado izquierdo del personaje es
  // el lejano cuando mira a la derecha.
  const far = facing === 1 ? 'L' : 'R';
  const near = far === 'L' ? 'R' : 'L';
  const j = (base: string, side: string): Point => screen[`${base}${side}` as JointName];

  const fill: Shape[] = [];

  /**
   * Pie apoyado. El tobillo está a 9 cm del piso, así que dibujar el pie como
   * una cápsula entre tobillo y punta lo deja flotando. Se dibuja como una
   * cuña que baja hasta la planta y acompaña al tobillo cuando el pie se
   * levanta en la caminata.
   */
  const foot = (side: string, tone: Hex): Shape => {
    const ankle = j('ankle', side);
    const toe = j('toe', side);
    const drop = px(ANKLE_HEIGHT_M);
    const heelX = ankle.x - facing * px(0.07);
    return {
      kind: 'poly',
      fill: tone,
      points: [
        { x: heelX, y: ankle.y + drop },
        { x: toe.x, y: toe.y + drop },
        { x: toe.x, y: toe.y + drop * 0.3 },
        { x: ankle.x, y: ankle.y - px(0.03) },
        { x: heelX, y: ankle.y - px(0.02) },
      ],
    };
  };

  // --- Lado lejano -------------------------------------------------------
  fill.push(
    capsule(j('hip', far), j('knee', far), w(`knee${far}` as JointName), farTone(skin.trousers)),
    capsule(j('knee', far), j('ankle', far), w(`ankle${far}` as JointName), farTone(skin.trousers)),
    foot(far, INK_SOFT),
    capsule(
      j('shoulder', far),
      j('elbow', far),
      w(`elbow${far}` as JointName),
      farTone(skin.jacket),
    ),
    capsule(j('elbow', far), j('hand', far), w(`hand${far}` as JointName), farTone(skin.jacket)),
    { kind: 'circle', c: j('hand', far), r: px(0.075), fill: farTone(skin.skin) },
  );

  // --- Torso -------------------------------------------------------------
  // La campera baja por debajo de la articulación de la cadera y sube por
  // encima de la línea de hombros. Dibujar el torso entre las articulaciones
  // desnudas es lo que hacía ver al personaje de torso corto y pierna larga.
  const pelvis = screen.pelvis;
  const chest = screen.chest;
  //
  // El ancho del torso está acotado por la línea de hombros: la campera tiene
  // que ser MÁS ANGOSTA que los hombros, o tapa el brazo lejano y el personaje
  // se ve con un solo brazo. Es una regla de silueta, no un ajuste estético.
  const hemY = pelvis.y + px(0.17);
  const hem = { x: pelvis.x + (pelvis.x - chest.x) * 0.18, y: hemY };
  const collar = { x: chest.x, y: chest.y };
  fill.push(
    taperedQuad(hem, collar, px(0.34), px(0.38), skin.jacket.base),
    // Reflejo del alumbrado de sodio sobre el lado que da a la luz.
    taperedQuad(
      { x: hem.x - facing * px(0.08), y: (hem.y + collar.y) / 2 },
      { x: collar.x - facing * px(0.09), y: collar.y },
      px(0.09),
      px(0.11),
      skin.jacket.lit,
    ),
    // Cuello, para que la cabeza no quede pegada a los hombros.
    capsule(chest, screen.neck, px(0.13), skin.skin.shade),
  );

  // --- Lado cercano ------------------------------------------------------
  fill.push(
    capsule(j('hip', near), j('knee', near), w(`knee${near}` as JointName), skin.trousers.base),
    capsule(j('knee', near), j('ankle', near), w(`ankle${near}` as JointName), skin.trousers.base),
    foot(near, INK),
  );

  // --- Cabeza ------------------------------------------------------------
  const head = screen.head;
  const headR = px(HEAD_RADIUS_M);
  fill.push(
    { kind: 'circle', c: head, r: headR, fill: skin.skin.base },
    // Media luna iluminada del lado de la llave de luz.
    {
      kind: 'circle',
      c: { x: head.x - facing * headR * 0.2, y: head.y - headR * 0.22 },
      r: headR * 0.74,
      fill: skin.skin.lit,
    },
  );
  if (skin.headwear === 'cap') {
    fill.push(
      { kind: 'circle', c: { x: head.x, y: head.y - headR * 0.3 }, r: headR * 0.94, fill: skin.hair },
      capsule(
        { x: head.x + facing * headR * 0.5, y: head.y - headR * 0.42 },
        { x: head.x + facing * headR * 1.5, y: head.y - headR * 0.36 },
        px(0.05),
        skin.hair,
      ),
    );
  } else {
    // Pelo: casquete corto, corrido hacia la nuca. Deja la cara despejada —
    // un casquete que tapa toda la cabeza convierte al personaje en una bola.
    fill.push({
      kind: 'circle',
      c: { x: head.x - facing * headR * 0.34, y: head.y - headR * 0.42 },
      r: headR * 0.8,
      fill: skin.hair,
    });
  }
  // Rasgos: un ojo y el bigote. Con silueta fuerte no hace falta más, y el
  // bigote es la firma del personaje.
  fill.push(
    {
      kind: 'circle',
      c: { x: head.x + facing * headR * 0.34, y: head.y - headR * 0.06 },
      r: headR * 0.11,
      fill: INK,
    },
    capsule(
      { x: head.x + facing * headR * 0.08, y: head.y + headR * 0.42 },
      { x: head.x + facing * headR * 0.56, y: head.y + headR * 0.42 },
      headR * 0.24,
      INK,
    ),
  );

  // --- Brazo cercano, por delante de todo --------------------------------
  fill.push(
    capsule(
      j('shoulder', near),
      j('elbow', near),
      w(`elbow${near}` as JointName),
      nearTone(skin.jacket),
    ),
    capsule(
      j('elbow', near),
      j('hand', near),
      w(`hand${near}` as JointName),
      nearTone(skin.jacket),
    ),
    { kind: 'circle', c: j('hand', near), r: px(0.08), fill: skin.skin.base },
  );

  const grow = OUTLINE_WIDTH_M * PIXELS_PER_METRE * scaleFactor;
  const ink = fill.map((shape) => inked(shape, grow));

  return { ink, fill };
}

/**
 * Cuánto se oscurece un personaje según su profundidad en la calle. La banda
 * de fondo recibe menos luz que la de adelante, y eso es lo que separa
 * visualmente a los enemigos lejanos de los cercanos sin cambiarles el tamaño.
 */
export function depthShade(worldY: number, nearY: number, farY: number): number {
  const t = Math.max(0, Math.min(1, (worldY - farY) / (nearY - farY || 1)));
  return 1 - SHADE_STEP * (1 - t);
}
