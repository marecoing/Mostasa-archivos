import { describe, expect, it } from 'vitest';
import { CHARACTER_HEIGHT_M, HERO_HEIGHT_M, SILHOUETTE_RULES } from '../../src/game/art/ArtBible';
import {
  BONES,
  PELVIS_HEIGHT_M,
  poseHeightM,
  skeletonToScreen,
  solveSkeleton,
} from '../../src/game/art/Skeleton';
import { ATTACK_1, IDLE, WALK, clipDuration, samplePose } from '../../src/game/art/Poses';

const ALL_CLIPS = [IDLE, WALK, ATTACK_1];

describe('esqueleto', () => {
  it('respeta la estatura declarada en la biblia de arte', () => {
    const height = poseHeightM(solveSkeleton({}));
    expect(height).toBeCloseTo(HERO_HEIGHT_M, 2);
  });

  it('apoya la planta del pie en el piso', () => {
    const s = solveSkeleton({});
    // El tobillo queda a ~9 cm, que es la altura real del tobillo; el pie se
    // dibuja con volumen por debajo hasta llegar a cero.
    expect(s.ankleL.y).toBeCloseTo(0.09, 2);
    expect(s.ankleR.y).toBeCloseTo(0.09, 2);
  });

  it('deja los pies apuntando hacia adelante', () => {
    const s = solveSkeleton({});
    expect(s.toeL.x).toBeGreaterThan(s.ankleL.x);
    expect(s.toeR.x).toBeGreaterThan(s.ankleR.x);
  });

  it('pone los hombros por encima de la cadera y la cabeza por encima de todo', () => {
    const s = solveSkeleton({});
    expect(s.chest.y).toBeGreaterThan(PELVIS_HEIGHT_M);
    expect(s.head.y).toBeGreaterThan(s.chest.y);
    expect(s.head.y).toBeGreaterThan(s.shoulderL.y);
  });

  it('cuelga las manos por debajo de los codos en reposo', () => {
    const s = solveSkeleton({});
    expect(s.handL.y).toBeLessThan(s.elbowL.y);
    expect(s.handR.y).toBeLessThan(s.elbowR.y);
  });

  it('cumple el ancho de hombros mínimo de la regla de silueta', () => {
    const s = solveSkeleton({});
    const shoulderWidth = Math.abs(s.shoulderR.x - s.shoulderL.x);
    expect(shoulderWidth / HERO_HEIGHT_M).toBeGreaterThanOrEqual(
      SILHOUETTE_RULES.minShoulderRatio,
    );
  });

  it('no tiene ningún miembro más fino que el mínimo legible', () => {
    for (const bone of BONES) {
      expect(bone.widthM, bone.joint).toBeGreaterThanOrEqual(SILHOUETTE_RULES.minLimbWidthM);
    }
  });

  it('separa los brazos del torso para que la silueta no se funda', () => {
    const s = solveSkeleton({});
    const gapL = Math.abs(s.elbowL.x) - SILHOUETTE_RULES.minLimbGapM;
    expect(gapL).toBeGreaterThan(0);
  });

  it('espeja la geometría sin cambiar el volumen del cuerpo', () => {
    const right = solveSkeleton({}, 1);
    const left = solveSkeleton({}, -1);
    expect(poseHeightM(left)).toBeCloseTo(poseHeightM(right), 10);
    expect(left.handR.x).toBeCloseTo(-right.handR.x, 10);
    expect(left.handR.y).toBeCloseTo(right.handR.y, 10);
  });
});

