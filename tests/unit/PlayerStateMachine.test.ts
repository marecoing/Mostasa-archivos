import { describe, it, expect, beforeEach } from 'vitest';
import {
  PlayerStateMachine,
  PLAYER_STATE,
  LAND_FRAMES,
  HURT_FRAMES,
  DOWN_FRAMES,
  GET_UP_FRAMES,
} from '../../src/game/player/PlayerStateMachine';
import { makeEmptySnapshot } from '../../src/game/systems/input/InputActions';
import { INPUT_ACTIONS } from '../../src/game/systems/input/InputActions';
import type { InputSnapshot } from '../../src/game/systems/input/InputActions';

const GROUNDED = { isOnGround: true, velZ: 0 };
const AIRBORNE = { isOnGround: false, velZ: 200 };
const FALLING = { isOnGround: false, velZ: -100 };
const LANDED = { isOnGround: true, velZ: -1 };

function snap(overrides: Partial<Record<string, Partial<{ held: boolean; justPressed: boolean; justReleased: boolean }>>> = {}): InputSnapshot {
  const base = makeEmptySnapshot() as Record<string, { held: boolean; justPressed: boolean; justReleased: boolean }>;
  for (const [k, v] of Object.entries(overrides)) {
    if (base[k]) Object.assign(base[k], v);
  }
  return base as InputSnapshot;
}

function pressLight(): InputSnapshot {
  return snap({ [INPUT_ACTIONS.LIGHT_ATTACK]: { held: true, justPressed: true } });
}

function pressHeavy(): InputSnapshot {
  return snap({ [INPUT_ACTIONS.HEAVY_ATTACK]: { held: true, justPressed: true } });
}

function pressJump(): InputSnapshot {
  return snap({ [INPUT_ACTIONS.JUMP]: { held: true, justPressed: true } });
}

function holdLeft(): InputSnapshot {
  return snap({ [INPUT_ACTIONS.MOVE_LEFT]: { held: true } });
}

function holdRun(): InputSnapshot {
  return snap({
    [INPUT_ACTIONS.MOVE_RIGHT]: { held: true },
    [INPUT_ACTIONS.RUN]: { held: true },
  });
}

const empty = makeEmptySnapshot();

describe('PlayerStateMachine initial state', () => {
  it('starts in IDLE', () => {
    expect(new PlayerStateMachine().currentState).toBe(PLAYER_STATE.IDLE);
  });

  it('canMove() is true in IDLE', () => {
    expect(new PlayerStateMachine().canMove()).toBe(true);
  });
});

describe('ground movement transitions', () => {
  it('IDLE → WALK on movement input', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(holdLeft(), GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.WALK);
  });

  it('IDLE → RUN when RUN held with movement', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(holdRun(), GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.RUN);
  });

  it('WALK → IDLE when no movement input', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(holdLeft(), GROUNDED);
    fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });

  it('WALK → RUN when RUN held', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(holdLeft(), GROUNDED);
    fsm.tick(holdRun(), GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.RUN);
  });

  it('RUN → IDLE when no movement', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(holdRun(), GROUNDED);
    fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });
});

describe('jump transitions', () => {
  it('IDLE → JUMP on jump press, velZSet = 720', () => {
    const fsm = new PlayerStateMachine();
    const result = fsm.tick(pressJump(), GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.JUMP);
    expect(result.velZSet).toBe(720);
  });

  it('WALK → JUMP on jump press', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(holdLeft(), GROUNDED);
    fsm.tick(pressJump(), GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.JUMP);
  });

  it('stays in JUMP while airborne', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressJump(), GROUNDED);
    for (let i = 0; i < 10; i++) fsm.tick(empty, AIRBORNE);
    expect(fsm.currentState).toBe(PLAYER_STATE.JUMP);
  });

  it('JUMP → LAND on landing after frame 4', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressJump(), GROUNDED);
    for (let i = 0; i < 5; i++) fsm.tick(empty, AIRBORNE);
    fsm.tick(empty, LANDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.LAND);
  });

  it('does not land in first 4 frames of JUMP', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressJump(), GROUNDED);
    fsm.tick(empty, LANDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.JUMP);
  });

  it('LAND → IDLE after LAND_FRAMES', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressJump(), GROUNDED);
    for (let i = 0; i < 5; i++) fsm.tick(empty, AIRBORNE);
    fsm.tick(empty, LANDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.LAND);
    for (let i = 0; i < LAND_FRAMES; i++) fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });
});

