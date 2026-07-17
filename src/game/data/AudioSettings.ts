/**
 * Persisted audio mix (Biblia §22: volúmenes separados, configurables).
 * Pure helpers + a defensive localStorage layer, same pattern as
 * CampaignProgress: degrades to defaults when storage is unavailable.
 */

import type { AudioMix } from '../systems/audio/AudioSystem';
import { DEFAULT_MIX } from '../systems/audio/AudioSystem';

const STORAGE_KEY = 'mostasas-rage:audio:v1';

export function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/** Normalize an arbitrary parsed value into a valid mix. */
export function sanitizeMix(raw: unknown): AudioMix {
  const r = (raw ?? {}) as Partial<Record<keyof AudioMix, unknown>>;
  const num = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? clamp01(v) : fallback;
  return {
    master: num(r.master, DEFAULT_MIX.master),
    sfx: num(r.sfx, DEFAULT_MIX.sfx),
    music: num(r.music, DEFAULT_MIX.music),
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

export function loadAudioSettings(): AudioMix {
  const store = getStorage();
  if (!store) return { ...DEFAULT_MIX };
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MIX };
    return sanitizeMix(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_MIX };
  }
}

export function saveAudioSettings(mix: AudioMix): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(sanitizeMix(mix)));
  } catch {
    /* storage blocked — settings just won't persist */
  }
}
