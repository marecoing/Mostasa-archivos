/**
 * Combo-driven impact feedback (Biblia §12 juice). Pure mapping from the
 * current combo state to VFX scale, camera intensity and milestone flashes —
 * so the "feel" scaling is testable independently of Phaser.
 */

import { comboMultiplier } from './ComboSystem';

/**
 * Extra scale for hit VFX by the current multiplier: x1 → 1.0 … x4 → 1.6.
 * Bigger chains land visibly harder.
 */
export function impactScale(multiplier: number): number {
  return 1 + (multiplier - 1) * 0.2;
}

/** True the frame a hit pushes the combo into a higher multiplier band. */
export function crossedComboBand(count: number): boolean {
  if (count <= 1) return false;
  return comboMultiplier(count) > comboMultiplier(count - 1);
}

/** Whether a landed hit at this multiplier warrants a medium (vs light) shake. */
export function usesHeavyShake(multiplier: number): boolean {
  return multiplier >= 2;
}
