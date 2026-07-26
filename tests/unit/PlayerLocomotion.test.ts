import { describe, it, expect } from 'vitest';
import {
  locomotionMode,
  gaitSpeeds,
  resolveLocomotion,
  WALK_SPEED_X,
  WALK_SPEED_Y,
  RUN_SPEED_X,
  RUN_SPEED_Y,
  FRICTION,
  DODGE_FRICTION_SCALE,
  STUN_FRICTION_SCALE,
} from '../../src/game/player/PlayerLocomotion';
import type { MoveIntent } from '../../src/game/player/PlayerLocomotion';

const DT = 1 / 60;
const still: MoveIntent = { left: false, right: false, up: false, down: false, run: false };
const intent = (o: Partial<MoveIntent>): MoveIntent => ({ ...still, ...o });

describe('locomotionMode', () => {
  it('prefers free movement whenever the state allows it', () => {
    expect(locomotionMode(true, false, false)).toBe('free');
    expect(locomotionMode(true, true, true)).toBe('free');
  });

  it('falls through dodge, then stun, then locked', () => {
    expect(locomotionMode(false, true, false)).toBe('dodge');
    expect(locomotionMode(false, false, true)).toBe('stunned');
    expect(locomotionMode(false, false, false)).toBe('locked');
  });
});

describe('gaitSpeeds', () => {
  it('runs faster than it walks on both axes', () => {
    expect(gaitSpeeds(false)).toEqual({ x: WALK_SPEED_X, y: WALK_SPEED_Y });
    expect(gaitSpeeds(true)).toEqual({ x: RUN_SPEED_X, y: RUN_SPEED_Y });
    expect(RUN_SPEED_X).toBeGreaterThan(WALK_SPEED_X);
    expect(RUN_SPEED_Y).toBeGreaterThan(WALK_SPEED_Y);
  });

  it('keeps depth slower than horizontal so diagonals stay controllable', () => {
    expect(WALK_SPEED_Y).toBeLessThan(WALK_SPEED_X);
    expect(RUN_SPEED_Y).toBeLessThan(RUN_SPEED_X);
  });
});

describe('free steering', () => {
  it('sets velocity outright rather than accelerating', () => {
    const r = resolveLocomotion('free', intent({ right: true }), { x: 0, y: 0 }, DT);
    expect(r.velocity.x).toBe(WALK_SPEED_X);
  });

  it('turns the fighter to face the direction steered', () => {
    expect(resolveLocomotion('free', intent({ right: true }), { x: 0, y: 0 }, DT).facing).toBe(1);
    expect(resolveLocomotion('free', intent({ left: true }), { x: 0, y: 0 }, DT).facing).toBe(-1);
  });

  it('does not change facing when only moving in depth', () => {
    const r = resolveLocomotion('free', intent({ up: true }), { x: 0, y: 0 }, DT);
    expect(r.facing).toBeNull();
    expect(r.velocity.y).toBe(-WALK_SPEED_Y);
  });

  it('lets left win over right when both are held, without flip-flopping', () => {
    const r = resolveLocomotion('free', intent({ left: true, right: true }), { x: 0, y: 0 }, DT);
    expect(r.velocity.x).toBe(-WALK_SPEED_X);
    expect(r.facing).toBe(-1);
  });

  it('applies run speed only while run is held', () => {
    const walk = resolveLocomotion('free', intent({ right: true }), { x: 0, y: 0 }, DT);
    const run = resolveLocomotion('free', intent({ right: true, run: true }), { x: 0, y: 0 }, DT);
    expect(run.velocity.x).toBeGreaterThan(walk.velocity.x);
  });

  it('steers each axis independently', () => {
    const r = resolveLocomotion('free', intent({ right: true, down: true }), { x: 0, y: 0 }, DT);
    expect(r.velocity.x).toBe(WALK_SPEED_X);
    expect(r.velocity.y).toBe(WALK_SPEED_Y);
  });

  it('coasts an axis to a stop once its direction is released', () => {
    const moving = { x: WALK_SPEED_X, y: 0 };
    const r = resolveLocomotion('free', still, moving, DT);
    expect(r.velocity.x).toBeLessThan(moving.x);
    expect(r.velocity.x).toBeGreaterThanOrEqual(0);
  });

  it('reaches a full stop instead of drifting forever', () => {
    let v = { x: RUN_SPEED_X, y: RUN_SPEED_Y };
    for (let i = 0; i < 120; i++) v = resolveLocomotion('free', still, v, DT).velocity;
    expect(v).toEqual({ x: 0, y: 0 });
  });

  it('keeps steering one axis while the other coasts', () => {
    const r = resolveLocomotion('free', intent({ up: true }), { x: WALK_SPEED_X, y: 0 }, DT);
    expect(r.velocity.y).toBe(-WALK_SPEED_Y);
    expect(r.velocity.x).toBeGreaterThan(0);
    expect(r.velocity.x).toBeLessThan(WALK_SPEED_X);
  });
});

describe('committed states', () => {
  it('plants the fighter completely while locked', () => {
    const r = resolveLocomotion('locked', intent({ right: true, run: true }), { x: 300, y: 90 }, DT);
    expect(r.velocity).toEqual({ x: 0, y: 0 });
    expect(r.facing).toBeNull();
  });

  it('ignores steering during a dodge roll', () => {
    const r = resolveLocomotion('dodge', intent({ left: true }), { x: 640, y: 0 }, DT);
    expect(r.velocity.x).toBeGreaterThan(0); // still carried by the launch
    expect(r.facing).toBeNull();
  });

  it('glides further in a dodge than a normal stop would', () => {
    const start = { x: 640, y: 0 };
    const rolling = resolveLocomotion('dodge', still, start, DT).velocity.x;
    const stopping = resolveLocomotion('free', still, start, DT).velocity.x;
    expect(rolling).toBeGreaterThan(stopping);
  });

  it('carries knockback while stunned and lets it decay', () => {
    const start = { x: 260, y: 0 };
    const r = resolveLocomotion('stunned', intent({ left: true }), start, DT);
    expect(r.velocity.x).toBeGreaterThan(0);
    expect(r.velocity.x).toBeLessThan(start.x);
  });

  it('uses the documented friction scales', () => {
    const start = { x: 600, y: 0 };
    const dodge = resolveLocomotion('dodge', still, start, DT).velocity.x;
    const stun = resolveLocomotion('stunned', still, start, DT).velocity.x;
    expect(dodge).toBeCloseTo(start.x - FRICTION * DODGE_FRICTION_SCALE * DT, 5);
    expect(stun).toBeCloseTo(start.x - FRICTION * STUN_FRICTION_SCALE * DT, 5);
  });
});
