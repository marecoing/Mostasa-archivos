/**
 * Per-stage object layouts: breakables and ground weapons laid along the
 * street (Biblia §13 armas, §14 rompibles). Pure data so GameScene stays
 * generic — adding a stage is adding an entry here plus its encounters.
 */

export interface PlacedObject {
  id: string;
  x: number;
  y: number;
}

export interface StageLayout {
  stageId: string;
  breakables: PlacedObject[];
  weapons: PlacedObject[];
}

const ONCE_LAYOUT: StageLayout = {
  stageId: '01-once',
  breakables: [
    { id: 'cajon_rompible', x: 720, y: 560 },
    { id: 'tacho_basura_rompible', x: 1050, y: 500 },
    { id: 'puesto_diarios_ficticio', x: 1500, y: 560 },
    { id: 'vidriera_rota', x: 1950, y: 460 },
    { id: 'cono_transito', x: 2350, y: 540 },
    { id: 'barril_plastico', x: 2800, y: 520 },
  ],
  weapons: [
    { id: 'tubo_metalico', x: 880, y: 520 },
    { id: 'llave_inglesa', x: 1700, y: 500 },
    { id: 'cadena_oxidada', x: 2500, y: 540 },
  ],
};

/** Estación Oxidada: rusty platform junk — barrels, crates, a broken window. */
const ESTACION_LAYOUT: StageLayout = {
  stageId: '02-estacion-oxidada',
  breakables: [
    { id: 'barril_plastico', x: 650, y: 540 },
    { id: 'cajon_rompible', x: 1120, y: 500 },
    { id: 'tacho_basura_rompible', x: 1580, y: 550 },
    { id: 'vidriera_rota', x: 2050, y: 460 },
    { id: 'cajon_rompible', x: 2450, y: 530 },
    { id: 'barril_plastico', x: 2900, y: 510 },
    { id: 'cono_transito', x: 3300, y: 550 },
  ],
  weapons: [
    { id: 'cadena_oxidada', x: 950, y: 530 },
    { id: 'tapa_tacho', x: 1850, y: 510 },
    { id: 'tubo_metalico', x: 2650, y: 540 },
    { id: 'maletin_pesado', x: 3500, y: 500 },
  ],
};

export const STAGE_LAYOUTS: Record<string, StageLayout> = {
  '01-once': ONCE_LAYOUT,
  '02-estacion-oxidada': ESTACION_LAYOUT,
};

const EMPTY_LAYOUT: StageLayout = { stageId: '', breakables: [], weapons: [] };

export function layoutForStage(stageId: string): StageLayout {
  return STAGE_LAYOUTS[stageId] ?? EMPTY_LAYOUT;
}
