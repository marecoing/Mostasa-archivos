import type { InputSnapshot } from '../systems/input/InputActions';
import { INPUT_ACTIONS } from '../systems/input/InputActions';
import { ATTACKS, isActiveFrame, getTotalFrames } from '../data/AttackData';
import type { AttackDef } from '../data/AttackData';

export const PLAYER_STATE = {
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
  JUMP: 'jump',
  LAND: 'land',
  LIGHT_1: 'light_1',
  LIGHT_2: 'light_2',
  LIGHT_3: 'light_3',
  HEAVY: 'heavy',
  AIR_ATTACK: 'air_attack',
  GRAB: 'grab',
  THROW: 'throw',
  SPECIAL: 'special',
  DODGE: 'dodge',
  HURT: 'hurt',
  DOWN: 'down',
  GET_UP: 'get_up',
} as const;

export type PlayerStateId = (typeof PLAYER_STATE)[keyof typeof PLAYER_STATE];

export const LAND_FRAMES = 6;
export const HURT_FRAMES = 14;
export const DOWN_FRAMES = 40;
export const GET_UP_FRAMES = 20;
export const GRAB_HOLD_FRAMES = 20;
export const THROW_FRAMES = 15;
export const SPECIAL_TOTAL_FRAMES = 45;
/** Dodge roll (§ combate): brief evasive roll with invulnerability frames. */
export const DODGE_FRAMES = 18;
/** i-frames run for frames [DODGE_IFRAME_START, DODGE_IFRAME_END]. */
export const DODGE_IFRAME_START = 1;
export const DODGE_IFRAME_END = 11;

/**
 * Cuántos cuadros después de terminar los cuadros activos se abre la ventana
 * de cancelación.
 *
 * Sin esto, la recuperación completa de cada golpe tenía que reproducirse
 * antes de que saliera el siguiente, aunque el jugador ya hubiera apretado:
 * el primer golpe tardaba 14 cuadros en encadenar y el combo entero 56, casi
 * un segundo. Un brawler que se siente bien encadena en 8 a 12. Cancelar la
 * recuperación con un golpe encadenado es la técnica estándar del género y es
 * la diferencia entre un combate que responde y uno pegajoso.
 */
export const CANCEL_LINK_FRAMES = 2;

/**
 * Vida de un input encolado, en cuadros. Un botón apretado hace medio segundo
 * no puede disparar un golpe ahora: eso produce golpes fantasma. 10 cuadros
 * (167 ms) es la ventana de perdón habitual del género.
 */
export const INPUT_BUFFER_FRAMES = 10;

export interface PlayerContext {
  isOnGround: boolean;
  velZ: number;
}

export type FSMEvent = 'jump' | 'land' | 'shake_light' | 'shake_medium' | 'grab_attempt' | 'throw' | 'special_radial' | 'dodge';

export interface FSMResult {
  velZSet: number | null;
  newFacing: 1 | -1 | null;
  events: FSMEvent[];
  activeAttack: AttackDef | null;
}

export class PlayerStateMachine {
  private state: PlayerStateId = PLAYER_STATE.IDLE;
  private frame = 0;
  private lightQueued = false;
  private heavyQueued = false;
  /** Cuántos cuadros le quedan de vida a cada input encolado. */
  private lightBuffer = 0;
  private heavyBuffer = 0;

  get currentState(): PlayerStateId {
    return this.state;
  }

  get currentFrame(): number {
    return this.frame;
  }

  canMove(): boolean {
    return (
      this.state === PLAYER_STATE.IDLE ||
      this.state === PLAYER_STATE.WALK ||
      this.state === PLAYER_STATE.RUN ||
      this.state === PLAYER_STATE.JUMP
    );
  }

  isGrabbing(): boolean {
    return this.state === PLAYER_STATE.GRAB || this.state === PLAYER_STATE.THROW;
  }

  locksMovement(): boolean {
    return !this.canMove();
  }

  isAttacking(): boolean {
    return (
      this.state === PLAYER_STATE.LIGHT_1 ||
      this.state === PLAYER_STATE.LIGHT_2 ||
      this.state === PLAYER_STATE.LIGHT_3 ||
      this.state === PLAYER_STATE.HEAVY ||
      this.state === PLAYER_STATE.AIR_ATTACK ||
      this.state === PLAYER_STATE.SPECIAL
    );
  }

  isAirborne(): boolean {
    return this.state === PLAYER_STATE.JUMP || this.state === PLAYER_STATE.AIR_ATTACK;
  }

  isDodging(): boolean {
    return this.state === PLAYER_STATE.DODGE;
  }

