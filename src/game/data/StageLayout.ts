/**
 * Per-stage object layouts: breakables and ground weapons laid along the
 * street (Biblia §13 armas, §14 rompibles). Pure data so GameScene stays
 * generic — adding a stage is adding an entry here plus its encounters.
 *
 * DEPTH RULE (§14). The walkable lane spans world Y 420–840. Objects must be
 * dealt across that whole band, not queued on a single line, or the street
 * reads as flat 2D and the near half of the field looks abandoned:
 *
 *   far   450–500  against the wall — shop windows and newsstands live here
 *   mid   500–660  the main brawling corridor
 *   near  660–790  foreground framing the player passes behind
 *
 * Consecutive objects along X alternate bands so the street zigzags in depth.
 * `vidriera_rota` (shop window) and `puesto_diarios_ficticio` (newsstand) are
 * wall-mounted fixtures and always stay in the far band. Enforced by
 * tests/unit/StageLayout.test.ts.
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

/** Objects that are part of a building facade and must hug the far band. */
export const WALL_MOUNTED_OBJECTS = new Set(['vidriera_rota', 'puesto_diarios_ficticio']);

/** Walkable depth band the layouts are dealt across. */
export const LAYOUT_DEPTH_MIN = 450;
export const LAYOUT_DEPTH_MAX = 790;
/** An object at or beyond this depth counts as foreground framing. */
export const LAYOUT_NEAR_BAND = 660;
/** An object at or before this depth counts as wall-side background. */
export const LAYOUT_FAR_BAND = 500;

const ONCE_LAYOUT: StageLayout = {
  stageId: '01-once',
  breakables: [
    { id: 'cajon_rompible', x: 720, y: 690 },
    { id: 'tacho_basura_rompible', x: 1050, y: 480 },
    { id: 'puesto_diarios_ficticio', x: 1500, y: 465 },
    { id: 'vidriera_rota', x: 1950, y: 450 },
    { id: 'cono_transito', x: 2350, y: 745 },
    { id: 'barril_plastico', x: 2800, y: 600 },
  ],
  weapons: [
    { id: 'tubo_metalico', x: 880, y: 620 },
    { id: 'llave_inglesa', x: 1700, y: 730 },
    { id: 'cadena_oxidada', x: 2500, y: 505 },
  ],
};

/** Estación Oxidada: rusty platform junk — barrels, crates, a broken window. */
const ESTACION_LAYOUT: StageLayout = {
  stageId: '02-estacion-oxidada',
  breakables: [
    { id: 'barril_plastico', x: 650, y: 700 },
    { id: 'cajon_rompible', x: 1120, y: 490 },
    { id: 'tacho_basura_rompible', x: 1580, y: 640 },
    { id: 'vidriera_rota', x: 2050, y: 450 },
    { id: 'cajon_rompible', x: 2450, y: 760 },
    { id: 'barril_plastico', x: 2900, y: 545 },
    { id: 'cono_transito', x: 3300, y: 690 },
  ],
  weapons: [
    { id: 'cadena_oxidada', x: 950, y: 560 },
    { id: 'tapa_tacho', x: 1850, y: 720 },
    { id: 'tubo_metalico', x: 2650, y: 480 },
    { id: 'maletin_pesado', x: 3500, y: 660 },
  ],
};

const CONURBANO_LAYOUT: StageLayout = {
  stageId: '03-pasillo-del-conurbano',
  breakables: [
    { id: 'tacho_basura_rompible', x: 700, y: 720 },
    { id: 'cajon_rompible', x: 1150, y: 490 },
    { id: 'barril_plastico', x: 1650, y: 640 },
    { id: 'cono_transito', x: 2100, y: 760 },
    { id: 'cajon_rompible', x: 2600, y: 530 },
    { id: 'tacho_basura_rompible', x: 3100, y: 680 },
  ],
  weapons: [
    { id: 'palo_escoba', x: 950, y: 600 },
    { id: 'botella_vidrio', x: 1900, y: 470 },
    { id: 'cadena_oxidada', x: 2900, y: 740 },
  ],
};

const PALERMO_LAYOUT: StageLayout = {
  stageId: '04-palermo-de-carton',
  breakables: [
    { id: 'cajon_rompible', x: 680, y: 660 },
    { id: 'vidriera_rota', x: 1200, y: 450 },
    { id: 'cono_transito', x: 1700, y: 745 },
    { id: 'tacho_basura_rompible', x: 2200, y: 510 },
    { id: 'vidriera_rota', x: 2750, y: 455 },
    { id: 'barril_plastico', x: 3250, y: 690 },
  ],
  weapons: [
    { id: 'silla_plastico', x: 950, y: 580 },
    { id: 'paraguas_roto', x: 1950, y: 700 },
    { id: 'botella_vidrio', x: 2950, y: 490 },
  ],
};

