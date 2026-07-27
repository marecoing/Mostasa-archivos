/**
 * PLIEGO DE PIEZAS — especificación de encargo de arte.
 *
 * El rig acepta arte por partes: en vez de pedir una lámina del personaje
 * completo (que es lo que produjo R-2, cuadros que hierven), se encarga cada
 * pieza del cuerpo por separado, y el esqueleto las mueve. Es el método de la
 * animación de recorte profesional, y es lo que permite tener a la vez arte de
 * calidad y animación que no se deforma.
 *
 * Este módulo NO inventa medidas: las deriva de los largos de hueso de
 * `Skeleton` y de los contornos de `BodyShapes`, que son los mismos que el
 * motor ya usa. Por eso una pieza entregada contra este pliego encaja sin
 * retoques, y por eso el validador puede rechazar automáticamente lo que no
 * cumple.
 *
 * Orientación de autoría, igual para todas las piezas:
 *   · el personaje mira hacia la DERECHA (+x)
 *   · el hueso apunta hacia ABAJO, con la articulación padre arriba
 *   · el punto de pivote es la articulación padre
 */

import { OUTLINE_WIDTH_M } from './ArtBible';
import * as B from './BodyShapes';
import { HEAD_RADIUS_M, boneOf } from './Skeleton';

/**
 * Resolución de autoría: cuatro veces la del juego. Se dibuja a 4× y el motor
 * reduce, por dos motivos concretos: aguanta pantallas de alta densidad sin
 * volver a pedir arte, y deja piezas de tamaño trabajable — a 2× la cabeza
 * medía 110 px, que no le sirve ni a un dibujante ni a un generador de
 * imágenes.
 */
export const AUTHORING_PPM = 600;

/** Aire alrededor del dibujo, en metros. Evita que el contorno se corte. */
export const MARGIN_M = 0.03;

/**
 * Solape en las articulaciones. Cada pieza se dibuja un poco más allá de su
 * articulación para que al doblarse no aparezca un hueco entre pieza y pieza.
 */
export const JOINT_OVERLAP_M = 0.04;

export interface PartSpec {
  /** Nombre de archivo sin extensión. */
  id: string;
  /** Nombre en castellano, para el pliego. */
  label: string;
  /** Largo del hueso en metros; `null` para cabeza y pie, que no lo usan. */
  boneLengthM: number | null;
  canvasW: number;
  canvasH: number;
  /** Dónde cae la articulación padre dentro del lienzo, en píxeles. */
  pivotX: number;
  pivotY: number;
  /** Dónde debe caer la articulación hija. `null` si la pieza no encadena. */
  childX: number | null;
  childY: number | null;
  notes: string;
}

function round(n: number): number {
  return Math.round(n);
}

function boundsUV(contours: readonly (readonly B.UV[])[]): {
  uMin: number;
  uMax: number;
  vMin: number;
  vMax: number;
} {
  const all = contours.flat();
  return {
    uMin: Math.min(...all.map((p) => p.u)),
    uMax: Math.max(...all.map((p) => p.u)),
    vMin: Math.min(...all.map((p) => p.v)),
    vMax: Math.max(...all.map((p) => p.v)),
  };
}

function boundsXY(contours: readonly (readonly B.XY[])[], scale: number): {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
} {
  const all = contours.flat();
  return {
    xMin: Math.min(...all.map((p) => p.x)) * scale,
    xMax: Math.max(...all.map((p) => p.x)) * scale,
    yMin: Math.min(...all.map((p) => p.y)) * scale,
    yMax: Math.max(...all.map((p) => p.y)) * scale,
  };
}

/**
 * Pieza de miembro. El contorno está en coordenadas del hueso, así que las
 * medidas del lienzo salen del largo real del hueso más el aire y el solape.
 */
function limbSpec(
  id: string,
  label: string,
  joint: Parameters<typeof boneOf>[0],
  contours: readonly (readonly B.UV[])[],
  notes: string,
): PartSpec {
  const bone = boneOf(joint);
  if (!bone) throw new Error(`hueso desconocido: ${joint}`);
  const len = bone.lengthM;
  const b = boundsUV(contours);
  const pad = MARGIN_M + JOINT_OVERLAP_M;

  const topM = b.vMin * len - pad;
  const bottomM = b.vMax * len + pad;
  const leftM = b.uMin - MARGIN_M;
  const rightM = b.uMax + MARGIN_M;

  return {
    id,
    label,
    boneLengthM: len,
    canvasW: round((rightM - leftM) * AUTHORING_PPM),
    canvasH: round((bottomM - topM) * AUTHORING_PPM),
    pivotX: round(-leftM * AUTHORING_PPM),
    pivotY: round(-topM * AUTHORING_PPM),
    childX: round(-leftM * AUTHORING_PPM),
    childY: round((len - topM) * AUTHORING_PPM),
    notes,
  };
}

const HEAD_BOUNDS = boundsXY([B.HEAD, B.HAIR], HEAD_RADIUS_M);
const FOOT_BOUNDS = boundsXY([B.BOOT, B.SOLE], 1);

/**
 * El pliego completo de Mostasa. Ocho piezas únicas: el lado lejano del cuerpo
 * usa el mismo arte, teñido un escalón más oscuro por el motor, así que no hay
 * que dibujarlo dos veces.
 */
