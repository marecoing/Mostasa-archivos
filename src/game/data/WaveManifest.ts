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

/**
 * Escenarios 3-10 (Biblia §11, §33): the difficulty curve is carried by
 * encounter density and archetype mix (zoners → crowds → tanks → speed →
 * elite gauntlet), since every stage reuses the Escenario 1 sheets until its
 * own cast art (enemies 11-100) is produced. All boss names are fictional.
 */
export const CONURBANO_ENCOUNTERS: StageEncounters = {
  stageId: '03-pasillo-del-conurbano',
  miniBossLabel: '¡EL QUINIELERO PESADO!',
  bossLabel: '¡EL PUNTERO DEL PASILLO!',
  zones: [
    {
      id: 'con-z1', kind: 'emboscada', triggerX: 800, lockMinX: 460, lockMaxX: 1180,
      waves: [
        { enemies: [common('enemy_003', -70, 480, 'zoner'), common('enemy_003', 80, 530, 'zoner')] },
        { enemies: [common('enemy_001', 20, 470), common('enemy_005', 110, 520, 'speedster')] },
      ],
    },
    {
      id: 'con-z2', kind: 'oleada', triggerX: 1850, lockMinX: 1520, lockMaxX: 2280,
      waves: [
        { enemies: [common('enemy_006', -60, 490), common('enemy_003', 60, 540, 'zoner'), common('enemy_002', 130, 470)] },
        { enemies: [common('enemy_005', 10, 500, 'speedster'), common('enemy_005', 90, 460, 'speedster')] },
      ],
    },
    {
      id: 'con-z3', kind: 'emboscada', triggerX: 2950, lockMinX: 2620, lockMaxX: 3400,
      waves: [
        { enemies: [common('enemy_004', -50, 490, 'tank'), common('enemy_003', 70, 540, 'zoner'), common('enemy_007', 140, 470)] },
      ],
    },
    {
      id: 'con-miniboss', kind: 'mini_boss', triggerX: 3800, lockMinX: 3500, lockMaxX: 4200,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_003', -80, 540, 'zoner')] },
      ],
    },
    {
      id: 'con-boss', kind: 'boss', triggerX: 4500, lockMinX: 4200, lockMaxX: 4600,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_005', -90, 540, 'speedster')] },
      ],
    },
  ],
};

export const PALERMO_ENCOUNTERS: StageEncounters = {
  stageId: '04-palermo-de-carton',
  miniBossLabel: '¡REFUERZOS!',
  bossLabel: '¡EL INFLUENCER DE CARTÓN!',
  zones: [
    {
      id: 'pal-z1', kind: 'oleada', triggerX: 820, lockMinX: 480, lockMaxX: 1200,
      waves: [
        { enemies: [common('enemy_002', -60, 480), common('enemy_006', 70, 530)] },
        { enemies: [common('enemy_005', 20, 470, 'speedster'), common('enemy_001', 110, 520)] },
      ],
    },
    {
      id: 'pal-z2', kind: 'oleada', triggerX: 1800, lockMinX: 1470, lockMaxX: 2230,
      waves: [
        { enemies: [common('enemy_007', -50, 490), common('enemy_008', 60, 540), common('enemy_002', 130, 470)] },
        { enemies: [common('enemy_005', 0, 500, 'speedster'), common('enemy_003', 90, 460, 'zoner')] },
      ],
    },
    {
      id: 'pal-z3', kind: 'emboscada', triggerX: 2800, lockMinX: 2470, lockMaxX: 3250,
      waves: [
        { enemies: [common('enemy_004', -60, 480, 'tank'), common('enemy_005', 60, 530, 'speedster'), common('enemy_006', 140, 470)] },
        { enemies: [common('enemy_001', 20, 500), common('enemy_002', 100, 460), common('enemy_003', 170, 540, 'zoner')] },
      ],
    },
    {
      id: 'pal-z4', kind: 'oleada', triggerX: 3700, lockMinX: 3380, lockMaxX: 4150,
      waves: [
        { enemies: [common('enemy_004', -40, 490, 'tank'), common('enemy_004', 80, 540, 'tank')] },
      ],
    },
    {
      // Sin mini-boss propio (biblia: Palermo salta directo al jefe).
      id: 'pal-boss', kind: 'boss', triggerX: 4480, lockMinX: 4180, lockMaxX: 4580,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_005', -90, 540, 'speedster')] },
      ],
    },
  ],
};

