/**
 * DIBUJO DEL RIG — Fase 1, segunda pasada.
 *
 * Convierte un esqueleto resuelto en una lista ordenada de formas. No dibuja:
 * emite geometría. Eso permite que el mismo código alimente al motor (Phaser),
 * a la hoja de prueba y a los tests, sin que ninguno de los tres pueda dibujar
 * algo distinto de lo que verifican los otros.
 *
 * La primera pasada usaba cápsulas sobre los huesos y el resultado era un
 * muñeco de palotes con volumen. Acá cada parte del cuerpo es un contorno
 * autorado en `BodyShapes`, y el hueso sólo lo transporta y lo orienta: el
 * esqueleto sigue garantizando que el volumen no cambie entre cuadros (R-2),
 * pero lo que se mueve ahora es un dibujo.
 *
 * El estilo es plano, de silueta fuerte y contorno de tinta, con planos de luz
 * y sombra en vez de degradados: la familia visual de Katana ZERO o Samurai
 * Jack, llevada al imaginario porteño.
 */

import { HERO_HEIGHT_M, OUTLINE_WIDTH_M, PIXELS_PER_METRE, SHADE_STEP } from './ArtBible';
import * as B from './BodyShapes';
import type { Hex, ToneRamp } from './Palette';
import { INK, INK_SOFT, RAMPS } from './Palette';
import type { JointName, Point, Skeleton } from './Skeleton';
import { HEAD_RADIUS_M, screenScaleFor } from './Skeleton';

/**
 * Una forma es un contorno cerrado ya proyectado a píxeles de pantalla.
 * `outline` marca las piezas que llevan tinta: las que forman la silueta la
 * llevan, los planos internos de luz y sombra no, o el dibujo se ensucia.
 */
export interface Shape {
  points: Point[];
  fill: Hex;
  outline: boolean;
  /** El contorno se suaviza con spline. Las piezas duras (suela) no. */
  smooth: boolean;
}

export interface RigDrawing {
  parts: Shape[];
  /** Ancho de la línea de tinta, en píxeles, para esta escala de personaje. */
  outlineWidth: number;
}

export interface CharacterSkin {
  jacket: ToneRamp;
  trousers: ToneRamp;
  skin: ToneRamp;
  hair: Hex;
  /** Estatura en metros. Define la escala; no hay multiplicadores por familia. */
  heightM: number;
}

/** Mostasa. El mostaza es suyo y de nadie más: nunca se pierde en pantalla. */
export const MOSTASA_SKIN: CharacterSkin = {
  jacket: RAMPS.mustard,
  trousers: RAMPS.clothBlue,
  skin: RAMPS.skin,
  hair: INK,
  heightM: HERO_HEIGHT_M,
};

function norm(dx: number, dy: number): { x: number; y: number; len: number } {
  const len = Math.hypot(dx, dy) || 1e-6;
  return { x: dx / len, y: dy / len, len };
}

/**
 * Proyecta un contorno de miembro. El marco corre a lo largo del hueso: v
 * avanza de la articulación padre a la hija, u se desplaza lateralmente hacia
 * el frente del personaje.
 */
function limbShape(
  a: Point,
  b: Point,
  contour: readonly B.UV[],
  scalePx: number,
  facing: 1 | -1,
  fill: Hex,
  outline = true,
): Shape {
  const d = norm(b.x - a.x, b.y - a.y);
  const px = -d.y * facing;
  const py = d.x * facing;
  return {
    fill,
    outline,
    smooth: true,
    points: contour.map(({ u, v }) => ({
      x: a.x + d.x * d.len * v + px * u * scalePx,
      y: a.y + d.y * d.len * v + py * u * scalePx,
    })),
  };
}

/** Proyecta un contorno de cabeza. Unidades de radio, x hacia adelante. */
function headShape(
  centre: Point,
  contour: readonly B.XY[],
  radiusPx: number,
  facing: 1 | -1,
  fill: Hex,
  outline = true,
): Shape {
  return {
    fill,
    outline,
    smooth: true,
    points: contour.map(({ x, y }) => ({
      x: centre.x + x * facing * radiusPx,
      y: centre.y - y * radiusPx,
    })),
  };
}

/** Proyecta el borceguí. Marco tobillo→punta, con la planta apoyada. */
function footShape(
  ankle: Point,
  toe: Point,
  contour: readonly B.XY[],
  scalePx: number,
  fill: Hex,
  outline = true,
  smooth = true,
): Shape {
  const d = norm(toe.x - ankle.x, toe.y - ankle.y);
  const ux = d.y;
  const uy = -d.x;
  return {
    fill,
    outline,
    smooth,
    points: contour.map(({ x, y }) => ({
      x: ankle.x + d.x * x * scalePx + ux * y * scalePx,
      y: ankle.y + d.y * x * scalePx + uy * y * scalePx,
    })),
  };
}

