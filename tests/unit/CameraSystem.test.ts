import { describe, it, expect, beforeEach } from 'vitest';
import {
  CameraSystem,
  createDefaultCameraConfig,
  SHAKE_LIGHT,
  SHAKE_MEDIUM,
  SHAKE_HEAVY,
  SHAKE_BOSS,
} from '../../src/game/systems/CameraSystem';
import type { CameraConfig } from '../../src/game/systems/CameraSystem';

function makeConfig(overrides: Partial<CameraConfig> = {}): CameraConfig {
  return {
    followLerpX: 1,
    followLerpY: 1,
    softPadLeft: 200,
    softPadRight: 120,
    stageMinX: 0,
    stageMaxX: 2400,
    viewportW: 1280,
    viewportH: 720,
    ...overrides,
  };
}

describe('CameraSystem.follow + update', () => {
  it('moves toward entity after update', () => {
    const cam = new CameraSystem(makeConfig());
    cam.follow(600, 480);
    cam.update(16);
    expect(cam.worldX).toBeGreaterThan(0);
  });

  it('with lerpX=1, snaps immediately to target', () => {
    const cam = new CameraSystem(makeConfig({ followLerpX: 1 }));
    cam.follow(600, 480);
    cam.update(16);
    const expectedX = Math.max(0, Math.min(2400 - 1280 + 120, 600 - 200));
    expect(cam.worldX).toBeCloseTo(expectedX, 0);
  });

  it('clamps at 0 when entity is at left edge', () => {
    const cam = new CameraSystem(makeConfig({ followLerpX: 1 }));
    cam.follow(0, 480);
    cam.update(16);
    expect(cam.worldX).toBeGreaterThanOrEqual(0);
  });

  it('clamps at max when entity is far right', () => {
    const cam = new CameraSystem(makeConfig({ followLerpX: 1 }));
    cam.follow(9999, 480);
    cam.update(16);
    expect(cam.worldX).toBeLessThanOrEqual(2400 - 1280);
  });

  it('does not move when locked', () => {
    const cam = new CameraSystem(makeConfig());
    cam.snapTo(500);
    cam.lock(500, 500);
    cam.follow(9999, 480);
    cam.update(16);
    expect(cam.worldX).toBeCloseTo(500, 0);
  });
});

describe('CameraSystem.snapTo', () => {
  it('instantly positions camera at given worldX', () => {
    const cam = new CameraSystem(makeConfig());
    cam.snapTo(300);
    expect(cam.worldX).toBe(300);
  });

  it('clamps snapTo at max', () => {
    const cam = new CameraSystem(makeConfig());
    cam.snapTo(99999);
    expect(cam.worldX).toBeLessThanOrEqual(2400 - 1280);
  });

  it('clamps snapTo at 0', () => {
    const cam = new CameraSystem(makeConfig());
    cam.snapTo(-100);
    expect(cam.worldX).toBe(0);
  });
});

describe('CameraSystem.lock / unlock', () => {
  it('isLocked returns true after lock()', () => {
    const cam = new CameraSystem(makeConfig());
    cam.lock(0, 500);
    expect(cam.isLocked).toBe(true);
  });

  it('isLocked returns false after unlock()', () => {
    const cam = new CameraSystem(makeConfig());
    cam.lock(0, 500);
    cam.unlock();
    expect(cam.isLocked).toBe(false);
  });

  it('clamps worldX within lock range', () => {
    const cam = new CameraSystem(makeConfig());
    cam.snapTo(800);
    cam.lock(100, 600);
    expect(cam.worldX).toBeLessThanOrEqual(600);
    expect(cam.worldX).toBeGreaterThanOrEqual(100);
  });
});

describe('CameraSystem.triggerShake', () => {
  it('adds shake offset after triggerShake + update', () => {
    const cam = new CameraSystem(makeConfig());
    cam.triggerShake(SHAKE_HEAVY);
    cam.update(16);
    const hasOffset = Math.abs(cam.worldX) > 0 || Math.abs(cam.worldY) > 0;
    expect(hasOffset).toBe(true);
  });

  it('ignores weaker shake when stronger is active', () => {
    const cam = new CameraSystem(makeConfig());
    cam.triggerShake(SHAKE_BOSS);
    cam.triggerShake(SHAKE_LIGHT);
    cam.update(16);
    const xOffset = Math.abs(cam.worldX);
    expect(xOffset).toBeLessThanOrEqual(SHAKE_BOSS.intensity + 1);
  });

  it('shake clears after duration expires', () => {
    const cam = new CameraSystem(makeConfig());
    cam.triggerShake(SHAKE_LIGHT);
    cam.update(200);
    expect(cam.worldX).toBe(0);
    expect(cam.worldY).toBe(0);
  });
});

describe('shake profiles', () => {
  it('SHAKE_LIGHT has lower intensity than SHAKE_MEDIUM', () => {
    expect(SHAKE_LIGHT.intensity).toBeLessThan(SHAKE_MEDIUM.intensity);
  });

  it('SHAKE_BOSS has highest intensity', () => {
    expect(SHAKE_BOSS.intensity).toBeGreaterThan(SHAKE_HEAVY.intensity);
  });

  it('all profiles have decay=true', () => {
    expect(SHAKE_LIGHT.decay).toBe(true);
    expect(SHAKE_MEDIUM.decay).toBe(true);
    expect(SHAKE_HEAVY.decay).toBe(true);
    expect(SHAKE_BOSS.decay).toBe(true);
  });
});

describe('createDefaultCameraConfig', () => {
  it('creates config with expected defaults', () => {
    const cfg = createDefaultCameraConfig(2400, 1280, 720);
    expect(cfg.followLerpX).toBe(0.08);
    expect(cfg.stageMaxX).toBe(2400);
    expect(cfg.viewportW).toBe(1280);
    expect(cfg.viewportH).toBe(720);
  });
});
