/**
 * Difficulty modes (Biblia §11 curva de dificultad). Each scales enemy
 * toughness and aggression, and rewards harder play with more score/guita.
 * Pure data + a defensive localStorage layer (same pattern as AudioSettings).
 */

export interface DifficultyDef {
  id: string;
  label: string;
  description: string;
  /** enemy HP multiplier at spawn */
  enemyHp: number;
  /** enemy attack-damage multiplier at spawn */
  enemyDamage: number;
  /** score/guita multiplier for the run */
  score: number;
}

export const DIFFICULTIES: DifficultyDef[] = [
  {
    id: 'normal',
    label: 'NORMAL',
    description: 'La calle como es. Enemigos estándar.',
    enemyHp: 1,
    enemyDamage: 1,
    score: 1,
  },
  {
    id: 'dificil',
    label: 'DIFÍCIL',
    description: 'La Rosca se puso seria. +40% aguante, +30% daño enemigo, +30% puntaje.',
    enemyHp: 1.4,
    enemyDamage: 1.3,
    score: 1.3,
  },
  {
    id: 'furia',
    label: 'FURIA',
    description: 'Modo bronca total. +80% aguante, +60% daño enemigo, +60% puntaje.',
    enemyHp: 1.8,
    enemyDamage: 1.6,
    score: 1.6,
  },
];

export const DIFFICULTY_BY_ID: Record<string, DifficultyDef> = Object.fromEntries(
  DIFFICULTIES.map((d) => [d.id, d]),
);

const DEFAULT_ID = 'normal';
const STORAGE_KEY = 'mostasas-rage:difficulty:v1';

export function difficultyById(id: string): DifficultyDef {
  return DIFFICULTY_BY_ID[id] ?? DIFFICULTY_BY_ID[DEFAULT_ID]!;
}

/** Next difficulty in the cycle (wraps around). */
export function cycleDifficulty(id: string): DifficultyDef {
  const i = DIFFICULTIES.findIndex((d) => d.id === id);
  const next = DIFFICULTIES[(i + 1 + DIFFICULTIES.length) % DIFFICULTIES.length];
  return next ?? DIFFICULTIES[0]!;
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function loadDifficulty(): DifficultyDef {
  const store = getStorage();
  if (!store) return difficultyById(DEFAULT_ID);
  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw ? difficultyById(raw) : difficultyById(DEFAULT_ID);
  } catch {
    return difficultyById(DEFAULT_ID);
  }
}

export function saveDifficulty(id: string): void {
  const store = getStorage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, difficultyById(id).id);
  } catch {
    /* storage blocked — selection just won't persist */
  }
}
