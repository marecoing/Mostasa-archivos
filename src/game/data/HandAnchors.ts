/**
 * Where a held weapon sits in the player's hand, per animation state
 * (§ combate, armas).
 *
 * The weapon used to be pinned with three hardcoded screen offsets — 28 px
 * forward at rest, 48 px while swinging, and a flat 118 px above the feet.
 * Those numbers were tuned for one character size and one pose, so at any
 * other scale, and in every attack other than the one they were eyeballed on,
 * the weapon visibly detached from the fighter.
 *
 * Anchors are stored as **fractions of the rendered body height**, so they hold
 * at any sprite scale, and per FSM state, because a jab, a kick, a roll and a
 * knockdown put the hand in completely different places.
 *
 *   x — forward from the body's centre line, in the facing direction
 *   y — above the feet
 *
 * Pure data + lookup: no Phaser dependency, unit-tested.
 */

export interface HandAnchor {
  /** forward offset as a fraction of body height (positive = facing forward) */
  x: number;
  /** height above the feet as a fraction of body height */
  y: number;
}

/** Hand at the hip, the resting pose used when a state has no entry. */
export const DEFAULT_HAND_ANCHOR: HandAnchor = { x: 0.11, y: 0.46 };

export const HAND_ANCHORS: Record<string, HandAnchor> = {
  // Upright and neutral: the arm hangs by the hip.
  idle: { x: 0.11, y: 0.46 },
  walk: { x: 0.12, y: 0.47 },
  run: { x: 0.15, y: 0.49 },
  jump: { x: 0.13, y: 0.5 },
  land: { x: 0.11, y: 0.44 },

  // Punches drive the hand forward at chest height, further with each link.
  light_1: { x: 0.29, y: 0.55 },
  light_2: { x: 0.34, y: 0.55 },
  light_3: { x: 0.32, y: 0.59 },
  heavy: { x: 0.33, y: 0.61 },
  // Airborne swing comes down from above.
  air_attack: { x: 0.26, y: 0.69 },

  // Grabs and throws reach forward at chest height.
  grab: { x: 0.28, y: 0.52 },
  throw: { x: 0.3, y: 0.58 },
  // The radial special is wound up high.
  special: { x: 0.2, y: 0.65 },

  // Reeling back: the arm drops and trails behind.
  hurt: { x: 0.04, y: 0.42 },
  // Rolling: tucked in close to the body.
  dodge: { x: 0.08, y: 0.3 },
  // On the floor, the hand is nearly at ground level.
  down: { x: 0.14, y: 0.12 },
  get_up: { x: 0.13, y: 0.22 },
};

export function handAnchorFor(state: string): HandAnchor {
  return HAND_ANCHORS[state] ?? DEFAULT_HAND_ANCHOR;
}

/**
 * Screen position of the hand for a fighter drawn at `bodyHeightPx`, whose
 * feet are at (`feetScreenX`, `feetScreenY`) and who faces `facing`.
 */
export function handScreenPosition(
  state: string,
  feetScreenX: number,
  feetScreenY: number,
  bodyHeightPx: number,
  facing: 1 | -1,
): { x: number; y: number } {
  const a = handAnchorFor(state);
  return {
    x: feetScreenX + facing * a.x * bodyHeightPx,
    y: feetScreenY - a.y * bodyHeightPx,
  };
}