export const PROTESTA_ENCOUNTERS: StageEncounters = {
  stageId: '05-avenida-de-la-protesta',
  miniBossLabel: '¡EL BOMBO INCANSABLE!',
  bossLabel: '¡EL ORADOR DE HUMO!',
  zones: [
    {
      id: 'pro-z1', kind: 'oleada', triggerX: 820, lockMinX: 480, lockMaxX: 1200,
      waves: [
        { enemies: [common('enemy_001', -70, 470), common('enemy_002', 30, 520), common('enemy_006', 120, 480)] },
        { enemies: [common('enemy_007', -30, 500), common('enemy_008', 60, 460), common('enemy_001', 150, 540)] },
      ],
    },
    {
      id: 'pro-z2', kind: 'oleada', triggerX: 1850, lockMinX: 1520, lockMaxX: 2300,
      waves: [
        { enemies: [common('enemy_002', -60, 480), common('enemy_006', 20, 530), common('enemy_007', 100, 470), common('enemy_008', 170, 520)] },
      ],
    },
    {
      id: 'pro-z3', kind: 'emboscada', triggerX: 2900, lockMinX: 2570, lockMaxX: 3350,
      waves: [
        { enemies: [common('enemy_004', -50, 490, 'tank'), common('enemy_001', 40, 540), common('enemy_002', 120, 470)] },
        { enemies: [common('enemy_005', 0, 500, 'speedster'), common('enemy_006', 80, 460), common('enemy_007', 160, 540)] },
      ],
    },
    {
      id: 'pro-miniboss', kind: 'mini_boss', triggerX: 3800, lockMinX: 3500, lockMaxX: 4200,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_001', -80, 540), common('enemy_002', -140, 480)] },
      ],
    },
    {
      id: 'pro-boss', kind: 'boss', triggerX: 4500, lockMinX: 4200, lockMaxX: 4600,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_006', -90, 540)] },
      ],
    },
  ],
};

export const CATALINAS_ENCOUNTERS: StageEncounters = {
  stageId: '06-catalinas-del-humo',
  miniBossLabel: '¡EL OFICINISTA BLINDADO!',
  bossLabel: '¡LA GERENCIA DEL HUMO!',
  zones: [
    {
      id: 'cat-z1', kind: 'oleada', triggerX: 830, lockMinX: 490, lockMaxX: 1210,
      waves: [
        { enemies: [common('enemy_004', -60, 480, 'tank'), common('enemy_002', 70, 530)] },
        { enemies: [common('enemy_003', 20, 470, 'zoner'), common('enemy_006', 110, 520)] },
      ],
    },
    {
      id: 'cat-z2', kind: 'emboscada', triggerX: 1880, lockMinX: 1550, lockMaxX: 2320,
      waves: [
        { enemies: [common('enemy_004', -70, 490, 'tank'), common('enemy_004', 60, 540, 'tank')] },
        { enemies: [common('enemy_005', 10, 500, 'speedster'), common('enemy_007', 90, 460)] },
      ],
    },
    {
      id: 'cat-z3', kind: 'oleada', triggerX: 2950, lockMinX: 2620, lockMaxX: 3400,
      waves: [
        { enemies: [common('enemy_004', -50, 480, 'tank'), common('enemy_003', 60, 530, 'zoner'), common('enemy_008', 130, 470)] },
      ],
    },
    {
      id: 'cat-miniboss', kind: 'mini_boss', triggerX: 3820, lockMinX: 3520, lockMaxX: 4220,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_004', -80, 540, 'tank')] },
      ],
    },
    {
      id: 'cat-boss', kind: 'boss', triggerX: 4500, lockMinX: 4200, lockMaxX: 4600,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_004', -90, 540, 'tank')] },
      ],
    },
  ],
};

