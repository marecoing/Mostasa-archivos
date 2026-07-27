/**
 * MONTAJE DE PIEZAS SOBRE EL ESQUELETO — Fase 1, tercera pasada.
 *
 * Toma el arte entregado contra el pliego y calcula dónde va cada pieza según
 * el esqueleto resuelto. Éste es el punto donde el arte dibujado y el rig se
 * encuentran, y es lo que permite tener las dos cosas a la vez: dibujo de
 * calidad y animación que no se deforma entre cuadros.
 *
 * Módulo puro: no dibuja ni carga imágenes, sólo devuelve transformaciones.
 * Eso lo hace verificable por unit test, y hace que el motor, la hoja de
 * prueba y los tests no puedan discrepar.
 *
 * Cada pieza se coloca con tres datos:
 *   · el punto del lienzo que se clava en la articulación (el pivote)
 *   · el ángulo que hay que rotarla
 *   · la escala uniforme que la lleva de resolución de autoría a la del juego
 *
 * En el arte, el hueso apunta hacia ABAJO. Por eso el torso, mirado como
 * archivo, parece estar al revés: tiene la pelvis arriba y el cuello abajo.
 * No es un defecto — es la convención del pliego, y al montarlo el rig lo
 * rota a su lugar.
 */

import { AUTHORING_PPM, PART_SPECS, type PartSpec } from './PartSpec';
import type { JointName, Point, Skeleton } from './Skeleton';
import { screenScaleFor } from './Skeleton';

/** En el arte el hueso apunta hacia abajo, que en pantalla es +90°. */
const ART_BONE_ANGLE = Math.PI / 2;

/**
 * Cuánto se hunde la cabeza dentro del cuello del torso, en metros.
 *
 * Sin esto, la base del mentón y el cuello de la campera se tocan con apenas
 * 2 px de solape, y en cuanto el torso se inclina se abre una junta visible.
 * Es el mismo criterio de solape que el pliego pide en los miembros, aplicado
 * a la única articulación que no encadena.
 */
export const HEAD_SEAT_M = 0.028;

export interface PartPlacement {
  /** Id de la pieza; coincide con el nombre de archivo sin extensión. */
  id: string;
  /** Dónde va el pivote de la pieza, en píxeles de pantalla. */
  x: number;
  y: number;
  /** Rotación en radianes. */
  angle: number;
  /** Escala uniforme desde la resolución de autoría. */
  scale: number;
  /** Si la pieza se espeja horizontalmente (personaje mirando a la izquierda). */
  flip: boolean;
  /** Piezas del lado lejano: el motor las oscurece un escalón. */
  far: boolean;
}

function angleOf(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

const SPEC_BY_ID = new Map<string, PartSpec>(PART_SPECS.map((s) => [s.id, s]));

/**
 * Escala de una pieza encadenada. Se mide contra la distancia real entre las
 * dos articulaciones en vez de usar una constante: si el arte viene con el
 * hueso unos píxeles corrido, la pieza se estira para llegar igual y no
 * aparece un hueco en la articulación.
 */
function chainedScale(spec: PartSpec, a: Point, b: Point, fallback: number): number {
  if (spec.childX === null || spec.childY === null) return fallback;
  const artLength = Math.hypot(spec.childX - spec.pivotX, spec.childY - spec.pivotY);
  if (artLength <= 0) return fallback;
  return distance(a, b) / artLength;
}

/**
 * Coloca las ocho piezas sobre un esqueleto ya proyectado a pantalla.
 *
 * Devuelve la lista en orden de dibujo, de atrás hacia adelante: pierna y
 * brazo lejanos, torso, pierna cercana, cabeza y por último el brazo cercano,
 * que cruza por delante de todo.
 */
export function placeParts(
  screen: Skeleton,
  heightM: number,
  facing: 1 | -1 = 1,
): PartPlacement[] {
  const baseScale = screenScaleFor(heightM) / AUTHORING_PPM;
  const flip = facing === -1;
  const far = facing === 1 ? 'L' : 'R';
  const near = far === 'L' ? 'R' : 'L';
  const j = (base: string, side: string): Point => screen[`${base}${side}` as JointName];

  const out: PartPlacement[] = [];

  /** Pieza encadenada: se clava en `a` y apunta hacia `b`. */
  const chained = (id: string, a: Point, b: Point, isFar: boolean): void => {
    const spec = SPEC_BY_ID.get(id);
    if (!spec) return;
    out.push({
      id,
      x: a.x,
      y: a.y,
      angle: angleOf(a, b) - ART_BONE_ANGLE,
      scale: chainedScale(spec, a, b, baseScale),
      flip,
      far: isFar,
    });
  };

  /** Pieza suelta: se clava en `at` y se orienta con la dirección dada. */
  const loose = (id: string, at: Point, direction: number, isFar: boolean): void => {
    out.push({ id, x: at.x, y: at.y, angle: direction, scale: baseScale, flip, far: isFar });
  };

  const leg = (side: string, isFar: boolean): void => {
    chained('muslo', j('hip', side), j('knee', side), isFar);
    chained('pantorrilla', j('knee', side), j('ankle', side), isFar);
    // El borceguí se orienta con la dirección del pie: en el arte la punta
    // mira a la derecha, así que el ángulo es el del vector tobillo→punta.
    const ankle = j('ankle', side);
    const toe = j('toe', side);
    const dir = flip ? angleOf(toe, ankle) : angleOf(ankle, toe);
    loose('borcegui', ankle, dir, isFar);
  };

  const arm = (side: string, isFar: boolean): void => {
    const shoulder = j('shoulder', side);
    const elbow = j('elbow', side);
    const hand = j('hand', side);
    chained('brazo', shoulder, elbow, isFar);
    chained('antebrazo', elbow, hand, isFar);
    // El puño prolonga la dirección del antebrazo.
    loose('mano', hand, angleOf(elbow, hand) - ART_BONE_ANGLE, isFar);
  };

  leg(far, true);
  arm(far, true);
  chained('torso', screen.pelvis, screen.chest, false);
  leg(near, false);
  // La cabeza va derecha: se inclina con la dirección cuello→cabeza, y se
  // hunde un poco hacia el cuello para que la junta no se abra.
  const headDir = angleOf(screen.neck, screen.head);
  const seat = HEAD_SEAT_M * screenScaleFor(heightM);
  out.push({
    id: 'cabeza',
    x: screen.head.x - Math.cos(headDir) * seat,
    y: screen.head.y - Math.sin(headDir) * seat,
    angle: headDir + ART_BONE_ANGLE,
    scale: baseScale,
    flip,
    far: false,
  });
  arm(near, false);

  return out;
}

export function specFor(id: string): PartSpec | undefined {
  return SPEC_BY_ID.get(id);
}
