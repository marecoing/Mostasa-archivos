import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
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

describe('full campaign wiring (every stage runtime-ready)', () => {
  const stageIds = [
    '01-once', '02-estacion-oxidada', '03-pasillo-del-conurbano',
    '04-palermo-de-carton', '05-avenida-de-la-protesta', '06-catalinas-del-humo',
    '07-puerto-del-country', '08-galpon-del-acceso', '09-pasillos-del-poder',
    '10-casa-rosada-final',
  ];

  for (const id of stageIds) {
    it(`${id}: runtime-ready with panels on disk, encounters, layout and props`, () => {
      const s = stageById(id)!;
      expect(s.runtimeReady).toBe(true);
      expect(s.panelPaths.length).toBe(5);
      for (const p of s.panelPaths) {
        expect(existsSync(join('public', p)), `missing panel file ${p}`).toBe(true);
      }
      expect(ALL_ENCOUNTERS[id], 'missing encounters').toBeDefined();
      expect(layoutForStage(id).breakables.length).toBeGreaterThan(0);
      expect(layoutForStage(id).weapons.length).toBeGreaterThan(0);
      expect(STAGE_PROPS[id]!.length).toBeGreaterThan(0);
    });
  }

  it('every prop id used has its asset on disk', () => {
    const ids = new Set<string>();
    for (const list of Object.values(STAGE_PROPS)) for (const p of list) ids.add(p.id);
    for (const id of ids) {
      expect(existsSync(join('public', 'assets', 'props', `${id}.png`)), `missing prop ${id}.png`).toBe(true);
    }
  });

  it('Palermo (04) is the only stage without a mini-boss zone', () => {
    for (const [id, enc] of Object.entries(ALL_ENCOUNTERS)) {
      const hasMini = enc.zones.some((z) => z.kind === 'mini_boss');
      expect(hasMini, id).toBe(id !== '04-palermo-de-carton');
    }
  });
});
