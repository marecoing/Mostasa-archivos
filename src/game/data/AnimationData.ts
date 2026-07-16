/**
 * Animation data for character sprite sheets.
 *
 * IMPORTANT: the uploaded Escenario 1 sheets are NOT a uniform 140×140 grid.
 * Measured frame sizes (width is always 140 = 1120/8 columns):
 *   Mostasa   1120×1680 → 8 rows × 210px
 *   Common    1120×1400 → 8 rows × 175px   (enemies 001-008)
 *   Mini-boss 1120×1540 → 10 rows × 154px  (enemy 009)
 *   Boss      1120×1680 → 8 rows × 210px   (enemy 010)
 *
 * Row layout (common 8-row sheets, verified visually):
 *   0 idle | 1 walk | 2 run | 3 punch | 4 kick | 5 weapon |
 *   6 knockdown | 7 downed/get-up
 * Mostasa 8-row layout:
 *   0 idle | 1 walk | 2 run | 3 punch | 4 heavy/kick | 5 special |
 *   6 hurt | 7 knockdown/get-up
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
  mostasa: { frameWidth: 140, frameHeight: 210, cols: 8, rows: 8 },
  enemy_001: { frameWidth: 140, frameHeight: 175, cols: 8, rows: 8 },
  enemy_002: { frameWidth: 140, frameHeight: 175, cols: 8, rows: 8 },
  enemy_003: { frameWidth: 140, frameHeight: 175, cols: 8, rows: 8 },
  enemy_004: { frameWidth: 140, frameHeight: 175, cols: 8, rows: 8 },
  enemy_005: { frameWidth: 140, frameHeight: 175, cols: 8, rows: 8 },
  enemy_006: { frameWidth: 140, frameHeight: 175, cols: 8, rows: 8 },
  enemy_007: { frameWidth: 140, frameHeight: 175, cols: 8, rows: 8 },
  enemy_008: { frameWidth: 140, frameHeight: 175, cols: 8, rows: 8 },
  enemy_009: { frameWidth: 140, frameHeight: 154, cols: 8, rows: 10 },
  enemy_010: { frameWidth: 140, frameHeight: 210, cols: 8, rows: 8 },
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
  idle:       clip(0, 0, 8, 8, true),
  walk:       clip(1, 0, 8, 12, true),
  run:        clip(2, 0, 8, 15, true),
  light_1:    clip(3, 0, 8, 26),
  light_2:    clip(3, 0, 8, 26),
  light_3:    clip(4, 0, 8, 22),
  heavy:      clip(4, 0, 8, 16),
  air_attack: clip(3, 0, 8, 24),
  jump:       clip(2, 0, 8, 12),
  land:       clip(0, 0, 2, 12),
  grab:       clip(4, 0, 8, 14),
  throw:      clip(4, 0, 8, 18),
  special:    clip(5, 0, 8, 16),
  hurt:       clip(6, 0, 6, 18),
  down:       clip(7, 0, 8, 12),
  get_up:     clip(7, 0, 8, 22, false, true),
};

/**
 * Common enemies (8 rows): 0 idle 1 walk 2 run 3 punch 4 kick 5 weapon
 * 6 knockdown 7 downed. get_up reuses the knockdown row reversed.
 */
export const ENEMY_ANIMS_COMMON: Record<string, AnimClip> = {
  idle:    clip(0, 0, 8, 8, true),
  walk:    clip(1, 0, 8, 12, true),
  attack:  clip(3, 0, 8, 14),
  hurt:    clip(6, 0, 4, 18),
  down:    clip(6, 0, 8, 12),
  get_up:  clip(6, 0, 8, 22, false, true),
  grabbed: clip(6, 0, 1, 1),
};

/** Mini-boss (10 rows × 154). Attacks occupy rows 3-7; knockdown 8, downed 9. */
export const ENEMY_ANIMS_MINIBOSS: Record<string, AnimClip> = {
  idle:    clip(0, 0, 8, 8, true),
  walk:    clip(1, 0, 8, 12, true),
  attack:  clip(3, 0, 8, 14),
  hurt:    clip(8, 0, 4, 18),
  down:    clip(8, 0, 8, 12),
  get_up:  clip(8, 0, 8, 22, false, true),
  grabbed: clip(8, 0, 1, 1),
};

/** Boss (8 rows × 210) — same layout family as the common sheets. */
export const ENEMY_ANIMS_BOSS: Record<string, AnimClip> = {
  idle:    clip(0, 0, 8, 8, true),
  walk:    clip(1, 0, 8, 12, true),
  attack:  clip(3, 0, 8, 14),
  hurt:    clip(6, 0, 5, 18),
  down:    clip(6, 0, 8, 12),
  get_up:  clip(6, 0, 8, 22, false, true),
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
