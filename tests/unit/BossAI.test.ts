import { describe, it, expect } from 'vitest';
import {
  chooseBossAttack,
  BOSS_CHARGE_MAX_RANGE,
  BOSS_CHARGE_DAMAGE,
  BOSS_CHARGE_DASH_FRAMES,
  BOSS_ATTACK_DEPTH,
} from '../../src/game/entities/BossAI';
import { EnemyEntity } from '../../src/game/entities/EnemyEntity';
import { ENEMY_TYPES } from '../../src/game/data/EnemyData';
import { ATTACK_WINDUP } from '../../src/game/entities/EnemyStateMachine';

const MELEE = 80;

describe('chooseBossAttack', () => {
  it('does nothing while on cooldown', () => {
    expect(chooseBossAttack(10, 0, MELEE, false)).toBe('none');
  });

  it('swings (melee) when the player is in reach', () => {
    expect(chooseBossAttack(MELEE - 5, 0, MELEE, true)).toBe('melee');
  });

  it('charges when the player is at mid range', () => {
    expect(chooseBossAttack(MELEE + 60, 0, MELEE, true)).toBe('charge');
    expect(chooseBossAttack(BOSS_CHARGE_MAX_RANGE, 0, MELEE, true)).toBe('charge');
  });

  it('does nothing when the player is too far', () => {
    expect(chooseBossAttack(BOSS_CHARGE_MAX_RANGE + 40, 0, MELEE, true)).toBe('none');
  });

  it('does nothing when depth is misaligned', () => {
    expect(chooseBossAttack(MELEE - 5, BOSS_ATTACK_DEPTH + 10, MELEE, true)).toBe('none');
  });
});

describe('EnemyEntity boss attacks', () => {
  function boss(x = 200): EnemyEntity {
    const e = new EnemyEntity(x, 500, ENEMY_TYPES['boss']!, 'enemy_010');
    return e;
  }

  const lane = { minX: 0, maxX: 9999, minY: 0, maxY: 9999 };

  it('commits a melee swing when the player is adjacent', () => {
    const e = boss();
    e.tickPhysics(e.pos.x + 40, 500, lane, true);
    expect(e.fsm.isAttacking()).toBe(true);
    expect(e.bossAttack).toBe('melee');
    expect(e.attackJustStarted).toBe('melee');
  });

  it('commits a charge when the player is at mid range', () => {
    const e = boss();
    e.tickPhysics(e.pos.x + 180, 500, lane, true);
    expect(e.fsm.isAttacking()).toBe(true);
    expect(e.bossAttack).toBe('charge');
  });

  it('lunges forward during the charge dash window', () => {
    const e = boss();
    const startX = e.pos.x;
    e.tickPhysics(startX + 180, 500, lane, true); // commit charge (frame 0)
    // Advance to the dash window; the player stays far so no re-decision runs.
    for (let i = 0; i < ATTACK_WINDUP + 2; i++) {
      e.tickPhysics(startX + 500, 500, lane, true);
    }
    expect(e.pos.x).toBeGreaterThan(startX); // moved toward the player
    expect(e.bossAttack).toBe('charge');
  });

  it('deals heavier charge damage across the dash window, once', () => {
    const e = boss();
    e.facing = 1;
    e.fsm.startAttack();
    e.bossAttack = 'charge';
    // wind-up: no damage yet
    for (let i = 0; i < ATTACK_WINDUP; i++) {
      expect(e.consumeAttackHit(e.pos.x + 40, 500, 0)).toBe(0);
      e.fsm.tick();
    }
    // first dash frame: charge damage
    expect(e.consumeAttackHit(e.pos.x + 40, 500, 0)).toBe(BOSS_CHARGE_DAMAGE);
    // only once per swing
    expect(e.consumeAttackHit(e.pos.x + 40, 500, 0)).toBe(0);
  });

  it('charge stays active longer than a normal swing', () => {
    const e = boss();
    e.facing = 1;
    e.fsm.startAttack();
    e.bossAttack = 'charge';
    let hits = 0;
    for (let i = 0; i < ATTACK_WINDUP + BOSS_CHARGE_DASH_FRAMES + 4; i++) {
      // fresh entity-less check: reset the once-guard each frame to count the window
      e.dealtDamageThisAttack = false;
      if (e.consumeAttackHit(e.pos.x + 40, 500, 0) > 0) hits++;
      e.fsm.tick();
    }
    expect(hits).toBe(BOSS_CHARGE_DASH_FRAMES);
  });

  it('enrage speeds the boss up only once', () => {
    const e = boss();
    const base = e.walkSpeed;
    e.enrage();
    expect(e.walkSpeed).toBeGreaterThan(base);
    const enragedSpeed = e.walkSpeed;
    e.enrage();
    expect(e.walkSpeed).toBe(enragedSpeed);
  });
});
