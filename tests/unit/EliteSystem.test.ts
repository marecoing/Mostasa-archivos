import { describe, it, expect } from 'vitest';
import {
  eliteEveryN, isEliteSpawn,
  ELITE_HP_MULT, ELITE_DAMAGE_MULT,
} from '../../src/game/systems/EliteSystem';
import { EnemyEntity } from '../../src/game/entities/EnemyEntity';
import { ENEMY_TYPES } from '../../src/game/data/EnemyData';

describe('eliteEveryN', () => {
  it('is disabled on Normal and denser on harder modes', () => {
    expect(eliteEveryN('normal')).toBe(0);
    expect(eliteEveryN('dificil')).toBe(5);
    expect(eliteEveryN('furia')).toBe(3);
    expect(eliteEveryN('nope')).toBe(0);
  });
});

describe('isEliteSpawn', () => {
  it('promotes every Nth spawn and never when disabled', () => {
    expect(isEliteSpawn(3, 3)).toBe(true);
    expect(isEliteSpawn(6, 3)).toBe(true);
    expect(isEliteSpawn(4, 3)).toBe(false);
    expect(isEliteSpawn(3, 0)).toBe(false); // disabled
    expect(isEliteSpawn(0, 3)).toBe(false); // no ordinal 0
  });

  it('produces roughly 1/N elites over a run', () => {
    let elites = 0;
    for (let i = 1; i <= 30; i++) if (isEliteSpawn(i, 5)) elites++;
    expect(elites).toBe(6); // 5,10,15,20,25,30
  });
});

describe('EnemyEntity.makeElite', () => {
  it('scales HP and damage and flags the enemy, once', () => {
    const e = new EnemyEntity(0, 0, ENEMY_TYPES['grunt']!, 'enemy_001');
    const baseHp = e.maxHp;
    const baseDmg = e.attackDamage;
    e.makeElite(ELITE_HP_MULT, ELITE_DAMAGE_MULT);
    expect(e.elite).toBe(true);
    expect(e.maxHp).toBe(Math.round(baseHp * ELITE_HP_MULT));
    expect(e.hp).toBe(e.maxHp);
    expect(e.attackDamage).toBe(Math.round(baseDmg * ELITE_DAMAGE_MULT));
    // idempotent
    const hp = e.maxHp;
    e.makeElite(ELITE_HP_MULT, ELITE_DAMAGE_MULT);
    expect(e.maxHp).toBe(hp);
  });
});
