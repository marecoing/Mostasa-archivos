/**
 * CLIPS DE ANIMACIÓN — Fase 1 de la reconstrucción.
 *
 * Cada clip es una lista de poses clave con su duración. Entre clave y clave
 * el motor interpola los ÁNGULOS, no las imágenes, así que el personaje no
 * puede deformarse: es la misma persona en todos los cuadros por construcción.
 *
 * Las claves están autoradas con criterio de animación de acción — pocas,
 * bien espaciadas, con anticipación antes del golpe y descanso después — y no
 * como muestreo uniforme de un movimiento continuo.
 *
 * Módulo puro y determinista: mismo tiempo, misma pose. Verificable por test.
 */

import { POSE_SAMPLE_HZ } from './ArtBible';
import type { JointName, Pose } from './Skeleton';

export interface Keyframe {
  /** Duración de esta clave hasta la siguiente, en segundos. */
  hold: number;
  pose: Pose;
}

export interface Clip {
  name: string;
  loop: boolean;
  frames: readonly Keyframe[];
}

export function clipDuration(clip: Clip): number {
  return clip.frames.reduce((sum, f) => sum + f.hold, 0);
}

const JOINTS_IN_POSES: readonly JointName[] = [
  'chest',
  'neck',
  'head',
  'shoulderL',
  'elbowL',
  'handL',
  'shoulderR',
  'elbowR',
  'handR',
  'hipL',
  'kneeL',
  'ankleL',
  'toeL',
  'hipR',
  'kneeR',
  'ankleR',
  'toeR',
];

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  for (const joint of JOINTS_IN_POSES) {
    const from = a[joint] ?? 0;
    const to = b[joint] ?? 0;
    if (from === 0 && to === 0) continue;
    out[joint] = from + (to - from) * t;
  }
  return out;
}

/** Suavizado de entrada y salida. Lo que le da peso al movimiento. */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

/**
 * Muestrea un clip en el tiempo dado.
 *
 * El tiempo se cuantiza a POSE_SAMPLE_HZ antes de interpolar: el render corre
 * a 60 fps pero las poses se sostienen a 24, que es lo que le da al movimiento
 * cadencia de animación dibujada en vez de deslizamiento de motor. Es una
 * decisión estética declarada en la biblia de arte, no una limitación.
 */
export function samplePose(clip: Clip, time: number, quantize = true): Pose {
  const total = clipDuration(clip);
  if (total <= 0) return {};

  let t = quantize ? Math.floor(time * POSE_SAMPLE_HZ) / POSE_SAMPLE_HZ : time;
  t = clip.loop ? ((t % total) + total) % total : Math.max(0, Math.min(total, t));

  const frames = clip.frames;
  const last = frames[frames.length - 1];
  if (!last) return {};

  let acc = 0;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame) continue;
    if (t < acc + frame.hold || i === frames.length - 1) {
      const nextIndex = clip.loop ? (i + 1) % frames.length : Math.min(i + 1, frames.length - 1);
      const next = frames[nextIndex] ?? frame;
      const local = frame.hold > 0 ? Math.min(1, (t - acc) / frame.hold) : 0;
      return lerpPose(frame.pose, next.pose, easeInOut(local));
    }
    acc += frame.hold;
  }
  return last.pose;
}

// ---------------------------------------------------------------------------
// Clips de Mostasa
// ---------------------------------------------------------------------------

/**
 * Reposo. Respiración lenta: el pecho sube, los hombros la siguen con un
 * cuadro de retraso, la cabeza flota. Amplitudes chicas a propósito — un
 * reposo que se mueve mucho es lo que hace que un juego parezca inestable.
 */
export const IDLE: Clip = {
  name: 'idle',
  loop: true,
  frames: [
    { hold: 0.5, pose: { chest: 0, shoulderL: 0, shoulderR: 0, head: 0, elbowL: 0, elbowR: 0 } },
    {
      hold: 0.5,
      pose: { chest: -2, shoulderL: -3, shoulderR: 3, head: -1.5, elbowL: 4, elbowR: -4 },
    },
    { hold: 0.5, pose: { chest: -1, shoulderL: -1, shoulderR: 1, head: 0.5, elbowL: 2, elbowR: -2 } },
    { hold: 0.5, pose: { chest: 1, shoulderL: 2, shoulderR: -2, head: 1, elbowL: -2, elbowR: 2 } },
  ],
};

/**
 * Caminata, 8 claves = dos pasos. Contacto, paso bajo, paso alto, extensión,
 * y el espejo para la otra pierna. Los brazos van en oposición a las piernas,
 * que es lo que hace que una caminata se lea como caminata.
 */
