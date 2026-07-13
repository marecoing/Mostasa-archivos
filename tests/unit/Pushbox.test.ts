import { describe, it, expect } from 'vitest';
import {
  pushboxOverlap,
  resolvePushboxes,
  clampEntityToLane,
  buildPlayerPushbox,
  buildEnemyPushbox,
} from '../../src/game/core/Pushbox';
import type { Pushbox, StageLane } from '../../src/game/core/Pushbox';

describe('pushboxOverlap', () => {
  it('returns true when boxes overlap in both axes', () => {
    const a: Pushbox = { x: 0, y: 0, halfW: 20, halfD: 18 };
    const b: Pushbox = { x: 10, y: 10, halfW: 20, halfD: 18 };
    expect(pushboxOverlap(a, b)).toBe(true);
  });

  it('returns false when boxes are separated on X', () => {
    const a: Pushbox = { x: 0, y: 0, halfW: 20, halfD: 18 };
    const b: Pushbox = { x: 50, y: 0, halfW: 20, halfD: 18 };
    expect(pushboxOverlap(a, b)).toBe(false);
  });

  it('returns false when boxes are separated on Y', () => {
    const a: Pushbox = { x: 0, y: 0, halfW: 20, halfD: 18 };
    const b: Pushbox = { x: 0, y: 50, halfW: 20, halfD: 18 };
    expect(pushboxOverlap(a, b)).toBe(false);
  });

  it('returns false when boxes touch exactly (not overlapping)', () => {
    const a: Pushbox = { x: 0, y: 0, halfW: 20, halfD: 18 };
    const b: Pushbox = { x: 40, y: 0, halfW: 20, halfD: 18 };
    expect(pushboxOverlap(a, b)).toBe(false);
  });

  it('returns true for identical positions', () => {
    const a: Pushbox = { x: 100, y: 100, halfW: 10, halfD: 10 };
    const b: Pushbox = { x: 100, y: 100, halfW: 10, halfD: 10 };
    expect(pushboxOverlap(a, b)).toBe(true);
  });
});

describe('resolvePushboxes', () => {
  it('returns original positions when no overlap', () => {
    const a: Pushbox = { x: 0, y: 0, halfW: 20, halfD: 18 };
    const b: Pushbox = { x: 100, y: 0, halfW: 20, halfD: 18 };
    const res = resolvePushboxes(a, b);
    expect(res.ax).toBe(0);
    expect(res.bx).toBe(100);
  });

  it('resolves X overlap by pushing apart symmetrically', () => {
    const a: Pushbox = { x: 0, y: 0, halfW: 20, halfD: 18 };
    const b: Pushbox = { x: 30, y: 0, halfW: 20, halfD: 18 };
    const res = resolvePushboxes(a, b);
    expect(res.ax).toBeLessThan(0);
    expect(res.bx).toBeGreaterThan(30);
    expect(res.ay).toBe(0);
    expect(res.by).toBe(0);
  });

  it('resolves Y overlap when Y overlap is smaller', () => {
    const a: Pushbox = { x: 0, y: 0, halfW: 40, halfD: 5 };
    const b: Pushbox = { x: 5, y: 8, halfW: 40, halfD: 5 };
    const res = resolvePushboxes(a, b);
    expect(res.ay).toBeLessThan(0);
    expect(res.by).toBeGreaterThan(8);
  });

  it('resolves so that resolved positions no longer overlap', () => {
    const a: Pushbox = { x: 0, y: 0, halfW: 20, halfD: 18 };
    const b: Pushbox = { x: 15, y: 5, halfW: 20, halfD: 18 };
    const res = resolvePushboxes(a, b);
    const resolvedA: Pushbox = { x: res.ax, y: res.ay, halfW: 20, halfD: 18 };
    const resolvedB: Pushbox = { x: res.bx, y: res.by, halfW: 20, halfD: 18 };
    expect(pushboxOverlap(resolvedA, resolvedB)).toBe(false);
  });
});

describe('clampEntityToLane', () => {
  const lane: StageLane = { minX: 0, maxX: 800, minY: 380, maxY: 590 };

  it('does not move entity already inside lane', () => {
    const res = clampEntityToLane(400, 480, 20, 18, lane);
    expect(res.x).toBe(400);
    expect(res.y).toBe(480);
  });

  it('clamps X at left boundary including halfW', () => {
    const res = clampEntityToLane(-50, 480, 20, 18, lane);
    expect(res.x).toBe(20);
  });

  it('clamps X at right boundary including halfW', () => {
    const res = clampEntityToLane(900, 480, 20, 18, lane);
    expect(res.x).toBe(780);
  });

  it('clamps Y at top boundary including halfD', () => {
    const res = clampEntityToLane(400, 300, 20, 18, lane);
    expect(res.y).toBe(398);
  });

  it('clamps Y at bottom boundary including halfD', () => {
    const res = clampEntityToLane(400, 700, 20, 18, lane);
    expect(res.y).toBe(572);
  });
});

describe('buildPlayerPushbox', () => {
  it('creates pushbox with correct default dimensions', () => {
    const pb = buildPlayerPushbox(100, 200);
    expect(pb.x).toBe(100);
    expect(pb.y).toBe(200);
    expect(pb.halfW).toBe(20);
    expect(pb.halfD).toBe(18);
  });
});

describe('buildEnemyPushbox', () => {
  it('creates pushbox with default dimensions', () => {
    const pb = buildEnemyPushbox(50, 100);
    expect(pb.halfW).toBe(18);
    expect(pb.halfD).toBe(16);
  });

  it('accepts custom dimensions', () => {
    const pb = buildEnemyPushbox(50, 100, 30, 25);
    expect(pb.halfW).toBe(30);
    expect(pb.halfD).toBe(25);
  });
});
