import { describe, it, expect } from 'vitest';
import {
  ComboSystem,
  comboMultiplier,
  comboLabel,
  COMBO_TIMEOUT_FRAMES,
} from '../../src/game/systems/ComboSystem';

describe('comboMultiplier', () => {
  it('steps up in bands', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
    expect(comboMultiplier(5)).toBe(1.5);
    expect(comboMultiplier(10)).toBe(2);
    expect(comboMultiplier(20)).toBe(3);
    expect(comboMultiplier(30)).toBe(4);
    expect(comboMultiplier(999)).toBe(4);
  });

  it('is non-decreasing in hit count', () => {
    let prev = 0;
    for (let h = 0; h <= 40; h++) {
      const m = comboMultiplier(h);
      expect(m).toBeGreaterThanOrEqual(prev);
      prev = m;
    }
  });
});

describe('comboLabel', () => {
  it('is empty below the first band and set at milestones', () => {
    expect(comboLabel(0)).toBe('');
    expect(comboLabel(4)).toBe('');
    expect(comboLabel(5)).not.toBe('');
    expect(comboLabel(30)).toBe('¡IMPARABLE!');
  });
});

describe('ComboSystem', () => {
  it('builds hits and refreshes the timer on each hit', () => {
    const c = new ComboSystem();
    expect(c.active).toBe(false);
    c.addHit();
    c.addHit();
    expect(c.count).toBe(2);
    expect(c.active).toBe(true);
    expect(c.timeFraction).toBe(1);
  });

  it('drops to zero after the timeout, exactly once', () => {
    const c = new ComboSystem();
    c.addHit();
    let dropped = false;
    for (let i = 0; i < COMBO_TIMEOUT_FRAMES; i++) {
      dropped = c.tick();
    }
    expect(dropped).toBe(true);
    expect(c.count).toBe(0);
    // subsequent ticks do not re-fire the drop
    expect(c.tick()).toBe(false);
  });

  it('a hit before timeout keeps the chain alive', () => {
    const c = new ComboSystem();
    c.addHit();
    for (let i = 0; i < COMBO_TIMEOUT_FRAMES - 1; i++) c.tick();
    c.addHit(); // refresh just in time
    expect(c.count).toBe(2);
    for (let i = 0; i < COMBO_TIMEOUT_FRAMES - 1; i++) expect(c.tick()).toBe(false);
    expect(c.count).toBe(2);
  });

  it('reset ends the chain immediately', () => {
    const c = new ComboSystem();
    c.addHit();
    c.addHit();
    c.reset();
    expect(c.count).toBe(0);
    expect(c.active).toBe(false);
  });

  it('scoreFor applies the current multiplier', () => {
    const c = new ComboSystem();
    for (let i = 0; i < 10; i++) c.addHit(); // multiplier 2
    expect(c.multiplier).toBe(2);
    expect(c.scoreFor(10)).toBe(20);
  });

  it('tracks the run peak across chains until a full reset', () => {
    const c = new ComboSystem();
    for (let i = 0; i < 7; i++) c.addHit();
    expect(c.maxCombo).toBe(7);
    c.reset(); // getting hit: chain ends, peak survives
    expect(c.count).toBe(0);
    expect(c.maxCombo).toBe(7);
    for (let i = 0; i < 3; i++) c.addHit(); // shorter chain
    expect(c.maxCombo).toBe(7); // peak unchanged
    c.reset(true); // fresh run
    expect(c.maxCombo).toBe(0);
  });
});