describe('R-2: el personaje no puede hervir', () => {
  it('mantiene la estatura constante en TODAS las poses de TODOS los clips', () => {
    const reference = poseHeightM(solveSkeleton({}));
    for (const clip of ALL_CLIPS) {
      const duration = clipDuration(clip);
      for (let t = 0; t <= duration; t += 1 / 60) {
        const pose = samplePose(clip, t);
        const height = poseHeightM(solveSkeleton(pose));
        // Una pose puede agacharse o estirarse, pero el CUERPO no cambia de
        // tamaño: la variación sólo puede venir de la inclinación, nunca de
        // que el personaje se haya redibujado más grande o más chico.
        expect(height, `${clip.name} @ ${t.toFixed(3)}s`).toBeLessThanOrEqual(reference * 1.02);
        expect(height, `${clip.name} @ ${t.toFixed(3)}s`).toBeGreaterThan(reference * 0.85);
      }
    }
  });

  it('conserva el largo de cada hueso en cualquier pose', () => {
    const lengthOf = (clipTime: number): number[] => {
      const s = solveSkeleton(samplePose(WALK, clipTime));
      return [
        Math.hypot(s.kneeL.x - s.hipL.x, s.kneeL.y - s.hipL.y),
        Math.hypot(s.ankleL.x - s.kneeL.x, s.ankleL.y - s.kneeL.y),
        Math.hypot(s.elbowR.x - s.shoulderR.x, s.elbowR.y - s.shoulderR.y),
        Math.hypot(s.handR.x - s.elbowR.x, s.handR.y - s.elbowR.y),
      ];
    };
    const expected = [0.45, 0.4, 0.3, 0.28];
    for (let t = 0; t < clipDuration(WALK); t += 0.02) {
      lengthOf(t).forEach((len, i) => {
        expect(len, `hueso ${i} @ ${t.toFixed(2)}s`).toBeCloseTo(expected[i] as number, 10);
      });
    }
  });

  it('es determinista: el mismo tiempo devuelve exactamente la misma pose', () => {
    for (const clip of ALL_CLIPS) {
      expect(samplePose(clip, 0.37)).toEqual(samplePose(clip, 0.37));
    }
  });
});

describe('clips', () => {
  it('cierra el ciclo de caminata sin salto entre el último cuadro y el primero', () => {
    const duration = clipDuration(WALK);
    const start = solveSkeleton(samplePose(WALK, 0, false));
    const end = solveSkeleton(samplePose(WALK, duration - 0.001, false));
    // Al volver a empezar, la pierna adelantada tiene que estar donde la dejó
    // el final del ciclo, o la caminata patina.
    expect(Math.abs(end.toeL.x - start.toeL.x)).toBeLessThan(0.25);
  });

  it('extiende de verdad el brazo en el cuadro de golpe', () => {
    const rest = solveSkeleton({});
    const restReach = Math.abs(rest.handR.x);
    let maxReach = 0;
    for (let t = 0; t < clipDuration(ATTACK_1); t += 1 / 60) {
      const s = solveSkeleton(samplePose(ATTACK_1, t));
      maxReach = Math.max(maxReach, s.handR.x);
    }
    // El puño tiene que llegar bastante más lejos que el brazo en reposo, o el
    // golpe no se lee como golpe.
    expect(maxReach).toBeGreaterThan(restReach + 0.3);
  });

  it('respeta el conteo de claves declarado en la biblia de arte', () => {
    expect(IDLE.frames.length).toBe(4);
    expect(WALK.frames.length).toBe(8);
    expect(ATTACK_1.frames.length).toBe(5);
  });

  it('no deja clips de duración cero', () => {
    for (const clip of ALL_CLIPS) {
      expect(clipDuration(clip), clip.name).toBeGreaterThan(0);
    }
  });
});

describe('proyección a pantalla', () => {
  it('apoya los pies en el punto de suelo que se le pasa', () => {
    const screen = skeletonToScreen(solveSkeleton({}), 640, 500);
    // El tobillo queda 9 cm por encima del suelo, lo mismo que en el mundo,
    // con menos de un píxel de diferencia.
    expect(Math.abs(screen.ankleL.y - (500 - 0.09 * 150))).toBeLessThan(1);
  });

  it('escala un personaje más alto sin cambiarle las proporciones', () => {
    const base = skeletonToScreen(solveSkeleton({}), 0, 0, CHARACTER_HEIGHT_M.hero);
    const heavy = skeletonToScreen(solveSkeleton({}), 0, 0, CHARACTER_HEIGHT_M.heavy);
    const ratio = CHARACTER_HEIGHT_M.heavy / CHARACTER_HEIGHT_M.hero;
    expect(heavy.head.y).toBeCloseTo(base.head.y * ratio, 6);
    expect(heavy.shoulderR.x).toBeCloseTo(base.shoulderR.x * ratio, 6);
  });
});
