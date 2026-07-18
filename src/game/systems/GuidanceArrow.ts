/**
 * Objective-guidance arrow (Biblia §11 orientación). Pure decision: while the
 * path is clear and there's still stage ahead, prompt the player to advance.
 * GameScene renders the pulsing arrow; this keeps the "when" testable.
 */

export interface GuidanceInput {
  /** wave-system phase */
  phase: string;
  aliveEnemies: number;
  playerX: number;
  laneMaxX: number;
  stageEnded: boolean;
  /** true while the pause menu (or any modal) is up */
  paused: boolean;
}

/** How close to the stage end before the arrow stops nudging (world units). */
export const GUIDANCE_END_MARGIN = 300;

/**
 * Show the "advance" arrow only when travelling with no live enemies, the
 * stage isn't over, we're not paused, and there's meaningful stage left.
 */
export function showGuidance(input: GuidanceInput): boolean {
  if (input.stageEnded || input.paused) return false;
  if (input.phase !== 'traveling') return false;
  if (input.aliveEnemies > 0) return false;
  return input.playerX < input.laneMaxX - GUIDANCE_END_MARGIN;
}
