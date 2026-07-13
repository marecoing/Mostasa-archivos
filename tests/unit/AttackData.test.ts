import { describe, it, expect } from 'vitest';
import {
  ATTACKS,
  getTotalFrames,
  isActiveFrame,
  isStartupFrame,
  isRecoveryFrame,
} from '../../src/game/data/AttackData';

describe('ATTACKS definitions', () => {
  it('defines all five attacks', () => {
    expect(Object.keys(ATTACKS)).toContain('light_1');
    expect(Object.keys(ATTACKS)).toContain('light_2');
    expect(Object.keys(ATTACKS)).toContain('light_3');
    expect(Object.keys(ATTACKS)).toContain('heavy');
    expect(Object.keys(ATTACKS)).toContain('air_attack');
  });

  it('light attack chain escalates in damage', () => {
    const l1 = ATTACKS['light_1'];
    const l2 = ATTACKS['light_2'];
    const l3 = ATTACKS['light_3'];
    expect(l1).toBeDefined();
    expect(l2).toBeDefined();
    expect(l3).toBeDefined();
    if (!l1 || !l2 || !l3) return;
    expect(l2.damage).toBeGreaterThan(l1.damage);
    expect(l3.damage).toBeGreaterThan(l2.damage);
  });

  it('heavy has more damage than any light', () => {
    const heavy = ATTACKS['heavy'];
    const l3 = ATTACKS['light_3'];
    expect(heavy).toBeDefined();
    expect(l3).toBeDefined();
    if (!heavy || !l3) return;
    expect(heavy.damage).toBeGreaterThan(l3.damage);
  });
});

describe('getTotalFrames', () => {
  it('returns startup + active + recovery', () => {
    const def = ATTACKS['light_1'];
    if (!def) throw new Error('missing');
    expect(getTotalFrames(def)).toBe(def.startupFrames + def.activeFrames + def.recoveryFrames);
  });

  it('heavy has more total frames than light_1', () => {
    const heavy = ATTACKS['heavy'];
    const l1 = ATTACKS['light_1'];
    if (!heavy || !l1) throw new Error('missing');
    expect(getTotalFrames(heavy)).toBeGreaterThan(getTotalFrames(l1));
  });
});

describe('isStartupFrame', () => {
  it('returns true for frame 0', () => {
    const def = ATTACKS['light_1'];
    if (!def) throw new Error('missing');
    expect(isStartupFrame(def, 0)).toBe(true);
  });

  it('returns false once past startup', () => {
    const def = ATTACKS['light_1'];
    if (!def) throw new Error('missing');
    expect(isStartupFrame(def, def.startupFrames)).toBe(false);
  });
});

describe('isActiveFrame', () => {
  it('false during startup', () => {
    const def = ATTACKS['light_1'];
    if (!def) throw new Error('missing');
    expect(isActiveFrame(def, 0)).toBe(false);
  });

  it('true at first active frame', () => {
    const def = ATTACKS['light_1'];
    if (!def) throw new Error('missing');
    expect(isActiveFrame(def, def.startupFrames)).toBe(true);
  });

  it('true during active window', () => {
    const def = ATTACKS['light_1'];
    if (!def) throw new Error('missing');
    for (let f = def.startupFrames; f < def.startupFrames + def.activeFrames; f++) {
      expect(isActiveFrame(def, f)).toBe(true);
    }
  });

  it('false after active window ends', () => {
    const def = ATTACKS['light_1'];
    if (!def) throw new Error('missing');
    expect(isActiveFrame(def, def.startupFrames + def.activeFrames)).toBe(false);
  });
});

describe('isRecoveryFrame', () => {
  it('false during startup and active', () => {
    const def = ATTACKS['heavy'];
    if (!def) throw new Error('missing');
    expect(isRecoveryFrame(def, 0)).toBe(false);
    expect(isRecoveryFrame(def, def.startupFrames)).toBe(false);
  });

  it('true at first recovery frame', () => {
    const def = ATTACKS['heavy'];
    if (!def) throw new Error('missing');
    const firstRecovery = def.startupFrames + def.activeFrames;
    expect(isRecoveryFrame(def, firstRecovery)).toBe(true);
  });

  it('false at total frames (attack over)', () => {
    const def = ATTACKS['heavy'];
    if (!def) throw new Error('missing');
    expect(isRecoveryFrame(def, getTotalFrames(def))).toBe(false);
  });
});
