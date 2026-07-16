import { describe, it, expect } from 'vitest';
import { BREAKABLES, BREAKABLE_LIST, rollDrop } from '../../src/game/data/BreakableManifest';
import { DROPPABLES, WEAPONS, PICKUPS, REWARDS } from '../../src/game/data/ItemManifest';
import { VFX, VFX_LIST, vfxFrames } from '../../src/game/data/VfxManifest';
import { STAGES, stageById } from '../../src/game/data/StageManifest';
import { BreakableEntity } from '../../src/game/entities/BreakableEntity';
import { PickupEntity } from '../../src/game/entities/PickupEntity';
import { checkPlayerHitsBreakables } from '../../src/game/systems/CombatSystem';
import { ATTACKS } from '../../src/game/data/AttackData';

describe('BreakableManifest', () => {
  it('every drop references an existing droppable item', () => {
    for (const b of BREAKABLE_LIST) {
      for (const entry of b.dropTable) {
        expect(DROPPABLES[entry.itemId], `${b.id} drops unknown ${entry.itemId}`).toBeDefined();
      }
    }
  });

  it('every breakable declares a known destroy VFX', () => {
    for (const b of BREAKABLE_LIST) {
      expect(VFX[b.destroyVfx], `${b.id} vfx ${b.destroyVfx}`).toBeDefined();
    }
  });

  it('rollDrop is deterministic for a given rng and stays in the table', () => {
    const def = BREAKABLES['cajon_rompible']!;
    const ids = def.dropTable.map((e) => e.itemId);
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      expect(ids).toContain(rollDrop(def, r));
    }
  });

  it('rollDrop weights the first entry proportionally', () => {
    // cajon: weights 3,2,2 (total 7); rng 0..3/7 -> first item
    const def = BREAKABLES['cajon_rompible']!;
    expect(rollDrop(def, 0.0)).toBe(def.dropTable[0]!.itemId);
    expect(rollDrop(def, 0.9)).toBe(def.dropTable[def.dropTable.length - 1]!.itemId);
  });
});

describe('BreakableEntity', () => {
  it('breaks only when hp reaches 0 and edge-triggers once', () => {
    const b = new BreakableEntity(BREAKABLES['cajon_rompible']!, 100, 500); // durability 5
    expect(b.applyHit(3)).toBe(false);
    expect(b.destroyed).toBe(false);
    expect(b.applyHit(3)).toBe(true); // total 6 >= 5
    expect(b.destroyed).toBe(true);
    expect(b.applyHit(10)).toBe(false); // already destroyed, no re-trigger
  });

  it('damageFrame progresses from intact to most-damaged', () => {
    const b = new BreakableEntity(BREAKABLES['puesto_diarios_ficticio']!, 0, 0); // dur 8, 4 frames
    expect(b.damageFrame()).toBe(0);
    b.applyHit(4); // half
    expect(b.damageFrame()).toBeGreaterThan(0);
    expect(b.damageFrame()).toBeLessThanOrEqual(3);
  });
});

describe('PickupEntity', () => {
  it('falls under gravity and settles on the ground', () => {
    const p = new PickupEntity(PICKUPS['mate_curativo']!, 100, 500, 200);
    for (let i = 0; i < 120; i++) p.tick(-1800, 1 / 60, 0);
    expect(p.z).toBe(0);
    expect(p.velZ).toBe(0);
  });

  it('is only collectible within range and depth tolerance', () => {
    const p = new PickupEntity(PICKUPS['mate_curativo']!, 100, 500, 0);
    expect(p.isInRange(120, 500, 46, 60)).toBe(true);
    expect(p.isInRange(300, 500, 46, 60)).toBe(false); // too far in X
    expect(p.isInRange(120, 620, 46, 60)).toBe(false); // wrong depth
    p.collected = true;
    expect(p.isInRange(120, 500, 46, 60)).toBe(false);
  });
});

describe('checkPlayerHitsBreakables', () => {
  it('hits a breakable in front within the attack reach', () => {
    const b = new BreakableEntity(BREAKABLES['cajon_rompible']!, 80, 500);
    const hits = checkPlayerHitsBreakables(0, 500, 1, ATTACKS['light_1']!, [b]);
    expect(hits).toContain(0);
  });

  it('misses a destroyed or already-hit breakable', () => {
    const b = new BreakableEntity(BREAKABLES['cajon_rompible']!, 80, 500);
    b.hitThisSwing = true;
    expect(checkPlayerHitsBreakables(0, 500, 1, ATTACKS['light_1']!, [b])).toEqual([]);
    b.hitThisSwing = false;
    b.destroyed = true;
    expect(checkPlayerHitsBreakables(0, 500, 1, ATTACKS['light_1']!, [b])).toEqual([]);
  });

  it('misses a breakable at a different depth', () => {
    const b = new BreakableEntity(BREAKABLES['cajon_rompible']!, 80, 600);
    expect(checkPlayerHitsBreakables(0, 500, 1, ATTACKS['light_1']!, [b])).toEqual([]);
  });
});

describe('ItemManifest', () => {
  it('weapon damages match the Biblia §13 ranges (6-14)', () => {
    for (const w of Object.values(WEAPONS)) {
      expect(w.damage).toBeGreaterThanOrEqual(6);
      expect(w.damage).toBeLessThanOrEqual(14);
    }
  });

  it('pickup effects are valid categories', () => {
    const valid = ['health', 'energy', 'rage', 'money', 'collectible', 'key_item'];
    for (const p of Object.values({ ...PICKUPS, ...REWARDS })) {
      expect(valid).toContain(p.effect);
    }
  });
});

describe('VfxManifest', () => {
  it('frame indices span the full strip', () => {
    for (const def of VFX_LIST) {
      expect(vfxFrames(def)).toHaveLength(def.frameCount);
      expect(vfxFrames(def)[def.frameCount - 1]).toBe(def.frameCount - 1);
    }
  });
});

describe('StageManifest', () => {
  it('registers all 10 campaign stages with linear progression', () => {
    expect(STAGES).toHaveLength(10);
    for (let i = 0; i < STAGES.length - 1; i++) {
      expect(STAGES[i]!.nextStageId).toBe(STAGES[i + 1]!.id);
    }
    expect(STAGES[STAGES.length - 1]!.nextStageId).toBeNull();
  });

  it('only Escenario 1 (Once) is runtime-ready with panel paths', () => {
    const once = stageById('01-once')!;
    expect(once.runtimeReady).toBe(true);
    expect(once.panelPaths).toHaveLength(5);
    for (const s of STAGES.slice(1)) expect(s.runtimeReady).toBe(false);
  });
});
