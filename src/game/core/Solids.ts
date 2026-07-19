/**
 * Solid obstacle volumes (2.5D). A solid is an axis-aligned footprint on the
 * ground plane (world X/Y) with a height: fighters cannot walk through it,
 * but an entity airborne above its height clears it (jumping over a crate).
 * Pure functions — GameScene feeds footprints from breakables and props.
 */

export interface SolidVolume {
  /** footprint centre in world coordinates */
  x: number;
  y: number;
  halfW: number;
  halfD: number;
  /** how tall the obstacle stands; entities with z above this pass over */
  height: number;
}

/**
 * Push an entity's footprint out of every solid it overlaps. Resolution is
 * along the axis of least penetration (the standard beat'em up "slide along
 * the crate" feel). Two passes settle corner cases where resolving one solid
 * pushes into another.
 */
export function resolveSolids(
  x: number,
  y: number,
  halfW: number,
  halfD: number,
  z: number,
  solids: readonly SolidVolume[],
): { x: number; y: number } {
  let px = x;
  let py = y;
  for (let pass = 0; pass < 2; pass++) {
    let moved = false;
    for (const s of solids) {
      if (z > s.height) continue; // airborne above the obstacle
      const dx = px - s.x;
      const dy = py - s.y;
      const overlapX = halfW + s.halfW - Math.abs(dx);
      const overlapY = halfD + s.halfD - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (overlapX < overlapY) {
        px += dx >= 0 ? overlapX : -overlapX;
      } else {
        py += dy >= 0 ? overlapY : -overlapY;
      }
      moved = true;
    }
    if (!moved) break;
  }
  return { x: px, y: py };
}

/** True when the footprint overlaps any solid at ground level (spawn checks). */
export function overlapsAnySolid(
  x: number,
  y: number,
  halfW: number,
  halfD: number,
  solids: readonly SolidVolume[],
): boolean {
  for (const s of solids) {
    if (
      Math.abs(x - s.x) < halfW + s.halfW &&
      Math.abs(y - s.y) < halfD + s.halfD
    ) {
      return true;
    }
  }
  return false;
}
