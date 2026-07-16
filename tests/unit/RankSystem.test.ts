import { describe, it, expect } from 'vitest';
import { computeRank, RANK_ORDER, RANK_COLORS } from '../../src/game/data/RankSystem';
import type { StageResult } from '../../src/game/data/RankSystem';

function result(over: Partial<StageResult> = {}): StageResult {
  return { stageId: '01-once', score: 0, hpFraction: 0.5, noDeaths: false, timeSeconds: 300, ...over };
}

describe('computeRank', () => {
  it('gives D for a low, slow, damaged clear', () => {
    expect(computeRank(result({ score: 200, hpFraction: 0.2, noDeaths: false, timeSeconds: 400 }))).toBe('D');
  });

  it('maps score bands to base ranks', () => {
    expect(computeRank(result({ score: 900, timeSeconds: 300, hpFraction: 0.5 }))).toBe('C');
    expect(computeRank(result({ score: 1600, timeSeconds: 300, hpFraction: 0.5 }))).toBe('B');
    expect(computeRank(result({ score: 2300, timeSeconds: 300, hpFraction: 0.5 }))).toBe('A');
  });

  it('bumps rank for a healthy no-death clear', () => {
    const slowDamaged = computeRank(result({ score: 1600, hpFraction: 0.4, noDeaths: false, timeSeconds: 300 }));
    const healthy = computeRank(result({ score: 1600, hpFraction: 0.8, noDeaths: true, timeSeconds: 300 }));
    expect(RANK_ORDER.indexOf(healthy)).toBeGreaterThan(RANK_ORDER.indexOf(slowDamaged));
  });

  it('bumps rank for a fast clear', () => {
    const slow = computeRank(result({ score: 1600, timeSeconds: 300, hpFraction: 0.5, noDeaths: false }));
    const fast = computeRank(result({ score: 1600, timeSeconds: 90, hpFraction: 0.5, noDeaths: false }));
    expect(RANK_ORDER.indexOf(fast)).toBeGreaterThan(RANK_ORDER.indexOf(slow));
  });

  it('awards Rosca only for a flawless, fast, high-score clear', () => {
    expect(computeRank(result({ score: 3200, hpFraction: 1.0, noDeaths: true, timeSeconds: 100 }))).toBe('Rosca');
    // Same score but slower / hurt → at most S
    expect(computeRank(result({ score: 3200, hpFraction: 0.6, noDeaths: false, timeSeconds: 300 }))).toBe('S');
  });

  it('never returns an out-of-range rank', () => {
    for (const r of [computeRank(result({ score: 99999, hpFraction: 1, noDeaths: true, timeSeconds: 1 })),
                     computeRank(result({ score: -50 }))]) {
      expect(RANK_ORDER).toContain(r);
      expect(RANK_COLORS[r]).toBeDefined();
    }
  });
});
