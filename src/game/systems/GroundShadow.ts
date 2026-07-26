/**
 * Ground contact shadows (§ integración visual).
 *
 * Every object that stands on the street — fighters, breakables, dropped
 * weapons, pickups — needs a contact shadow, or it reads as pasted on top of
 * the photoreal backdrop instead of standing in it.
 *
 * A single hard-edged ellipse does not work: at these sizes it reads as a hole
 * cut in the pavement rather than as shade. Instead the shadow is emitted as a
 * stack of concentric ellipses whose alpha accumulates toward the centre,
 * which composites into a soft blob with a dark contact point and a feathered
 * edge — subtle enough to sit under the art, dark enough to occlude the wet
 * asphalt's specular highlights so the contact reads.
 *
 * Airborne objects widen, lighten and soften their shadow with height, which
 * is what sells a jump as leaving the ground.
 *
 * Pure geometry — no Phaser dependency, so it stays unit-testable.
 */

export interface ShadowRing {
  /** horizontal radius of this ring */
  rx: number;
  /** vertical radius of this ring */
  ry: number;
  /** alpha this ring is filled with; rings composite toward the centre */
  alpha: number;
}

/** Ellipses on the ground plane are foreshortened by the 2.5D projection. */
export const SHADOW_SQUASH = 0.34;
/** Rings drawn per shadow. More rings, smoother falloff. */
export const SHADOW_RINGS = 6;
/** Per-ring alpha; the accumulated centre lands near 0.45 when grounded. */
export const SHADOW_RING_ALPHA = 0.1;
/** A shadow never fades below this, so an airborne object stays readable. */
export const SHADOW_MIN_FALLOFF = 0.35;

/**
 * How much the shadow darkens at height `z`: full strength on the floor,
 * easing off over roughly twice the object's own height.
 */
export function shadowFalloff(z: number, objectHeight: number): number {
  if (!Number.isFinite(z) || z <= 0) return 1;
  const range = Math.max(120, objectHeight * 2);
  return Math.max(SHADOW_MIN_FALLOFF, 1 - z / range);
}

/**
 * Concentric rings making up an object's contact shadow, ordered outermost
 * first so a renderer can draw them in sequence. `halfW` is the ground
 * footprint half-width in world units and `z` the height above the floor.
 */
export function groundShadowRings(
  halfW: number,
  z: number,
  objectHeight: number,
  rings = SHADOW_RINGS,
): ShadowRing[] {
  const k = shadowFalloff(z, objectHeight);
  // Rising off the floor spreads the blob out as it lightens.
  const spread = 1 + (1 - k) * 0.6;
  const baseRx = Math.max(9, halfW * 1.02 + 4) * spread;
  const out: ShadowRing[] = [];
  for (let i = 0; i < rings; i++) {
    // 1 for the outermost ring, shrinking toward the centre.
    const t = 1 - i / rings;
    const rx = baseRx * t;
    out.push({ rx, ry: rx * SHADOW_SQUASH, alpha: SHADOW_RING_ALPHA * k });
  }
  return out;
}

/** Opacity the stacked rings composite to at the contact point. */
export function shadowCoreOpacity(rings: readonly ShadowRing[]): number {
  return 1 - rings.reduce((acc, r) => acc * (1 - r.alpha), 1);
}
