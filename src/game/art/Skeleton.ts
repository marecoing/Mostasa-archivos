/**
 * ESQUELETO PROCEDURAL — Fase 1 de la reconstrucción.
 *
 * Respuesta directa a la causa de raíz R-2. Hasta acá, cada cuadro de
 * animación era una generación independiente del personaje: cambiaba el
 * volumen del cuerpo, el largo de los brazos y los pliegues de la ropa, y al
 * reproducirlos en bucle el personaje hervía.
 *
 * Un esqueleto no puede hervir. Los largos de hueso son constantes declaradas
 * en metros; lo único que cambia entre poses son los ÁNGULOS. El volumen del
 * cuerpo es matemáticamente idéntico en todos los cuadros.
 *
 * Módulo puro: no importa Phaser ni toca el DOM. Entra una pose, salen
 * posiciones de articulación. Eso lo hace verificable por unit test.
 *
 * Convención angular: 0° apunta hacia arriba de pantalla y crece en sentido
 * horario, de modo que 90° apunta a la derecha y 180° hacia abajo. Los ángulos
 * de `restAngleDeg` son LOCALES: se suman a lo largo de la cadena de padres.
 */

import { HEAD_HEIGHT_M, HERO_HEIGHT_M, PIXELS_PER_METRE } from './ArtBible';

export interface Point {
  x: number;
  y: number;
}

export type JointName =
  | 'pelvis'
  | 'chest'
  | 'neck'
  | 'head'
  | 'shoulderL'
  | 'elbowL'
  | 'handL'
  | 'shoulderR'
  | 'elbowR'
  | 'handR'
  | 'hipL'
  | 'kneeL'
  | 'ankleL'
  | 'toeL'
  | 'hipR'
  | 'kneeR'
  | 'ankleR'
  | 'toeR';

export interface Bone {
  /** Articulación de la que cuelga. `null` = arranca en la pelvis. */
  parent: JointName | null;
  /** Articulación que este hueso posiciona. */
  joint: JointName;
  /** Largo en metros. CONSTANTE: es lo que impide que el cuerpo hierva. */
  lengthM: number;
  /** Ángulo local de reposo, en grados. La pose sólo aporta un delta. */
  restAngleDeg: number;
  /** Grosor del miembro en metros, para dibujar volumen sobre el hueso. */
  widthM: number;
}

/**
 * Altura de la pelvis sobre el piso. Junto con los largos de pierna determina
 * que el tobillo quede a 9 cm del suelo, que es donde está el tobillo de una
 * persona real: la planta del pie apoya en y = 0 exactamente.
 */
export const PELVIS_HEIGHT_M = 0.94;

/**
 * Altura del tobillo sobre el piso. El pie se dibuja como una cuña desde el
 * tobillo hasta la planta, así que este número es lo que hace que la planta
 * apoye exactamente en y = 0 en vez de flotar.
 */
export const ANKLE_HEIGHT_M = 0.09;

/** Radio de la cabeza. La cabeza se dibuja como volumen, no como hueso. */
export const HEAD_RADIUS_M = HEAD_HEIGHT_M / 2;

/**
 * Proporciones de Mostasa. Derivadas de HERO_HEIGHT_M = 1.76 m y una figura de
 * 6.5 cabezas:
 *
 *   pelvis 0.940 + torso 0.480 = hombros 1.420  (80.7 % de la estatura)
 *          + cuello 0.090      = 1.510
 *          + cuello→centro cabeza 0.100 = 1.610
 *          + radio de cabeza 0.147 = 1.757  ← coronilla
 *
 * y hacia abajo, muslo 0.45 + pantorrilla 0.40 = 0.85, que deja el tobillo en
 * 0.09. Un test verifica esta suma contra HERO_HEIGHT_M, así que la proporción
 * no puede desincronizarse del resto del juego.
 */
export const BONES: readonly Bone[] = [
  // Tronco
  { parent: null, joint: 'chest', lengthM: 0.48, restAngleDeg: -4, widthM: 0.36 },
  { parent: 'chest', joint: 'neck', lengthM: 0.09, restAngleDeg: 2, widthM: 0.14 },
  { parent: 'neck', joint: 'head', lengthM: 0.1, restAngleDeg: 2, widthM: 0.22 },

  // Brazos. El reposo los deja separados del torso: es la regla de silueta —
  // si el brazo se funde con el cuerpo, el golpe no se lee.
  { parent: 'chest', joint: 'shoulderL', lengthM: 0.24, restAngleDeg: -96, widthM: 0.15 },
  { parent: 'shoulderL', joint: 'elbowL', lengthM: 0.3, restAngleDeg: 287, widthM: 0.12 },
  { parent: 'elbowL', joint: 'handL', lengthM: 0.28, restAngleDeg: 4, widthM: 0.1 },

  { parent: 'chest', joint: 'shoulderR', lengthM: 0.24, restAngleDeg: 104, widthM: 0.15 },
  { parent: 'shoulderR', joint: 'elbowR', lengthM: 0.3, restAngleDeg: 73, widthM: 0.12 },
  { parent: 'elbowR', joint: 'handR', lengthM: 0.28, restAngleDeg: -4, widthM: 0.1 },

  // Piernas. La separación de caderas es chica a propósito: en una vista de
  // tres cuartos las piernas se separan en PROFUNDIDAD, no a lo ancho de la
  // pantalla. Separarlas en X produce la postura de rana que estaba mal.
  { parent: null, joint: 'hipL', lengthM: 0.07, restAngleDeg: -90, widthM: 0.13 },
  { parent: 'hipL', joint: 'kneeL', lengthM: 0.45, restAngleDeg: 272, widthM: 0.16 },
  { parent: 'kneeL', joint: 'ankleL', lengthM: 0.4, restAngleDeg: -2, widthM: 0.12 },
  { parent: 'ankleL', joint: 'toeL', lengthM: 0.16, restAngleDeg: -90, widthM: 0.1 },

  { parent: null, joint: 'hipR', lengthM: 0.07, restAngleDeg: 90, widthM: 0.13 },
  { parent: 'hipR', joint: 'kneeR', lengthM: 0.45, restAngleDeg: 88, widthM: 0.16 },
  { parent: 'kneeR', joint: 'ankleR', lengthM: 0.4, restAngleDeg: 2, widthM: 0.12 },
  { parent: 'ankleR', joint: 'toeR', lengthM: 0.16, restAngleDeg: -90, widthM: 0.1 },
];

