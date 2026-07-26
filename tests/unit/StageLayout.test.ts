import { describe, it, expect } from 'vitest';
import {
  STAGE_LAYOUTS,
  layoutForStage,
  WALL_MOUNTED_OBJECTS,
  LAYOUT_DEPTH_MIN,
  LAYOUT_DEPTH_MAX,
  LAYOUT_NEAR_BAND,
  LAYOUT_FAR_BAND,
} from '../../src/game/data/StageLayout';
import type { PlacedObject } from '../../src/game/data/StageLayout';
import { STAGES } from '../../src/game/data/StageManifest';

const allObjects = (stageId: string): PlacedObject[] => {
  const l = layoutForStage(stageId);
  return [...l.breakables, ...l.weapons];
};

describe('StageLayout coverage', () => {
  it('defines a layout for every stage in the campaign', () => {
    for (const stage of STAGES) {
      expect(STAGE_LAYOUTS[stage.id], `missing layout for ${stage.id}`).toBeDefined();
    }
  });

  it('returns an empty layout for an unknown stage', () => {
    expect(layoutForStage('nope')).toEqual({ stageId: '', breakables: [], weapons: [] });
  });
});

/**
 * The depth rule from the module header. These assertions are what stops the
 * street from collapsing back onto a single line, which reads as flat 2D.
 */
describe('depth distribution rule', () => {
  for (const stageId of Object.keys(STAGE_LAYOUTS)) {
    describe(stageId, () => {
      it('keeps every object inside the walkable depth band', () => {
        for (const o of allObjects(stageId)) {
          expect(o.y, `${o.id}@${o.x} too far back`).toBeGreaterThanOrEqual(LAYOUT_DEPTH_MIN);
          expect(o.y, `${o.id}@${o.x} too close to camera`).toBeLessThanOrEqual(LAYOUT_DEPTH_MAX);
        }
      });

      it('places objects in the foreground as well as against the wall', () => {
        const ys = allObjects(stageId).map((o) => o.y);
        expect(ys.some((y) => y >= LAYOUT_NEAR_BAND), 'no foreground object').toBe(true);
        expect(ys.some((y) => y <= LAYOUT_FAR_BAND), 'no wall-side object').toBe(true);
      });

      it('spreads objects over a real depth range, not one line', () => {
        const ys = allObjects(stageId).map((o) => o.y);
        expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThanOrEqual(200);
      });

      it('uses at least three distinct depths', () => {
        const ys = allObjects(stageId).map((o) => o.y);
        expect(new Set(ys).size).toBeGreaterThanOrEqual(3);
      });

      it('keeps wall-mounted fixtures against the wall', () => {
        for (const o of allObjects(stageId)) {
          if (!WALL_MOUNTED_OBJECTS.has(o.id)) continue;
          expect(o.y, `${o.id}@${o.x} floated off the facade`).toBeLessThanOrEqual(LAYOUT_FAR_BAND);
        }
      });

      it('never stacks two objects at the same spot', () => {
        const seen = new Set<string>();
        for (const o of allObjects(stageId)) {
          const near = [...seen].some((k) => {
            const [x, y] = k.split(',').map(Number);
            return Math.abs((x ?? 0) - o.x) < 60 && Math.abs((y ?? 0) - o.y) < 60;
          });
          expect(near, `${o.id}@${o.x},${o.y} overlaps another object`).toBe(false);
          seen.add(`${o.x},${o.y}`);
        }
      });
    });
  }
});
