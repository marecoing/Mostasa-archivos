/**
 * Wave / combat-zone encounters (Biblia §11).
 *
 * A stage is a sequence of combat zones. The player travels ("tránsito")
 * until crossing a zone's triggerX, which locks the camera to an arena and
 * spawns waves; the zone clears when every enemy is defeated, unlocking the
 * camera so the player can advance. Threat budget for Escenario 1 is 3-6
 * points per zone (common 1, tank 3, mini-boss 6).
 */

export type ZoneKind = 'oleada' | 'emboscada' | 'mini_boss' | 'boss';

export interface EnemySpawn {
  /** archetype key into ENEMY_TYPES */
  type: string;
  /** sprite sheet key */
  spriteKey: string;
  /** spawn offset from the arena's right edge (negative = further left) */
  offsetX: number;
  /** depth lane Y */
  y: number;
}

export interface WaveDef {
  enemies: EnemySpawn[];
}

export interface CombatZoneDef {
  id: string;
  kind: ZoneKind;
  /** player world X that activates the zone */
  triggerX: number;
  /** camera/movement lock bounds while fighting */
  lockMinX: number;
  lockMaxX: number;
  waves: WaveDef[];
}

export interface StageEncounters {
  stageId: string;
  /** objective-banner labels for the special zones */
  miniBossLabel: string;
  bossLabel: string;
  zones: CombatZoneDef[];
}

// Common sprite pool for the Once street.
const common = (spriteKey: string, offsetX: number, y: number, type = 'grunt'): EnemySpawn => ({
  type, spriteKey, offsetX, y,
});

export const ONCE_ENCOUNTERS: StageEncounters = {
  stageId: '01-once',
  miniBossLabel: '¡EL CARTONERO BLINDADO!',
  bossLabel: '¡EL CAPATAZ NOCTURNO!',
  zones: [
    {
      id: 'once-z1', kind: 'oleada', triggerX: 900, lockMinX: 500, lockMaxX: 1250,
      waves: [
        { enemies: [common('enemy_001', -80, 470), common('enemy_002', 60, 510)] },
        { enemies: [common('enemy_003', 40, 490), common('enemy_005', 120, 540, 'speedster')] },
      ],
    },
    {
      id: 'once-z2', kind: 'oleada', triggerX: 2000, lockMinX: 1650, lockMaxX: 2450,
      waves: [
        { enemies: [common('enemy_004', -60, 480, 'tank'), common('enemy_006', 60, 520)] },
        { enemies: [common('enemy_007', 20, 460), common('enemy_008', 100, 500), common('enemy_005', 160, 540, 'speedster')] },
      ],
    },
    {
      id: 'once-z3', kind: 'oleada', triggerX: 3100, lockMinX: 2750, lockMaxX: 3550,
      waves: [
        { enemies: [common('enemy_001', -40, 470), common('enemy_004', 80, 520, 'tank'), common('enemy_002', 160, 500)] },
      ],
    },
    {
      id: 'once-miniboss', kind: 'mini_boss', triggerX: 3900, lockMinX: 3600, lockMaxX: 4300,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_003', -80, 540)] },
      ],
    },
    {
      id: 'once-boss', kind: 'boss', triggerX: 4550, lockMinX: 4250, lockMaxX: 4650,
      waves: [
        // El Capataz Nocturno (enemy_010). Fase 2 (refuerzos) al 50% la maneja
        // GameScene observando su HP.
        { enemies: [common('enemy_010', 20, 500, 'boss')] },
      ],
    },
  ],
};

/**
 * Estación Oxidada (Biblia §11, §14): a harder run than Once — tighter
 * arenas, more speedsters/tanks. The Escenario 1 sheets are reused as the
 * cast until the stage-2 character art (enemies 11-20) is produced.
 */
export const ESTACION_ENCOUNTERS: StageEncounters = {
  stageId: '02-estacion-oxidada',
  miniBossLabel: '¡EL GUARDA FANTASMA!',
  bossLabel: '¡EL SEÑALERO DEL ÓXIDO!',
  zones: [
    {
      id: 'est-z1', kind: 'oleada', triggerX: 850, lockMinX: 480, lockMaxX: 1220,
      waves: [
        { enemies: [common('enemy_002', -60, 480), common('enemy_005', 80, 530, 'speedster')] },
        { enemies: [common('enemy_006', 20, 470), common('enemy_003', 120, 520, 'zoner')] },
      ],
    },
    {
      id: 'est-z2', kind: 'emboscada', triggerX: 1900, lockMinX: 1560, lockMaxX: 2320,
      waves: [
        { enemies: [common('enemy_004', -70, 490, 'tank'), common('enemy_005', 70, 540, 'speedster'), common('enemy_001', 140, 470)] },
        { enemies: [common('enemy_007', 30, 500), common('enemy_008', 110, 460), common('enemy_003', 180, 540, 'zoner')] },
      ],
    },
    {
      id: 'est-z3', kind: 'oleada', triggerX: 3000, lockMinX: 2650, lockMaxX: 3450,
      waves: [
        { enemies: [common('enemy_004', -50, 480, 'tank'), common('enemy_004', 90, 530, 'tank')] },
        { enemies: [common('enemy_005', 0, 470, 'speedster'), common('enemy_005', 80, 520, 'speedster'), common('enemy_002', 160, 490)] },
      ],
    },
    {
      id: 'est-miniboss', kind: 'mini_boss', triggerX: 3850, lockMinX: 3550, lockMaxX: 4250,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_005', -80, 540, 'speedster')] },
      ],
    },
    {
      id: 'est-boss', kind: 'boss', triggerX: 4520, lockMinX: 4220, lockMaxX: 4620,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_001', -90, 540)] },
      ],
    },
  ],
};

export const ALL_ENCOUNTERS: Record<string, StageEncounters> = {
  '01-once': ONCE_ENCOUNTERS,
  '02-estacion-oxidada': ESTACION_ENCOUNTERS,
};

/** Encounters for a stage; falls back to Once so the scene never breaks. */
export function encountersForStage(stageId: string): StageEncounters {
  return ALL_ENCOUNTERS[stageId] ?? ONCE_ENCOUNTERS;
}
