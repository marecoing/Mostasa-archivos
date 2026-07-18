import { describe, it, expect } from 'vitest';
import { zoneClearReward, ZONE_CLEAR_BASE, ZONE_PERFECT_BONUS } from '../../src/game/systems/ZoneBonus';

describe('zoneClearReward', () => {
  it('pays only the base when the player took damage', () => {
    const r = zoneClearReward(true);
    expect(r.perfect).toBe(false);
    expect(r.score).toBe(ZONE_CLEAR_BASE);
  });

  it('pays base + perfect bonus for a flawless clear', () => {
    const r = zoneClearReward(false);
    expect(r.perfect).toBe(true);
    expect(r.score).toBe(ZONE_CLEAR_BASE + ZONE_PERFECT_BONUS);
  });

  it('the perfect clear always pays strictly more', () => {
    expect(zoneClearReward(false).score).toBeGreaterThan(zoneClearReward(true).score);
  });
});
