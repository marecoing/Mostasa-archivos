/**
 * El Kiosco de Doña Bronca — between-level upgrade shop (Biblia §16).
 *
 * Currency is "guita" (CampaignProgress.wallet) earned by clearing stages —
 * strictly in-game, no real-money anything (legal constraints §35). Pure
 * logic: the ShopScene renders it, tests validate it.
 */

import type { CampaignProgress } from './CampaignProgress';

export interface ShopItemDef {
  id: string;
  displayName: string;
  description: string;
  /** cost of level N purchase = baseCost * (N+1) */
  baseCost: number;
  maxLevel: number;
}

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: 'aguante_extra',
    displayName: 'Mate Reforzado',
    description: '+15 de AGUANTE máximo por nivel',
    baseCost: 900,
    maxLevel: 3,
  },
  {
    id: 'punos_curtidos',
    displayName: 'Puños Curtidos',
    description: '+10% de daño por nivel',
    baseCost: 1200,
    maxLevel: 3,
  },
  {
    id: 'vida_extra',
    displayName: 'Corazón de Barrio',
    description: '+1 vida por nivel',
    baseCost: 2000,
    maxLevel: 2,
  },
  {
    id: 'bronca_inicial',
    displayName: 'Desayuno Amargo',
    description: 'Arrancás cada zona con 50 de BRONCA',
    baseCost: 1500,
    maxLevel: 1,
  },
];

export const SHOP_ITEM_BY_ID: Record<string, ShopItemDef> = Object.fromEntries(
  SHOP_ITEMS.map((i) => [i.id, i]),
);

export function upgradeLevel(p: CampaignProgress, itemId: string): number {
  return p.upgrades[itemId] ?? 0;
}

/** Cost of the NEXT level of an item, or null when maxed. */
export function nextCost(p: CampaignProgress, itemId: string): number | null {
  const def = SHOP_ITEM_BY_ID[itemId];
  if (!def) return null;
  const level = upgradeLevel(p, itemId);
  if (level >= def.maxLevel) return null;
  return def.baseCost * (level + 1);
}

export function canBuy(p: CampaignProgress, itemId: string): boolean {
  const cost = nextCost(p, itemId);
  return cost !== null && p.wallet >= cost;
}

/** Pure purchase: returns the new progress, or null if not affordable/maxed. */
export function buyUpgrade(p: CampaignProgress, itemId: string): CampaignProgress | null {
  const cost = nextCost(p, itemId);
  if (cost === null || p.wallet < cost) return null;
  return {
    ...p,
    wallet: p.wallet - cost,
    upgrades: { ...p.upgrades, [itemId]: upgradeLevel(p, itemId) + 1 },
  };
}

/** Gameplay effects derived from the purchased upgrade levels. */
export interface UpgradeEffects {
  maxHpBonus: number;
  damageMultiplier: number;
  extraLives: number;
  startingBronca: number;
}

export function effectsFor(p: CampaignProgress): UpgradeEffects {
  return {
    maxHpBonus: upgradeLevel(p, 'aguante_extra') * 15,
    damageMultiplier: 1 + upgradeLevel(p, 'punos_curtidos') * 0.1,
    extraLives: upgradeLevel(p, 'vida_extra'),
    startingBronca: upgradeLevel(p, 'bronca_inicial') > 0 ? 50 : 0,
  };
}