export const PART_SPECS: readonly PartSpec[] = [
  {
    id: 'cabeza',
    label: 'Cabeza (perfil tres cuartos, con pelo y bigote)',
    boneLengthM: null,
    canvasW: round((HEAD_BOUNDS.xMax - HEAD_BOUNDS.xMin + 2 * MARGIN_M) * AUTHORING_PPM),
    canvasH: round((HEAD_BOUNDS.yMax - HEAD_BOUNDS.yMin + 2 * MARGIN_M) * AUTHORING_PPM),
    pivotX: round((-HEAD_BOUNDS.xMin + MARGIN_M) * AUTHORING_PPM),
    pivotY: round((HEAD_BOUNDS.yMax + MARGIN_M) * AUTHORING_PPM),
    childX: null,
    childY: null,
    notes:
      'El pivote es el CENTRO de la cabeza, no la base del cuello. La cara mira ' +
      'a la derecha. Incluir pelo, oreja, ceja, ojo y bigote en la misma pieza. ' +
      'El cuello lo dibuja el torso: no dibujarlo acá.',
  },
  {
    id: 'torso',
    label: 'Torso con campera y cuello',
    boneLengthM: boneOf('chest')?.lengthM ?? 0.48,
    ...(() => {
      const len = boneOf('chest')?.lengthM ?? 0.48;
      const b = boundsUV([B.JACKET, B.LAPEL, B.COLLAR, B.NECK]);
      const leftM = b.uMin - MARGIN_M;
      const rightM = b.uMax + MARGIN_M;
      const topM = b.vMin * len - MARGIN_M;
      const bottomM = b.vMax * len + MARGIN_M;
      return {
        canvasW: round((rightM - leftM) * AUTHORING_PPM),
        canvasH: round((bottomM - topM) * AUTHORING_PPM),
        pivotX: round(-leftM * AUTHORING_PPM),
        pivotY: round(-topM * AUTHORING_PPM),
        childX: round(-leftM * AUTHORING_PPM),
        childY: round((len - topM) * AUTHORING_PPM),
      };
    })(),
    notes:
      'El pivote es la PELVIS. El punto hijo es la línea de hombros. La campera ' +
      'baja por debajo de la pelvis y sube hasta el cuello. Tiene que ser más ' +
      'angosta que la línea de hombros, o tapa el brazo del lado lejano. ' +
      'Incluir el cuello asomando arriba; los brazos van aparte.',
  },
  limbSpec(
    'brazo',
    'Brazo (hombro a codo), con manga',
    'elbowR',
    [B.UPPER_ARM],
    'El pivote es el HOMBRO. Marcar el deltoides arriba y afinar hacia el codo.',
  ),
  limbSpec(
    'antebrazo',
    'Antebrazo (codo a muñeca), con puño de manga',
    'handR',
    [B.FOREARM, B.CUFF],
    'El pivote es el CODO. Panza del músculo arriba, muñeca fina abajo. ' +
      'Incluir el puño de la manga donde termina.',
  ),
  {
    id: 'mano',
    label: 'Mano cerrada en puño',
    boneLengthM: 0.11,
    ...(() => {
      const len = 0.11;
      const b = boundsUV([B.FIST, B.KNUCKLES]);
      const leftM = b.uMin - MARGIN_M;
      const rightM = b.uMax + MARGIN_M;
      const topM = b.vMin * len - MARGIN_M;
      const bottomM = b.vMax * len + MARGIN_M;
      return {
        canvasW: round((rightM - leftM) * AUTHORING_PPM),
        canvasH: round((bottomM - topM) * AUTHORING_PPM),
        pivotX: round(-leftM * AUTHORING_PPM),
        pivotY: round(-topM * AUTHORING_PPM),
        childX: null,
        childY: null,
      };
    })(),
    notes:
      'El pivote es la MUÑECA. Puño cerrado con el pulgar cruzado por delante: ' +
      'se lee mucho mejor que una mano abierta y es la pose correcta casi siempre.',
  },
  limbSpec(
    'muslo',
    'Muslo (cadera a rodilla), con pantalón',
    'kneeR',
    [B.THIGH],
    'El pivote es la CADERA. Grueso arriba, rodilla marcada abajo.',
  ),
  limbSpec(
    'pantorrilla',
    'Pantorrilla (rodilla a tobillo), con pantalón',
    'ankleR',
    [B.CALF],
    'El pivote es la RODILLA. El gemelo va del lado de ATRÁS (izquierda del ' +
      'dibujo, porque el personaje mira a la derecha).',
  ),
  {
    id: 'borcegui',
    label: 'Borceguí con suela',
    boneLengthM: boneOf('toeR')?.lengthM ?? 0.16,
    canvasW: round((FOOT_BOUNDS.xMax - FOOT_BOUNDS.xMin + 2 * MARGIN_M) * AUTHORING_PPM),
    canvasH: round((FOOT_BOUNDS.yMax - FOOT_BOUNDS.yMin + 2 * MARGIN_M) * AUTHORING_PPM),
    pivotX: round((-FOOT_BOUNDS.xMin + MARGIN_M) * AUTHORING_PPM),
    pivotY: round((FOOT_BOUNDS.yMax + MARGIN_M) * AUTHORING_PPM),
    childX: null,
    childY: null,
    notes:
      'El pivote es el TOBILLO, y queda por ENCIMA de la planta: la planta del ' +
      'borceguí tiene que caer a ' +
      `${round(0.09 * AUTHORING_PPM)} px por debajo del pivote, que es donde ` +
      'apoya en el piso. La punta mira a la derecha. Suela más oscura.',
  },
];

/** Grosor de la línea de tinta a resolución de autoría. */
export const AUTHORING_OUTLINE_PX = round(OUTLINE_WIDTH_M * AUTHORING_PPM);

export function specById(id: string): PartSpec | undefined {
  return PART_SPECS.find((s) => s.id === id);
}
