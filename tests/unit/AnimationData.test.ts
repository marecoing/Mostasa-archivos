import { describe, it, expect } from 'vitest';
import {
  MOSTASA_ANIMS,
  ENEMY_ANIMS,
  clipFrames,
  SPRITE_COLS,
} from '../../src/game/data/AnimationData';
import type { AnimClip } from '../../src/game/data/AnimationData';

describe('clipFrames', () => {
  it('computes contiguous frame indices from row/startFrame', () => {
    const c: AnimClip = { row: 0, startFrame: 0, frameCount: 8, frameRate: 8, loop: true };
    expect(clipFrames(c)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  });

  it('offsets by row * cols', () => {
    const c: AnimClip = { row: 2, startFrame: 0, frameCount: 4, frameRate: 8, loop: false };
    expect(clipFrames(c)).toEqual([16, 17, 18, 19]);
  });

  it('respects startFrame within a row', () => {
    const c: AnimClip = { row: 10, startFrame: 4, frameCount: 4, frameRate: 8, loop: false };
    expect(clipFrames(c)).toEqual([84, 85, 86, 87]);
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

  it('uses only the 12 canonical rows (0-11)', () => {
    for (const [state, c] of Object.entries(MOSTASA_ANIMS)) {
      expect(c.row, `${state} row out of range`).toBeGreaterThanOrEqual(0);
      expect(c.row, `${state} row out of range`).toBeLessThanOrEqual(11);
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
  it('defines a clip for every enemy FSM state', () => {
    const required = ['idle', 'walk', 'hurt', 'down', 'get_up', 'grabbed'];
    for (const state of required) {
      expect(ENEMY_ANIMS[state], `missing clip for ${state}`).toBeDefined();
    }
  });

  it('never references a column beyond the sheet width', () => {
    for (const [state, c] of Object.entries(ENEMY_ANIMS)) {
      expect(c.startFrame + c.frameCount, `${state} overflows row`).toBeLessThanOrEqual(SPRITE_COLS);
    }
  });

  it('stays within rows 0-9 (valid on the 10-row common sheets)', () => {
    for (const [state, c] of Object.entries(ENEMY_ANIMS)) {
      expect(c.row, `${state} row out of range for 10-row sheet`).toBeLessThanOrEqual(9);
    }
  });
});
