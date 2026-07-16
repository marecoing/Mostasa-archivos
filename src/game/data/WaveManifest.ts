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
  zones: CombatZoneDef[];
}

// Common sprite pool for the Once street.
const common = (spriteKey: string, offsetX: number, y: number, type = 'grunt'): EnemySpawn => ({
  type, spriteKey, offsetX, y,
});

export const ONCE_ENCOUNTERS: StageEncounters = {
  stageId: '01-once',
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