/**
 * Una pose es un delta angular en grados por articulación. Lo que no se
 * declara queda en reposo. Ésta es la razón por la que dos poses del mismo
 * personaje son forzosamente el mismo personaje.
 */
export type Pose = Partial<Record<JointName, number>>;

export type Skeleton = Record<JointName, Point>;

const BONE_BY_JOINT = new Map<JointName, Bone>(BONES.map((b) => [b.joint, b]));

function chainOf(joint: JointName): Bone[] {
  const chain: Bone[] = [];
  let current = BONE_BY_JOINT.get(joint);
  while (current) {
    chain.unshift(current);
    current = current.parent ? BONE_BY_JOINT.get(current.parent) : undefined;
  }
  return chain;
}

const CHAINS = new Map<JointName, Bone[]>(BONES.map((b) => [b.joint, chainOf(b.joint)] as const));

/**
 * Cinemática directa. Devuelve la posición de cada articulación en METROS, con
 * origen en el punto de apoyo entre los pies y +Y hacia arriba.
 *
 * `facing` de -1 espeja la GEOMETRÍA, no la imagen. Espejar la geometría es lo
 * que evita que el personaje cambie de volumen al darse vuelta.
 */
export function solveSkeleton(pose: Pose, facing: 1 | -1 = 1): Skeleton {
  const pelvis: Point = { x: 0, y: PELVIS_HEIGHT_M };
  const joints = { pelvis } as Skeleton;

  for (const bone of BONES) {
    const chain = CHAINS.get(bone.joint);
    if (!chain) continue;

    let angle = 0;
    let point = pelvis;
    for (const link of chain) {
      angle += link.restAngleDeg + (pose[link.joint] ?? 0);
      const rad = (angle * Math.PI) / 180;
      point = {
        x: point.x + Math.sin(rad) * link.lengthM,
        y: point.y + Math.cos(rad) * link.lengthM,
      };
    }
    joints[bone.joint] = point;
  }

  if (facing === -1) {
    for (const key of Object.keys(joints) as JointName[]) {
      joints[key] = { x: -joints[key].x, y: joints[key].y };
    }
  }

  return joints;
}

/**
 * Altura total que ocupa una pose, en metros, medida desde el piso. Se usa
 * para verificar por test que ninguna pose deforme la estatura del personaje:
 * el chequeo automático que antes no existía y que dejaba pasar los cuadros
 * que hervían.
 */
export function poseHeightM(skeleton: Skeleton): number {
  const highest = Math.max(...Object.values(skeleton).map((p) => p.y));
  return highest + HEAD_RADIUS_M;
}

/**
 * Pasa el esqueleto de metros a píxeles de pantalla, apoyado en un punto de
 * suelo. Invierte Y porque en pantalla crece hacia abajo.
 *
 * `heightM` permite dibujar el mismo esqueleto para personajes de distinta
 * estatura sin autorar un rig nuevo: un pesado de 1.92 m es este mismo rig
 * escalado, con las mismas proporciones, tal como declara la biblia de arte.
 */
export function skeletonToScreen(
  skeleton: Skeleton,
  feetX: number,
  feetY: number,
  heightM: number = HERO_HEIGHT_M,
): Skeleton {
  const scale = (PIXELS_PER_METRE * heightM) / HERO_HEIGHT_M;
  const out = {} as Skeleton;
  for (const key of Object.keys(skeleton) as JointName[]) {
    out[key] = {
      x: feetX + skeleton[key].x * scale,
      y: feetY - skeleton[key].y * scale,
    };
  }
  return out;
}

export function screenScaleFor(heightM: number): number {
  return (PIXELS_PER_METRE * heightM) / HERO_HEIGHT_M;
}

export function boneWidthPx(joint: JointName, heightM: number = HERO_HEIGHT_M): number {
  const bone = BONE_BY_JOINT.get(joint);
  if (!bone) return 0;
  return bone.widthM * PIXELS_PER_METRE * (heightM / HERO_HEIGHT_M);
}

export function boneOf(joint: JointName): Bone | undefined {
  return BONE_BY_JOINT.get(joint);
}
