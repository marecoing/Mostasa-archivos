import { describe, it, expect } from 'vitest';
import {
  zoneClearReward,
  perfectStreakMultiplier,
  ZONE_CLEAR_BASE,
  ZONE_PERFECT_BONUS,
} from '../../src/game/systems/ZoneBonus';

describe('zoneClearReward', () => {
  it('pays only the base and breaks the streak when the player took damage', () => {
    const r = zoneClearReward(true, 4);
    expect(r.perfect).toBe(false);
    expect(r.score).toBe(ZONE_CLEAR_BASE);
    expect(r.streak).toBe(0);
    expect(r.multiplier).toBe(1);
  });

  it('pays base + perfect bonus for the first flawless clear', () => {
    const r = zoneClearReward(false, 0);
    expect(r.perfect).toBe(true);
    expect(r.streak).toBe(1);
    expect(r.multiplier).toBe(1);
    expect(r.score).toBe(ZONE_CLEAR_BASE + ZONE_PERFECT_BONUS);
  });

  it('the perfect clear always pays strictly more', () => {
    expect(zoneClearReward(false, 0).score).toBeGreaterThan(zoneClearReward(true, 0).score);
  });
});

describe('perfectStreakMultiplier', () => {
  it('ramps 1 → 1.5 → 2 and caps', () => {
    expect(perfectStreakMultiplier(1)).toBe(1);
    expect(perfectStreakMultiplier(2)).toBe(1.5);
    expect(perfectStreakMultiplier(3)).toBe(2);
    expect(perfectStreakMultiplier(10)).toBe(2);
  });

  it('grows the reward with the streak', () => {
    const s1 = zoneClearReward(false, 0); // streak 1, x1
    const s2 = zoneClearReward(false, 1); // streak 2, x1.5
    const s3 = zoneClearReward(false, 2); // streak 3, x2
    expect(s2.score).toBeGreaterThan(s1.score);
    expect(s3.score).toBeGreaterThan(s2.score);
    expect(s3.score).toBe(ZONE_CLEAR_BASE + ZONE_PERFECT_BONUS * 2);
  });
});
