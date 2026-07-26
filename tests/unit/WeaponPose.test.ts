import { describe, it, expect } from 'vitest';
import {
  WEAPON_POSES,
  ROD_ELONGATION,
  poseFor,
  weaponAngle,
} from '../../src/game/data/WeaponPose';
import { WEAPONS } from '../../src/game/data/ItemManifest';

describe('WEAPON_POSES coverage', () => {
  it('describes every weapon the game can equip', () => {
    for (const id of Object.keys(WEAPONS)) {
      expect(poseFor(id), `missing pose for ${id}`).toBeDefined();
    }
  });

  it('only re-orients silhouettes that actually read as rods', () => {
    for (const [id, p] of Object.entries(WEAPON_POSES)) {
      if (p.orient) {
        expect(p.elongation, `${id} oriented but not rod-like`).toBeGreaterThanOrEqual(
          ROD_ELONGATION,
        );
      }
    }
  });

  it('keeps measured axes inside the range atan2 can return', () => {
    for (const [id, p] of Object.entries(WEAPON_POSES)) {
      expect(p.artAxisDeg, `${id}`).toBeGreaterThanOrEqual(-90);
      expect(p.artAxisDeg, `${id}`).toBeLessThanOrEqual(90);
      expect(p.elongation, `${id}`).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('weaponAngle', () => {
  it('rotates a rod from its art axis to the intended axis', () => {
    // The pipe is drawn along -54.8 and should be carried at +20.
    expect(weaponAngle('tubo_metalico', false, false)).toBeCloseTo(20 - -54.8, 5);
    expect(weaponAngle('tubo_metalico', true, false)).toBeCloseTo(-5 - -54.8, 5);
  });

  it('inverts the rotation when the sprite is mirrored', () => {
    const right = weaponAngle('tubo_metalico', false, false);
    const left = weaponAngle('tubo_metalico', false, true);
    expect(left).toBeCloseTo(-right, 5);
  });

  it('leaves compact props at their authored angle', () => {
    for (const id of ['maletin_pesado', 'tapa_tacho', 'silla_plastico', 'cadena_oxidada']) {
      expect(weaponAngle(id, false, false), id).toBe(0);
      expect(weaponAngle(id, true, true), id).toBe(0);
    }
  });

  it('returns no rotation for an unknown weapon instead of throwing', () => {
    expect(weaponAngle('no_existe', true, false)).toBe(0);
  });

  it('never leaves a rod standing on end while carried', () => {
    // A carried rod should read as angled, not vertical: the resulting axis is
    // artAxis + rotation, which must stay well away from +/-90.
    for (const [id, p] of Object.entries(WEAPON_POSES)) {
      if (!p.orient || id === 'botella_vidrio') continue; // a bottle is upright by design
      const resultingAxis = p.artAxisDeg + weaponAngle(id, false, false);
      expect(Math.abs(resultingAxis), `${id} carried axis`).toBeLessThan(45);
    }
  });
});
