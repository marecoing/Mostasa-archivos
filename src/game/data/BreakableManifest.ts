/**
 * Breakable (destructible) objects — 4-frame sheets (362×181 per frame):
 * frame 0 = intact, frames 1-3 = destruction progression.
 * Durability follows the Biblia Maestra §13 (liviana 5 / media 8 / pesada 3-5).
 * Each defines a drop table (pickup/reward ids + weights) and a destruction VFX.
 */

export interface BreakableDropEntry {
  itemId: string; // key into ItemManifest DROPPABLES
  weight: number;
}

export interface BreakableDef {
  id: string;
  path: string;
  displayName: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  /** hit points before it shatters */
  durability: number;
  /** half-width / half-depth of its collision box in world units */
  halfW: number;
  halfD: number;
  /** VFX id played when destroyed */
  destroyVfx: string;
  /** frame rate of the destruction animation */
  breakFrameRate: number;
  dropTable: BreakableDropEntry[];
}

export const BREAKABLES: Record<string, BreakableDef> = {
  cajon_rompible: {
    id: 'cajon_rompible', path: 'assets/destructibles/cajon_rompible.png',
    displayName: 'Cajón', frameWidth: 362, frameHeight: 181, frameCount: 4,
    durability: 5, halfW: 34, halfD: 22, destroyVfx: 'polvo_caida', breakFrameRate: 18,
    dropTable: [
      { itemId: 'monedas_sueltas', weight: 3 },
      { itemId: 'empanada_rotiseria', weight: 2 },
      { itemId: 'mate_curativo', weight: 2 },
    ],
  },
  tacho_basura_rompible: {
    id: 'tacho_basura_rompible', path: 'assets/destructibles/tacho_basura_rompible.png',
    displayName: 'Tacho de Basura', frameWidth: 362, frameHeight: 181, frameCount: 4,
    durability: 5, halfW: 30, halfD: 22, destroyVfx: 'polvo_caida', breakFrameRate: 18,
    dropTable: [
      { itemId: 'monedas_sueltas', weight: 3 },
      { itemId: 'choripan_callejero', weight: 2 },
      { itemId: 'bronca_embotellada', weight: 1 },
    ],
  },
  puesto_diarios_ficticio: {
    id: 'puesto_diarios_ficticio', path: 'assets/destructibles/puesto_diarios_ficticio.png',
    displayName: 'Puesto de Diarios', frameWidth: 362, frameHeight: 181, frameCount: 4,
    durability: 8, halfW: 40, halfD: 24, destroyVfx: 'polvo_caida', breakFrameRate: 16,
    dropTable: [
      { itemId: 'monedas_sueltas', weight: 3 },
      { itemId: 'fajo_billetes_ficticios', weight: 1 },
      { itemId: 'cafe_quemado', weight: 2 },
    ],
  },
  vidriera_rota: {
    id: 'vidriera_rota', path: 'assets/destructibles/vidriera_rota.png',
    displayName: 'Vidriera', frameWidth: 362, frameHeight: 181, frameCount: 4,
    durability: 4, halfW: 42, halfD: 20, destroyVfx: 'vidrio_roto_vfx', breakFrameRate: 22,
    dropTable: [
      { itemId: 'monedas_sueltas', weight: 2 },
      { itemId: 'botiquin_once', weight: 1 },
      { itemId: 'alfajor_generico', weight: 2 },
    ],
  },
  cono_transito: {
    id: 'cono_transito', path: 'assets/destructibles/cono_transito.png',
    displayName: 'Cono de Tránsito', frameWidth: 362, frameHeight: 181, frameCount: 4,
    durability: 3, halfW: 22, halfD: 18, destroyVfx: 'polvo_caida', breakFrameRate: 20,
    dropTable: [
      { itemId: 'monedas_sueltas', weight: 2 },
      { itemId: 'gaseosa_ficticia', weight: 1 },
    ],
  },
  barril_plastico: {
    id: 'barril_plastico', path: 'assets/destructibles/barril_plastico.png',
    displayName: 'Barril', frameWidth: 362, frameHeight: 181, frameCount: 4,
    durability: 8, halfW: 30, halfD: 26, destroyVfx: 'polvo_caida', breakFrameRate: 16,
    dropTable: [
      { itemId: 'monedas_sueltas', weight: 3 },
      { itemId: 'pizza_slice_ficticia', weight: 2 },
      { itemId: 'termo_salvador', weight: 1 },
    ],
  },
};

export const BREAKABLE_LIST: BreakableDef[] = Object.values(BREAKABLES);

/**
 * Roll a drop from a breakable's weighted table. Returns an item id, or
 * null if the table is empty. `rng` in [0,1) is injectable for tests.
 */
export function rollDrop(def: BreakableDef, rng: number): string | null {
  if (def.dropTable.length === 0) return null;
  const total = def.dropTable.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return null;
  let r = rng * total;
  for (const entry of def.dropTable) {
    r -= entry.weight;
    if (r < 0) return entry.itemId;
  }
  return def.dropTable[def.dropTable.length - 1]!.itemId;
}