  /** True during the dodge roll's invulnerability window (§ combate). */
  isInvulnerable(): boolean {
    return (
      this.state === PLAYER_STATE.DODGE &&
      this.frame >= DODGE_IFRAME_START &&
      this.frame <= DODGE_IFRAME_END
    );
  }

  triggerGrab(): boolean {
    if (this.state !== PLAYER_STATE.IDLE && this.state !== PLAYER_STATE.WALK && this.state !== PLAYER_STATE.RUN) return false;
    this.enterState(PLAYER_STATE.GRAB);
    this.frame = 1;
    return true;
  }

  triggerSpecial(): boolean {
    if (this.state !== PLAYER_STATE.IDLE && this.state !== PLAYER_STATE.WALK && this.state !== PLAYER_STATE.RUN) return false;
    this.enterState(PLAYER_STATE.SPECIAL);
    this.frame = 1;
    return true;
  }

  forceHurt(): void {
    if (this.state === PLAYER_STATE.DOWN || this.state === PLAYER_STATE.GET_UP) return;
    this.enterState(PLAYER_STATE.HURT);
    // External calls bypass the tick's frame++, so align with internally-entered states (frame=1)
    this.frame = 1;
  }

  forceDown(): void {
    this.enterState(PLAYER_STATE.DOWN);
    this.frame = 1;
  }

  tick(input: InputSnapshot, ctx: PlayerContext): FSMResult {
    // El buffer envejece antes de leer el input nuevo, así que una pulsación
    // dura exactamente INPUT_BUFFER_FRAMES cuadros.
    if (this.lightBuffer > 0 && --this.lightBuffer === 0) this.lightQueued = false;
    if (this.heavyBuffer > 0 && --this.heavyBuffer === 0) this.heavyQueued = false;

    if (input[INPUT_ACTIONS.LIGHT_ATTACK].justPressed) {
      this.lightQueued = true;
      this.lightBuffer = INPUT_BUFFER_FRAMES;
    }
    if (input[INPUT_ACTIONS.HEAVY_ATTACK].justPressed) {
      this.heavyQueued = true;
      this.heavyBuffer = INPUT_BUFFER_FRAMES;
    }

    const result = this.processCurrentState(input, ctx);
    this.frame++;
    return result;
  }

  /**
   * Primer cuadro en el que un golpe encadenado puede cancelar la
   * recuperación de éste.
   */
  private cancelFrame(def: AttackDef): number {
    return def.startupFrames + def.activeFrames + CANCEL_LINK_FRAMES;
  }

  private clearBuffers(): void {
    this.lightQueued = false;
    this.heavyQueued = false;
    this.lightBuffer = 0;
    this.heavyBuffer = 0;
  }

  private enterState(next: PlayerStateId): void {
    this.state = next;
    this.frame = 0;
  }

  private consumeLight(): boolean {
    if (this.lightQueued) {
      this.lightQueued = false;
      this.lightBuffer = 0;
      return true;
    }
    return false;
  }

  private consumeHeavy(): boolean {
    if (this.heavyQueued) {
      this.heavyQueued = false;
      this.heavyBuffer = 0;
      return true;
    }
    return false;
  }

  private emptyResult(): FSMResult {
    return { velZSet: null, newFacing: null, events: [], activeAttack: null };
  }

  private processCurrentState(input: InputSnapshot, ctx: PlayerContext): FSMResult {
    switch (this.state) {
      case PLAYER_STATE.IDLE:
        return this.processIdle(input);
      case PLAYER_STATE.WALK:
        return this.processWalk(input);
      case PLAYER_STATE.RUN:
        return this.processRun(input);
      case PLAYER_STATE.JUMP:
        return this.processJump(input, ctx);
      case PLAYER_STATE.LAND:
        return this.processLand();
      case PLAYER_STATE.LIGHT_1:
      case PLAYER_STATE.LIGHT_2:
      case PLAYER_STATE.LIGHT_3:
        return this.processLightAttack();
      case PLAYER_STATE.HEAVY:
        return this.processHeavy();
      case PLAYER_STATE.AIR_ATTACK:
        return this.processAirAttack(ctx);
      case PLAYER_STATE.GRAB:
        return this.processGrab();
      case PLAYER_STATE.THROW:
        return this.processThrow();
      case PLAYER_STATE.SPECIAL:
        return this.processSpecial();
      case PLAYER_STATE.DODGE:
        return this.processDodge();
      case PLAYER_STATE.HURT:
        return this.processHurt();
      case PLAYER_STATE.DOWN:
        return this.processDown();
      case PLAYER_STATE.GET_UP:
        return this.processGetUp();
      default:
        return this.emptyResult();
    }
  }