/**
 * Emite el dibujo completo de un personaje.
 *
 * `screen` tiene que venir ya proyectado a píxeles con `skeletonToScreen`. El
 * orden va de atrás hacia adelante: miembros lejanos, cuello, torso, pierna
 * cercana, cabeza y por último el brazo cercano, que cruza por delante de todo.
 */
export function drawRig(screen: Skeleton, skin: CharacterSkin, facing: 1 | -1 = 1): RigDrawing {
  const scalePx = screenScaleFor(skin.heightM);
  const headR = HEAD_RADIUS_M * scalePx;
  const parts: Shape[] = [];

  const far = facing === 1 ? 'L' : 'R';
  const near = far === 'L' ? 'R' : 'L';
  const j = (base: string, side: string): Point => screen[`${base}${side}` as JointName];

  const leg = (side: string, trousers: Hex, boot: Hex, sole: Hex): void => {
    parts.push(
      limbShape(j('hip', side), j('knee', side), B.THIGH, scalePx, facing, trousers),
      limbShape(j('knee', side), j('ankle', side), B.CALF, scalePx, facing, trousers),
      footShape(j('ankle', side), j('toe', side), B.BOOT, scalePx, boot),
      footShape(j('ankle', side), j('toe', side), B.SOLE, scalePx, sole, false, false),
    );
  };

  const arm = (side: string, sleeve: Hex, hand: Hex, detail: boolean): void => {
    const shoulder = j('shoulder', side);
    const elbow = j('elbow', side);
    const hnd = j('hand', side);
    parts.push(
      limbShape(shoulder, elbow, B.UPPER_ARM, scalePx, facing, sleeve),
      limbShape(elbow, hnd, B.FOREARM, scalePx, facing, sleeve),
      limbShape(elbow, hnd, B.CUFF, scalePx, facing, sleeve),
    );
    // El puño se orienta con la dirección del antebrazo, prolongándola.
    const d = norm(hnd.x - elbow.x, hnd.y - elbow.y);
    const fistEnd = { x: hnd.x + d.x * 0.11 * scalePx, y: hnd.y + d.y * 0.11 * scalePx };
    parts.push(limbShape(hnd, fistEnd, B.FIST, scalePx, facing, hand));
    if (detail) {
      parts.push(limbShape(hnd, fistEnd, B.KNUCKLES, scalePx, facing, skin.skin.shade, false));
    }
  };

  // --- Pierna y brazo lejanos, un escalón más oscuros ---------------------
  leg(far, skin.trousers.shade, INK_SOFT, INK);
  arm(far, skin.jacket.shade, skin.skin.shade, false);

  // --- Cuello -------------------------------------------------------------
  parts.push(limbShape(screen.chest, screen.neck, B.NECK, scalePx, facing, skin.skin.shade));

  // --- Torso --------------------------------------------------------------
  const pelvis = screen.pelvis;
  const chest = screen.chest;
  parts.push(
    limbShape(pelvis, chest, B.JACKET, scalePx, facing, skin.jacket.base),
    limbShape(pelvis, chest, B.JACKET_LIGHT, scalePx, facing, skin.jacket.lit, false),
    limbShape(pelvis, chest, B.LAPEL, scalePx, facing, skin.jacket.shade, false),
    limbShape(pelvis, chest, B.COLLAR, scalePx, facing, RAMPS.pavement.base),
  );

  // --- Pierna cercana -----------------------------------------------------
  leg(near, skin.trousers.base, INK_SOFT, INK);

  // --- Cabeza -------------------------------------------------------------
  const head = screen.head;
  const face = (contour: readonly B.XY[], fill: Hex, outline = false): Shape =>
    headShape(head, contour, headR, facing, fill, outline);
  parts.push(
    face(B.HEAD, skin.skin.base, true),
    face(B.HEAD_LIGHT, skin.skin.lit),
    face(B.JAW_SHADOW, skin.skin.shade),
    face(B.HAIR, skin.hair, true),
    face(B.EAR, skin.skin.shade),
    face(B.SIDEBURN, skin.hair),
    face(B.BROW, INK),
    face(B.EYE, INK),
    face(B.MOUSTACHE, skin.hair),
  );

  // --- Brazo cercano, por delante de todo --------------------------------
  arm(near, skin.jacket.base, skin.skin.base, true);

  return { parts, outlineWidth: OUTLINE_WIDTH_M * scalePx };
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

/** Ancho de tinta en píxeles para una estatura dada. */
export function outlineWidthFor(heightM: number): number {
  return (OUTLINE_WIDTH_M * PIXELS_PER_METRE * heightM) / HERO_HEIGHT_M;
}
