import { describe, it, expect } from 'vitest';
import {
  groundShadowRings,
  shadowFalloff,
  shadowCoreOpacity,
  SHADOW_SQUASH,
  SHADOW_RINGS,
  SHADOW_MIN_FALLOFF,
} from '../../src/game/systems/GroundShadow';

describe('shadowFalloff', () => {
  it('is full strength on the ground', () => {
    expect(shadowFalloff(0, 200)).toBe(1);
    expect(shadowFalloff(-5, 200)).toBe(1);
  });

  it('fades as the object rises', () => {
    const low = shadowFalloff(40, 200);
    const high = shadowFalloff(150, 200);
    expect(low).toBeLessThan(1);
    expect(high).toBeLessThan(low);
  });

  it('never fades below the readable floor', () => {
    expect(shadowFalloff(100000, 200)).toBe(SHADOW_MIN_FALLOFF);
  });

  it('uses a minimum range so tiny objects still fade smoothly', () => {
    expect(shadowFalloff(60, 10)).toBeGreaterThan(SHADOW_MIN_FALLOFF);
  });
});

describe('groundShadowRings', () => {
  it('emits the configured number of rings, outermost first', () => {
    const rings = groundShadowRings(30, 0, 200);
    expect(rings).toHaveLength(SHADOW_RINGS);
    for (let i = 1; i < rings.length; i++) {
      expect(rings[i]!.rx).toBeLessThan(rings[i - 1]!.rx);
    }
  });

  it('keeps every ring foreshortened to the ground plane', () => {
    for (const r of groundShadowRings(30, 0, 200)) {
      if (r.rx === 0) continue;
      expect(r.ry / r.rx).toBeCloseTo(SHADOW_SQUASH, 5);
    }
  });

  it('composites to a soft contact, not an opaque hole', () => {
    const core = shadowCoreOpacity(groundShadowRings(30, 0, 200));
    expect(core).toBeGreaterThan(0.3); // dark enough to read on wet asphalt
    expect(core).toBeLessThan(0.6); // soft enough to not look like a hole
  });

  it('scales with the footprint', () => {
    const small = groundShadowRings(12, 0, 100)[0]!;
    const big = groundShadowRings(48, 0, 100)[0]!;
    expect(big.rx).toBeGreaterThan(small.rx);
  });

  it('gives even a tiny footprint a visible shadow', () => {
    const rings = groundShadowRings(0, 0, 40);
    expect(rings[0]!.rx).toBeGreaterThanOrEqual(9);
    expect(shadowCoreOpacity(rings)).toBeGreaterThan(0);
  });

  it('spreads wider and lightens when the object is airborne', () => {
    const grounded = groundShadowRings(30, 0, 200);
    const airborne = groundShadowRings(30, 140, 200);
    expect(airborne[0]!.rx).toBeGreaterThan(grounded[0]!.rx);
    expect(shadowCoreOpacity(airborne)).toBeLessThan(shadowCoreOpacity(grounded));
  });

  it('keeps an airborne shadow on screen rather than deleting it', () => {
    const rings = groundShadowRings(30, 5000, 200);
    expect(rings[0]!.rx).toBeGreaterThan(0);
    expect(shadowCoreOpacity(rings)).toBeGreaterThan(0);
  });
});
