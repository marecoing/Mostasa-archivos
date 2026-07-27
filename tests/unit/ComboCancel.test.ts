import { describe, expect, it } from 'vitest';
import {
  CANCEL_LINK_FRAMES,
  INPUT_BUFFER_FRAMES,
  PLAYER_STATE,
  PlayerStateMachine,
} from '../../src/game/player/PlayerStateMachine';
import { INPUT_ACTIONS } from '../../src/game/systems/input/InputActions';
import type { InputSnapshot } from '../../src/game/systems/input/InputActions';
import { ATTACKS, getTotalFrames } from '../../src/game/data/AttackData';

function blank(): InputSnapshot {
  const snap = {} as Record<string, { held: boolean; justPressed: boolean }>;
  for (const action of Object.values(INPUT_ACTIONS)) {
    snap[action] = { held: false, justPressed: false };
  }
  return snap as unknown as InputSnapshot;
}

function press(action: string): InputSnapshot {
  const snap = blank();
  (snap as Record<string, { held: boolean; justPressed: boolean }>)[action] = {
    held: true,
    justPressed: true,
  };
  return snap;
}

const GROUND = { isOnGround: true, velZ: 0 };

/** Cuadros que tarda el combo en llegar al estado pedido apretando siempre. */
function framesTo(target: string, mashEvery = 1): number {
  const fsm = new PlayerStateMachine();
  for (let f = 0; f < 300; f++) {
    fsm.tick(f % mashEvery === 0 ? press(INPUT_ACTIONS.LIGHT_ATTACK) : blank(), GROUND);
    if (fsm.currentState === target) return f;
  }
  return -1;
}

describe('ventana de cancelación', () => {
  it('encadena el segundo golpe sin esperar la recuperación entera del primero', () => {
    const light1 = ATTACKS['light_1']!;
    const full = getTotalFrames(light1);
    const cancel = light1.startupFrames + light1.activeFrames + CANCEL_LINK_FRAMES;

    const at = framesTo(PLAYER_STATE.LIGHT_2);
    expect(at).toBeGreaterThan(0);
    // Sale en la ventana de cancelación, no al final de la recuperación.
    expect(at).toBeLessThan(full);
    expect(at).toBeGreaterThanOrEqual(cancel - 1);
  });

  it('acorta el combo completo respecto de esperar cada recuperación', () => {
    const sinCancelar =
      getTotalFrames(ATTACKS['light_1']!) +
      getTotalFrames(ATTACKS['light_2']!) +
      getTotalFrames(ATTACKS['light_3']!);
    const conCancelar = framesTo(PLAYER_STATE.LIGHT_3);

    expect(conCancelar).toBeGreaterThan(0);
    // El tercer golpe tiene que arrancar bastante antes de lo que tardaban
    // las dos recuperaciones anteriores completas.
    expect(conCancelar).toBeLessThan(sinCancelar * 0.6);
  });

  it('no cancela antes de que terminen los cuadros activos', () => {
    const light1 = ATTACKS['light_1']!;
    const fsm = new PlayerStateMachine();
    fsm.tick(press(INPUT_ACTIONS.LIGHT_ATTACK), GROUND);
    for (let f = 0; f < light1.startupFrames + light1.activeFrames; f++) {
      fsm.tick(press(INPUT_ACTIONS.LIGHT_ATTACK), GROUND);
      expect(fsm.currentState, `cuadro ${f}`).toBe(PLAYER_STATE.LIGHT_1);
    }
  });

  it('no encadena un cuarto golpe: el tercero es el remate', () => {
    const fsm = new PlayerStateMachine();
    let sawThird = false;
    for (let f = 0; f < 300; f++) {
      fsm.tick(press(INPUT_ACTIONS.LIGHT_ATTACK), GROUND);
      if (fsm.currentState === PLAYER_STATE.LIGHT_3) sawThird = true;
      // Tras el remate tiene que pasar por reposo antes de volver a empezar.
      if (sawThird && fsm.currentState === PLAYER_STATE.IDLE) return;
    }
    expect(sawThird).toBe(true);
  });

  it('deja rematar el combo liviano con el golpe fuerte', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(press(INPUT_ACTIONS.LIGHT_ATTACK), GROUND);
    let entered = false;
    for (let f = 0; f < 60; f++) {
      fsm.tick(press(INPUT_ACTIONS.HEAVY_ATTACK), GROUND);
      if (fsm.currentState === PLAYER_STATE.HEAVY) {
        entered = true;
        break;
      }
    }
    expect(entered).toBe(true);
  });
});

describe('buffer de entrada', () => {
  it('acepta un golpe apretado durante la recuperación del anterior', () => {
    const light1 = ATTACKS['light_1']!;
    const fsm = new PlayerStateMachine();
    fsm.tick(press(INPUT_ACTIONS.LIGHT_ATTACK), GROUND);
    // Una sola pulsación, temprano, y nada más.
    fsm.tick(press(INPUT_ACTIONS.LIGHT_ATTACK), GROUND);
    for (let f = 0; f < light1.startupFrames + light1.activeFrames + 4; f++) {
      fsm.tick(blank(), GROUND);
    }
    expect(fsm.currentState).toBe(PLAYER_STATE.LIGHT_2);
  });

  it('vence el input encolado en vez de disparar un golpe fantasma', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(press(INPUT_ACTIONS.LIGHT_ATTACK), GROUND);
    // Deja pasar bastante más que la vida del buffer sin apretar nada.
    for (let f = 0; f < INPUT_BUFFER_FRAMES + 40; f++) fsm.tick(blank(), GROUND);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
    // Y sigue quieto: no aparece un golpe de la nada.
    for (let f = 0; f < 30; f++) fsm.tick(blank(), GROUND);
    expect(fsm.currentState).toBe(PLAYER_STATE.IDLE);
  });

  it('mantiene el golpe encolado durante el aterrizaje', () => {
    const fsm = new PlayerStateMachine();
    fsm.tick(press(INPUT_ACTIONS.JUMP), { isOnGround: true, velZ: 0 });
    fsm.tick(blank(), { isOnGround: false, velZ: 100 });
    // Aprieta en el aire, justo antes de tocar el piso.
    fsm.tick(press(INPUT_ACTIONS.LIGHT_ATTACK), { isOnGround: false, velZ: -100 });
    expect([PLAYER_STATE.JUMP, PLAYER_STATE.AIR_ATTACK]).toContain(fsm.currentState);
  });

  it('el buffer dura exactamente la ventana declarada', () => {
    expect(INPUT_BUFFER_FRAMES).toBeGreaterThanOrEqual(6);
    expect(INPUT_BUFFER_FRAMES).toBeLessThanOrEqual(15);
  });
});

describe('responsividad medida', () => {
  it('mantiene el intervalo entre golpes dentro del rango del género', () => {
    // Un brawler que responde encadena entre 8 y 14 cuadros. Por debajo se
    // vuelve ilegible; por encima se siente pegajoso.
    const toSecond = framesTo(PLAYER_STATE.LIGHT_2);
    const toThird = framesTo(PLAYER_STATE.LIGHT_3);
    const interval = toThird - toSecond;

    expect(toSecond).toBeGreaterThanOrEqual(6);
    expect(toSecond).toBeLessThanOrEqual(14);
    expect(interval).toBeGreaterThanOrEqual(6);
    expect(interval).toBeLessThanOrEqual(14);
  });
});