export const COUNTRY_ENCOUNTERS: StageEncounters = {
  stageId: '07-puerto-del-country',
  miniBossLabel: '¡EL CADDIE FURIOSO!',
  bossLabel: '¡EL ESCRIBANO DEL COUNTRY!',
  zones: [
    {
      id: 'cou-z1', kind: 'oleada', triggerX: 820, lockMinX: 480, lockMaxX: 1200,
      waves: [
        { enemies: [common('enemy_005', -60, 480, 'speedster'), common('enemy_005', 70, 530, 'speedster')] },
        { enemies: [common('enemy_003', 20, 470, 'zoner'), common('enemy_002', 110, 520)] },
      ],
    },
    {
      id: 'cou-z2', kind: 'emboscada', triggerX: 1850, lockMinX: 1520, lockMaxX: 2300,
      waves: [
        { enemies: [common('enemy_005', -50, 490, 'speedster'), common('enemy_003', 60, 540, 'zoner'), common('enemy_005', 130, 470, 'speedster')] },
        { enemies: [common('enemy_006', 10, 500), common('enemy_003', 90, 460, 'zoner')] },
      ],
    },
    {
      id: 'cou-z3', kind: 'oleada', triggerX: 2950, lockMinX: 2620, lockMaxX: 3400,
      waves: [
        { enemies: [common('enemy_005', -40, 480, 'speedster'), common('enemy_004', 70, 530, 'tank'), common('enemy_003', 150, 470, 'zoner')] },
      ],
    },
    {
      id: 'cou-miniboss', kind: 'mini_boss', triggerX: 3820, lockMinX: 3520, lockMaxX: 4220,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_005', -80, 540, 'speedster')] },
      ],
    },
    {
      id: 'cou-boss', kind: 'boss', triggerX: 4500, lockMinX: 4200, lockMaxX: 4600,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_003', -90, 540, 'zoner')] },
      ],
    },
  ],
};

export const GALPON_ENCOUNTERS: StageEncounters = {
  stageId: '08-galpon-del-acceso',
  miniBossLabel: '¡EL FLETERO FANTASMA!',
  bossLabel: '¡EL CAPANGA DEL GALPÓN!',
  zones: [
    {
      id: 'gal-z1', kind: 'emboscada', triggerX: 800, lockMinX: 460, lockMaxX: 1180,
      waves: [
        { enemies: [common('enemy_004', -60, 480, 'tank'), common('enemy_005', 70, 530, 'speedster'), common('enemy_001', 140, 470)] },
      ],
    },
    {
      id: 'gal-z2', kind: 'oleada', triggerX: 1850, lockMinX: 1520, lockMaxX: 2300,
      waves: [
        { enemies: [common('enemy_002', -50, 490), common('enemy_006', 40, 540), common('enemy_007', 120, 470)] },
        { enemies: [common('enemy_004', 0, 500, 'tank'), common('enemy_003', 90, 460, 'zoner'), common('enemy_005', 160, 540, 'speedster')] },
      ],
    },
    {
      id: 'gal-z3', kind: 'emboscada', triggerX: 2950, lockMinX: 2620, lockMaxX: 3400,
      waves: [
        { enemies: [common('enemy_008', -50, 480), common('enemy_004', 60, 530, 'tank')] },
        { enemies: [common('enemy_005', 10, 500, 'speedster'), common('enemy_005', 90, 460, 'speedster'), common('enemy_001', 160, 540)] },
      ],
    },
    {
      id: 'gal-miniboss', kind: 'mini_boss', triggerX: 3820, lockMinX: 3520, lockMaxX: 4220,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_004', -80, 540, 'tank')] },
      ],
    },
    {
      id: 'gal-boss', kind: 'boss', triggerX: 4500, lockMinX: 4200, lockMaxX: 4600,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_009', -90, 540, 'miniboss')] },
      ],
    },
  ],
};

export const PODER_ENCOUNTERS: StageEncounters = {
  stageId: '09-pasillos-del-poder',
  miniBossLabel: '¡EL ASESOR ETERNO!',
  bossLabel: '¡LA MANO DERECHA!',
  zones: [
    {
      id: 'pod-z1', kind: 'oleada', triggerX: 820, lockMinX: 480, lockMaxX: 1200,
      waves: [
        { enemies: [common('enemy_004', -60, 480, 'tank'), common('enemy_005', 70, 530, 'speedster')] },
        { enemies: [common('enemy_003', 20, 470, 'zoner'), common('enemy_003', 110, 520, 'zoner'), common('enemy_006', 170, 490)] },
      ],
    },
    {
      id: 'pod-z2', kind: 'emboscada', triggerX: 1850, lockMinX: 1520, lockMaxX: 2300,
      waves: [
        { enemies: [common('enemy_004', -70, 490, 'tank'), common('enemy_004', 60, 540, 'tank'), common('enemy_005', 140, 470, 'speedster')] },
      ],
    },
    {
      id: 'pod-z3', kind: 'oleada', triggerX: 2950, lockMinX: 2620, lockMaxX: 3400,
      waves: [
        { enemies: [common('enemy_005', -50, 480, 'speedster'), common('enemy_005', 40, 530, 'speedster'), common('enemy_003', 120, 470, 'zoner'), common('enemy_002', 180, 520)] },
      ],
    },
    {
      id: 'pod-miniboss', kind: 'mini_boss', triggerX: 3820, lockMinX: 3520, lockMaxX: 4220,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_009', -100, 540, 'miniboss')] },
      ],
    },
    {
      id: 'pod-boss', kind: 'boss', triggerX: 4500, lockMinX: 4200, lockMaxX: 4600,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_004', -90, 540, 'tank'), common('enemy_005', -150, 480, 'speedster')] },
      ],
    },
  ],
};

