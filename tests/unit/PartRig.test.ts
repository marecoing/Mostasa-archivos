import { describe, expect, it } from 'vitest';
import { CHARACTER_HEIGHT_M, HERO_HEIGHT_M } from '../../src/game/art/ArtBible';
import { AUTHORING_PPM } from '../../src/game/art/PartSpec';
import { placeParts, specFor } from '../../src/game/art/PartRig';
import { screenScaleFor, skeletonToScreen, solveSkeleton } from '../../src/game/art/Skeleton';
import { ATTACK_1, IDLE, WALK, clipDuration, samplePose } from '../../src/game/art/Poses';

function rig(pose = {}, facing: 1 | -1 = 1, heightM = HERO_HEIGHT_M) {
  const screen = skeletonToScreen(solveSkeleton(pose, facing), 640, 500, heightM);
  return { screen, parts: placeParts(screen, heightM, facing) };
}

describe('montaje de piezas', () => {
  it('coloca las catorce piezas del cuerpo', () => {
    const { parts } = rig();
    expect(parts).toHaveLength(14);
    const ids = parts.map((p) => p.id);
    for (const id of ['cabeza', 'torso', 'brazo', 'antebrazo', 'mano', 'muslo', 'pantorrilla', 'borcegui']) {
      expect(ids, id).toContain(id);
    }
  });

  it('dibuja el lado lejano antes que el torso y el brazo cercano al final', () => {
    const { parts } = rig();
    const lastFar = parts.reduce((last, p, i) => (p.far ? i : last), -1);
    const torso = parts.findIndex((p) => p.id === 'torso');
    const head = parts.findIndex((p) => p.id === 'cabeza');
    const nearArm = parts.map((p, i) => ({ p, i })).filter(({ p }) => p.id === 'brazo' && !p.far);

    expect(lastFar).toBeLessThan(torso);
    expect(head).toBeGreaterThan(torso);
    expect(nearArm[0]!.i).toBeGreaterThan(head);
  });

  it('marca exactamente seis piezas como lejanas: una pierna y un brazo', () => {
    const { parts } = rig();
    expect(parts.filter((p) => p.far)).toHaveLength(6);
  });
});

describe('escala', () => {
  it('lleva el arte de la resolución de autoría a la del juego', () => {
    const { parts } = rig();
    const expected = screenScaleFor(HERO_HEIGHT_M) / AUTHORING_PPM;
    const head = parts.find((p) => p.id === 'cabeza')!;
    expect(head.scale).toBeCloseTo(expected, 10);
  });

  it('estira cada pieza encadenada justo hasta su articulación hija', () => {
    const { screen, parts } = rig();
    const brazo = parts.find((p) => p.id === 'brazo' && !p.far)!;
    const spec = specFor('brazo')!;
    const artLength = Math.hypot(spec.childX! - spec.pivotX, spec.childY! - spec.pivotY);
    const boneLength = Math.hypot(
      screen.elbowR.x - screen.shoulderR.x,
      screen.elbowR.y - screen.shoulderR.y,
    );
    expect(brazo.scale * artLength).toBeCloseTo(boneLength, 8);
  });

  it('escala un personaje más alto sin cambiarle las proporciones', () => {
    const base = rig({}, 1, CHARACTER_HEIGHT_M.hero).parts.find((p) => p.id === 'cabeza')!;
    const heavy = rig({}, 1, CHARACTER_HEIGHT_M.heavy).parts.find((p) => p.id === 'cabeza')!;
    const ratio = CHARACTER_HEIGHT_M.heavy / CHARACTER_HEIGHT_M.hero;
    expect(heavy.scale / base.scale).toBeCloseTo(ratio, 10);
  });
});

describe('orientación', () => {
  it('apunta el torso de la pelvis hacia los hombros', () => {
    const { screen, parts } = rig();
    const torso = parts.find((p) => p.id === 'torso')!;
    const expected =
      Math.atan2(screen.chest.y - screen.pelvis.y, screen.chest.x - screen.pelvis.x) - Math.PI / 2;
    expect(torso.angle).toBeCloseTo(expected, 10);
    expect(torso.x).toBeCloseTo(screen.pelvis.x, 10);
    expect(torso.y).toBeCloseTo(screen.pelvis.y, 10);
  });

  it('hunde la cabeza en el cuello en vez de dejarla flotando', () => {
    const { screen, parts } = rig();
    const head = parts.find((p) => p.id === 'cabeza')!;
    // Queda por debajo de la articulación de la cabeza, hacia el cuello.
    expect(head.y).toBeGreaterThan(screen.head.y);
    expect(head.y - screen.head.y).toBeLessThan(10);
  });

  it('espeja todas las piezas cuando el personaje mira a la izquierda', () => {
    const right = rig({}, 1).parts;
    const left = rig({}, -1).parts;
    expect(right.every((p) => !p.flip)).toBe(true);
    expect(left.every((p) => p.flip)).toBe(true);
  });
});

describe('estabilidad a lo largo de los clips', () => {
  it('nunca produce una escala nula, negativa o infinita', () => {
    for (const clip of [IDLE, WALK, ATTACK_1]) {
      for (let t = 0; t <= clipDuration(clip); t += 1 / 60) {
        for (const p of rig(samplePose(clip, t)).parts) {
          expect(Number.isFinite(p.scale), `${clip.name}/${p.id} @ ${t.toFixed(2)}`).toBe(true);
          expect(p.scale, `${clip.name}/${p.id} @ ${t.toFixed(2)}`).toBeGreaterThan(0);
          expect(Number.isFinite(p.angle)).toBe(true);
        }
      }
    }
  });

  it('mantiene la escala de las piezas encadenadas prácticamente constante', () => {
    // Si una pieza se estirara de golpe entre cuadros, el personaje se
    // deformaría — que es exactamente lo que el rig tiene que impedir.
    const scales: number[] = [];
    for (let t = 0; t <= clipDuration(WALK); t += 1 / 60) {
      const muslo = rig(samplePose(WALK, t)).parts.find((p) => p.id === 'muslo')!;
      scales.push(muslo.scale);
    }
    const min = Math.min(...scales);
    const max = Math.max(...scales);
    expect(max / min).toBeLessThan(1.001);
  });
});
