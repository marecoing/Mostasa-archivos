/**
 * Campaign progress + persistence (Biblia §32 progresión, §35 guardado).
 *
 * The pure functions (unlock / playable / withStageCleared) are unit-tested
 * without any storage; loadProgress/saveProgress wrap them with a defensive
 * localStorage layer that degrades to an in-memory value when storage is
 * unavailable (private mode, SSR, tests).
 */

import { STAGES } from './StageManifest';
import type { StageDef } from './StageManifest';
import { RANK_ORDER } from './RankSystem';
import type { Rank } from './RankSystem';

export interface CampaignProgress {
  /** stage ids the player has cleared at least once */
  cleared: string[];
  /** best score achieved per stage */
  bestScore: Record<string, number>;
  /** best rank achieved per stage */
  bestRank: Record<string, Rank>;
  /** guita: spendable in-game currency earned from cleared runs (§16) */
  wallet: number;
  /** purchased upgrade levels, keyed by ShopManifest item id */
  upgrades: Record<string, number>;
  /** highest combo chain ever reached across the campaign (§12) */
  bestCombo: number;
  /** ids of achievements already unlocked (and paid out) */
  achievements: string[];
}

const STORAGE_KEY = 'mostasas-rage:progress:v1';

export function emptyProgress(): CampaignProgress {
  return { cleared: [], bestScore: {}, bestRank: {}, wallet: 0, upgrades: {}, bestCombo: 0, achievements: [] };
}

/**
 * A stage is unlocked if it's the first, or the stage immediately before it in
 * campaign order has been cleared.
 */
export function isStageUnlocked(stage: StageDef, cleared: readonly string[]): boolean {
  if (stage.index <= 1) return true;
  const prev = STAGES.find((s) => s.index === stage.index - 1);
  return prev ? cleared.includes(prev.id) : false;
}

/** Playable = unlocked in the campaign AND its art is wired for runtime. */
export function isStagePlayable(stage: StageDef, cleared: readonly string[]): boolean {
  return stage.runtimeReady && isStageUnlocked(stage, cleared);
}

function isBetterRank(a: Rank, b: Rank | undefined): boolean {
  if (b === undefined) return true;
  return RANK_ORDER.indexOf(a) > RANK_ORDER.indexOf(b);
}

/** Return a new progress with the stage recorded as cleared (pure). */
export function withStageCleared(
  p: CampaignProgress,
  stageId: string,
  score: number,
  rank: Rank,
): CampaignProgress {
  const cleared = p.cleared.includes(stageId) ? p.cleared : [...p.cleared, stageId];
  const bestScore = { ...p.bestScore };
  if (score > (bestScore[stageId] ?? -1)) bestScore[stageId] = score;
  const bestRank = { ...p.bestRank };
  if (isBetterRank(rank, bestRank[stageId])) bestRank[stageId] = rank;
  // Every completed run pays its score into the wallet (replays earn too).
  const wallet = p.wallet + Math.max(0, Math.round(score));
  return {
    cleared, bestScore, bestRank, wallet,
    upgrades: { ...p.upgrades }, bestCombo: p.bestCombo, achievements: [...p.achievements],
  };
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadProgress(): CampaignProgress {
  const store = getStorage();
  if (!store) return emptyProgress();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as Partial<CampaignProgress>;
    return {
      cleared: Array.isArray(parsed.cleared) ? parsed.cleared : [],
      bestScore: parsed.bestScore ?? {},
      bestRank: parsed.bestRank ?? {},
      wallet: typeof parsed.wallet === 'number' && Number.isFinite(parsed.wallet) ? Math.max(0, parsed.wallet) : 0,
      upgrades: parsed.upgrades ?? {},
      bestCombo: typeof parsed.bestCombo === 'number' && Number.isFinite(parsed.bestCombo) ? Math.max(0, parsed.bestCombo) : 0,
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
    };
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(p: CampaignProgress): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* storage full / blocked — progress just won't persist this session */
  }
}

/** Load, record a clear (with optional run combo), save, and return it. */
export function recordStageResult(
  stageId: string,
  score: number,
  rank: Rank,
  maxCombo = 0,
): CampaignProgress {
  const cleared = withStageCleared(loadProgress(), stageId, score, rank);
  const next = { ...cleared, bestCombo: Math.max(cleared.bestCombo, Math.max(0, Math.round(maxCombo))) };
  saveProgress(next);
  return next;
}
