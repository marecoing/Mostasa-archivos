/**
 * Floating damage-number styling (Biblia §12 feedback). Pure mapping from a
 * damage amount to its on-screen colour/size tier, so the presentation choice
 * is testable without Phaser. GameScene spawns the actual floating text.
 */

export interface DamageStyle {
  color: string;
  /** font size in px */
  size: number;
}

/**
 * Bigger, hotter numbers for harder hits: light punches read small and white,
 * heavy/weapon hits red and large.
 */
export function damageStyle(damage: number): DamageStyle {
  if (damage >= 30) return { color: '#ff4433', size: 26 };
  if (damage >= 18) return { color: '#ff8833', size: 22 };
  if (damage >= 10) return { color: '#ffcc44', size: 18 };
  return { color: '#eeeeee', size: 15 };
}
