/**
 * How a held weapon is oriented in the hand (§ combate, armas).
 *
 * The art was authored at whatever angle suited each illustration, so applying
 * a single hardcoded rotation left elongated weapons standing on end: the metal
 * pipe is drawn along a −55° axis, so rotating it by −35° produced a near
 * vertical post beside the fighter instead of a pipe held forward.
 *
 * `artAxisDeg` is the **measured** principal axis of each weapon's opaque
 * pixels (0° = horizontal, positive = descending to the right), obtained from
 * the shipped PNGs; `elongation` is how rod-like the silhouette is. Rotation is
 * then derived as "where we want the axis" minus "where the art puts it", so
 * replacing a weapon's art only means re-measuring its axis.
 *
 * Compact props — a briefcase, a bin lid, a chair — have no meaningful long
 * axis, so they are flagged `orient: false` and drawn exactly as authored.
 *
 * Pure data + math: no Phaser dependency, unit-tested.
 */

export interface WeaponPose {
  /** measured principal axis of the art, in degrees (0 = horizontal) */
  artAxisDeg: number;
  /** ratio of the silhouette's major to minor axis; > 2 reads as a rod */
  elongation: number;
  /** false for compact props that should be drawn at their authored angle */
  orient: boolean;
  /** where the long axis should sit while carried */
  restAxisDeg: number;
  /** where the long axis should sit mid-swing */
  swingAxisDeg: number;
}

/**
 * Measured with `scripts/measure-weapon-axes.mjs` against the shipped art.
 * Re-run it after replacing any weapon PNG.
 */
export const WEAPON_POSES: Record<string, WeaponPose> = {
  // Rods: carried angled down-forward, swung through to near horizontal.
  tubo_metalico: pose(-54.8, 6.57, true, 20, -5),
  palo_escoba: pose(-53.7, 11.45, true, 18, -5),
  llave_inglesa: pose(51.9, 4.94, true, 25, 0),
  paraguas_roto: pose(58.0, 2.14, true, 20, -5),
  // A bottle is gripped by the neck, so it stays upright and swings down.
  botella_vidrio: pose(-89.9, 3.68, true, -72, -40),
  // Compact props: no long axis worth aligning, drawn as authored.
  cadena_oxidada: pose(-1.0, 1.33, false, 0, 0),
  cajon_verdura: pose(7.3, 1.53, false, 0, 0),
  maletin_pesado: pose(-21.4, 1.21, false, 0, 0),
  silla_plastico: pose(-76.6, 1.35, false, 0, 0),
  tapa_tacho: pose(11.0, 1.31, false, 0, 0),
};

/** Rod-like silhouettes are the ones worth re-orienting. */
export const ROD_ELONGATION = 2;

export function poseFor(weaponId: string): WeaponPose | undefined {
  return WEAPON_POSES[weaponId];
}

/**
 * Rotation to apply to a weapon sprite so its long axis lands where we want.
 *
 * `flipped` is whether the sprite is mirrored for facing: mirroring negates
 * both the art's axis and the target, so the whole rotation simply inverts.
 * Returns 0 for compact props and unknown weapons, which are drawn as authored.
 */
export function weaponAngle(weaponId: string, swinging: boolean, flipped: boolean): number {
  const p = poseFor(weaponId);
  if (!p || !p.orient) return 0;
  const target = swinging ? p.swingAxisDeg : p.restAxisDeg;
  const rotation = target - p.artAxisDeg;
  return flipped ? -rotation : rotation;
}

function pose(
  artAxisDeg: number,
  elongation: number,
  orient: boolean,
  restAxisDeg: number,
  swingAxisDeg: number,
): WeaponPose {
  return { artAxisDeg, elongation, orient, restAxisDeg, swingAxisDeg };
}
