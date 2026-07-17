import { describe, it, expect, beforeEach } from 'vitest';
import {
  emptyProgress,
  isStageUnlocked,
  isStagePlayable,
  withStageCleared,
  loadProgress,
  saveProgress,
  recordStageResult,
} from '../../src/game/data/CampaignProgress';
import { STAGES, stageById } from '../../src/game/data/StageManifest';

const once = stageById('01-once')!;
const stage2 = STAGES.find((s) => s.index === 2)!;
const stage3 = STAGES.find((s) => s.index === 3)!;

describe('isStageUnlocked', () => {
  it('always unlocks the first stage', () => {
    expect(isStageUnlocked(once, [])).toBe(true);
  });

  it('locks later stages until the previous is cleared', () => {
    expect(isStageUnlocked(stage2, [])).toBe(false);
    expect(isStageUnlocked(stage2, ['01-once'])).toBe(true);
    expect(isStageUnlocked(stage3, ['01-once'])).toBe(false);
    expect(isStageUnlocked(stage3, ['01-once', stage2.id])).toBe(true);
  });
});

describe('isStagePlayable', () => {
  it('requires both unlock and runtime-ready art', () => {
    expect(isStagePlayable(once, [])).toBe(true); // once is runtimeReady
    // stage2 is unlocked once Once is cleared, but its art is not runtime-ready
    expect(isStagePlayable(stage2, ['01-once'])).toBe(false);
  });
});

describe('withStageCleared', () => {
  it('records the clear, best score and best rank (pure)', () => {
    const p0 = emptyProgress();
    const p1 = withStageCleared(p0, '01-once', 1000, 'B');
    expect(p1.cleared).toContain('01-once');
    expect(p1.bestScore['01-once']).toBe(1000);
    expect(p1.bestRank['01-once']).toBe('B');
    // original untouched (immutability)
    expect(p0.cleared).toEqual([]);
  });

  it('keeps the better score and rank, not the latest', () => {
    let p = withStageCleared(emptyProgress(), '01-once', 1000, 'B');
    p = withStageCleared(p, '01-once', 500, 'S'); // lower score, higher rank
    expect(p.bestScore['01-once']).toBe(1000);
    expect(p.bestRank['01-once']).toBe('S');
    expect(p.cleared.filter((x) => x === '01-once').length).toBe(1); // no dup
  });
});

describe('persistence (jsdom localStorage)', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  it('round-trips through save/load', () => {
    const p = withStageCleared(emptyProgress(), '01-once', 2500, 'A');
    saveProgress(p);
    const loaded = loadProgress();
    expect(loaded.cleared).toContain('01-once');
    expect(loaded.bestScore['01-once']).toBe(2500);
    expect(loaded.bestRank['01-once']).toBe('A');
  });

  it('returns empty progress when nothing is stored', () => {
    expect(loadProgress()).toEqual(emptyProgress());
  });

  it('recordStageResult persists and unlocks the next stage', () => {
    recordStageResult('01-once', 3000, 'S');
    expect(isStageUnlocked(stage2, loadProgress().cleared)).toBe(true);
  });
});