export const ROSADA_ENCOUNTERS: StageEncounters = {
  stageId: '10-casa-rosada-final',
  miniBossLabel: '¡EL CUSTODIO DE LA ROSCA!',
  bossLabel: '¡EL JEFE DE LA ROSCA!',
  zones: [
    {
      id: 'ros-z1', kind: 'emboscada', triggerX: 800, lockMinX: 460, lockMaxX: 1180,
      waves: [
        { enemies: [common('enemy_001', -70, 470), common('enemy_002', 20, 520), common('enemy_005', 100, 480, 'speedster')] },
        { enemies: [common('enemy_004', -30, 500, 'tank'), common('enemy_003', 70, 460, 'zoner')] },
      ],
    },
    {
      id: 'ros-z2', kind: 'oleada', triggerX: 1800, lockMinX: 1470, lockMaxX: 2250,
      waves: [
        { enemies: [common('enemy_006', -60, 480), common('enemy_007', 30, 530), common('enemy_008', 110, 470), common('enemy_005', 180, 520, 'speedster')] },
        { enemies: [common('enemy_004', 0, 500, 'tank'), common('enemy_004', 90, 460, 'tank')] },
      ],
    },
    {
      id: 'ros-z3', kind: 'emboscada', triggerX: 2850, lockMinX: 2520, lockMaxX: 3300,
      waves: [
        { enemies: [common('enemy_005', -50, 480, 'speedster'), common('enemy_005', 40, 530, 'speedster'), common('enemy_003', 120, 470, 'zoner'), common('enemy_004', 190, 520, 'tank')] },
      ],
    },
    {
      id: 'ros-miniboss', kind: 'mini_boss', triggerX: 3780, lockMinX: 3480, lockMaxX: 4180,
      waves: [
        { enemies: [common('enemy_009', 40, 500, 'miniboss'), common('enemy_009', -100, 540, 'miniboss'), common('enemy_005', 120, 470, 'speedster')] },
      ],
    },
    {
      id: 'ros-boss', kind: 'boss', triggerX: 4480, lockMinX: 4180, lockMaxX: 4580,
      waves: [
        { enemies: [common('enemy_010', 20, 500, 'boss'), common('enemy_009', -90, 540, 'miniboss'), common('enemy_004', -150, 480, 'tank')] },
      ],
    },
  ],
};

export const ALL_ENCOUNTERS: Record<string, StageEncounters> = {
  '01-once': ONCE_ENCOUNTERS,
  '02-estacion-oxidada': ESTACION_ENCOUNTERS,
  '03-pasillo-del-conurbano': CONURBANO_ENCOUNTERS,
  '04-palermo-de-carton': PALERMO_ENCOUNTERS,
  '05-avenida-de-la-protesta': PROTESTA_ENCOUNTERS,
  '06-catalinas-del-humo': CATALINAS_ENCOUNTERS,
  '07-puerto-del-country': COUNTRY_ENCOUNTERS,
  '08-galpon-del-acceso': GALPON_ENCOUNTERS,
  '09-pasillos-del-poder': PODER_ENCOUNTERS,
  '10-casa-rosada-final': ROSADA_ENCOUNTERS,
};

/** Encounters for a stage; falls back to Once so the scene never breaks. */
export function encountersForStage(stageId: string): StageEncounters {
  return ALL_ENCOUNTERS[stageId] ?? ONCE_ENCOUNTERS;
}
