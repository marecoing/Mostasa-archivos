import { describe, it, expect } from 'vitest';
import {
  ALL_ENCOUNTERS,
  ESTACION_ENCOUNTERS,
  ONCE_ENCOUNTERS,
  encountersForStage,
} from '../../src/game/data/WaveManifest';
import { STAGE_LAYOUTS, layoutForStage } from '../../src/game/data/StageLayout';
import { BREAKABLES } from '../../src/game/data/BreakableManifest';
import { WEAPONS } from '../../src/game/data/ItemManifest';
import { ENEMY_TYPES } from '../../src/game/data/EnemyData';
import { STAGE_PROPS } from '../../src/game/data/PropManifest';
import { stageById } from '../../src/game/data/StageManifest';

describe('encountersForStage', () => {
  it('returns the matching encounters and falls back to Once', () => {
    expect(encountersForStage('01-once')).toBe(ONCE_ENCOUNTERS);
    expect(encountersForStage('02-estacion-oxidada')).toBe(ESTACION_ENCOUNTERS);
    expect(encountersForStage('nope')).toBe(ONCE_ENCOUNTERS);
  });
});

describe('encounter integrity (every registered stage)', () => {
  for (const [stageId, enc] of Object.entries(ALL_ENCOUNTERS)) {
    it(`${stageId}: zones are ordered, bounded and end with a boss`, () => {
      expect(enc.stageId).toBe(stageId);
      expect(enc.bossLabel.length).toBeGreaterThan(0);
      expect(enc.miniBossLabel.length).toBeGreaterThan(0);
      expect(enc.zones.length).toBeGreaterThan(0);

      let prevTrigger = -Infinity;
      for (const z of enc.zones) {
        expect(z.triggerX).toBeGreaterThan(prevTrigger);
        prevTrigger = z.triggerX;
        expect(z.lockMinX).toBeLessThan(z.lockMaxX);
        expect(z.waves.length).toBeGreaterThan(0);
        for (const w of z.waves) {
          expect(w.enemies.length).toBeGreaterThan(0);
          for (const e of w.enemies) {
            expect(ENEMY_TYPES[e.type], `unknown enemy type "${e.type}"`).toBeDefined();
          }
        }
      }
      expect(enc.zones[enc.zones.length - 1]!.kind).toBe('boss');
    });
  }
});

describe('stage layouts', () => {
  it('falls back to an empty layout for unknown stages', () => {
    const empty = layoutForStage('nope');
    expect(empty.breakables).toEqual([]);
    expect(empty.weapons).toEqual([]);
  });

  for (const [stageId, layout] of Object.entries(STAGE_LAYOUTS)) {
    it(`${stageId}: every placed object id exists in its manifest`, () => {
      for (const b of layout.breakables) {
        expect(BREAKABLES[b.id], `unknown breakable "${b.id}"`).toBeDefined();
      }
      for (const w of layout.weapons) {
        expect(WEAPONS[w.id], `unknown weapon "${w.id}"`).toBeDefined();
      }
    });
  }
});

describe('stage 2 runtime wiring', () => {
  it('is runtime-ready with 5 panel paths', () => {
    const s = stageById('02-estacion-oxidada')!;
    expect(s.runtimeReady).toBe(true);
    expect(s.panelPaths.length).toBe(5);
  });

  it('has its own props and encounters registered', () => {
    expect(STAGE_PROPS['02-estacion-oxidada']!.length).toBeGreaterThan(0);
    expect(ALL_ENCOUNTERS['02-estacion-oxidada']).toBeDefined();
  });
});
