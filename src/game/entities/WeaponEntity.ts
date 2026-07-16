import type { WeaponDef } from '../data/ItemManifest';

/**
 * A weapon lying in the world, ready to be walked over and equipped.
 * Pure logic — the scene owns the sprite and the equip transition.
 */
export class WeaponEntity {
  readonly def: WeaponDef;
  x: number;
  y: number;
  z: number;
  velZ: number;
  taken = false;

  constructor(def: WeaponDef, x: number, y: number, popUp = 180) {
    this.def = def;
    this.x = x;
    this.y = y;
    this.z = 0;
    this.velZ = popUp;
  }

  tick(gravity: number, dt: number, groundZ: number): void {
    if (this.z > groundZ || this.velZ > 0) {
      this.velZ += gravity * dt;
      this.z += this.velZ * dt;
      if (this.z <= groundZ) {
        this.z = groundZ;
        this.velZ = 0;
      }
    }
  }

  isInRange(px: number, py: number, radius: number, depthTol: number): boolean {
    if (this.taken) return false;
    if (Math.abs(py - this.y) > depthTol) return false;
    return Math.abs(px - this.x) < radius;
  }
}

/** State of the currently held weapon. */
export interface EquippedWeapon {
  def: WeaponDef;
  durabilityLeft: number;
}

/**
 * Damage a landed hit deals given the player's base attack and any held
 * weapon. A weapon adds its damage on top of the attack (Biblia §13).
 */
export function effectiveHitDamage(baseDamage: number, weapon: EquippedWeapon | null): number {
  return weapon ? baseDamage + weapon.def.damage : baseDamage;
}
