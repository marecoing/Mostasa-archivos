import { describe, it, expect, beforeEach } from 'vitest';
import {
  DIFFICULTIES,
  DIFFICULTY_BY_ID,
  difficultyById,
  cycleDifficulty,
  loadDifficulty,
  saveDifficulty,
} from '../../src/game/data/DifficultyManifest';

describe('DIFFICULTIES integrity', () => {
  it('has unique ids and monotonically rising multipliers', () => {
    const ids = DIFFICULTIES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < DIFFICULTIES.length; i++) {
      const prev = DIFFICULTIES[i - 1]!;
      const cur = DIFFICULTIES[i]!;
      expect(cur.enemyHp).toBeGreaterThanOrEqual(prev.enemyHp);
      expect(cur.enemyDamage).toBeGreaterThanOrEqual(prev.enemyDamage);
      expect(cur.score).toBeGreaterThanOrEqual(prev.score);
    }
    expect(DIFFICULTIES[0]!.score).toBe(1); // Normal is the baseline
  });

  it('by-id lookup maps every entry', () => {
    for (const d of DIFFICULTIES) expect(DIFFICULTY_BY_ID[d.id]).toBe(d);
  });
});

describe('difficultyById / cycleDifficulty', () => {
  it('falls back to normal for unknown ids', () => {
    expect(difficultyById('nope').id).toBe('normal');
  });

  it('cycles through all difficulties and wraps around', () => {
    const seen = new Set<string>();
    let cur = DIFFICULTIES[0]!.id;
    for (let i = 0; i < DIFFICULTIES.length; i++) {
      seen.add(cur);
      cur = cycleDifficulty(cur).id;
    }
    expect(seen.size).toBe(DIFFICULTIES.length);
    expect(cur).toBe(DIFFICULTIES[0]!.id); // wrapped back to start
  });
});

describe('persistence (jsdom localStorage)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('defaults to normal and round-trips a saved choice', () => {
    expect(loadDifficulty().id).toBe('normal');
    saveDifficulty('furia');
    expect(loadDifficulty().id).toBe('furia');
  });

  it('ignores an invalid stored id, falling back to normal', () => {
    saveDifficulty('nonsense'); // sanitised to normal on save
    expect(loadDifficulty().id).toBe('normal');
  });
});
