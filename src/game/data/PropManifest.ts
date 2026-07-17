/**
 * Decorative props for the stages (Biblia §14 "props decorativos", §33).
 *
 * Props are non-interactive scenery laid along a street in two parallax layers:
 *   - 'back':  mid-ground detail behind the action (shutters, signs, cables).
 *   - 'front': foreground pieces the fighters pass *behind* (street lamps,
 *              benches, garbage), which sell the 2.5D depth.
 *
 * They are purely cosmetic and data-driven, so this file has no Phaser deps and
 * the projection math below is unit-testable.
 */

export type PropLayer = 'back' | 'front';

export interface PropDef {
  /** asset basename served from public/assets/props/<id>.png */
  id: string;
  /** world X along the street */
  worldX: number;
  /** screen Y of the prop's base (origin is bottom-centre) */
  groundScreenY: number;
  scale: number;
  /** scroll factor vs the camera: 1 = locked to the street, >1 nearer/faster */
  parallax: number;
  layer: PropLayer;
  flip?: boolean;
  alpha?: number;
}

/** Horizontal screen position of a prop for a given camera scroll. */
export function propScreenX(worldX: number, cameraWorldX: number, parallax: number): number {
  return worldX - cameraWorldX * parallax;
}

/**
 * Once — "La noche de los trapitos". A grimy market street at night: metal
 * shutters and torn posters on the walls behind, street lamps and junk in the
 * immediate foreground.
 */
export const ONCE_PROPS: PropDef[] = [
  // --- back layer (behind the fighters) ---
  { id: 'cableado_colgante', worldX: 620, groundScreenY: 150, scale: 0.7, parallax: 0.9, layer: 'back', alpha: 0.9 },
  { id: 'persiana_metalica', worldX: 360, groundScreenY: 320, scale: 0.72, parallax: 0.96, layer: 'back' },
  { id: 'cartel_generico_local', worldX: 820, groundScreenY: 250, scale: 0.55, parallax: 0.96, layer: 'back' },
  { id: 'reja_seguridad', worldX: 1280, groundScreenY: 320, scale: 0.72, parallax: 0.96, layer: 'back' },
  { id: 'posteres_rotos', worldX: 1760, groundScreenY: 280, scale: 0.6, parallax: 0.96, layer: 'back' },
  { id: 'cableado_colgante', worldX: 1980, groundScreenY: 150, scale: 0.7, parallax: 0.9, layer: 'back', flip: true, alpha: 0.9 },
  { id: 'persiana_metalica', worldX: 2320, groundScreenY: 320, scale: 0.72, parallax: 0.96, layer: 'back', flip: true },
  { id: 'cartel_anden_ilegible', worldX: 2780, groundScreenY: 250, scale: 0.5, parallax: 0.96, layer: 'back' },

  // --- front layer (the fighters pass behind these) ---
  { id: 'farol_estacion', worldX: 560, groundScreenY: 478, scale: 0.62, parallax: 1.08, layer: 'front' },
  { id: 'bolsa_basura', worldX: 1080, groundScreenY: 470, scale: 0.42, parallax: 1.1, layer: 'front' },
  { id: 'bicicleta_reparto', worldX: 1620, groundScreenY: 476, scale: 0.5, parallax: 1.1, layer: 'front', flip: true },
  { id: 'banco_anden', worldX: 2160, groundScreenY: 470, scale: 0.5, parallax: 1.1, layer: 'front' },
  { id: 'farol_estacion', worldX: 2640, groundScreenY: 478, scale: 0.62, parallax: 1.08, layer: 'front', flip: true },
];

/**
 * Estación Oxidada — a decaying rail platform: turnstiles and illegible
 * platform signage behind, benches / lamps / abandoned luggage up front.
 */
