import type { PickupDef } from '../data/ItemManifest';

/**
 * A collectible dropped in the world (from breakables or enemies).
 * Pure logic — the scene owns the sprite and applies the effect on pickup.
 */
export class PickupEntity {
  readonly def: PickupDef;
  x: number;
  y: number;
  z: number;
  velZ: number;
  collected = false;
  /** frames alive; used to auto-despawn stale drops */
  age = 0;

  constructor(def: PickupDef, x: number, y: number, popUp = 220) {
    this.def = def;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.velZ = popUp; // little hop when it spawns
  }

  /** Integrate the spawn hop (gravity) with the shared physics constants. */
  tick(gravity: number, dt: number, groundZ: number): void {
    this.age++;
    if (this.z > groundZ || this.velZ > 0) {
      this.velZ += gravity * dt;
      this.z += this.velZ * dt;
      if (this.z <= groundZ) {
        this.z = groundZ;
        this.velZ = 0;
      }
    }
  }

  /** True when the player is close enough (in the depth lane) to collect. */
  isInRange(px: number, py: number, radius: number, depthTol: number): boolean {
    if (this.collected) return false;
    if (Math.abs(py - this.y) > depthTol) return false;
    return Math.abs(px - this.x) < radius;
  }
}