describe('light attack chain (Hito 014)', () => {
  it('IDLE → LIGHT_1 on light attack press', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressLight(), GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.LIGHT_1);
  });

  it('LIGHT_1 produces activeAttack during active frames', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressLight(), GROUNDED);
    let foundActive = false;
    for (let i = 0; i < 20; i++) {
      const result = fsm.tick(empty, GROUNDED);
      if (result.activeAttack?.id === 'light_1') foundActive = true;
    }
    expect(foundActive).toBe(true);
  });

  it('LIGHT_1 → LIGHT_2 when light queued', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressLight(), GROUNDED);
    // tick through LIGHT_1 total frames, pressing light midway
    const light1Total = 3 + 3 + 8; // 14
    for (let i = 0; i < light1Total - 1; i++) {
      fsm.tick(i === 5 ? pressLight() : empty, GROUNDED);
    }
    fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.LIGHT_2);
  });

  it('LIGHT_2 → LIGHT_3 when light queued', () => {
    const fsm = new PlayerStateMachine();
    // Drive to LIGHT_2
    fsm.tick(pressLight(), GROUNDED);
    const light1Total = 3 + 3 + 8;
    for (let i = 0; i < light1Total - 1; i++) {
      fsm.tick(i === 5 ? pressLight() : empty, GROUNDED);
    }
    fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.LIGHT_2);

    // Drive through LIGHT_2
    const light2Total = 3 + 3 + 10;
    for (let i = 0; i < light2Total - 1; i++) {
      fsm.tick(i === 5 ? pressLight() : empty, GROUNDED);
    }
    fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.LIGHT_3);
  });

  it('LIGHT_3 → IDLE (no chain)', () => {
    const fsm = new PlayerStateMachine();
    // Drive to LIGHT_3 directly (force state by running through chain)
    // Press light at correct times
    fsm.tick(pressLight(), GROUNDED);
    const l1 = 3 + 3 + 8;
    for (let i = 0; i < l1 - 1; i++) fsm.tick(i === 5 ? pressLight() : empty, GROUNDED);
    fsm.tick(empty, GROUNDED);
    const l2 = 3 + 3 + 10;
    for (let i = 0; i < l2 - 1; i++) fsm.tick(i === 5 ? pressLight() : empty, GROUNDED);
    fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.LIGHT_3);

    // Now run through LIGHT_3 without pressing again
    const l3 = 4 + 4 + 18;
    for (let i = 0; i < l3; i++) fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });

  it('LIGHT_1 → IDLE when no combo queued', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressLight(), GROUNDED);
    const l1Total = 3 + 3 + 8;
    for (let i = 0; i < l1Total; i++) fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });
});

describe('heavy attack (Hito 015)', () => {
  it('IDLE → HEAVY on heavy attack press', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressHeavy(), GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.HEAVY);
  });

  it('HEAVY produces activeAttack during active frames', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressHeavy(), GROUNDED);
    let foundActive = false;
    for (let i = 0; i < 40; i++) {
      const result = fsm.tick(empty, GROUNDED);
      if (result.activeAttack?.id === 'heavy') foundActive = true;
    }
    expect(foundActive).toBe(true);
  });

  it('HEAVY → IDLE after total frames', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressHeavy(), GROUNDED);
    const heavyTotal = 8 + 6 + 20;
    for (let i = 0; i < heavyTotal; i++) fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });

  it('locksMovement() is true during HEAVY', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressHeavy(), GROUNDED);
    expect(fsm.locksMovement()).toBe(true);
  });
});

describe('air attack (Hito 015)', () => {
  it('JUMP → AIR_ATTACK on light press while airborne', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressJump(), GROUNDED);
    for (let i = 0; i < 3; i++) fsm.tick(empty, AIRBORNE);
    fsm.tick(pressLight(), AIRBORNE);
    expect(fsm.currentState).toBe(PLAYER_STATE.AIR_ATTACK);
  });

  it('AIR_ATTACK → LAND when landing', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressJump(), GROUNDED);
    for (let i = 0; i < 3; i++) fsm.tick(empty, AIRBORNE);
    fsm.tick(pressLight(), AIRBORNE);
    for (let i = 0; i < 5; i++) fsm.tick(empty, AIRBORNE);
    fsm.tick(empty, LANDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.LAND);
  });
});

describe('hurt / down states', () => {
  it('forceHurt() transitions to HURT', () => {
    const fsm = new PlayerStateMachine();
    fsm.forceHurt();
    expect(fsm.currentState).toBe(PLAYER_STATE.HURT);
  });

  it('HURT → IDLE after HURT_FRAMES', () => {
    const fsm = new PlayerStateMachine();
    fsm.forceHurt();
    for (let i = 0; i < HURT_FRAMES; i++) fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });

  it('forceDown() transitions to DOWN', () => {
    const fsm = new PlayerStateMachine();
    fsm.forceDown();
    expect(fsm.currentState).toBe(PLAYER_STATE.DOWN);
  });

  it('DOWN → GET_UP after DOWN_FRAMES', () => {
    const fsm = new PlayerStateMachine();
    fsm.forceDown();
    for (let i = 0; i < DOWN_FRAMES; i++) fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.GET_UP);
  });

  it('GET_UP → IDLE after GET_UP_FRAMES', () => {
    const fsm = new PlayerStateMachine();
    fsm.forceDown();
    for (let i = 0; i < DOWN_FRAMES + GET_UP_FRAMES; i++) fsm.tick(empty, GROUNDED);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });

  it('forceHurt() is ignored when already DOWN', () => {
    const fsm = new PlayerStateMachine();
    fsm.forceDown();
    fsm.forceHurt();
    expect(fsm.currentState).toBe(PLAYER_STATE.DOWN);
  });
});

describe('isAttacking / isAirborne helpers', () => {
  it('isAttacking() true during LIGHT_1', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressLight(), GROUNDED);
    expect(fsm.isAttacking()).toBe(true);
  });

  it('isAirborne() true in JUMP', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressJump(), GROUNDED);
    expect(fsm.isAirborne()).toBe(true);
  });

  it('isAirborne() false on ground', () => {
    expect(new PlayerStateMachine().isAirborne()).toBe(false);
  });
});

describe('event emission', () => {
  it('emits jump event on jump transition', () => {
    const fsm = new PlayerStateMachine();
    const result = fsm.tick(pressJump(), GROUNDED);
    expect(result.events).toContain('jump');
  });

  it('emits land event on landing', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(pressJump(), GROUNDED);
    for (let i = 0; i < 5; i++) fsm.tick(empty, AIRBORNE);
    const result = fsm.tick(empty, LANDED);
    expect(result.events).toContain('land');
  });
});
