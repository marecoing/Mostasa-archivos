import { describe, it, expect } from 'vitest';
import { progressFraction, zoneMarkers, zoneMarkerColor } from '../../src/game/systems/StageProgress';
import type { CombatZoneDef } from '../../src/game/data/WaveManifest';
import { encountersForStage } from '../../src/game/data/WaveManifest';

function zone(kind: CombatZoneDef['kind'], triggerX: number): CombatZoneDef {
  return { id: `z-${triggerX}`, kind, triggerX, lockMinX: triggerX - 100, lockMaxX: triggerX + 100, waves: [] };
}

describe('progressFraction', () => {
  it('maps the player X onto 0..1 and clamps', () => {
    expect(progressFraction(0, 1000)).toBe(0);
    expect(progressFraction(500, 1000)).toBe(0.5);
    expect(progressFraction(1000, 1000)).toBe(1);
    expect(progressFraction(1500, 1000)).toBe(1); // clamped
    expect(progressFraction(-50, 1000)).toBe(0);
  });

  it('is 0 for a degenerate lane', () => {
    expect(progressFraction(500, 0)).toBe(0);
  });
});

describe('zoneMarkers', () => {
  const zones = [zone('oleada', 1000), zone('mini_boss', 2000), zone('boss', 4000)];

  it('normalizes trigger positions and flags cleared zones', () => {
    const markers = zoneMarkers(zones, 4000, 1); // zone 0 cleared, on zone 1
    expect(markers.map((m) => m.fraction)).toEqual([0.25, 0.5, 1]);
    expect(markers.map((m) => m.cleared)).toEqual([true, false, false]);
    expect(markers.map((m) => m.kind)).toEqual(['oleada', 'mini_boss', 'boss']);
  });

  it('marks all cleared once past the last zone', () => {
    const markers = zoneMarkers(zones, 4000, 3);
    expect(markers.every((m) => m.cleared)).toBe(true);
  });

  it('returns nothing for a degenerate lane', () => {
    expect(zoneMarkers(zones, 0, 0)).toEqual([]);
  });

  it('produces one marker per zone for a real stage', () => {
    const enc = encountersForStage('01-once');
    const markers = zoneMarkers(enc.zones, 5000, 0);
    expect(markers.length).toBe(enc.zones.length);
    for (const m of markers) {
      expect(m.fraction).toBeGreaterThanOrEqual(0);
      expect(m.fraction).toBeLessThanOrEqual(1);
    }
  });
});

describe('zoneMarkerColor', () => {
  it('distinguishes boss / mini-boss / wave, and dims cleared', () => {
    const boss = zoneMarkerColor('boss', false);
    const mini = zoneMarkerColor('mini_boss', false);
    const wave = zoneMarkerColor('oleada', false);
    expect(new Set([boss, mini, wave]).size).toBe(3);
    expect(zoneMarkerColor('boss', true)).not.toBe(boss); // cleared is distinct
  });
});
