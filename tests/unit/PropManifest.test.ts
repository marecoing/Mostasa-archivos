import { describe, it, expect } from 'vitest';
import {
  ONCE_PROPS,
  propsForStage,
  propScreenX,
  allPropIds,
} from '../../src/game/data/PropManifest';

describe('propScreenX', () => {
  it('locks to the street at parallax 1.0', () => {
    expect(propScreenX(1000, 300, 1)).toBe(700);
  });

  it('scrolls slower than the street for a far (back) layer', () => {
    // parallax < 1 → moves less as the camera pans → appears farther away
    const near = propScreenX(1000, 300, 1);
    const far = propScreenX(1000, 300, 0.9);
    expect(far).toBeGreaterThan(near);
  });

  it('scrolls faster than the street for a near (front) layer', () => {
    const locked = propScreenX(1000, 300, 1);
    const front = propScreenX(1000, 300, 1.1);
    expect(front).toBeLessThan(locked);
  });
});

describe('ONCE_PROPS integrity', () => {
  it('has both back and front layers', () => {
    expect(ONCE_PROPS.some((p) => p.layer === 'back')).toBe(true);
    expect(ONCE_PROPS.some((p) => p.layer === 'front')).toBe(true);
  });

  it('uses sane, positive scales and non-negative parallax', () => {
    for (const p of ONCE_PROPS) {
      expect(p.scale).toBeGreaterThan(0);
      expect(p.parallax).toBeGreaterThan(0);
      expect(p.worldX).toBeGreaterThanOrEqual(0);
      if (p.alpha !== undefined) {
        expect(p.alpha).toBeGreaterThan(0);
        expect(p.alpha).toBeLessThanOrEqual(1);
      }
    }
  });

  it('front props sit at street level, below the wall-mounted back props', () => {
    const front = ONCE_PROPS.filter((p) => p.layer === 'front');
    const back = ONCE_PROPS.filter((p) => p.layer === 'back');
    const avgFrontY = front.reduce((s, p) => s + p.groundScreenY, 0) / front.length;
    const avgBackY = back.reduce((s, p) => s + p.groundScreenY, 0) / back.length;
    expect(avgFrontY).toBeGreaterThan(avgBackY);
  });
});

describe('propsForStage / allPropIds', () => {
  it('returns Once props for the once stage and empty for unknown', () => {
    expect(propsForStage('01-once').length).toBe(ONCE_PROPS.length);
    expect(propsForStage('does-not-exist')).toEqual([]);
  });

  it('lists every distinct prop id once', () => {
    const ids = allPropIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of ONCE_PROPS) expect(ids).toContain(p.id);
  });
});