export const ESTACION_PROPS: PropDef[] = [
  // --- back layer ---
  { id: 'cartel_anden_ilegible', worldX: 420, groundScreenY: 250, scale: 0.55, parallax: 0.96, layer: 'back' },
  { id: 'molinete_generico', worldX: 760, groundScreenY: 402, scale: 0.6, parallax: 0.96, layer: 'back' },
  { id: 'cableado_colgante', worldX: 1100, groundScreenY: 150, scale: 0.7, parallax: 0.9, layer: 'back', alpha: 0.9 },
  { id: 'posteres_rotos', worldX: 1500, groundScreenY: 280, scale: 0.6, parallax: 0.96, layer: 'back', flip: true },
  { id: 'reja_seguridad', worldX: 1980, groundScreenY: 320, scale: 0.72, parallax: 0.96, layer: 'back' },
  { id: 'cartel_anden_ilegible', worldX: 2440, groundScreenY: 250, scale: 0.55, parallax: 0.96, layer: 'back', flip: true },
  { id: 'molinete_generico', worldX: 2860, groundScreenY: 402, scale: 0.6, parallax: 0.96, layer: 'back', flip: true },
  { id: 'cableado_colgante', worldX: 3260, groundScreenY: 150, scale: 0.7, parallax: 0.9, layer: 'back', flip: true, alpha: 0.9 },

  // --- front layer ---
  { id: 'farol_estacion', worldX: 520, groundScreenY: 478, scale: 0.62, parallax: 1.08, layer: 'front' },
  { id: 'valija_vieja', worldX: 1040, groundScreenY: 468, scale: 0.4, parallax: 1.1, layer: 'front' },
  { id: 'banco_anden', worldX: 1560, groundScreenY: 470, scale: 0.5, parallax: 1.1, layer: 'front', flip: true },
  { id: 'carrito_carga', worldX: 2120, groundScreenY: 474, scale: 0.5, parallax: 1.1, layer: 'front' },
  { id: 'banco_anden', worldX: 2680, groundScreenY: 470, scale: 0.5, parallax: 1.1, layer: 'front' },
  { id: 'farol_estacion', worldX: 3200, groundScreenY: 478, scale: 0.62, parallax: 1.08, layer: 'front', flip: true },
];

/** Compact helpers for the stage-3..10 sets (same grammar as above). */
const back = (id: string, worldX: number, groundScreenY: number, scale: number, flip = false): PropDef => ({
  id, worldX, groundScreenY, scale, parallax: 0.96, layer: 'back', ...(flip ? { flip } : {}),
});
const front = (id: string, worldX: number, groundScreenY: number, scale: number, flip = false): PropDef => ({
  id, worldX, groundScreenY, scale, parallax: 1.1, layer: 'front', ...(flip ? { flip } : {}),
});
const cables = (worldX: number, flip = false): PropDef => ({
  id: 'cableado_colgante', worldX, groundScreenY: 150, scale: 0.7, parallax: 0.9, layer: 'back', alpha: 0.9, ...(flip ? { flip } : {}),
});

/** Pasillo del Conurbano: narrow alley — posters, cables, junk and bikes. */
export const CONURBANO_PROPS: PropDef[] = [
  cables(500), back('posteres_rotos', 900, 280, 0.6), back('persiana_metalica', 1400, 320, 0.72),
  cables(1900, true), back('posteres_rotos', 2400, 280, 0.6, true), back('reja_seguridad', 2900, 320, 0.72),
  front('bolsa_basura', 700, 470, 0.42), front('bicicleta_reparto', 1600, 476, 0.5),
  front('bolsa_basura', 2500, 470, 0.42, true), front('farol_estacion', 3200, 478, 0.62),
];

/** Palermo de Cartón: fake-trendy storefronts and abandoned delivery gear. */
export const PALERMO_PROPS: PropDef[] = [
  back('cartel_generico_local', 500, 250, 0.55), back('persiana_metalica', 1000, 320, 0.72),
  back('posteres_rotos', 1550, 280, 0.6), back('cartel_generico_local', 2100, 250, 0.55, true),
  back('persiana_metalica', 2650, 320, 0.72, true), cables(3100),
  front('bicicleta_reparto', 800, 476, 0.5), front('bolsa_basura', 1800, 470, 0.42),
  front('banco_anden', 2800, 470, 0.5), front('bicicleta_reparto', 3400, 476, 0.5, true),
];

/** Avenida de la Protesta: a marched-over avenue — podiums and litter. */
export const PROTESTA_PROPS: PropDef[] = [
  back('posteres_rotos', 450, 280, 0.6), back('cartel_generico_local', 950, 250, 0.55),
  back('atril_ficticio', 1500, 330, 0.55), back('posteres_rotos', 2050, 280, 0.6, true),
  cables(2600), back('reja_seguridad', 3100, 320, 0.72),
  front('bolsa_basura', 700, 470, 0.42), front('bolsa_basura', 1700, 470, 0.42, true),
  front('farol_estacion', 2600, 478, 0.62), front('bolsa_basura', 3300, 470, 0.42),
];

