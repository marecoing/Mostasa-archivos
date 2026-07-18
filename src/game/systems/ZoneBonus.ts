/**
 * Zone-clear rewards (Biblia §12/§16). Clearing a combat zone always pays a
 * base bonus; clearing it without taking a hit ("Zona Perfecta") pays extra.
 * Pure so the scoring is testable independently of the scene.
 */

/** Base score for clearing any combat zone. */
export const ZONE_CLEAR_BASE = 200;
/** Extra score for a flawless (no-damage) zone clear. */
export const ZONE_PERFECT_BONUS = 300;

export interface ZoneReward {
  /** total score to award (before the difficulty multiplier) */
  score: number;
  /** whether the flawless bonus applied */
  perfect: boolean;
}

/**
 * Reward for clearing a zone. `tookDamage` is whether the player was hit at
 * any point during the zone's fight.
 */
export function zoneClearReward(tookDamage: boolean): ZoneReward {
  const perfect = !tookDamage;
  return {
    score: ZONE_CLEAR_BASE + (perfect ? ZONE_PERFECT_BONUS : 0),
    perfect,
  };
}
