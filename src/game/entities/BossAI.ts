/**
 * El Capataz Nocturno — differentiated boss attacks (Biblia §10, §33).
 *
 * Pure decision logic so it can be unit-tested without Phaser. The boss picks
 * between two telegraphed attacks by distance:
 *   - 'melee'  (el caño): a short, wide swing when the player is in reach.
 *   - 'charge' (la embestida): a mid-range dash that closes distance fast and
 *     hits hard; heavily telegraphed during the wind-up.
 */

export type BossAttack = 'melee' | 'charge' | 'none';

/**
 * Max horizontal distance from which the boss will commit to a charge. Kept
 * close to the reachable dash distance (SPEED × DASH_FRAMES / 60 ≈ 165) so the
 * lunge actually closes into range instead of stopping short.
 */
export const BOSS_CHARGE_MAX_RANGE = 240;
/** Forward dash speed (world units/second) during the charge's active window. */
export const BOSS_CHARGE_SPEED = 620;
/** Damage the charge deals to the player (heavier than the swing). */
export const BOSS_CHARGE_DAMAGE = 32;
/** Frames the boss keeps dashing (starts at the end of the wind-up). */
export const BOSS_CHARGE_DASH_FRAMES = 16;
/** Depth alignment tolerance before the boss will attack at all. */
export const BOSS_ATTACK_DEPTH = 46;

/**
 * Choose the boss attack for the current geometry, or 'none' to keep moving.
 * `meleeRange` is the boss's own attackRange.
 */
export function chooseBossAttack(
  absDx: number,
  absDy: number,
  meleeRange: number,
  cooldownReady: boolean,
): BossAttack {
  if (!cooldownReady) return 'none';
  if (absDy > BOSS_ATTACK_DEPTH) return 'none';
  if (absDx <= meleeRange) return 'melee';
  if (absDx <= BOSS_CHARGE_MAX_RANGE) return 'charge';
  return 'none';
}
