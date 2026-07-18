import { describe, it, expect } from 'vitest';
import { bossBarView, bossBarColor } from '../../src/game/systems/BossBar';
import type { BossBarInput } from '../../src/game/systems/BossBar';

function input(over: Partial<BossBarInput> = {}): BossBarInput {
  return {
    zoneKind: 'boss',
    fighting: true,
    bossHp: 300,
    bossMaxHp: 600,
    bossEnraged: false,
    miniBossLabel: '¡MINI!',
    bossLabel: '¡EL JEFE!',
    ...over,
  };
}

describe('bossBarView', () => {
  it('shows the boss label and clamped fraction in a boss zone', () => {
    const v = bossBarView(input({ bossHp: 300, bossMaxHp: 600 }));
    expect(v.visible).toBe(true);
    expect(v.label).toBe('¡EL JEFE!');
    expect(v.fraction).toBeCloseTo(0.5, 6);
  });

  it('shows the mini-boss label in a mini_boss zone', () => {
    const v = bossBarView(input({ zoneKind: 'mini_boss' }));
    expect(v.visible).toBe(true);
    expect(v.label).toBe('¡MINI!');
  });

  it('is hidden outside boss zones, when not fighting, or with no boss', () => {
    expect(bossBarView(input({ zoneKind: 'oleada' })).visible).toBe(false);
    expect(bossBarView(input({ fighting: false })).visible).toBe(false);
    expect(bossBarView(input({ bossHp: null, bossMaxHp: null })).visible).toBe(false);
    expect(bossBarView(input({ bossMaxHp: 0 })).visible).toBe(false);
  });

  it('clamps the fraction into [0,1]', () => {
    expect(bossBarView(input({ bossHp: -50, bossMaxHp: 600 })).fraction).toBe(0);
    expect(bossBarView(input({ bossHp: 900, bossMaxHp: 600 })).fraction).toBe(1);
  });

  it('passes the enraged flag through', () => {
    expect(bossBarView(input({ bossEnraged: true })).enraged).toBe(true);
  });
});

describe('bossBarColor', () => {
  it('goes green→amber→red as HP drops', () => {
    expect(bossBarColor(0.8, false)).not.toBe(bossBarColor(0.4, false));
    expect(bossBarColor(0.4, false)).not.toBe(bossBarColor(0.1, false));
  });

  it('is a distinct deep red while enraged regardless of fraction', () => {
    expect(bossBarColor(0.9, true)).toBe(bossBarColor(0.1, true));
  });
});
