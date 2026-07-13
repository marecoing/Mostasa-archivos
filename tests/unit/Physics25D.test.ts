import { describe, it, expect } from 'vitest';
import {
  worldToScreen,
  sameDepth,
  applyGravity,
  applyFriction,
  isOnGround,
  clampToBounds,
  DEPTH_SCALE,
  GRAVITY,
  GROUND_Z,
} from '../../src/game/core/Physics25D';
import type { Vec3, Bounds2D } from '../../src/game/core/Physics25D';

describe('worldToScreen', () => {
  it('projects world position to screen correctly with no camera offset', () => {
    const result = worldToScreen(100, 200, 0, 0, 0);
    expect(result.screenX).toBe(100);
    expect(result.screenY).toBeCloseTo(200 * DEPTH_SCALE);
  });

  it('subtracts camera offset from X', () => {
    const result = worldToScreen(300, 100, 0, 100, 0);
    expect(result.screenX).toBe(200);
  });

  it('subtracts worldZ from screenY (elevation raises sprite)', () => {
    const groundScreen = worldToScreen(100, 200, 0, 0, 0);
    const elevatedScreen = worldToScreen(100, 200, 50, 0, 0);
    expect(elevatedScreen.screenY).toBeLessThan(groundScreen.screenY);
  });

  it('handles negative Z correctly', () => {
    const result = worldToScreen(0, 0, -10, 0, 0);
    expect(result.screenY).toBeCloseTo(10);
  });
});

describe('sameDepth', () => {
  it('returns true when difference is within tolerance', () => {
    expect(sameDepth(100, 110, 24)).toBe(true);
  });

  it('returns false when difference exceeds tolerance', () => {
    expect(sameDepth(100, 130, 24)).toBe(false);
  });

  it('returns true when values are equal', () => {
    expect(sameDepth(200, 200, 0)).toBe(true);
  });

  it('is symmetric', () => {
    expect(sameDepth(100, 120, 24)).toBe(sameDepth(120, 100, 24));
  });
});

describe('applyGravity', () => {
  it('decreases Z velocity over time', () => {
    const vel: Vec3 = { x: 0, y: 0, z: 0 };
    const result = applyGravity(vel, 1 / 60);
    expect(result.z).toBeLessThan(0);
    expect(result.z).toBeCloseTo(GRAVITY / 60);
  });

  it('does not affect X or Y velocity', () => {
    const vel: Vec3 = { x: 100, y: 50, z: 200 };
    const result = applyGravity(vel, 1 / 60);
    expect(result.x).toBe(100);
    expect(result.y).toBe(50);
  });

  it('accumulates over multiple steps', () => {
    let vel: Vec3 = { x: 0, y: 0, z: 720 };
    for (let i = 0; i < 60; i++) {
      vel = applyGravity(vel, 1 / 60);
    }
    expect(vel.z).toBeCloseTo(720 + GRAVITY, 0);
  });
});

describe('applyFriction', () => {
  it('reduces positive X velocity toward zero', () => {
    const vel: Vec3 = { x: 280, y: 0, z: 0 };
    const result = applyFriction(vel, 1600, 1 / 60);
    expect(result.x).toBeLessThan(280);
    expect(result.x).toBeGreaterThan(0);
  });

  it('reduces negative X velocity toward zero', () => {
    const vel: Vec3 = { x: -280, y: 0, z: 0 };
    const result = applyFriction(vel, 1600, 1 / 60);
    expect(result.x).toBeGreaterThan(-280);
    expect(result.x).toBeLessThan(0);
  });

  it('clamps to zero instead of overshooting', () => {
    const vel: Vec3 = { x: 1, y: 0, z: 0 };
    const result = applyFriction(vel, 1600, 1 / 60);
    expect(result.x).toBe(0);
  });

  it('does not affect Z velocity', () => {
    const vel: Vec3 = { x: 100, y: 100, z: 500 };
    const result = applyFriction(vel, 1600, 1 / 60);
    expect(result.z).toBe(500);
  });
});

describe('isOnGround', () => {
  it('returns true when Z is zero', () => {
    expect(isOnGround({ x: 0, y: 0, z: GROUND_Z })).toBe(true);
  });

  it('returns false when Z is positive', () => {
    expect(isOnGround({ x: 0, y: 0, z: 10 })).toBe(false);
  });

  it('returns true when Z is slightly below ground (clamped)', () => {
    expect(isOnGround({ x: 0, y: 0, z: -0.001 })).toBe(true);
  });
});

describe('clampToBounds', () => {
  const bounds: Bounds2D = { minX: 0, maxX: 1000, minY: 300, maxY: 600 };

  it('clamps X to minX', () => {
    const result = clampToBounds({ x: -50, y: 400, z: 0 }, bounds);
    expect(result.x).toBe(0);
  });

  it('clamps X to maxX', () => {
    const result = clampToBounds({ x: 1200, y: 400, z: 0 }, bounds);
    expect(result.x).toBe(1000);
  });

  it('clamps Y to minY', () => {
    const result = clampToBounds({ x: 500, y: 100, z: 0 }, bounds);
    expect(result.y).toBe(300);
  });

  it('clamps Y to maxY', () => {
    const result = clampToBounds({ x: 500, y: 800, z: 0 }, bounds);
    expect(result.y).toBe(600);
  });

  it('does not modify Z', () => {
    const result = clampToBounds({ x: 500, y: 400, z: 999 }, bounds);
    expect(result.z).toBe(999);
  });

  it('leaves valid positions unchanged', () => {
    const pos: Vec3 = { x: 500, y: 450, z: 0 };
    const result = clampToBounds(pos, bounds);
    expect(result.x).toBe(500);
    expect(result.y).toBe(450);
  });
});
