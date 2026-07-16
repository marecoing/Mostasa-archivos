import type { CombatZoneDef, EnemySpawn, StageEncounters } from '../data/WaveManifest';

export type WavePhase = 'traveling' | 'fighting' | 'done';

/** Concrete spawn request emitted to the scene (world coordinates). */
export interface SpawnRequest extends EnemySpawn {
  x: number;
}

/** Actions the scene must perform this tick. */
export interface WaveActions {
  lockCamera?: { minX: number; maxX: number };
  unlockCamera?: boolean;
  spawns: SpawnRequest[];
  zoneCleared?: string;
  stageCleared?: boolean;
}

/**
 * Drives stage progression through combat zones (Biblia §11). Pure logic:
 * `update(playerX, aliveEnemies)` returns the actions to apply and the
 * movement gate the scene should clamp the player to.
 */
export class WaveSystem {
  private zones: CombatZoneDef[];
  private zoneIndex = 0;
  private waveIndex = 0;
  private phase: WavePhase = 'traveling';
  /** rightmost world X the player may currently walk to */
  private gate: number;
  private readonly fullGate: number;

  constructor(encounters: StageEncounters, fullStageMaxX: number) {
    this.zones = encounters.zones;
    this.fullGate = fullStageMaxX;
    this.gate = fullStageMaxX;
  }

  get gateX(): number {
    return this.gate;
  }

  get currentPhase(): WavePhase {
    return this.phase;
  }

  get activeZone(): CombatZoneDef | null {
    return this.phase === 'fighting' ? (this.zones[this.zoneIndex] ?? null) : null;
  }

  private spawnsForWave(zone: CombatZoneDef, waveIdx: number): SpawnRequest[] {
    const wave = zone.waves[waveIdx];
    if (!wave) return [];
    return wave.enemies.map((e) => ({ ...e, x: zone.lockMaxX + e.offsetX }));
  }

  /**
   * Advance the encounter state. `aliveEnemies` is the count of live enemies
   * currently in the scene.
   */
  update(playerX: number, aliveEnemies: number): WaveActions {
    const actions: WaveActions = { spawns: [] };

    if (this.phase === 'done') return actions;

    if (this.phase === 'traveling') {
      const zone = this.zones[this.zoneIndex];
      if (!zone) {
        this.phase = 'done';
        actions.stageCleared = true;
        return actions;
      }
      // Gate the player just past the trigger until the zone starts.
      this.gate = Math.min(this.fullGate, zone.triggerX + 120);
      if (playerX >= zone.triggerX) {
        this.phase = 'fighting';
        this.waveIndex = 0;
        this.gate = zone.lockMaxX;
        actions.lockCamera = { minX: zone.lockMinX, maxX: zone.lockMaxX };
        actions.spawns = this.spawnsForWave(zone, 0);
      }
      return actions;
    }

    // phase === 'fighting'
    const zone = this.zones[this.zoneIndex]!;
    this.gate = zone.lockMaxX;
    if (aliveEnemies > 0) return actions;

    // current wave cleared — next wave or next zone
    if (this.waveIndex < zone.waves.length - 1) {
      this.waveIndex++;
      actions.spawns = this.spawnsForWave(zone, this.waveIndex);
      return actions;
    }

    // zone fully cleared
    actions.zoneCleared = zone.id;
    actions.unlockCamera = true;
    this.zoneIndex++;
    this.phase = 'traveling';
    if (this.zoneIndex >= this.zones.length) {
      this.phase = 'done';
      actions.stageCleared = true;
      this.gate = this.fullGate;
    } else {
      this.gate = this.fullGate;
    }
    return actions;
  }
}