  /**
   * Shared dodge check for the grounded movement states. Enters DODGE on a
   * fresh dodge press, facing the horizontal input, and emits the event the
   * scene uses to apply the roll burst. Returns true if a dodge started.
   */
  private tryStartDodge(input: InputSnapshot, result: FSMResult): boolean {
    if (!input[INPUT_ACTIONS.DODGE].justPressed) return false;
    this.enterState(PLAYER_STATE.DODGE);
    if (input[INPUT_ACTIONS.MOVE_LEFT].held) result.newFacing = -1;
    else if (input[INPUT_ACTIONS.MOVE_RIGHT].held) result.newFacing = 1;
    result.events.push('dodge');
    return true;
  }

  private processIdle(input: InputSnapshot): FSMResult {
    const result = this.emptyResult();
    if (this.consumeLight()) { this.enterState(PLAYER_STATE.LIGHT_1); return result; }
    if (this.consumeHeavy()) { this.enterState(PLAYER_STATE.HEAVY); return result; }
    if (this.tryStartDodge(input, result)) return result;
    if (input[INPUT_ACTIONS.JUMP].justPressed) {
      this.enterState(PLAYER_STATE.JUMP);
      result.velZSet = 720;
      result.events.push('jump');
      return result;
    }
    const moving = input[INPUT_ACTIONS.MOVE_LEFT].held || input[INPUT_ACTIONS.MOVE_RIGHT].held ||
      input[INPUT_ACTIONS.MOVE_UP].held || input[INPUT_ACTIONS.MOVE_DOWN].held;
    if (moving) {
      this.enterState(input[INPUT_ACTIONS.RUN].held ? PLAYER_STATE.RUN : PLAYER_STATE.WALK);
    }
    return result;
  }

  private processWalk(input: InputSnapshot): FSMResult {
    const result = this.emptyResult();
    if (this.consumeLight()) { this.enterState(PLAYER_STATE.LIGHT_1); return result; }
    if (this.consumeHeavy()) { this.enterState(PLAYER_STATE.HEAVY); return result; }
    if (this.tryStartDodge(input, result)) return result;
    if (input[INPUT_ACTIONS.JUMP].justPressed) {
      this.enterState(PLAYER_STATE.JUMP);
      result.velZSet = 720;
      result.events.push('jump');
      return result;
    }
    const moving = input[INPUT_ACTIONS.MOVE_LEFT].held || input[INPUT_ACTIONS.MOVE_RIGHT].held ||
      input[INPUT_ACTIONS.MOVE_UP].held || input[INPUT_ACTIONS.MOVE_DOWN].held;
    if (!moving) {
      this.enterState(PLAYER_STATE.IDLE);
    } else if (input[INPUT_ACTIONS.RUN].held) {
      this.enterState(PLAYER_STATE.RUN);
    }
    return result;
  }

  private processRun(input: InputSnapshot): FSMResult {
    const result = this.emptyResult();
    if (this.consumeLight()) { this.enterState(PLAYER_STATE.LIGHT_1); return result; }
    if (this.consumeHeavy()) { this.enterState(PLAYER_STATE.HEAVY); return result; }
    if (this.tryStartDodge(input, result)) return result;
    if (input[INPUT_ACTIONS.JUMP].justPressed) {
      this.enterState(PLAYER_STATE.JUMP);
      result.velZSet = 720;
      result.events.push('jump');
      return result;
    }
    const moving = input[INPUT_ACTIONS.MOVE_LEFT].held || input[INPUT_ACTIONS.MOVE_RIGHT].held ||
      input[INPUT_ACTIONS.MOVE_UP].held || input[INPUT_ACTIONS.MOVE_DOWN].held;
    if (!moving) {
      this.enterState(PLAYER_STATE.IDLE);
    } else if (!input[INPUT_ACTIONS.RUN].held) {
      this.enterState(PLAYER_STATE.WALK);
    }
    return result;
  }

  private processJump(input: InputSnapshot, ctx: PlayerContext): FSMResult {
    const result = this.emptyResult();
    if (ctx.isOnGround && ctx.velZ <= 0 && this.frame > 4) {
      this.enterState(PLAYER_STATE.LAND);
      result.events.push('land');
      return result;
    }
    if (this.consumeLight()) {
      this.enterState(PLAYER_STATE.AIR_ATTACK);
    }
    return result;
  }

