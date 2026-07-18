import { describe, it, expect } from 'vitest';
import { impactScale, crossedComboBand, usesHeavyShake } from '../../src/game/systems/ComboFeedback';
import { comboMultiplier } from '../../src/game/systems/ComboSystem';

describe('impactScale', () => {
  it('is 1.0 at the base multiplier and grows with it', () => {
    expect(impactScale(1)).toBeCloseTo(1.0, 6);
    expect(impactScale(1.5)).toBeCloseTo(1.1, 6);
    expect(impactScale(2)).toBeCloseTo(1.2, 6);
    expect(impactScale(4)).toBeCloseTo(1.6, 6);
  });

  it('is monotonic in the multiplier', () => {
    let prev = 0;
    for (const m of [1, 1.5, 2, 3, 4]) {
      const s = impactScale(m);
      expect(s).toBeGreaterThan(prev);
      prev = s;
    }
  });
});

describe('crossedComboBand', () => {
  it('is true exactly at the band thresholds (5, 10, 20, 30)', () => {
    for (const n of [5, 10, 20, 30]) {
      expect(crossedComboBand(n), `expected band cross at ${n}`).toBe(true);
    }
  });

  it('is false at non-threshold counts and at 0/1', () => {
    for (const n of [0, 1, 2, 4, 6, 11, 19, 21, 40]) {
      expect(crossedComboBand(n), `unexpected band cross at ${n}`).toBe(false);
    }
  });

  it('matches an actual multiplier increase', () => {
    for (let n = 2; n <= 40; n++) {
      const expected = comboMultiplier(n) > comboMultiplier(n - 1);
      expect(crossedComboBand(n)).toBe(expected);
    }
  });
});

describe('usesHeavyShake', () => {
  it('kicks in from the x2 band', () => {
    expect(usesHeavyShake(1)).toBe(false);
    expect(usesHeavyShake(1.5)).toBe(false);
    expect(usesHeavyShake(2)).toBe(true);
    expect(usesHeavyShake(4)).toBe(true);
  });
});
