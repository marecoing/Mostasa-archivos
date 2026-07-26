/**
 * Ground locomotion for the player (§ movimiento).
 *
 * This is the code the player feels on every frame — walk and run speed, how
 * quickly a stop decays, how far a dodge roll glides, whether knockback keeps
 * carrying you — and it lived inline in a 350-line `fixedUpdate`, where no
 * test could reach it (audit finding AUD-06). Extracted here as a pure
 * transform so each rule can be pinned down.
 *
 * The scene keeps ownership of the FSM and the entity; this module only
 * answers "given the movement mode and what's held, what is the new planar
 * velocity, and which way is the fighter now facing".
 */

import { applyFriction } from '../core/Physics25D';
import type { Vec3 } from '../core/Physics25D';

/** Horizontal walk speed, world units per second. */
export const WALK_SPEED_X = 280;
/** Depth walk speed. Slower than X so diagonals don't outrun the lane. */
export const WALK_SPEED_Y = 210;
export const RUN_SPEED_X = 390;
export const RUN_SPEED_Y = 285;
/** Deceleration applied when the player stops steering. */
export const FRICTION = 1600;
/** A dodge roll glides: it sheds speed slower than a normal stop. */
export const DODGE_FRICTION_SCALE = 0.55;
/** Knockback carries further still while stunned. */
export const STUN_FRICTION_SCALE = 0.5;

/**
 * How the fighter is allowed to move this frame.
 *  - `free`    — steering under the player's control
 *  - `dodge`   — committed roll, coasting on its launch momentum
 *  - `stunned` — hurt or downed, carrying knockback that decays
 *  - `locked`  — attacking, grabbing or otherwise planted
 */
export type LocomotionMode = 'free' | 'dodge' | 'stunned' | 'locked';

export interface MoveIntent {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  run: boolean;
}

export interface PlanarVelocity {
  x: number;
  y: number;
}

export interface LocomotionResult {
  velocity: PlanarVelocity;
  /** the direction the fighter now faces, or null to keep the current one */
  facing: 1 | -1 | null;
}

/** Classify the frame's movement mode from the player's state. */
export function locomotionMode(
  canMove: boolean,
  isDodging: boolean,
  isStunned: boolean,
): LocomotionMode {
  if (canMove) return 'free';
  if (isDodging) return 'dodge';
  if (isStunned) return 'stunned';
  return 'locked';
}

/** Speeds for the current gait. */
export function gaitSpeeds(run: boolean): { x: number; y: number } {
  return run ? { x: RUN_SPEED_X, y: RUN_SPEED_Y } : { x: WALK_SPEED_X, y: WALK_SPEED_Y };
}

/**
 * New planar velocity for this frame.
 *
 * Steering sets velocity outright rather than accelerating, which is what
 * gives a brawler its immediate, snappy feel; releasing a direction hands that
 * axis over to friction. Each axis is independent, so you can steer in depth
 * while coasting horizontally.
 */
export function resolveLocomotion(
  mode: LocomotionMode,
  intent: MoveIntent,
  current: PlanarVelocity,
  dt: number,
): LocomotionResult {
  const vel: Vec3 = { x: current.x, y: current.y, z: 0 };

  if (mode === 'locked') {
    return { velocity: { x: 0, y: 0 }, facing: null };
  }

  if (mode === 'dodge' || mode === 'stunned') {
    const scale = mode === 'dodge' ? DODGE_FRICTION_SCALE : STUN_FRICTION_SCALE;
    const eased = applyFriction(vel, FRICTION * scale, dt);
    return { velocity: { x: eased.x, y: eased.y }, facing: null };
  }

  const speed = gaitSpeeds(intent.run);
  const coasted = applyFriction(vel, FRICTION, dt);

  let x = coasted.x;
  let facing: 1 | -1 | null = null;
  if (intent.left) {
    x = -speed.x;
    facing = -1;
  } else if (intent.right) {
    x = speed.x;
    facing = 1;
  }

  let y = coasted.y;
  if (intent.up) y = -speed.y;
  else if (intent.down) y = speed.y;

  return { velocity: { x, y }, facing };
}
