/**
 * Elite enemy variants (Biblia §10 variedad). On harder difficulties some
 * regular enemies spawn as tougher "elites": more HP and damage, a bigger
 * silhouette with a red aura, and a guita bonus on death. Pure promotion
 * rule so it's deterministic and testable.
 */

export const ELITE_HP_MULT = 2.2;
export const ELITE_DAMAGE_MULT = 1.4;
export const ELITE_SCALE = 1.22;
/** Score/guita bonus awarded when an elite is defeated. */
export const ELITE_KILL_BONUS = 120;

/**
 * How often a regular spawn is promoted to elite, by difficulty id. 0 means
 * no elites (Normal stays classic).
 */
export function eliteEveryN(difficultyId: string): number {
  switch (difficultyId) {
    case 'furia':
      return 3;
    case 'dificil':
      return 5;
    default:
      return 0;
  }
}

/**
 * Deterministic promotion: the Nth, 2Nth, … regular spawn (1-indexed ordinal)
 * becomes an elite. everyN <= 0 disables elites entirely.
 */
export function isEliteSpawn(spawnOrdinal: number, everyN: number): boolean {
  return everyN > 0 && spawnOrdinal > 0 && spawnOrdinal % everyN === 0;
}
