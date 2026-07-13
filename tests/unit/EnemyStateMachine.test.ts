import { describe, it, expect, beforeEach } from 'vitest';
import { EnemyStateMachine, ENEMY_STATE } from '../../src/game/entities/EnemyStateMachine';

function tickN(fsm: EnemyStateMachine, n: number): void {
  for (let i = 0; i < n; i++) fsm.tick();
}

describe('EnemyStateMachine', () => {
  let fsm: EnemyStateMachine;

  beforeEach(() => {
    fsm = new EnemyStateMachine();
  });

  describe('initial state', () => {
    it('starts IDLE', () => {
      expect(fsm.currentState).toBe(ENEMY_STATE.IDLE);
    });

    it('canMove() is true when IDLE', () => {
      expect(fsm.canMove()).toBe(true);
    });

    it('isVulnerable() is true when IDLE', () => {
      expect(fsm.isVulnerable()).toBe(true);
    });

    it('isGrabbed() is false when IDLE', () => {
      expect(fsm.isGrabbed()).toBe(false);
    });

    it('isDown() is false when IDLE', () => {
      expect(fsm.isDown()).toBe(false);
    });
  });

  describe('setWalking / setIdle', () => {
    it('transitions IDLE → WALK on setWalking', () => {
      fsm.setWalking();
      expect(fsm.currentState).toBe(ENEMY_STATE.WALK);
    });

    it('canMove() is true when WALK', () => {
      fsm.setWalking();
      expect(fsm.canMove()).toBe(true);
    });

    it('transitions WALK → IDLE on setIdle', () => {
      fsm.setWalking();
      fsm.setIdle();
      expect(fsm.currentState).toBe(ENEMY_STATE.IDLE);
    });

    it('setWalking from non-IDLE state has no effect', () => {
      fsm.receiveHit(10);
      fsm.setWalking();
      expect(fsm.currentState).toBe(ENEMY_STATE.HURT);
    });

    it('setIdle from non-WALK state has no effect', () => {
      fsm.receiveHit(10);
      fsm.setIdle();
      expect(fsm.currentState).toBe(ENEMY_STATE.HURT);
    });
  });

  describe('receiveHit / HURT state', () => {
    it('transitions to HURT on receiveHit', () => {
      fsm.receiveHit(12);
      expect(fsm.currentState).toBe(ENEMY_STATE.HURT);
    });

    it('canMove() is false when HURT', () => {
      fsm.receiveHit(12);
      expect(fsm.canMove()).toBe(false);
    });

    it('isVulnerable() is true when HURT', () => {
      fsm.receiveHit(12);
      expect(fsm.isVulnerable()).toBe(true);
    });

    it('transitions HURT → IDLE after hitstun expires', () => {
      fsm.receiveHit(5);
      tickN(fsm, 5);
      expect(fsm.currentState).toBe(ENEMY_STATE.IDLE);
    });

    it('stays HURT before hitstun expires', () => {
      fsm.receiveHit(10);
      tickN(fsm, 9);
      expect(fsm.currentState).toBe(ENEMY_STATE.HURT);
    });

    it('rejects receiveHit when GRABBED', () => {
      fsm.receiveGrab();
      fsm.receiveHit(10);
      expect(fsm.currentState).toBe(ENEMY_STATE.GRABBED);
    });
  });

  describe('receiveKnockdown / DOWN / GET_UP', () => {
    it('transitions to DOWN on receiveKnockdown', () => {
      fsm.receiveKnockdown();
      expect(fsm.currentState).toBe(ENEMY_STATE.DOWN);
    });

    it('isDown() is true when DOWN', () => {
      fsm.receiveKnockdown();
      expect(fsm.isDown()).toBe(true);
    });

    it('isVulnerable() is true when DOWN', () => {
      fsm.receiveKnockdown();
      expect(fsm.isVulnerable()).toBe(true);
    });

    it('transitions DOWN → GET_UP after 40 ticks', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 40);
      expect(fsm.currentState).toBe(ENEMY_STATE.GET_UP);
    });

    it('stays DOWN before 40 ticks', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 39);
      expect(fsm.currentState).toBe(ENEMY_STATE.DOWN);
    });

    it('isDown() is true when GET_UP', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 40);
      expect(fsm.isDown()).toBe(true);
    });

    it('isVulnerable() is false when GET_UP', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 40);
      expect(fsm.isVulnerable()).toBe(false);
    });

    it('transitions GET_UP → IDLE after 20 ticks', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 40);
      tickN(fsm, 20);
      expect(fsm.currentState).toBe(ENEMY_STATE.IDLE);
    });

    it('stays GET_UP before 20 ticks', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 40);
      tickN(fsm, 19);
      expect(fsm.currentState).toBe(ENEMY_STATE.GET_UP);
    });
  });

  describe('receiveGrab / GRABBED', () => {
    it('transitions to GRABBED on receiveGrab', () => {
      fsm.receiveGrab();
      expect(fsm.currentState).toBe(ENEMY_STATE.GRABBED);
    });

    it('isGrabbed() is true when GRABBED', () => {
      fsm.receiveGrab();
      expect(fsm.isGrabbed()).toBe(true);
    });

    it('isVulnerable() is false when GRABBED', () => {
      fsm.receiveGrab();
      expect(fsm.isVulnerable()).toBe(false);
    });

    it('canMove() is false when GRABBED', () => {
      fsm.receiveGrab();
      expect(fsm.canMove()).toBe(false);
    });

    it('rejects grab when already GRABBED', () => {
      fsm.receiveGrab();
      // a second grab attempt should be ignored (isVulnerable returns false)
      fsm.receiveGrab();
      expect(fsm.currentState).toBe(ENEMY_STATE.GRABBED);
    });

    it('rejects grab when GET_UP', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 40);
      fsm.receiveGrab();
      expect(fsm.currentState).toBe(ENEMY_STATE.GET_UP);
    });
  });

  describe('releaseGrab', () => {
    it('transitions GRABBED → DOWN on releaseGrab', () => {
      fsm.receiveGrab();
      fsm.releaseGrab();
      expect(fsm.currentState).toBe(ENEMY_STATE.DOWN);
    });

    it('releaseGrab from non-GRABBED state has no effect on IDLE', () => {
      fsm.releaseGrab();
      expect(fsm.currentState).toBe(ENEMY_STATE.IDLE);
    });
  });

  describe('currentFrame', () => {
    it('frame increments each tick in DOWN', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 5);
      expect(fsm.currentFrame).toBe(5);
    });

    it('frame resets to 0 on state transition', () => {
      fsm.receiveKnockdown();
      tickN(fsm, 40);
      expect(fsm.currentFrame).toBe(0);
    });
  });
});
