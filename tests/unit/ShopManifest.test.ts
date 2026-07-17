import { describe, it, expect } from 'vitest';
import { emptyProgress } from '../../src/game/data/CampaignProgress';
import type { CampaignProgress } from '../../src/game/data/CampaignProgress';
import {
  SHOP_ITEMS,
  SHOP_ITEM_BY_ID,
  upgradeLevel,
  nextCost,
  canBuy,
  buyUpgrade,
  effectsFor,
} from '../../src/game/data/ShopManifest';

function withWallet(guita: number, upgrades: Record<string, number> = {}): CampaignProgress {
  return { ...emptyProgress(), wallet: guita, upgrades };
}

describe('SHOP_ITEMS integrity', () => {
  it('has unique ids and sane costs/levels', () => {
    const ids = SHOP_ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of SHOP_ITEMS) {
      expect(item.baseCost).toBeGreaterThan(0);
      expect(item.maxLevel).toBeGreaterThanOrEqual(1);
      expect(item.displayName.length).toBeGreaterThan(0);
      expect(SHOP_ITEM_BY_ID[item.id]).toBe(item);
    }
  });
});

describe('nextCost / canBuy', () => {
  it('scales cost with level and returns null when maxed', () => {
    const p0 = withWallet(99999);
    expect(nextCost(p0, 'aguante_extra')).toBe(900); // level 0 → base * 1
    const p1 = withWallet(99999, { aguante_extra: 1 });
    expect(nextCost(p1, 'aguante_extra')).toBe(1800); // level 1 → base * 2
    const pMax = withWallet(99999, { aguante_extra: 3 });
    expect(nextCost(pMax, 'aguante_extra')).toBeNull();
    expect(canBuy(pMax, 'aguante_extra')).toBe(false);
  });

  it('gates on affordability', () => {
    expect(canBuy(withWallet(899), 'aguante_extra')).toBe(false);
    expect(canBuy(withWallet(900), 'aguante_extra')).toBe(true);
  });

  it('returns null for unknown items', () => {
    expect(nextCost(withWallet(9999), 'nope')).toBeNull();
  });
});

describe('buyUpgrade (pure)', () => {
  it('spends guita, bumps the level, leaves the original untouched', () => {
    const p0 = withWallet(2000);
    const p1 = buyUpgrade(p0, 'aguante_extra')!;
    expect(p1.wallet).toBe(1100);
    expect(upgradeLevel(p1, 'aguante_extra')).toBe(1);
    expect(p0.wallet).toBe(2000); // immutable
    expect(upgradeLevel(p0, 'aguante_extra')).toBe(0);
  });

  it('refuses when unaffordable or maxed', () => {
    expect(buyUpgrade(withWallet(100), 'aguante_extra')).toBeNull();
    expect(buyUpgrade(withWallet(99999, { bronca_inicial: 1 }), 'bronca_inicial')).toBeNull();
  });
});

describe('effectsFor', () => {
  it('maps upgrade levels to gameplay effects', () => {
    expect(effectsFor(emptyProgress())).toEqual({
      maxHpBonus: 0,
      damageMultiplier: 1,
      extraLives: 0,
      startingBronca: 0,
    });
    const p = withWallet(0, {
      aguante_extra: 2,
      punos_curtidos: 3,
      vida_extra: 1,
      bronca_inicial: 1,
    });
    const fx = effectsFor(p);
    expect(fx.maxHpBonus).toBe(30);
    expect(fx.damageMultiplier).toBeCloseTo(1.3, 5);
    expect(fx.extraLives).toBe(1);
    expect(fx.startingBronca).toBe(50);
  });
});
