import { describe, it, expect } from 'vitest';
import { WaveSystem } from '../../src/game/systems/WaveSystem';
import { ONCE_ENCOUNTERS } from '../../src/game/data/WaveManifest';
import type { StageEncounters } from '../../src/game/data/WaveManifest';

const TWO_ZONE: StageEncounters = {
  stageId: 'test',
  miniBossLabel: '¡MINI!',
  bossLabel: '¡BOSS!',
  zones: [
    {
      id: 'z1', kind: 'oleada', triggerX: 500, lockMinX: 300, lockMaxX: 900,
      waves: [
        { enemies: [{ type: 'grunt', spriteKey: 'enemy_001', offsetX: 0, y: 480 }] },
        { enemies: [{ type: 'grunt', spriteKey: 'enemy_002', offsetX: -40, y: 500 }] },
      ],
    },
    {
      id: 'z2', kind: 'oleada', triggerX: 1500, lockMinX: 1300, lockMaxX: 1900,
      waves: [{ enemies: [{ type: 'grunt', spriteKey: 'enemy_003', offsetX: 0, y: 480 }] }],
    },
  ],
};

describe('WaveSystem', () => {
  it('starts traveling and gates the player just past the next trigger', () => {
    const w = new WaveSystem(TWO_ZONE, 5000);
    const a = w.update(100, 0);
    expect(w.currentPhase).toBe('traveling');
    expect(a.spawns).toHaveLength(0);
    expect(w.gateX).toBe(500 + 120); // triggerX + margin
  });

  it('locks the camera and spawns wave 0 when the player crosses the trigger', () => {
    const w = new WaveSystem(TWO_ZONE, 5000);
    const a = w.update(520, 0);
    expect(w.currentPhase).toBe('fighting');
    expect(a.lockCamera).toEqual({ minX: 300, maxX: 900 });
    expect(a.spawns).toHaveLength(1);
    expect(a.spawns[0]!.spriteKey).toBe('enemy_001');
    // First spawn flanks from beyond the arena's right edge, dealt to the
    // first depth slot — the pack disperses through the 2.5D field.
    expect(a.spawns[0]!.x).toBeGreaterThan(900);
    expect(a.spawns[0]!.y).toBe(470);
    expect(w.gateX).toBe(900); // confined to arena
  });

  it('alternates entry sides and depth slots across a wave', () => {
    const zone = {
      id: 'z', kind: 'oleada' as const, triggerX: 500, lockMinX: 300, lockMaxX: 900,
      waves: [{
        enemies: [
          { type: 'grunt', spriteKey: 'e1', offsetX: -40, y: 480 },
          { type: 'grunt', spriteKey: 'e2', offsetX: 20, y: 500 },
          { type: 'grunt', spriteKey: 'e3', offsetX: 80, y: 520 },
          { type: 'grunt', spriteKey: 'e4', offsetX: 120, y: 540 },
        ],
      }],
    };
    const w = new WaveSystem({ stageId: 't', miniBossLabel: '', bossLabel: '', zones: [zone] }, 5000);
    const a = w.update(520, 0);
    const xs = a.spawns.map((s) => s.x);
    const ys = a.spawns.map((s) => s.y);
    // even indices from the right (past lockMaxX), odd from the left
    expect(xs[0]).toBeGreaterThan(900);
    expect(xs[1]).toBeLessThan(300);
    expect(xs[2]).toBeGreaterThan(900);
    expect(xs[3]).toBeLessThan(300);
    // depth disperses across distinct slots
    expect(new Set(ys).size).toBe(4);
  });

  it('emboscada zones spawn surrounding the player, inside the arena', () => {
    const zone = {
      id: 'amb', kind: 'emboscada' as const, triggerX: 500, lockMinX: 300, lockMaxX: 900,
      waves: [{
        enemies: [
          { type: 'grunt', spriteKey: 'e1', offsetX: 0, y: 480 },
          { type: 'grunt', spriteKey: 'e2', offsetX: 0, y: 500 },
          { type: 'grunt', spriteKey: 'e3', offsetX: 0, y: 520 },
          { type: 'grunt', spriteKey: 'e4', offsetX: 0, y: 540 },
        ],
      }],
    };
    const w = new WaveSystem({ stageId: 't', miniBossLabel: '', bossLabel: '', zones: [zone] }, 5000);
    const a = w.update(600, 0, 620);
    expect(a.spawns).toHaveLength(4);
    // some in front of the player, some behind (both X sides)
    expect(a.spawns.some((s) => s.x > 600)).toBe(true);
    expect(a.spawns.some((s) => s.x < 600)).toBe(true);
    // spread across depth, near AND far of the player's Y
    expect(a.spawns.some((s) => s.y < 620)).toBe(true);
    expect(a.spawns.some((s) => s.y > 620)).toBe(true);
    for (const s of a.spawns) {
      expect(s.x).toBeGreaterThanOrEqual(340);
      expect(s.x).toBeLessThanOrEqual(860);
      expect(s.y).toBeGreaterThanOrEqual(445);
      expect(s.y).toBeLessThanOrEqual(815);
    }
  });

  it('does not advance while enemies are alive', () => {
    const w = new WaveSystem(TWO_ZONE, 5000);
    w.update(520, 0); // start
    const a = w.update(520, 1); // 1 alive
    expect(a.spawns).toHaveLength(0);
    expect(w.currentPhase).toBe('fighting');
  });

  it('spawns the next wave when the current one is cleared', () => {
    const w = new WaveSystem(TWO_ZONE, 5000);
    w.update(520, 0); // wave 0
    const a = w.update(520, 0); // cleared -> wave 1
    expect(a.spawns).toHaveLength(1);
    expect(a.spawns[0]!.spriteKey).toBe('enemy_002');
    expect(a.unlockCamera).toBeUndefined();
  });

  it('unlocks and advances to the next zone when fully cleared', () => {
    const w = new WaveSystem(TWO_ZONE, 5000);
    w.update(520, 0); // wave 0
    w.update(520, 0); // wave 1
    const a = w.update(520, 0); // zone cleared
    expect(a.zoneCleared).toBe('z1');
    expect(a.unlockCamera).toBe(true);
    expect(w.currentPhase).toBe('traveling');
    expect(w.gateX).toBe(5000); // free to advance
  });

  it('completes the stage after the last zone', () => {
    const w = new WaveSystem(TWO_ZONE, 5000);
    // clear zone 1 (2 waves)
    w.update(520, 0); w.update(520, 0); w.update(520, 0);
    // travel + start + clear zone 2 (1 wave)
    w.update(1520, 0); // start z2
    expect(w.currentPhase).toBe('fighting');
    const done = w.update(1520, 0); // clear z2
    expect(done.stageCleared).toBe(true);
    expect(w.currentPhase).toBe('done');
    // idempotent once done
    expect(w.update(1520, 0).spawns).toHaveLength(0);
  });
});

describe('ONCE_ENCOUNTERS', () => {
  it('has valid, ordered zones with non-empty waves', () => {
    const zones = ONCE_ENCOUNTERS.zones;
    expect(zones.length).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < zones.length; i++) {
      const z = zones[i]!;
      expect(z.lockMinX).toBeLessThan(z.lockMaxX);
      expect(z.triggerX).toBeGreaterThanOrEqual(z.lockMinX);
      expect(z.waves.length).toBeGreaterThan(0);
      for (const wave of z.waves) expect(wave.enemies.length).toBeGreaterThan(0);
      if (i > 0) expect(z.triggerX).toBeGreaterThan(zones[i - 1]!.triggerX);
    }
  });

  it('has a mini-boss zone before the final boss zone', () => {
    const zones = ONCE_ENCOUNTERS.zones;
    const last = zones[zones.length - 1]!;
    const prev = zones[zones.length - 2]!;
    expect(last.kind).toBe('boss');
    expect(prev.kind).toBe('mini_boss');
  });
});
