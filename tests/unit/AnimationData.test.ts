import { describe, it, expect } from 'vitest';
import {
  MOSTASA_ANIMS,
  ENEMY_ANIMS_COMMON,
  ENEMY_ANIMS_MINIBOSS,
  ENEMY_ANIMS_BOSS,
  enemyAnimsFor,
  clipFrames,
  gridFor,
  CHARACTER_GRIDS,
  SPRITE_COLS,
} from '../../src/game/data/AnimationData';
import type { AnimClip } from '../../src/game/data/AnimationData';

describe('CHARACTER_GRIDS (measured sheet geometry)', () => {
  it('every grid tiles its sheet exactly (cols*fw x rows*fh)', () => {
    const sheetHeights: Record<string, number> = {
      mostasa: 1680, enemy_001: 1400, enemy_002: 1400, enemy_003: 1400,
      enemy_004: 1400, enemy_005: 1400, enemy_006: 1400, enemy_007: 1400,
      enemy_008: 1400, enemy_009: 1540, enemy_010: 1680,
    };
    for (const [key, g] of Object.entries(CHARACTER_GRIDS)) {
      expect(g.cols * g.frameWidth, `${key} width`).toBe(1120);
      expect(g.rows * g.frameHeight, `${key} height`).toBe(sheetHeights[key]);
    }
  });

  it('uses 140px-wide, 8-column frames on every sheet', () => {
    for (const [key, g] of Object.entries(CHARACTER_GRIDS)) {
      expect(g.frameWidth, `${key}`).toBe(140);
      expect(g.cols, `${key}`).toBe(8);
    }
  });

  it('gridFor falls back to a common grid for unknown keys', () => {
    expect(gridFor('enemy_001')).toBe(CHARACTER_GRIDS['enemy_001']);
    expect(gridFor('nope')).toBe(CHARACTER_GRIDS['enemy_001']);
  });
});

describe('clipFrames', () => {
  it('computes contiguous frame indices from row/startFrame', () => {
    const c: AnimClip = { row: 0, startFrame: 0, frameCount: 8, frameRate: 8, loop: true, reverse: false };
    expect(clipFrames(c)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('offsets by row * cols', () => {
    const c: AnimClip = { row: 2, startFrame: 0, frameCount: 4, frameRate: 8, loop: false, reverse: false };
    expect(clipFrames(c)).toEqual([16, 17, 18, 19]);
  });

  it('respects startFrame within a row', () => {
    const c: AnimClip = { row: 10, startFrame: 4, frameCount: 4, frameRate: 8, loop: false, reverse: false };
    expect(clipFrames(c)).toEqual([84, 85, 86, 87]);
  });

  it('returns frames back-to-front when reversed', () => {
    const c: AnimClip = { row: 8, startFrame: 0, frameCount: 8, frameRate: 8, loop: false, reverse: true };
    expect(clipFrames(c)).toEqual([71, 70, 69, 68, 67, 66, 65, 64]);
  });
});

describe('MOSTASA_ANIMS integrity', () => {
  it('defines a clip for every FSM state used by the player', () => {
    const required = [
      'idle', 'walk', 'run', 'jump', 'land',
      'light_1', 'light_2', 'light_3', 'heavy', 'air_attack',
      'grab', 'throw', 'special', 'hurt', 'down', 'get_up',
    ];
    for (const state of required) {
      expect(MOSTASA_ANIMS[state], `missing clip for ${state}`).toBeDefined();
    }
  });

  it('never references a column beyond the sheet width', () => {
    for (const [state, c] of Object.entries(MOSTASA_ANIMS)) {
      expect(c.startFrame + c.frameCount, `${state} overflows row`).toBeLessThanOrEqual(SPRITE_COLS);
    }
  });

  it('stays within the 8 rows of Mostasa\'s sheet (0-7)', () => {
    for (const [state, c] of Object.entries(MOSTASA_ANIMS)) {
      expect(c.row, `${state} row out of range`).toBeGreaterThanOrEqual(0);
      expect(c.row, `${state} row out of range`).toBeLessThanOrEqual(7);
    }
  });

  it('loops only idle/walk/run', () => {
    for (const [state, c] of Object.entries(MOSTASA_ANIMS)) {
      const shouldLoop = state === 'idle' || state === 'walk' || state === 'run';
      expect(c.loop, `${state} loop mismatch`).toBe(shouldLoop);
    }
  });
});

describe('ENEMY_ANIMS integrity', () => {
  const required = ['idle', 'walk', 'hurt', 'down', 'get_up', 'grabbed'];

  const configs: [string, Record<string, AnimClip>, number][] = [
    ['common', ENEMY_ANIMS_COMMON, 8],
    ['miniboss', ENEMY_ANIMS_MINIBOSS, 10],
    ['boss', ENEMY_ANIMS_BOSS, 8],
  ];

  for (const [name, config, rowCount] of configs) {
    describe(name, () => {
      it('defines a clip for every enemy FSM state', () => {
        for (const state of required) {
          expect(config[state], `${name} missing clip for ${state}`).toBeDefined();
        }
      });

      it('never references a column beyond the sheet width', () => {
        for (const [state, c] of Object.entries(config)) {
          expect(c.startFrame + c.frameCount, `${name}.${state} overflows row`).toBeLessThanOrEqual(SPRITE_COLS);
        }
      });

      it(`stays within the ${rowCount} rows of its sheet`, () => {
        for (const [state, c] of Object.entries(config)) {
          expect(c.row, `${name}.${state} row out of range`).toBeGreaterThanOrEqual(0);
          expect(c.row, `${name}.${state} row out of range`).toBeLessThanOrEqual(rowCount - 1);
        }
      });

      it('rises from the knockdown row (get_up reuses down, reversed)', () => {
        expect(config['get_up']?.reverse).toBe(true);
        expect(config['get_up']?.row).toBe(config['down']?.row);
      });
    });
  }

  it('maps sprite keys to the right archetype config', () => {
    expect(enemyAnimsFor('enemy_001')).toBe(ENEMY_ANIMS_COMMON);
    expect(enemyAnimsFor('enemy_008')).toBe(ENEMY_ANIMS_COMMON);
    expect(enemyAnimsFor('enemy_009')).toBe(ENEMY_ANIMS_MINIBOSS);
    expect(enemyAnimsFor('enemy_010')).toBe(ENEMY_ANIMS_BOSS);
  });
});