  private processLand(): FSMResult {
    const result = this.emptyResult();
    if (this.frame >= LAND_FRAMES) {
      // El aterrizaje NO limpia el buffer: si el jugador aprieta mientras cae,
      // el golpe tiene que salir al tocar el piso.
      this.enterState(PLAYER_STATE.IDLE);
    }
    return result;
  }

  private processLightAttack(): FSMResult {
    const result = this.emptyResult();
    const attackId =
      this.state === PLAYER_STATE.LIGHT_1 ? 'light_1' :
      this.state === PLAYER_STATE.LIGHT_2 ? 'light_2' : 'light_3';
    const def = ATTACKS[attackId];
    if (!def) return result;

    if (isActiveFrame(def, this.frame)) {
      result.activeAttack = def;
    }

    const canChain = this.state !== PLAYER_STATE.LIGHT_3;

    // Cancelación: en cuanto pasan los cuadros activos, un golpe ya encolado
    // corta la recuperación en vez de esperarla entera.
    if (canChain && this.frame >= this.cancelFrame(def)) {
      if (this.consumeLight()) {
        const next =
          this.state === PLAYER_STATE.LIGHT_1 ? PLAYER_STATE.LIGHT_2 : PLAYER_STATE.LIGHT_3;
        this.enterState(next);
        return result;
      }
      // El fuerte también cancela el combo liviano: es el remate del género.
      if (this.consumeHeavy()) {
        this.enterState(PLAYER_STATE.HEAVY);
        return result;
      }
    }

    if (this.frame >= getTotalFrames(def)) {
      this.clearBuffers();
      this.enterState(PLAYER_STATE.IDLE);
    }
    return result;
  }

  private processHeavy(): FSMResult {
    const result = this.emptyResult();
    const def = ATTACKS['heavy'];
    if (!def) return result;

    if (isActiveFrame(def, this.frame)) {
      result.activeAttack = def;
    }

    if (this.frame >= getTotalFrames(def)) {
      this.clearBuffers();
      this.enterState(PLAYER_STATE.IDLE);
    }
    return result;
  }

  private processAirAttack(ctx: PlayerContext): FSMResult {
    const result = this.emptyResult();
    const def = ATTACKS['air_attack'];
    if (!def) return result;

    if (isActiveFrame(def, this.frame)) {
      result.activeAttack = def;
    }

    if (ctx.isOnGround && ctx.velZ <= 0 && this.frame > 4) {
      this.enterState(PLAYER_STATE.LAND);
      result.events.push('land');
      return result;
    }

    if (this.frame >= getTotalFrames(def)) {
      this.enterState(PLAYER_STATE.JUMP);
    }
    return result;
  }

  private processGrab(): FSMResult {
    const result = this.emptyResult();
    if (this.frame === 1) {
      result.events.push('grab_attempt');
    }
    if (this.frame >= GRAB_HOLD_FRAMES) {
      this.enterState(PLAYER_STATE.THROW);
    }
    return result;
  }

  private processThrow(): FSMResult {
    const result = this.emptyResult();
    if (this.frame === 1) {
      result.events.push('throw');
    }
    if (this.frame >= THROW_FRAMES) {
      this.lightQueued = false;
      this.heavyQueued = false;
      this.enterState(PLAYER_STATE.IDLE);
    }
    return result;
  }

  private processSpecial(): FSMResult {
    const result = this.emptyResult();
    if (this.frame === 1) {
      result.events.push('special_radial');
    }
    if (this.frame >= SPECIAL_TOTAL_FRAMES) {
      this.lightQueued = false;
      this.heavyQueued = false;
      this.enterState(PLAYER_STATE.IDLE);
    }
    return result;
  }

  private processDodge(): FSMResult {
    const result = this.emptyResult();
    if (this.frame >= DODGE_FRAMES) {
      this.lightQueued = false;
      this.heavyQueued = false;
      this.enterState(PLAYER_STATE.IDLE);
    }
    return result;
  }

  private processHurt(): FSMResult {
    const result = this.emptyResult();
    if (this.frame >= HURT_FRAMES) {
      this.enterState(PLAYER_STATE.IDLE);
    }
    return result;
  }

  private processDown(): FSMResult {
    const result = this.emptyResult();
    if (this.frame >= DOWN_FRAMES) {
      this.enterState(PLAYER_STATE.GET_UP);
    }
    return result;
  }

  private processGetUp(): FSMResult {
    const result = this.emptyResult();
    if (this.frame >= GET_UP_FRAMES) {
      this.enterState(PLAYER_STATE.IDLE);
    }
    return result;
  }
}
