/**
 * Combo / score-multiplier system (Biblia §12 "cadena de bronca").
 *
 * Landing hits before the timer runs out builds a combo. The multiplier grows
 * in bands and scales both score payout and the on-screen counter. Pure logic
 * with a frame-driven timer — no Phaser deps, fully testable.
 */

/** Frames the chain survives without a new hit before it drops (~1.4s @60). */
export const COMBO_TIMEOUT_FRAMES = 84;

/** Score multiplier for a given hit count (stepped bands). */
export function comboMultiplier(hits: number): number {
  if (hits >= 30) return 4;
  if (hits >= 20) return 3;
  if (hits >= 10) return 2;
  if (hits >= 5) return 1.5;
  return 1;
}

/** Praise label shown at combo milestones, or '' below the first band. */
export function comboLabel(hits: number): string {
  if (hits >= 30) return '¡IMPARABLE!';
  if (hits >= 20) return '¡FURIA TOTAL!';
  if (hits >= 10) return '¡QUÉ MÁQUINA!';
  if (hits >= 5) return '¡DALE!';
  return '';
}

export class ComboSystem {
  private hits = 0;
  private timer = 0;
  private peak = 0;
  /** true on the frame the combo just dropped, for one-shot reactions */
  private droppedThisFrame = false;

  get count(): number {
    return this.hits;
  }

  /** Highest chain reached since the last full reset (for run stats). */
  get maxCombo(): number {
    return this.peak;
  }

  get active(): boolean {
    return this.hits > 0;
  }

  get multiplier(): number {
    return comboMultiplier(this.hits);
  }

  get label(): string {
    return comboLabel(this.hits);
  }

  /** Fraction of the timeout window remaining, 0..1 (for a countdown bar). */
  get timeFraction(): number {
    return this.timer / COMBO_TIMEOUT_FRAMES;
  }

  /** Register a landed hit; refreshes the timer and returns the new count. */
  addHit(): number {
    this.hits += 1;
    this.timer = COMBO_TIMEOUT_FRAMES;
    if (this.hits > this.peak) this.peak = this.hits;
    return this.hits;
  }

  /** Advance one fixed step; returns true the frame the combo drops to 0. */
  tick(): boolean {
    this.droppedThisFrame = false;
    if (this.hits > 0) {
      this.timer -= 1;
      if (this.timer <= 0) {
        this.hits = 0;
        this.timer = 0;
        this.droppedThisFrame = true;
      }
    }
    return this.droppedThisFrame;
  }

  /**
   * Force the combo to end now (e.g. the player got hit). Keeps the run peak
   * unless `full` is set (used when a fresh run starts).
   */
  reset(full = false): void {
    this.hits = 0;
    this.timer = 0;
    if (full) this.peak = 0;
  }

  /** Score awarded for a base amount at the current multiplier (rounded). */
  scoreFor(base: number): number {
    return Math.round(base * this.multiplier);
  }
}