const PROTESTA_LAYOUT: StageLayout = {
  stageId: '05-avenida-de-la-protesta',
  breakables: [
    { id: 'cono_transito', x: 650, y: 730 },
    { id: 'barril_plastico', x: 1100, y: 500 },
    { id: 'cono_transito', x: 1550, y: 640 },
    { id: 'tacho_basura_rompible', x: 2050, y: 470 },
    { id: 'barril_plastico', x: 2550, y: 700 },
    { id: 'cajon_rompible', x: 3050, y: 560 },
    { id: 'cono_transito', x: 3450, y: 760 },
  ],
  weapons: [
    { id: 'palo_escoba', x: 900, y: 620 },
    { id: 'tapa_tacho', x: 1800, y: 730 },
    { id: 'cajon_verdura', x: 2800, y: 490 },
    { id: 'tubo_metalico', x: 3550, y: 660 },
  ],
};

const CATALINAS_LAYOUT: StageLayout = {
  stageId: '06-catalinas-del-humo',
  breakables: [
    { id: 'vidriera_rota', x: 700, y: 450 },
    { id: 'cajon_rompible', x: 1250, y: 690 },
    { id: 'tacho_basura_rompible', x: 1750, y: 540 },
    { id: 'vidriera_rota', x: 2300, y: 455 },
    { id: 'barril_plastico', x: 2850, y: 740 },
    { id: 'cajon_rompible', x: 3300, y: 600 },
  ],
  weapons: [
    { id: 'maletin_pesado', x: 1000, y: 640 },
    { id: 'silla_plastico', x: 2000, y: 490 },
    { id: 'llave_inglesa', x: 3050, y: 715 },
  ],
};

const COUNTRY_LAYOUT: StageLayout = {
  stageId: '07-puerto-del-country',
  breakables: [
    { id: 'cono_transito', x: 720, y: 700 },
    { id: 'cajon_rompible', x: 1250, y: 505 },
    { id: 'barril_plastico', x: 1800, y: 660 },
    { id: 'vidriera_rota', x: 2350, y: 450 },
    { id: 'cajon_rompible', x: 2900, y: 745 },
    { id: 'tacho_basura_rompible', x: 3350, y: 570 },
  ],
  weapons: [
    { id: 'paraguas_roto', x: 1000, y: 610 },
    { id: 'botella_vidrio', x: 2050, y: 730 },
    { id: 'silla_plastico', x: 3100, y: 480 },
  ],
};

const GALPON_LAYOUT: StageLayout = {
  stageId: '08-galpon-del-acceso',
  breakables: [
    { id: 'barril_plastico', x: 650, y: 690 },
    { id: 'cajon_rompible', x: 1100, y: 490 },
    { id: 'barril_plastico', x: 1600, y: 630 },
    { id: 'cajon_rompible', x: 2150, y: 755 },
    { id: 'tacho_basura_rompible', x: 2650, y: 545 },
    { id: 'barril_plastico', x: 3150, y: 700 },
    { id: 'cajon_rompible', x: 3500, y: 470 },
  ],
  weapons: [
    { id: 'tubo_metalico', x: 900, y: 600 },
    { id: 'cadena_oxidada', x: 1850, y: 720 },
    { id: 'llave_inglesa', x: 2850, y: 480 },
    { id: 'cajon_verdura', x: 3600, y: 660 },
  ],
};

const PODER_LAYOUT: StageLayout = {
  stageId: '09-pasillos-del-poder',
  breakables: [
    { id: 'vidriera_rota', x: 750, y: 450 },
    { id: 'cajon_rompible', x: 1300, y: 700 },
    { id: 'vidriera_rota', x: 1850, y: 455 },
    { id: 'tacho_basura_rompible', x: 2400, y: 620 },
    { id: 'vidriera_rota', x: 2950, y: 450 },
    { id: 'cajon_rompible', x: 3400, y: 745 },
  ],
  weapons: [
    { id: 'maletin_pesado', x: 1050, y: 560 },
    { id: 'silla_plastico', x: 2100, y: 710 },
    { id: 'maletin_pesado', x: 3150, y: 490 },
  ],
};

const ROSADA_LAYOUT: StageLayout = {
  stageId: '10-casa-rosada-final',
  breakables: [
    { id: 'cono_transito', x: 700, y: 720 },
    { id: 'barril_plastico', x: 1200, y: 500 },
    { id: 'cajon_rompible', x: 1700, y: 650 },
    { id: 'tacho_basura_rompible', x: 2250, y: 760 },
    { id: 'tacho_basura_rompible', x: 2800, y: 540 },
    { id: 'cajon_rompible', x: 3250, y: 690 },
  ],
  weapons: [
    { id: 'tubo_metalico', x: 950, y: 610 },
    { id: 'llave_inglesa', x: 1950, y: 470 },
    { id: 'maletin_pesado', x: 2950, y: 730 },
    { id: 'cadena_oxidada', x: 3550, y: 580 },
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
