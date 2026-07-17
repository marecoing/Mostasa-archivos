import type { Vec3 } from '../core/Physics25D';
import { isOnGround, applyFriction, GRAVITY, GROUND_Z, FIXED_TIMESTEP } from '../core/Physics25D';
import { clampEntityToLane } from '../core/Pushbox';
import type { StageLane } from '../core/Pushbox';
import { EnemyStateMachine, ATTACK_WINDUP } from './EnemyStateMachine';
import type { EnemyStats } from '../data/EnemyData';
import type { AttackDef } from '../data/AttackData';
import {
  chooseBossAttack,
  BOSS_CHARGE_SPEED,
  BOSS_CHARGE_DAMAGE,
  BOSS_CHARGE_DASH_FRAMES,
} from './BossAI';
import type { BossAttack } from './BossAI';

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
  attackDamage: number;
  attackRange: number;
  attackCooldown: number;
  attackCooldownLeft = 0;
  /** guards one damage application per attack swing */
  dealtDamageThisAttack = false;
  /** which boss attack the current swing is (null for regular enemies) */
  bossAttack: Exclude<BossAttack, 'none'> | null = null;
  /** set when the boss commits an attack; the scene reads & clears it for FX */
  attackJustStarted: Exclude<BossAttack, 'none'> | null = null;
  /** phase-2 rage: faster and more aggressive */
  enraged = false;

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
    this.attackDamage = stats.attackDamage;
    this.attackRange = stats.attackRange;
    this.attackCooldown = stats.attackCooldown;
    this.spriteKey = spriteKey;
    this.fsm = new EnemyStateMachine();
  }

  /**
   * Returns the damage to apply to the player this frame, or 0. Fires once
   * per attack, only during the active window and when the player is within
   * reach and depth. The scene decides i-frames / actual application.
   */
  consumeAttackHit(playerX: number, playerY: number, playerZ: number): number {
    if (this.dead || this.dealtDamageThisAttack) return 0;
    if (!this.fsm.isAttacking()) return 0;

    // A boss charge stays "active" for the whole dash window and deals heavier
    // damage over a longer reach; the swing uses the normal active frames.
    let active: boolean;
    let damage: number;
    let reach: number;
    if (this.bossAttack === 'charge') {
      const f = this.fsm.currentFrame;
      active = f >= ATTACK_WINDUP && f < ATTACK_WINDUP + BOSS_CHARGE_DASH_FRAMES;
      damage = BOSS_CHARGE_DAMAGE;
      reach = this.attackRange + 20;
    } else {
      active = this.fsm.isAttackActive();
      damage = this.attackDamage;
      reach = this.attackRange + 24;
    }
    if (!active) return 0;

    if (Math.abs(playerY - this.pos.y) > 40) return 0;
    if (Math.abs(playerZ - this.pos.z) > 60) return 0;
    const dx = playerX - this.pos.x;
    if (this.facing * dx < -12) return 0; // player must be in front
    if (Math.abs(dx) > reach) return 0;
    this.dealtDamageThisAttack = true;
    return damage;
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

  tickPhysics(playerX: number, playerY: number, lane: StageLane, attackAllowed = false): void {
    if (this.dead) return;

    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining--;
      return;
    }

    if (this.attackCooldownLeft > 0) this.attackCooldownLeft--;
    this.fsm.tick();
    if (!this.fsm.isAttacking()) {
      this.dealtDamageThisAttack = false;
      this.bossAttack = null;
    }

    if (this.fsm.isAttacking()) {
      const f = this.fsm.currentFrame;
      if (this.bossAttack === 'charge' && f >= ATTACK_WINDUP && f < ATTACK_WINDUP + BOSS_CHARGE_DASH_FRAMES) {
        // Committed dash: lunge forward at the locked facing.
        this.vel.x = this.facing * BOSS_CHARGE_SPEED;
        this.vel.y = 0;
      } else {
        // Anchored while winding up / swinging / recovering.
        this.vel.x = 0;
        this.vel.y = 0;
      }
    } else if (this.fsm.canMove()) {
      this.tickAI(playerX, playerY, attackAllowed);
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

  /** Phase-2 rage: quicker on its feet and quicker to attack. */
  enrage(): void {
    if (this.enraged) return;
    this.enraged = true;
    this.walkSpeed *= 1.35;
  }

  private tickAI(playerX: number, playerY: number, attackAllowed: boolean): void {
    const dx = playerX - this.pos.x;
    const dy = playerY - this.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.facing = dx >= 0 ? 1 : -1;

    if (this.type === 'boss') {
      this.tickBossAI(dx, dy, dist, attackAllowed);
      return;
    }

    const inRange = Math.abs(dx) <= this.attackRange && Math.abs(dy) <= 40;

    // Commit to a telegraphed attack when in range, off cooldown and a token
    // is available.
    if (inRange && this.attackCooldownLeft <= 0 && attackAllowed && this.fsm.startAttack()) {
      this.attackCooldownLeft = this.attackCooldown;
      this.vel.x = 0;
      this.vel.y = 0;
      return;
    }

    if (dist > 65) {
      this.fsm.setWalking();
      const scale = this.walkSpeed / dist;
      this.vel.x = dx * scale;
      this.vel.y = dy * scale;
    } else if (Math.abs(dx) > this.attackRange - 8 || Math.abs(dy) > 30) {
      // Close enough to loiter but not yet in strike range → keep pressing in.
      this.fsm.setWalking();
      const scale = (this.walkSpeed * 0.7) / Math.max(1, dist);
      this.vel.x = dx * scale;
      this.vel.y = dy * scale;
    } else {
      this.fsm.setIdle();
      this.vel.x = 0;
      this.vel.y = 0;
    }
  }

  private tickBossAI(dx: number, dy: number, dist: number, attackAllowed: boolean): void {
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (attackAllowed && this.attackCooldownLeft <= 0) {
      const choice = chooseBossAttack(absDx, absDy, this.attackRange, true);
      if (choice !== 'none' && this.fsm.startAttack()) {
        this.bossAttack = choice;
        this.attackJustStarted = choice;
        // The charge covers a bigger commitment, so it costs a full cooldown;
        // the swing recovers faster. Rage shortens both.
        const base = choice === 'charge' ? this.attackCooldown : Math.round(this.attackCooldown * 0.75);
        this.attackCooldownLeft = this.enraged ? Math.round(base * 0.6) : base;
        this.vel.x = 0;
        this.vel.y = 0;
        return; // facing is now locked for the swing/dash
      }
    }

    // Otherwise close the distance until in melee reach.
    if (dist > this.attackRange - 8) {
      this.fsm.setWalking();
      const scale = this.walkSpeed / Math.max(1, dist);
      this.vel.x = dx * scale;
      this.vel.y = dy * scale;
    } else {
      this.fsm.setIdle();
      this.vel.x = 0;
      this.vel.y = 0;
    }
  }
}
