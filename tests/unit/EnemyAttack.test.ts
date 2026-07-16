import { describe, it, expect } from 'vitest';
import {
  EnemyStateMachine, ENEMY_STATE,
  ATTACK_WINDUP, ATTACK_ACTIVE, ATTACK_TOTAL,
} from '../../src/game/entities/EnemyStateMachine';
import { EnemyEntity } from '../../src/game/entities/EnemyEntity';
import { ENEMY_TYPES } from '../../src/game/data/EnemyData';

function tickN(fsm: EnemyStateMachine, n: number): void {
  for (let i = 0; i < n; i++) fsm.tick();
}

describe('EnemyStateMachine attack', () => {
  it('enters ATTACK only from idle/walk', () => {
    const fsm = new EnemyStateMachine();
    expect(fsm.startAttack()).toBe(true);
    expect(fsm.currentState).toBe(ENEMY_STATE.ATTACK);
    expect(fsm.startAttack()).toBe(false); // already attacking
  });

  it('is not attack-active during the windup (telegraph)', () => {
    const fsm = new EnemyStateMachine();
    fsm.startAttack();
    for (let i = 0; i < ATTACK_WINDUP; i++) {
      expect(fsm.isAttackActive()).toBe(false);
      fsm.tick();
    }
    // now within active window
    expect(fsm.isAttackActive()).toBe(true);
  });

  it('is attack-active only during the active window', () => {
    const fsm = new EnemyStateMachine();
    fsm.startAttack();
    let activeFrames = 0;
    for (let i = 0; i < ATTACK_TOTAL; i++) {
      if (fsm.isAttackActive()) activeFrames++;
      fsm.tick();
    }
    expect(activeFrames).toBe(ATTACK_ACTIVE);
  });

  it('returns to idle after the full attack', () => {
    const fsm = new EnemyStateMachine();
    fsm.startAttack();
    tickN(fsm, ATTACK_TOTAL);
    expect(fsm.currentState).toBe(ENEMY_STATE.IDLE);
  });

  it('can be interrupted by a hit (attack is vulnerable)', () => {
    const fsm = new EnemyStateMachine();
    fsm.startAttack();
    tickN(fsm, ATTACK_WINDUP);
    fsm.receiveHit(10);
    expect(fsm.currentState).toBe(ENEMY_STATE.HURT);
    expect(fsm.isAttackActive()).toBe(false);
  });
});

describe('EnemyEntity attack damage', () => {
  function grunt(): EnemyEntity {
    const e = new EnemyEntity(100, 500, ENEMY_TYPES['grunt']!, 'enemy_001');
    e.facing = 1;
    return e;
  }

  it('deals damage once, only during the active window, to a player in front & in range', () => {
    const e = grunt();
    e.fsm.startAttack();
    // during windup: no damage
    for (let i = 0; i < ATTACK_WINDUP; i++) {
      expect(e.consumeAttackHit(140, 500, 0)).toBe(0);
      e.fsm.tick();
    }
    // first active frame: deals damage
    const dmg = e.consumeAttackHit(140, 500, 0);
    expect(dmg).toBe(ENEMY_TYPES['grunt']!.attackDamage);
    // does not deal again this attack
    expect(e.consumeAttackHit(140, 500, 0)).toBe(0);
  });

  it('misses a player behind it or out of range', () => {
    const e = grunt();
    e.fsm.startAttack();
    tickN(e.fsm, ATTACK_WINDUP);
    expect(e.consumeAttackHit(20, 500, 0)).toBe(0);  // behind (facing +1, player left)
    const e2 = grunt();
    e2.fsm.startAttack();
    tickN(e2.fsm, ATTACK_WINDUP);
    expect(e2.consumeAttackHit(400, 500, 0)).toBe(0); // too far
  });

  it('misses a player at a different depth', () => {
    const e = grunt();
    e.fsm.startAttack();
    tickN(e.fsm, ATTACK_WINDUP);
    expect(e.consumeAttackHit(140, 600, 0)).toBe(0);
  });

  it('sets a cooldown after committing to an attack via AI', () => {
    const e = grunt();
    // player right next to it, off cooldown, token allowed
    e.tickPhysics(140, 500, { minX: 0, maxX: 9999, minY: 0, maxY: 9999 }, true);
    expect(e.fsm.isAttacking()).toBe(true);
    expect(e.attackCooldownLeft).toBeGreaterThan(0);
  });

  it('does not attack when no token is available', () => {
    const e = grunt();
    e.tickPhysics(140, 500, { minX: 0, maxX: 9999, minY: 0, maxY: 9999 }, false);
    expect(e.fsm.isAttacking()).toBe(false);
  });
});
