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
  /** new consecutive-perfect streak after this zone (0 if broken) */
  streak: number;
  /** streak multiplier applied to the perfect bonus (1 when not perfect) */
  multiplier: number;
}

/**
 * Multiplier for a consecutive-perfect streak: 1st perfect ×1, 2nd ×1.5,
 * 3rd and beyond ×2 (capped). `streak` is the count *including* the zone
 * just cleared.
 */
export function perfectStreakMultiplier(streak: number): number {
  if (streak >= 3) return 2;
  if (streak === 2) return 1.5;
  return 1;
}

/**
 * Reward for clearing a zone. `tookDamage` is whether the player was hit at
 * any point during the zone's fight; `currentStreak` is the perfect streak
 * coming in. Taking damage pays only the base and breaks the streak.
 */
export function zoneClearReward(tookDamage: boolean, currentStreak = 0): ZoneReward {
  if (tookDamage) {
    return { score: ZONE_CLEAR_BASE, perfect: false, streak: 0, multiplier: 1 };
  }
  const streak = currentStreak + 1;
  const multiplier = perfectStreakMultiplier(streak);
  return {
    score: ZONE_CLEAR_BASE + Math.round(ZONE_PERFECT_BONUS * multiplier),
    perfect: true,
    streak,
    multiplier,
  };
}
