import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  MOSTASA_ANIMS,
  ENEMY_ANIMS_COMMON,
  ENEMY_ANIMS_MINIBOSS,
  ENEMY_ANIMS_BOSS,
  enemyAnimsFor,
  clipFrames,
  gridFor,
  CHARACTER_GRIDS,
} from '../../src/game/data/AnimationData';
import type { AnimClip } from '../../src/game/data/AnimationData';

/** Read a PNG's IHDR dimensions straight from the file header. */
function pngSize(file: string): { width: number; height: number } {
  const buf = readFileSync(join(__dirname, '../../public/assets/characters', file));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('CHARACTER_GRIDS (normalized sheet geometry)', () => {
  it('every grid tiles its actual PNG exactly (cols*fw × rows*fh)', () => {
    for (const [key, g] of Object.entries(CHARACTER_GRIDS)) {
      const { width, height } = pngSize(`${key}.png`);
      expect(g.cols * g.frameWidth, `${key} width`).toBe(width);
      expect(g.rows * g.frameHeight, `${key} height`).toBe(height);
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
    expect(clipFrames(c, 10)).toEqual([20, 21, 22, 23]);
  });

  it('respects startFrame within a row', () => {
    const c: AnimClip = { row: 1, startFrame: 4, frameCount: 4, frameRate: 8, loop: false, reverse: false };
    expect(clipFrames(c, 10)).toEqual([14, 15, 16, 17]);
  });

  it('returns frames back-to-front when reversed', () => {
    const c: AnimClip = { row: 1, startFrame: 0, frameCount: 4, frameRate: 8, loop: false, reverse: true };
    expect(clipFrames(c, 10)).toEqual([13, 12, 11, 10]);
  });
});

/** The animation config each sheet actually renders with. */
function configForSheet(key: string): Record<string, AnimClip> {
  return key === 'mostasa' ? MOSTASA_ANIMS : enemyAnimsFor(key);
}

describe('clips fit the grid of every sheet that uses them', () => {
  for (const key of Object.keys(CHARACTER_GRIDS)) {
    it(`${key}: every clip stays inside ${CHARACTER_GRIDS[key]!.cols}×${CHARACTER_GRIDS[key]!.rows}`, () => {
      const g = CHARACTER_GRIDS[key]!;
      for (const [state, c] of Object.entries(configForSheet(key))) {
        expect(c.row, `${key}.${state} row`).toBeGreaterThanOrEqual(0);
        expect(c.row, `${key}.${state} row`).toBeLessThanOrEqual(g.rows - 1);
        expect(c.startFrame + c.frameCount, `${key}.${state} overflows row`).toBeLessThanOrEqual(g.cols);
      }
    });
  }
});

describe('MOSTASA_ANIMS integrity', () => {
  it('defines a clip for every FSM state used by the player', () => {
    const required = [
      'idle', 'walk', 'run', 'jump', 'land',
      'light_1', 'light_2', 'light_3', 'heavy', 'air_attack',
      'grab', 'throw', 'special', 'hurt', 'down', 'get_up', 'dodge',
    ];
    for (const state of required) {
      expect(MOSTASA_ANIMS[state], `missing clip for ${state}`).toBeDefined();
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
  const required = ['idle', 'walk', 'attack', 'hurt', 'down', 'get_up', 'grabbed'];

  const configs: [string, Record<string, AnimClip>][] = [
    ['common', ENEMY_ANIMS_COMMON],
    ['miniboss', ENEMY_ANIMS_MINIBOSS],
    ['boss', ENEMY_ANIMS_BOSS],
  ];

  for (const [name, config] of configs) {
    it(`${name} defines a clip for every enemy FSM state`, () => {
      for (const state of required) {
        expect(config[state], `${name} missing clip for ${state}`).toBeDefined();
      }
    });
  }

  it('maps sprite keys to the right archetype config', () => {
    expect(enemyAnimsFor('enemy_001')).toBe(ENEMY_ANIMS_COMMON);
    expect(enemyAnimsFor('enemy_008')).toBe(ENEMY_ANIMS_COMMON);
    expect(enemyAnimsFor('enemy_009')).toBe(ENEMY_ANIMS_MINIBOSS);
    expect(enemyAnimsFor('enemy_010')).toBe(ENEMY_ANIMS_BOSS);
  });
});
