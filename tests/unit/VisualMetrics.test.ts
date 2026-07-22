import { describe, expect, it } from 'vitest';
import { BREAKABLE_LIST } from '../../src/game/data/BreakableManifest';
import { PICKUPS, REWARDS, WEAPONS } from '../../src/game/data/ItemManifest';
import { allPropIds } from '../../src/game/data/PropManifest';
import {
  BREAKABLE_VISUALS,
  CHARACTER_REFERENCE_HEIGHTS,
  HUD_DEPTH,
  PICKUP_VISUALS,
  PROP_VISUALS,
  WEAPON_VISUALS,
  characterOriginY,
  characterScaleForTarget,
  isOccludingFighter,
  propScaleFor,
  rectsIntersect,
  scaleForVisibleHeight,
  visualScale,
} from '../../src/game/data/VisualMetrics';

describe('visible-height scaling', () => {
  it('derives scale from the opaque subject rather than the texture canvas', () => {
    expect(scaleForVisibleHeight(260, 200)).toBeCloseTo(1.3);
    expect(
      characterScaleForTarget('enemy_004', 320, 174) * CHARACTER_REFERENCE_HEIGHTS['enemy_004']!,
    ).toBeCloseTo(320);
  });

  it('falls back safely for invalid or as-yet unmeasured art', () => {
    expect(scaleForVisibleHeight(100, 0)).toBe(1);
    expect(characterScaleForTarget('new_character', 240, 200)).toBeCloseTo(1.2);
  });

  it('has a measured standing reference for every current character sheet', () => {
    expect(Object.keys(CHARACTER_REFERENCE_HEIGHTS)).toHaveLength(11);
    for (const height of Object.values(CHARACTER_REFERENCE_HEIGHTS)) {
      expect(height).toBeGreaterThan(100);
    }
    expect(characterOriginY('mostasa')).toBeGreaterThan(0.9);
    expect(characterOriginY('mostasa')).toBeLessThan(1);
  });
});

describe('asset visual manifests', () => {
  it('covers every runtime breakable and declares grounded proportions', () => {
    for (const def of BREAKABLE_LIST) {
      const visual = BREAKABLE_VISUALS[def.id];
      expect(visual, `missing breakable visual ${def.id}`).toBeDefined();
      expect(visualScale(visual!)).toBeGreaterThan(0);
      expect(visual!.originX).toBeGreaterThanOrEqual(0);
      expect(visual!.originX).toBeLessThanOrEqual(1);
      expect(visual!.originY).toBeGreaterThan(0.8);
      expect(visual!.originY).toBeLessThanOrEqual(1);
      expect(def.collisionHeight).toBeGreaterThan(0);
    }
  });

  it('keeps physically different breakables at different target sizes', () => {
    expect(BREAKABLE_VISUALS['cono_transito']!.targetHeightPx).toBeLessThan(
      BREAKABLE_VISUALS['cajon_rompible']!.targetHeightPx,
    );
    expect(BREAKABLE_VISUALS['puesto_diarios_ficticio']!.targetHeightPx).toBeGreaterThan(
      BREAKABLE_VISUALS['barril_plastico']!.targetHeightPx,
    );
  });

  it('covers every pickup, reward and weapon without a shared render constant', () => {
    for (const id of Object.keys({ ...PICKUPS, ...REWARDS })) {
      expect(PICKUP_VISUALS[id], `missing pickup visual ${id}`).toBeDefined();
    }
    for (const id of Object.keys(WEAPONS)) {
      const visual = WEAPON_VISUALS[id];
      expect(visual, `missing weapon visual ${id}`).toBeDefined();
      expect(visual!.heldHeightPx).toBeGreaterThan(visual!.targetHeightPx);
      expect(visual!.gripX).toBeGreaterThanOrEqual(0);
      expect(visual!.gripX).toBeLessThanOrEqual(1);
    }
  });

  it('covers every prop and resolves its canonical authored placement to target height', () => {
    for (const id of allPropIds()) {
      const visual = PROP_VISUALS[id];
      expect(visual, `missing prop visual ${id}`).toBeDefined();
      const renderedHeight = visual!.referenceHeightPx * propScaleFor(id, visual!.authoredScale);
      expect(renderedHeight).toBeCloseTo(visual!.targetHeightPx);
    }
  });
});

describe('foreground occlusion', () => {
  const prop = { x: 100, y: 100, width: 80, height: 160, depth: 520 };

  it('uses two-dimensional intersection', () => {
    expect(rectsIntersect(prop, { x: 120, y: 140, width: 40, height: 80, depth: 500 })).toBe(true);
    expect(rectsIntersect(prop, { x: 120, y: 300, width: 40, height: 80, depth: 500 })).toBe(false);
  });

  it('fades only when the intersecting fighter is behind the prop', () => {
    expect(isOccludingFighter(prop, [{ x: 120, y: 140, width: 40, height: 80, depth: 500 }])).toBe(
      true,
    );
    expect(isOccludingFighter(prop, [{ x: 120, y: 140, width: 40, height: 80, depth: 540 }])).toBe(
      false,
    );
    expect(isOccludingFighter(prop, [{ x: 220, y: 140, width: 40, height: 80, depth: 500 }])).toBe(
      false,
    );
  });

  it('reserves an isolated depth range for the HUD', () => {
    expect(HUD_DEPTH).toBeGreaterThanOrEqual(10_000);
  });
});
