/**
 * Derived campaign statistics for the records screen (Biblia §32). Pure
 * aggregation over CampaignProgress + StageManifest — no engine deps, so the
 * numbers shown to the player are unit-testable.
 */

import { STAGES } from './StageManifest';
import { RANK_ORDER } from './RankSystem';
import type { Rank } from './RankSystem';
import type { CampaignProgress } from './CampaignProgress';

export interface CampaignStats {
  stagesCleared: number;
  stagesTotal: number;
  /** true once every stage has been cleared at least once */
  campaignComplete: boolean;
  /** sum of best scores across all stages */
  totalBestScore: number;
  bestCombo: number;
  wallet: number;
  /** highest rank earned on any stage, or null if nothing cleared */
  topRank: Rank | null;
  /** count of stages graded S or Rosca */
  sRankCount: number;
  /** lifetime no-damage zone clears */
  perfectZones: number;
}

export function computeStats(p: CampaignProgress): CampaignStats {
  const stagesTotal = STAGES.length;
  const stagesCleared = STAGES.reduce((n, s) => n + (p.cleared.includes(s.id) ? 1 : 0), 0);
  const totalBestScore = Object.values(p.bestScore).reduce((a, b) => a + b, 0);

  let topRank: Rank | null = null;
  let sRankCount = 0;
  for (const rank of Object.values(p.bestRank)) {
    if (topRank === null || RANK_ORDER.indexOf(rank) > RANK_ORDER.indexOf(topRank)) {
      topRank = rank;
    }
    if (rank === 'S' || rank === 'Rosca') sRankCount += 1;
  }

  return {
    stagesCleared,
    stagesTotal,
    campaignComplete: stagesCleared === stagesTotal,
    totalBestScore,
    bestCombo: p.bestCombo,
    wallet: p.wallet,
    topRank,
    sRankCount,
    perfectZones: p.perfectZones,
  };
}
