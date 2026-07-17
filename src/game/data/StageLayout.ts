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

const CONURBANO_LAYOUT: StageLayout = {
  stageId: '03-pasillo-del-conurbano',
  breakables: [
    { id: 'tacho_basura_rompible', x: 700, y: 540 },
    { id: 'cajon_rompible', x: 1150, y: 500 },
    { id: 'barril_plastico', x: 1650, y: 550 },
    { id: 'cono_transito', x: 2100, y: 470 },
    { id: 'cajon_rompible', x: 2600, y: 530 },
    { id: 'tacho_basura_rompible', x: 3100, y: 510 },
  ],
  weapons: [
    { id: 'palo_escoba', x: 950, y: 520 },
    { id: 'botella_vidrio', x: 1900, y: 500 },
    { id: 'cadena_oxidada', x: 2900, y: 540 },
  ],
};

const PALERMO_LAYOUT: StageLayout = {
  stageId: '04-palermo-de-carton',
  breakables: [
    { id: 'cajon_rompible', x: 680, y: 540 },
    { id: 'vidriera_rota', x: 1200, y: 460 },
    { id: 'cono_transito', x: 1700, y: 550 },
    { id: 'tacho_basura_rompible', x: 2200, y: 500 },
    { id: 'vidriera_rota', x: 2750, y: 460 },
    { id: 'barril_plastico', x: 3250, y: 530 },
  ],
  weapons: [
    { id: 'silla_plastico', x: 950, y: 520 },
    { id: 'paraguas_roto', x: 1950, y: 500 },
    { id: 'botella_vidrio', x: 2950, y: 540 },
  ],
};

const PROTESTA_LAYOUT: StageLayout = {
  stageId: '05-avenida-de-la-protesta',
  breakables: [
    { id: 'cono_transito', x: 650, y: 540 },
    { id: 'barril_plastico', x: 1100, y: 500 },
    { id: 'cono_transito', x: 1550, y: 550 },
    { id: 'tacho_basura_rompible', x: 2050, y: 470 },
    { id: 'barril_plastico', x: 2550, y: 530 },
    { id: 'cajon_rompible', x: 3050, y: 510 },
    { id: 'cono_transito', x: 3450, y: 550 },
  ],
  weapons: [
    { id: 'palo_escoba', x: 900, y: 520 },
    { id: 'tapa_tacho', x: 1800, y: 500 },
    { id: 'cajon_verdura', x: 2800, y: 540 },
    { id: 'tubo_metalico', x: 3550, y: 510 },
  ],
};

const CATALINAS_LAYOUT: StageLayout = {
  stageId: '06-catalinas-del-humo',
  breakables: [
    { id: 'vidriera_rota', x: 700, y: 460 },
    { id: 'cajon_rompible', x: 1250, y: 530 },
    { id: 'tacho_basura_rompible', x: 1750, y: 500 },
    { id: 'vidriera_rota', x: 2300, y: 460 },
    { id: 'barril_plastico', x: 2850, y: 540 },
    { id: 'cajon_rompible', x: 3300, y: 510 },
  ],
  weapons: [
    { id: 'maletin_pesado', x: 1000, y: 520 },
    { id: 'silla_plastico', x: 2000, y: 500 },
    { id: 'llave_inglesa', x: 3050, y: 540 },
  ],
};

const COUNTRY_LAYOUT: StageLayout = {
  stageId: '07-puerto-del-country',
  breakables: [
    { id: 'cono_transito', x: 720, y: 540 },
    { id: 'cajon_rompible', x: 1250, y: 500 },
    { id: 'barril_plastico', x: 1800, y: 550 },
    { id: 'vidriera_rota', x: 2350, y: 460 },
    { id: 'cajon_rompible', x: 2900, y: 530 },
    { id: 'tacho_basura_rompible', x: 3350, y: 500 },
  ],
  weapons: [
    { id: 'paraguas_roto', x: 1000, y: 520 },
    { id: 'botella_vidrio', x: 2050, y: 500 },
    { id: 'silla_plastico', x: 3100, y: 540 },
  ],
};

const GALPON_LAYOUT: StageLayout = {
  stageId: '08-galpon-del-acceso',
  breakables: [
    { id: 'barril_plastico', x: 650, y: 540 },
    { id: 'cajon_rompible', x: 1100, y: 500 },
    { id: 'barril_plastico', x: 1600, y: 550 },
    { id: 'cajon_rompible', x: 2150, y: 470 },
    { id: 'tacho_basura_rompible', x: 2650, y: 530 },
    { id: 'barril_plastico', x: 3150, y: 510 },
    { id: 'cajon_rompible', x: 3500, y: 550 },
  ],
  weapons: [
    { id: 'tubo_metalico', x: 900, y: 520 },
    { id: 'cadena_oxidada', x: 1850, y: 500 },
    { id: 'llave_inglesa', x: 2850, y: 540 },
    { id: 'cajon_verdura', x: 3600, y: 510 },
  ],
};

const PODER_LAYOUT: StageLayout = {
  stageId: '09-pasillos-del-poder',
  breakables: [
    { id: 'vidriera_rota', x: 750, y: 460 },
    { id: 'cajon_rompible', x: 1300, y: 530 },
    { id: 'vidriera_rota', x: 1850, y: 460 },
    { id: 'tacho_basura_rompible', x: 2400, y: 500 },
    { id: 'vidriera_rota', x: 2950, y: 460 },
    { id: 'cajon_rompible', x: 3400, y: 540 },
  ],
  weapons: [
    { id: 'maletin_pesado', x: 1050, y: 520 },
    { id: 'silla_plastico', x: 2100, y: 500 },
    { id: 'maletin_pesado', x: 3150, y: 540 },
  ],
};

const ROSADA_LAYOUT: StageLayout = {
  stageId: '10-casa-rosada-final',
  breakables: [
    { id: 'cono_transito', x: 700, y: 530 },
    { id: 'barril_plastico', x: 1200, y: 530 },
    { id: 'cajon_rompible', x: 1700, y: 500 },
    { id: 'tacho_basura_rompible', x: 2250, y: 520 },
    { id: 'tacho_basura_rompible', x: 2800, y: 540 },
    { id: 'cajon_rompible', x: 3250, y: 500 },
  ],
  weapons: [
    { id: 'tubo_metalico', x: 950, y: 520 },
    { id: 'llave_inglesa', x: 1950, y: 500 },
    { id: 'maletin_pesado', x: 2950, y: 540 },
    { id: 'cadena_oxidada', x: 3550, y: 510 },
  ],
};

export const STAGE_LAYOUTS: Record<string, StageLayout> = {
  '01-once': ONCE_LAYOUT,
  '02-estacion-oxidada': ESTACION_LAYOUT,
  '03-pasillo-del-conurbano': CONURBANO_LAYOUT,
  '04-palermo-de-carton': PALERMO_LAYOUT,
  '05-avenida-de-la-protesta': PROTESTA_LAYOUT,
  '06-catalinas-del-humo': CATALINAS_LAYOUT,
  '07-puerto-del-country': COUNTRY_LAYOUT,
  '08-galpon-del-acceso': GALPON_LAYOUT,
  '09-pasillos-del-poder': PODER_LAYOUT,
  '10-casa-rosada-final': ROSADA_LAYOUT,
};

const EMPTY_LAYOUT: StageLayout = { stageId: '', breakables: [], weapons: [] };

export function layoutForStage(stageId: string): StageLayout {
  return STAGE_LAYOUTS[stageId] ?? EMPTY_LAYOUT;
}
