import { describe, it, expect } from 'vitest';
import { resolveSolids, overlapsAnySolid } from '../../src/game/core/Solids';
import type { SolidVolume } from '../../src/game/core/Solids';

const crate: SolidVolume = { x: 100, y: 100, halfW: 34, halfD: 22, height: 55 };

describe('resolveSolids', () => {
  it('leaves a non-overlapping entity untouched', () => {
    const r = resolveSolids(300, 300, 20, 18, 0, [crate]);
    expect(r).toEqual({ x: 300, y: 300 });
  });

  it('pushes out along X when X penetration is smaller', () => {
    // entity slightly inside the crate's right edge
    const r = resolveSolids(140, 100, 20, 18, 0, [crate]);
    expect(r.x).toBe(154); // 100 + 34 + 20
    expect(r.y).toBe(100);
  });

  it('pushes out along Y when Y penetration is smaller', () => {
    const r = resolveSolids(100, 135, 20, 18, 0, [crate]);
    expect(r.y).toBe(140); // 100 + 22 + 18
    expect(r.x).toBe(100);
  });

  it('pushes left/up for entities on the negative side', () => {
    const left = resolveSolids(60, 100, 20, 18, 0, [crate]);
    expect(left.x).toBe(46); // 100 - 34 - 20
    const above = resolveSolids(100, 65, 20, 18, 0, [crate]);
    expect(above.y).toBe(60); // 100 - 22 - 18
  });

  it('lets an airborne entity pass over a low obstacle', () => {
    const r = resolveSolids(100, 100, 20, 18, 80, [crate]);
    expect(r).toEqual({ x: 100, y: 100 }); // z 80 > height 55
  });

  it('still blocks below the obstacle height', () => {
    const r = resolveSolids(140, 100, 20, 18, 30, [crate]);
    expect(r.x).toBe(154);
  });

  it('settles clear of two nearby solids', () => {
    const wall: SolidVolume = { x: 220, y: 100, halfW: 10, halfD: 60, height: 200 };
    const r = resolveSolids(140, 100, 20, 18, 0, [crate, wall]);
    expect(overlapsAnySolid(r.x, r.y, 20, 18, [crate, wall])).toBe(false);
  });
});

describe('overlapsAnySolid', () => {
  it('detects footprint overlap and clear space', () => {
    expect(overlapsAnySolid(120, 110, 20, 18, [crate])).toBe(true);
    expect(overlapsAnySolid(300, 300, 20, 18, [crate])).toBe(false);
  });
});
