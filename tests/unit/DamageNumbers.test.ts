import { describe, it, expect } from 'vitest';
import { damageStyle } from '../../src/game/systems/DamageNumbers';

describe('damageStyle', () => {
  it('maps damage bands to distinct colours', () => {
    const light = damageStyle(5);
    const mid = damageStyle(12);
    const heavy = damageStyle(20);
    const huge = damageStyle(35);
    const colors = new Set([light.color, mid.color, heavy.color, huge.color]);
    expect(colors.size).toBe(4); // all four bands are visually distinct
  });

  it('grows the font size with damage (non-decreasing)', () => {
    let prev = 0;
    for (const d of [1, 5, 10, 18, 30, 99]) {
      const s = damageStyle(d);
      expect(s.size).toBeGreaterThanOrEqual(prev);
      prev = s.size;
    }
  });

  it('uses the biggest, hottest style for the highest band', () => {
    const huge = damageStyle(50);
    expect(huge.size).toBe(26);
    expect(huge.color).toBe('#ff4433');
  });

  it('handles the band boundaries', () => {
    expect(damageStyle(10).size).toBe(18);
    expect(damageStyle(9).size).toBe(15);
    expect(damageStyle(18).size).toBe(22);
    expect(damageStyle(30).size).toBe(26);
  });
});
