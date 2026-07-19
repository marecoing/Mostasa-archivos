/**
 * Animation data for character sprite sheets.
 *
 * The sheets in public/assets/characters are the output of
 * `npm run sprites:process` + `node scripts/normalize-sprites.mjs`: the
 * uploaded art was NOT grid-aligned, so the normalizer re-slices it by
 * connected components and repacks uniform cells (feet anchored at the cell
 * bottom, each row's frames cycled to fill every column). The grids below
 * come from the normalizer's output — regenerate them together.
 *
 * Row layout (verified visually on the normalized sheets):
 *   Mostasa (9 rows):  0 idle | 1 walk | 2 dash/jab | 3 punches | 4 kicks |
 *                      5 advance/guard | 6 hurt | 7 down+crawl+rise | 8 victory
 *   Common  (8 rows):  0 idle | 1 walk | 2 run | 3 punch | 4 kick |
 *                      5 weapon | 6 fall+crawl+rise | 7 crouch→lying
 *   Mini-boss (10 rows): 0 idle | 1 walk | 2 run | 3 threat | 4 poke |
 *                      5 whip overhead | 6 whip sweep | 7 carry | 8 stagger | 9 lying
 */

export const SPRITE_COLS = 8;

export interface CharacterGrid {
  frameWidth: number;
  frameHeight: number;
  cols: number;
  rows: number;
}

/** Per-sheet frame geometry. Keyed by texture key. */
export const CHARACTER_GRIDS: Record<string, CharacterGrid> = {
  mostasa: { frameWidth: 118, frameHeight: 208, cols: 10, rows: 9 },
  enemy_001: { frameWidth: 162, frameHeight: 182, cols: 10, rows: 8 },
  enemy_002: { frameWidth: 170, frameHeight: 200, cols: 9, rows: 8 },
  enemy_003: { frameWidth: 150, frameHeight: 198, cols: 9, rows: 8 },
  enemy_004: { frameWidth: 126, frameHeight: 176, cols: 9, rows: 9 },
  enemy_005: { frameWidth: 108, frameHeight: 168, cols: 10, rows: 9 },
  enemy_006: { frameWidth: 130, frameHeight: 168, cols: 10, rows: 9 },
  enemy_007: { frameWidth: 166, frameHeight: 188, cols: 9, rows: 8 },
  enemy_008: { frameWidth: 168, frameHeight: 178, cols: 10, rows: 8 },
  enemy_009: { frameWidth: 226, frameHeight: 164, cols: 8, rows: 10 },
  enemy_010: { frameWidth: 130, frameHeight: 204, cols: 10, rows: 9 },
};

export function gridFor(spriteKey: string): CharacterGrid {
  return CHARACTER_GRIDS[spriteKey] ?? CHARACTER_GRIDS['enemy_001']!;
}

export interface AnimClip {
  /** row index in the sheet (0-based) */
  row: number;
  /** first frame within the row (0-based column) */
  startFrame: number;
  /** number of frames to play */
  frameCount: number;
  /** playback frame rate */
  frameRate: number;
  /** whether the clip loops */
  loop: boolean;
  /** play the frames back-to-front (used to rise from a knockdown) */
  reverse: boolean;
}

function clip(
  row: number,
  startFrame: number,
  frameCount: number,
  frameRate: number,
  loop = false,
  reverse = false,
): AnimClip {
  return { row, startFrame, frameCount, frameRate, loop, reverse };
}

/**
 * Player (Mostasa) — 8 rows. Rows beyond what the sheet provides are
 * reused (the sheet has fewer animations than the FSM has states).
 * Keyed by PlayerStateMachine state id string.
 */
export const MOSTASA_ANIMS: Record<string, AnimClip> = {
  idle:       clip(0, 0, 10, 8, true),
  walk:       clip(1, 0, 10, 12, true),
  run:        clip(1, 0, 10, 18, true),
  light_1:    clip(3, 0, 5, 26),
  light_2:    clip(3, 5, 5, 26),
  light_3:    clip(4, 5, 4, 22),
  heavy:      clip(4, 4, 6, 16),
  air_attack: clip(3, 3, 4, 24),
  jump:       clip(2, 0, 1, 10),
  land:       clip(0, 0, 2, 12),
  grab:       clip(5, 0, 4, 14),
  throw:      clip(5, 4, 6, 18),
  special:    clip(8, 0, 10, 18),
  hurt:       clip(6, 0, 4, 18),
  down:       clip(7, 0, 3, 8),
  get_up:     clip(7, 3, 7, 16),
  dodge:      clip(2, 0, 3, 14),
};

/**
 * Common enemies (8 rows): 0 idle 1 walk 2 run 3 punch 4 kick 5 weapon
 * 6 knockdown 7 downed. get_up reuses the knockdown row reversed.
 */
export const ENEMY_ANIMS_COMMON: Record<string, AnimClip> = {
  idle:    clip(0, 0, 9, 8, true),
  walk:    clip(1, 0, 9, 12, true),
  attack:  clip(3, 0, 9, 14),
  hurt:    clip(6, 0, 2, 14),
  down:    clip(7, 0, 8, 12),
  get_up:  clip(6, 4, 5, 14),
  grabbed: clip(6, 0, 1, 1),
};

/** Mini-boss (10 rows): poke attack row 4, stagger row 8, lying row 9. */
export const ENEMY_ANIMS_MINIBOSS: Record<string, AnimClip> = {
  idle:    clip(0, 0, 8, 8, true),
  walk:    clip(1, 0, 8, 12, true),
  attack:  clip(4, 0, 8, 14),
  hurt:    clip(8, 0, 3, 16),
  down:    clip(9, 0, 6, 10),
  get_up:  clip(8, 2, 5, 14),
  grabbed: clip(8, 0, 1, 1),
};

/** Boss (9 rows) — same layout family as the common sheets. */
export const ENEMY_ANIMS_BOSS: Record<string, AnimClip> = {
  idle:    clip(0, 0, 10, 8, true),
  walk:    clip(1, 0, 10, 12, true),
  attack:  clip(3, 0, 10, 14),
  hurt:    clip(6, 0, 2, 14),
  down:    clip(7, 0, 8, 12),
  get_up:  clip(6, 4, 5, 14),
  grabbed: clip(6, 0, 1, 1),
};

/** Select the enemy animation set for a given sprite sheet key. */
export function enemyAnimsFor(spriteKey: string): Record<string, AnimClip> {
  if (spriteKey === 'enemy_009') return ENEMY_ANIMS_MINIBOSS;
  if (spriteKey === 'enemy_010') return ENEMY_ANIMS_BOSS;
  return ENEMY_ANIMS_COMMON;
}

/**
 * Build the Phaser frame index list for a clip. Frame indices are laid out
 * row-major with `cols` frames per row. Reversed clips return them
 * back-to-front.
 */
export function clipFrames(c: AnimClip, cols = SPRITE_COLS): number[] {
  const frames: number[] = [];
  const base = c.row * cols + c.startFrame;
  for (let i = 0; i < c.frameCount; i++) frames.push(base + i);
  if (c.reverse) frames.reverse();
  return frames;
}
