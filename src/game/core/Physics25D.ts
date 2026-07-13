export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Bounds2D {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const DEPTH_SCALE = 0.6;
export const GRAVITY = -1800;
export const GROUND_Z = 0;
export const FIXED_TIMESTEP = 1 / 60;
export const MAX_DELTA = 0.05;

export function worldToScreen(
  worldX: number,
  worldY: number,
  worldZ: number,
  cameraX: number,
  cameraY: number,
): { screenX: number; screenY: number } {
  const screenX = worldX - cameraX;
  const screenY = worldY * DEPTH_SCALE - worldZ - cameraY;
  return { screenX, screenY };
}

export function sameDepth(ay: number, by: number, tolerance: number): boolean {
  return Math.abs(ay - by) <= tolerance;
}

export function applyGravity(vel: Vec3, dt: number): Vec3 {
  return { x: vel.x, y: vel.y, z: vel.z + GRAVITY * dt };
}

export function applyFriction(vel: Vec3, friction: number, dt: number): Vec3 {
  const sign = vel.x >= 0 ? 1 : -1;
  const decel = friction * dt;
  const newVx = Math.abs(vel.x) <= decel ? 0 : vel.x - sign * decel;
  const signY = vel.y >= 0 ? 1 : -1;
  const newVy = Math.abs(vel.y) <= decel ? 0 : vel.y - signY * decel;
  return { x: newVx, y: newVy, z: vel.z };
}

export function isOnGround(pos: Vec3): boolean {
  return pos.z <= GROUND_Z;
}

export function clampToBounds(pos: Vec3, bounds: Bounds2D): Vec3 {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y)),
    z: pos.z,
  };
}
