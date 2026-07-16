import type { BreakableDef } from '../data/BreakableManifest';

/**
 * A destructible stage object. Pure logic — the scene owns the sprite,
 * plays the destruction VFX and spawns drops when `destroyed` flips true.
 */
export class BreakableEntity {
  readonly def: BreakableDef;
  x: number;
  y: number;
  hp: number;
  destroyed = false;
  /** set true the frame it breaks, so the scene can react exactly once */
  justBroke = false;
  /** guards against multiple hits from a single attack swing */
  hitThisSwing = false;

  constructor(def: BreakableDef, x: number, y: number) {
    this.def = def;
    this.x = x;
    this.y = y;
    this.hp = def.durability;
  }

  /**
   * Apply damage. Returns true if this hit destroyed it (edge-triggered).
   * Ignored once already destroyed.
   */
  applyHit(damage: number): boolean {
    if (this.destroyed) return false;
    this.hp -= damage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.destroyed = true;
      this.justBroke = true;
      return true;
    }
    return false;
  }

  /**
   * Which sheet frame to show for the current damage level.
   * 0 = intact … (frameCount-1) = most damaged.
   */
  damageFrame(): number {
    const ratio = 1 - this.hp / this.def.durability; // 0..1
    const maxFrame = this.def.frameCount - 1;
    const f = Math.floor(ratio * maxFrame);
    return Math.max(0, Math.min(maxFrame, f));
  }
}
