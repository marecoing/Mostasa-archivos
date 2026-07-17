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

export const STAGE_PROPS: Record<string, PropDef[]> = {
  '01-once': ONCE_PROPS,
  '02-estacion-oxidada': ESTACION_PROPS,
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
