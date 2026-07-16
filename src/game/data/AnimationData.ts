/**
 * Animation data for character sprite sheets.
 *
 * All Escenario 1 sheets use 140×140 frames, 8 columns per row.
 * Row layout follows the Biblia Maestra §6 (Mostasa canonical sheet):
 *   0 idle | 1 walk | 2 run | 3 punch_combo_1 | 4 punch_combo_2 |
 *   5 kick | 6 jump | 7 grab | 8 throw | 9 hit | 10 knockdown_getup |
 *   11 special_rage
 *
 * Enemy sheets share rows 0-9 (idle/walk/run/attacks/react/knockdown).
 */

export const SPRITE_FRAME = 140;
export const SPRITE_COLS = 8;

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
}

function clip(row: number, startFrame: number, frameCount: number, frameRate: number, loop = false): AnimClip {
  return { row, startFrame, frameCount, frameRate, loop };
}

/**
 * Player (Mostasa) — keyed by PlayerStateMachine state id string.
 * Uses all 12 canonical rows.
 */
export const MOSTASA_ANIMS: Record<string, AnimClip> = {
  idle:       clip(0, 0, 8, 8, true),
  walk:       clip(1, 0, 8, 12, true),
  run:        clip(2, 0, 8, 15, true),
  light_1:    clip(3, 0, 8, 26),
  light_2:    clip(4, 0, 8, 26),
  light_3:    clip(5, 0, 8, 22),
  heavy:      clip(5, 0, 8, 16),
  air_attack: clip(3, 0, 8, 24),
  jump:       clip(6, 0, 8, 12),
  land:       clip(6, 6, 2, 12),
  grab:       clip(7, 0, 8, 14),
  throw:      clip(8, 0, 8, 18),
  hurt:       clip(9, 0, 6, 18),
  down:       clip(10, 0, 4, 10),
  get_up:     clip(10, 4, 4, 10),
  special:    clip(11, 0, 8, 16),
};

/**
 * Enemies — shared config for the common/mini-boss/boss sheets of
 * Escenario 1. Only rows 0-9 are referenced so it is valid for the
 * 10/11/12-row sheets alike. Keyed by EnemyStateMachine state id.
 */
export const ENEMY_ANIMS: Record<string, AnimClip> = {
  idle:    clip(0, 0, 8, 8, true),
  walk:    clip(1, 0, 8, 12, true),
  hurt:    clip(7, 0, 4, 16),
  down:    clip(8, 0, 8, 10),
  get_up:  clip(9, 0, 8, 10),
  grabbed: clip(7, 0, 1, 1),
};

/**
 * Build the Phaser frame index list for a clip on an 8-column sheet.
 */
export function clipFrames(c: AnimClip, cols = SPRITE_COLS): number[] {
  const frames: number[] = [];
  const base = c.row * cols + c.startFrame;
  for (let i = 0; i < c.frameCount; i++) frames.push(base + i);
  return frames;
}
