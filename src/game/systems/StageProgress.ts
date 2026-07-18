/**
 * Stage-progress mini-map (Biblia §11). Pure projection of the combat zones
 * and the player's position onto a 0..1 track, so the HUD bar is testable
 * without Phaser.
 */

import type { CombatZoneDef, ZoneKind } from '../data/WaveManifest';

export interface ZoneMarker {
  /** position along the track, 0..1 */
  fraction: number;
  kind: ZoneKind;
  /** true once the player has cleared this zone */
  cleared: boolean;
}

/** Clamp helper. */
function clamp01(v: number): number {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

/** Player position along the stage as a 0..1 fraction. */
export function progressFraction(playerX: number, laneMaxX: number): number {
  if (laneMaxX <= 0) return 0;
  return clamp01(playerX / laneMaxX);
}

/**
 * Marker for each combat zone: normalized trigger position, its kind, and
 * whether it's been cleared (index below the current zone).
 */
export function zoneMarkers(
  zones: readonly CombatZoneDef[],
  laneMaxX: number,
  currentZoneIndex: number,
): ZoneMarker[] {
  if (laneMaxX <= 0) return [];
  return zones.map((z, i) => ({
    fraction: clamp01(z.triggerX / laneMaxX),
    kind: z.kind,
    cleared: i < currentZoneIndex,
  }));
}

/** Marker colour by zone kind (0xRRGGBB). Boss red, mini-boss orange, waves grey. */
export function zoneMarkerColor(kind: ZoneKind, cleared: boolean): number {
  if (cleared) return 0x336644;
  switch (kind) {
    case 'boss':
      return 0xff3322;
    case 'mini_boss':
      return 0xff8822;
    case 'emboscada':
      return 0xcc55aa;
    default:
      return 0xbbbbbb;
  }
}
