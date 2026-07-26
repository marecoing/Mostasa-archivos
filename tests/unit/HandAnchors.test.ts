import { describe, it, expect } from 'vitest';
import {
  HAND_ANCHORS,
  DEFAULT_HAND_ANCHOR,
  handAnchorFor,
  handScreenPosition,
} from '../../src/game/data/HandAnchors';
import { MOSTASA_ANIMS } from '../../src/game/data/AnimationData';

describe('handAnchorFor', () => {
  it('falls back to the resting anchor for an unknown state', () => {
    expect(handAnchorFor('nope')).toBe(DEFAULT_HAND_ANCHOR);
  });

  it('covers every player animation state', () => {
    for (const state of Object.keys(MOSTASA_ANIMS)) {
      expect(HAND_ANCHORS[state], `missing hand anchor for ${state}`).toBeDefined();
    }
  });
});

describe('anchors stay anatomically plausible', () => {
  it('keeps every hand inside the body silhouette', () => {
    for (const [state, a] of Object.entries(HAND_ANCHORS)) {
      // Never behind the body's centre line, never further out than an arm.
      expect(a.x, `${state} x`).toBeGreaterThanOrEqual(0);
      expect(a.x, `${state} x`).toBeLessThanOrEqual(0.45);
      // Never below the floor, never above the head.
      expect(a.y, `${state} y`).toBeGreaterThan(0);
      expect(a.y, `${state} y`).toBeLessThan(0.95);
    }
  });

  it('reaches further forward while attacking than at rest', () => {
    const idle = handAnchorFor('idle');
    for (const state of ['light_1', 'light_2', 'light_3', 'heavy']) {
      expect(handAnchorFor(state).x, `${state} should extend`).toBeGreaterThan(idle.x);
    }
  });

  it('puts the hand near the ground when knocked down', () => {
    expect(handAnchorFor('down').y).toBeLessThan(0.2);
    expect(handAnchorFor('get_up').y).toBeLessThan(handAnchorFor('idle').y);
  });

  it('tucks the hand in during a dodge roll', () => {
    const dodge = handAnchorFor('dodge');
    const idle = handAnchorFor('idle');
    expect(dodge.x).toBeLessThan(idle.x);
    expect(dodge.y).toBeLessThan(idle.y);
  });
});

describe('handScreenPosition', () => {
  it('projects forward in the facing direction and up from the feet', () => {
    const right = handScreenPosition('idle', 100, 500, 260, 1);
    const left = handScreenPosition('idle', 100, 500, 260, -1);
    expect(right.x).toBeGreaterThan(100);
    expect(left.x).toBeLessThan(100);
    expect(right.y).toBeLessThan(500); // screen Y grows downward
    expect(right.y).toBe(left.y);
  });

  it('scales with the rendered body height, not fixed pixels', () => {
    const small = handScreenPosition('light_2', 0, 0, 130, 1);
    const big = handScreenPosition('light_2', 0, 0, 260, 1);
    expect(big.x).toBeCloseTo(small.x * 2, 5);
    expect(big.y).toBeCloseTo(small.y * 2, 5);
  });

  it('mirrors exactly when the fighter turns around', () => {
    const r = handScreenPosition('heavy', 640, 500, 260, 1);
    const l = handScreenPosition('heavy', 640, 500, 260, -1);
    expect(r.x - 640).toBeCloseTo(640 - l.x, 5);
  });
});
