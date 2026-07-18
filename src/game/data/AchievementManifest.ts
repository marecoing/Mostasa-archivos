/**
 * Logros de la Rosca — achievements (Biblia §32). Each is a condition over the
 * aggregated campaign stats; unlocking one pays a guita bonus (§16). Rewards
 * are in-game currency only — no real-money anything (§35).
 *
 * Pure logic: evaluation and payout are unit-tested; the Libreta renders it.
 */

import { computeStats } from './CampaignStats';
import type { CampaignProgress } from './CampaignProgress';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** guita paid when first unlocked */
  reward: number;
  /** true when the progress satisfies this achievement */
  check: (p: CampaignProgress) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'primera_sangre',
    name: 'Primera Sangre',
    description: 'Despejá tu primera zona',
    reward: 200,
    check: (p) => computeStats(p).stagesCleared >= 1,
  },
  {
    id: 'media_ciudad',
    name: 'Media Ciudad',
    description: 'Despejá 5 zonas',
    reward: 1000,
    check: (p) => computeStats(p).stagesCleared >= 5,
  },
  {
    id: 'cadena_de_bronca',
    name: 'Cadena de Bronca',
    description: 'Alcanzá un combo de 20 hits',
    reward: 500,
    check: (p) => p.bestCombo >= 20,
  },
  {
    id: 'imparable',
    name: 'Imparable',
    description: 'Alcanzá un combo de 30 hits',
    reward: 1000,
    check: (p) => p.bestCombo >= 30,
  },
  {
    id: 'sin_una_marca',
    name: 'Sin Una Marca',
    description: 'Ganá rango S o Rosca en cualquier zona',
    reward: 800,
    check: (p) => computeStats(p).sRankCount >= 1,
  },
  {
    id: 'millonario',
    name: 'Millonario del Barrio',
    description: 'Acumulá 20.000 de puntaje total',
    reward: 1500,
    check: (p) => computeStats(p).totalBestScore >= 20000,
  },
  {
    id: 'la_rosca_cayo',
    name: 'La Rosca Cayó',
    description: 'Despejá las 10 zonas de la campaña',
    reward: 3000,
    check: (p) => computeStats(p).campaignComplete,
  },
];

export const ACHIEVEMENT_BY_ID: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export interface AchievementUnlock {
  ids: string[];
  reward: number;
}

/** Achievements whose condition holds but that aren't yet recorded. */
export function pendingAchievements(p: CampaignProgress): AchievementUnlock {
  const ids: string[] = [];
  let reward = 0;
  for (const a of ACHIEVEMENTS) {
    if (!p.achievements.includes(a.id) && a.check(p)) {
      ids.push(a.id);
      reward += a.reward;
    }
  }
  return { ids, reward };
}

/**
 * Pure: return progress with any newly-satisfied achievements recorded and
 * their guita added. Idempotent — already-claimed ones are never paid twice.
 */
export function grantAchievements(p: CampaignProgress): { progress: CampaignProgress; unlocked: AchievementUnlock } {
  const unlocked = pendingAchievements(p);
  if (unlocked.ids.length === 0) return { progress: p, unlocked };
  return {
    progress: {
      ...p,
      wallet: p.wallet + unlocked.reward,
      achievements: [...p.achievements, ...unlocked.ids],
    },
    unlocked,
  };
}
