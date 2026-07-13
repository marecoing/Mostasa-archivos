export const ENEMY_STATE = {
  IDLE: 'idle',
  WALK: 'walk',
  HURT: 'hurt',
  DOWN: 'down',
  GET_UP: 'get_up',
  GRABBED: 'grabbed',
} as const;

export type EnemyStateId = (typeof ENEMY_STATE)[keyof typeof ENEMY_STATE];

const DOWN_FRAMES = 40;
const GET_UP_FRAMES = 20;

export class EnemyStateMachine {
  private state: EnemyStateId = ENEMY_STATE.IDLE;
  private frame = 0;
  private hitstunCountdown = 0;

  get currentState(): EnemyStateId {
    return this.state;
  }

  get currentFrame(): number {
    return this.frame;
  }

  canMove(): boolean {
    return this.state === ENEMY_STATE.IDLE || this.state === ENEMY_STATE.WALK;
  }

  isVulnerable(): boolean {
    return this.state !== ENEMY_STATE.GET_UP && this.state !== ENEMY_STATE.GRABBED;
  }

  isGrabbed(): boolean {
    return this.state === ENEMY_STATE.GRABBED;
  }

  isDown(): boolean {
    return this.state === ENEMY_STATE.DOWN || this.state === ENEMY_STATE.GET_UP;
  }

  setWalking(): void {
    if (this.state === ENEMY_STATE.IDLE) this.enterState(ENEMY_STATE.WALK);
  }

  setIdle(): void {
    if (this.state === ENEMY_STATE.WALK) this.enterState(ENEMY_STATE.IDLE);
  }

  receiveHit(hitstun: number): void {
    if (!this.isVulnerable()) return;
    this.enterState(ENEMY_STATE.HURT);
    this.hitstunCountdown = hitstun;
  }

  receiveKnockdown(): void {
    this.enterState(ENEMY_STATE.DOWN);
  }

  receiveGrab(): void {
    if (!this.isVulnerable()) return;
    this.enterState(ENEMY_STATE.GRABBED);
  }

  releaseGrab(): void {
    if (this.state === ENEMY_STATE.GRABBED) {
      this.enterState(ENEMY_STATE.DOWN);
    }
  }

  tick(): void {
    this.frame++;
    switch (this.state) {
      case ENEMY_STATE.HURT:
        this.hitstunCountdown--;
        if (this.hitstunCountdown <= 0) {
          this.enterState(ENEMY_STATE.IDLE);
        }
        break;
      case ENEMY_STATE.DOWN:
        if (this.frame >= DOWN_FRAMES) {
          this.enterState(ENEMY_STATE.GET_UP);
        }
        break;
      case ENEMY_STATE.GET_UP:
        if (this.frame >= GET_UP_FRAMES) {
          this.enterState(ENEMY_STATE.IDLE);
        }
        break;
    }
  }

  private enterState(next: EnemyStateId): void {
    this.state = next;
    this.frame = 0;
    this.hitstunCountdown = 0;
  }
}
