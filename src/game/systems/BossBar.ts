/**
 * Boss health-bar view state (Biblia §10 jefes). Pure: given the active zone
 * and the boss enemy's HP, decide whether the dedicated top bar shows, its
 * label, and its fill fraction. GameScene renders it.
 */

export type BossZoneKind = 'boss' | 'mini_boss';

export interface BossBarInput {
  /** kind of the active combat zone, if any */
  zoneKind: string | undefined;
  /** true while the zone is in its fighting phase */
  fighting: boolean;
  /** current / max HP of the boss enemy, or null when none is alive */
  bossHp: number | null;
  bossMaxHp: number | null;
  bossEnraged: boolean;
  miniBossLabel: string;
  bossLabel: string;
}

export interface BossBarView {
  visible: boolean;
  label: string;
  /** 0..1 fill */
  fraction: number;
  enraged: boolean;
}

const HIDDEN: BossBarView = { visible: false, label: '', fraction: 0, enraged: false };

export function bossBarView(input: BossBarInput): BossBarView {
  if (!input.fighting) return HIDDEN;
  if (input.zoneKind !== 'boss' && input.zoneKind !== 'mini_boss') return HIDDEN;
  if (input.bossHp === null || input.bossMaxHp === null || input.bossMaxHp <= 0) return HIDDEN;

  const fraction = Math.max(0, Math.min(1, input.bossHp / input.bossMaxHp));
  const label = input.zoneKind === 'boss' ? input.bossLabel : input.miniBossLabel;
  return { visible: true, label, fraction, enraged: input.bossEnraged };
}

/** Bar fill colour: green → amber → red as HP drops; deep red while enraged. */
export function bossBarColor(fraction: number, enraged: boolean): number {
  if (enraged) return 0xff2222;
  if (fraction > 0.5) return 0xcc3322;
  if (fraction > 0.25) return 0xcc6622;
  return 0xaa1111;
}
