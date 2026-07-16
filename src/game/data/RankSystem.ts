/**
 * Stage rank system (Biblia §4): D, C, B, A, S, Rosca.
 * Rank is earned from score, remaining health and whether the stage was
 * cleared without dying. Pure logic — no engine dependencies.
 */

export type Rank = 'D' | 'C' | 'B' | 'A' | 'S' | 'Rosca';

export const RANK_ORDER: Rank[] = ['D', 'C', 'B', 'A', 'S', 'Rosca'];

export interface StageResult {
  stageId: string;
  score: number;
  /** player HP fraction at clear (0..1) */
  hpFraction: number;
  /** cleared without losing a life */
  noDeaths: boolean;
  /** seconds taken to clear */
  timeSeconds: number;
}

/**
 * Score thresholds for the base rank, then bumped by performance modifiers.
 * Tuned for the Escenario 1 slice (a full clear yields ~2000-3000).
 */
const SCORE_THRESHOLDS: { rank: Rank; min: number }[] = [
  { rank: 'S', min: 3000 },
  { rank: 'A', min: 2200 },
  { rank: 'B', min: 1500 },
  { rank: 'C', min: 800 },
  { rank: 'D', min: 0 },
];

function bumpRank(rank: Rank, steps: number): Rank {
  const i = RANK_ORDER.indexOf(rank);
  const j = Math.max(0, Math.min(RANK_ORDER.length - 1, i + steps));
  return RANK_ORDER[j]!;
}

export function computeRank(result: StageResult): Rank {
  let rank: Rank = 'D';
  for (const t of SCORE_THRESHOLDS) {
    if (result.score >= t.min) { rank = t.rank; break; }
  }

  // Performance bumps.
  let bumps = 0;
  if (result.noDeaths && result.hpFraction >= 0.75) bumps += 1;
  if (result.timeSeconds > 0 && result.timeSeconds <= 120) bumps += 1;

  rank = bumpRank(rank, bumps);

  // "Rosca" is reserved for a flawless, fast, high-score clear.
  if (rank === 'S' && result.noDeaths && result.hpFraction >= 0.9 && result.timeSeconds <= 150) {
    rank = 'Rosca';
  }
  return rank;
}

export const RANK_COLORS: Record<Rank, string> = {
  D: '#888888',
  C: '#88cc88',
  B: '#88aaff',
  A: '#ffcc44',
  S: '#ff6644',
  Rosca: '#ff00aa',
};