export const WALK: Clip = {
  name: 'walk',
  loop: true,
  frames: [
    // Contacto: pierna izquierda adelante
    {
      hold: 0.11,
      pose: {
        hipL: 0, kneeL: -26, ankleL: 14, toeL: -6,
        hipR: 0, kneeR: 24, ankleR: -10, toeR: 10,
        shoulderL: 20, elbowL: -14, shoulderR: -20, elbowR: 14, chest: 2,
      },
    },
    // Paso bajo: el peso cae sobre la izquierda
    {
      hold: 0.11,
      pose: {
        hipL: 0, kneeL: -8, ankleL: 6, toeL: 0,
        hipR: 0, kneeR: 34, ankleR: -22, toeR: 16,
        shoulderL: 10, elbowL: -8, shoulderR: -10, elbowR: 8, chest: 0,
      },
    },
    // Paso alto: la derecha pasa por al lado
    {
      hold: 0.11,
      pose: {
        hipL: 0, kneeL: 8, ankleL: -2, toeL: 4,
        hipR: 0, kneeR: 4, ankleR: -30, toeR: 18,
        shoulderL: -2, elbowL: 0, shoulderR: 2, elbowR: 0, chest: -1,
      },
    },
    // Extensión: la derecha se estira hacia adelante
    {
      hold: 0.11,
      pose: {
        hipL: 0, kneeL: 20, ankleL: -8, toeL: 8,
        hipR: 0, kneeR: -22, ankleR: 10, toeR: -4,
        shoulderL: -14, elbowL: 10, shoulderR: 14, elbowR: -10, chest: -2,
      },
    },
    // Contacto espejado: pierna derecha adelante
    {
      hold: 0.11,
      pose: {
        hipL: 0, kneeL: 24, ankleL: -10, toeL: 10,
        hipR: 0, kneeR: -26, ankleR: 14, toeR: -6,
        shoulderL: -20, elbowL: 14, shoulderR: 20, elbowR: -14, chest: 2,
      },
    },
    {
      hold: 0.11,
      pose: {
        hipL: 0, kneeL: 34, ankleL: -22, toeL: 16,
        hipR: 0, kneeR: -8, ankleR: 6, toeR: 0,
        shoulderL: -10, elbowL: 8, shoulderR: 10, elbowR: -8, chest: 0,
      },
    },
    {
      hold: 0.11,
      pose: {
        hipL: 0, kneeL: 4, ankleL: -30, toeL: 18,
        hipR: 0, kneeR: 8, ankleR: -2, toeR: 4,
        shoulderL: 2, elbowL: 0, shoulderR: -2, elbowR: 0, chest: -1,
      },
    },
    {
      hold: 0.11,
      pose: {
        hipL: 0, kneeL: -22, ankleL: 10, toeL: -4,
        hipR: 0, kneeR: 20, ankleR: -8, toeR: 8,
        shoulderL: 14, elbowL: -10, shoulderR: -14, elbowR: 10, chest: -2,
      },
    },
  ],
};

/**
 * Primer golpe del combo. Cinco claves con la estructura clásica: anticipación
 * (el cuerpo carga hacia atrás), golpe (extensión total, el cuadro que el
 * jugador tiene que leer), impacto sostenido, y recuperación en dos tiempos.
 *
 * La clave de golpe dura menos que las otras a propósito: un golpe que se
 * queda extendido se siente lento.
 */
export const ATTACK_1: Clip = {
  name: 'attack_1',
  loop: false,
  frames: [
    // Anticipación: hombro atrás, torso cargado
    {
      hold: 0.09,
      pose: {
        chest: -10, shoulderR: 26, elbowR: -40, head: -4,
        shoulderL: -14, elbowL: 20, kneeR: -8,
      },
    },
    // Golpe: extensión completa del brazo derecho
    {
      hold: 0.05,
      pose: {
        chest: 14, shoulderR: -76, elbowR: -4, head: 6,
        shoulderL: 18, elbowL: -30, kneeR: 10, kneeL: -14,
      },
    },
    // Impacto sostenido: el cuadro que hace que el golpe se sienta
    {
      hold: 0.08,
      pose: {
        chest: 12, shoulderR: -72, elbowR: -8, head: 5,
        shoulderL: 16, elbowL: -26, kneeR: 8, kneeL: -12,
      },
    },
    // Recuperación
    {
      hold: 0.1,
      pose: { chest: 4, shoulderR: -28, elbowR: -20, head: 2, shoulderL: 6, elbowL: -10 },
    },
    { hold: 0.12, pose: {} },
  ],
};

export const CLIPS = { IDLE, WALK, ATTACK_1 } as const;
