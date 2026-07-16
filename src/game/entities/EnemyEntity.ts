import type { Vec3 } from '../core/Physics25D';
import { isOnGround, applyFriction, GRAVITY, GROUND_Z, FIXED_TIMESTEP } from '../core/Physics25D';
import { clampEntityToLane } from '../core/Pushbox';
import type { StageLane } from '../core/Pushbox';
import { EnemyStateMachine } from './EnemyStateMachine';
import type { EnemyStats } from '../data/EnemyData';
import type { AttackDef } from '../data/AttackData';

const KNOCKBACK_FRICTION = 300;

export class EnemyEntity {
  pos: Vec3;
  vel: Vec3;
  facing: 1 | -1 = -1;
  hp: number;
  maxHp: number;
  halfW: number;
  halfD: number;
  walkSpeed: number;
  color: number;
  height: number;
  type: string;
  fsm: EnemyStateMachine;
  hitstopRemaining = 0;
  dead = false;
  hitThisSwing = false;
  spriteKey: string;

  constructor(x: number, y: number, stats: EnemyStats, spriteKey = 'enemy_001') {
    this.pos = { x, y, z: 0 };
    this.vel = { x: 0, y: 0, z: 0 };
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.halfW = stats.halfW;
    this.halfD = stats.halfD;
    this.walkSpeed = stats.walkSpeed;
    this.color = stats.color;
    this.height = stats.height;
    this.type = stats.type;
    this.spriteKey = spriteKey;
    this.fsm = new EnemyStateMachine();
  }

  applyHit(attack: AttackDef, attackerFacing: 1 | -1): void {
    if (!this.fsm.isVulnerable()) return;
    this.hp = Math.max(0, this.hp - attack.damage);
    this.vel.x = attack.knockbackX * attackerFacing;
    if (attack.knockbackZ > 0) this.vel.z = attack.knockbackZ;
    this.hitstopRemaining = attack.hitstopFrames;
    this.hitThisSwing = true;

    const knocksDown = attack.knockbackZ > 0 || this.hp <= 0;
    if (knocksDown) {
      this.fsm.receiveKnockdown();
      if (this.hp <= 0) this.dead = true;
    } else {
      this.fsm.receiveHit(attack.hitstunFrames);
    }
  }

  applyGrab(): void {
    if (!this.fsm.isVulnerable()) return;
    this.fsm.receiveGrab();
    this.vel.x = 0;
    this.vel.y = 0;
    this.vel.z = 0;
  }

  applyThrow(throwVelX: number, throwVelZ: number, attackerFacing: 1 | -1): void {
    this.fsm.releaseGrab();
    this.vel.x = throwVelX * attackerFacing;
    this.vel.z = throwVelZ;
  }

  applySpecialHit(): void {
    if (this.dead) return;
    this.hp = Math.max(0, this.hp - 30);
    this.vel.x = (this.pos.x > 0 ? 1 : -1) * 600;
    this.vel.z = 150;
    this.hitstopRemaining = 10;
    this.fsm.receiveKnockdown();
    if (this.hp <= 0) this.dead = true;
  }

  tickPhysics(playerX: number, playerY: number, lane: StageLane): void {
    if (this.dead) return;

    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining--;
      return;
    }

    this.fsm.tick();

    if (this.fsm.canMove()) {
      this.tickAI(playerX, playerY);
    } else if (!this.fsm.isGrabbed()) {
      const f = applyFriction(this.vel, KNOCKBACK_FRICTION, FIXED_TIMESTEP);
      this.vel.x = f.x;
      this.vel.y = f.y;
    }

    // Gravity
    if (!isOnGround(this.pos) || this.vel.z > 0) {
      this.vel.z += GRAVITY * FIXED_TIMESTEP;
    }

    // Integrate
    this.pos.x += this.vel.x * FIXED_TIMESTEP;
    this.pos.y += this.vel.y * FIXED_TIMESTEP;
    this.pos.z += this.vel.z * FIXED_TIMESTEP;

    // Ground clamp + ground bounce
    if (this.pos.z <= GROUND_Z) {
      if (this.vel.z < -150) {
        this.vel.z = Math.abs(this.vel.z) * 0.3;
      } else {
        this.vel.z = 0;
      }
      this.pos.z = GROUND_Z;
    }

    // Lane clamp + wall bounce
    const priorX = this.pos.x;
    const clamped = clampEntityToLane(this.pos.x, this.pos.y, this.halfW, this.halfD, lane);
    this.pos.x = clamped.x;
    this.pos.y = clamped.y;

    if (Math.abs(this.pos.x - priorX) > 0.5 && Math.abs(this.vel.x) > 80) {
      this.vel.x *= -0.4;
    }
  }

  private tickAI(playerX: number, playerY: number): void {
    const dx = playerX - this.pos.x;
    const dy = playerY - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 65) {
      this.fsm.setWalking();
      const scale = this.walkSpeed / dist;
      this.vel.x = dx * scale;
      this.vel.y = dy * scale;
      this.facing = dx >= 0 ? 1 : -1;
    } else {
      this.fsm.setIdle();
      this.vel.x = 0;
      this.vel.y = 0;
    }
  }
}