/**
 * Catalinas del Humo: corporate lobby decay. The office props (files, stamps,
 * briefcases) are close-up renders, so they only read correctly as small
 * floor clutter — never as wall decoration.
 */
export const CATALINAS_PROPS: PropDef[] = [
  back('persiana_metalica', 500, 320, 0.72), back('reja_seguridad', 2150, 320, 0.72),
  cables(1100), cables(3200, true),
  front('carrito_expedientes', 800, 474, 0.5), front('carpeta_oficina', 1450, 468, 0.22),
  front('maletin_papeles', 1900, 466, 0.28), front('sello_administrativo', 2500, 466, 0.18),
  front('carrito_expedientes', 3000, 474, 0.5, true),
];

/** Puerto del Country: gated luxury — fences, signage, left-behind luggage. */
export const COUNTRY_PROPS: PropDef[] = [
  back('reja_seguridad', 500, 320, 0.72), back('cartel_generico_local', 1050, 250, 0.55),
  back('reja_seguridad', 1600, 320, 0.72, true), back('cartel_anden_ilegible', 2150, 250, 0.55),
  back('reja_seguridad', 2700, 320, 0.72), cables(3200, true),
  front('valija_vieja', 850, 468, 0.4), front('banco_anden', 1850, 470, 0.5),
  front('valija_vieja', 2900, 468, 0.4, true), front('farol_estacion', 3400, 478, 0.62),
];

/** Galpón del Acceso: warehouse guts — carts, shutters, heavy cabling. */
export const GALPON_PROPS: PropDef[] = [
  cables(450), back('persiana_metalica', 950, 320, 0.72), back('reja_seguridad', 1500, 320, 0.72),
  cables(2050, true), back('persiana_metalica', 2600, 320, 0.72, true), back('posteres_rotos', 3100, 280, 0.6),
  front('carrito_carga', 750, 474, 0.5), front('bolsa_basura', 1750, 470, 0.42),
  front('carrito_carga', 2750, 474, 0.5, true), front('farol_estacion', 3400, 478, 0.62, true),
];

/** Pasillos del Poder: bureaucratic corridors — floor-level files and carts. */
export const PODER_PROPS: PropDef[] = [
  back('atril_ficticio', 1600, 450, 0.5), back('reja_seguridad', 3200, 320, 0.72),
  cables(700), cables(2400, true),
  front('carrito_expedientes', 850, 474, 0.5), front('carpeta_oficina', 1350, 468, 0.22),
  front('maletin_papeles', 1900, 466, 0.28), front('sello_administrativo', 2450, 466, 0.18),
  front('carrito_expedientes', 2950, 474, 0.5, true), front('maletin_papeles', 3400, 466, 0.28, true),
];

/**
 * Casa Rosada Final: the plaza's painted floor sits lower than the street
 * stages, so back props stand at the wall base (~460) instead of ~320.
 */
export const ROSADA_PROPS: PropDef[] = [
  back('atril_ficticio', 500, 455, 0.5), back('reja_seguridad', 1050, 465, 0.6),
  back('atril_ficticio', 2150, 455, 0.5, true), back('reja_seguridad', 2700, 465, 0.6, true),
  cables(1600), cables(3200, true),
  front('farol_estacion', 800, 478, 0.62), front('banco_anden', 1800, 470, 0.5),
  front('farol_estacion', 2800, 478, 0.62, true), front('maletin_papeles', 3400, 466, 0.28),
];

export const STAGE_PROPS: Record<string, PropDef[]> = {
  '01-once': ONCE_PROPS,
  '02-estacion-oxidada': ESTACION_PROPS,
  '03-pasillo-del-conurbano': CONURBANO_PROPS,
  '04-palermo-de-carton': PALERMO_PROPS,
  '05-avenida-de-la-protesta': PROTESTA_PROPS,
  '06-catalinas-del-humo': CATALINAS_PROPS,
  '07-puerto-del-country': COUNTRY_PROPS,
  '08-galpon-del-acceso': GALPON_PROPS,
  '09-pasillos-del-poder': PODER_PROPS,
  '10-casa-rosada-final': ROSADA_PROPS,
};

export function propsForStage(stageId: string): PropDef[] {
  return STAGE_PROPS[stageId] ?? [];
}

/** Every distinct prop asset id used across all stages (for preloading). */
export function allPropIds(): string[] {
  const ids = new Set<string>();
  for (const list of Object.values(STAGE_PROPS)) {
    for (const p of list) ids.add(p.id);
  }
  return [...ids];
}
