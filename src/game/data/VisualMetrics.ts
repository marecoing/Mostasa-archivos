/**
 * Runtime visual calibration for art whose transparent canvases are not drawn
 * at a common physical scale.  Gameplay code should size sprites from the
 * visible subject, never from the PNG/cell dimensions.
 *
 * `referenceHeightPx` is the measured opaque height of the reference pose in
 * the current source art.  When art is replaced, only this manifest needs to
 * be updated; the desired on-screen proportions remain stable.
 */

import { CHARACTER_ASSET_MANIFEST } from './CharacterAssetManifest';
import { targetHeightPxFor } from '../art/WorldScale';

export interface SpriteVisualMetric {
  referenceHeightPx: number;
  targetHeightPx: number;
  originX: number;
  originY: number;
}

export interface PropVisualMetric extends SpriteVisualMetric {
  /** Existing PropDef.scale value that represents the canonical placement. */
  authoredScale: number;
}

export interface WeaponVisualMetric extends SpriteVisualMetric {
  heldHeightPx: number;
  /** Normalized point in the unflipped texture that should sit in the hand. */
  gripX: number;
  gripY: number;
  /** Whether the unflipped art extends principally toward screen-right. */
  pointsRight: boolean;
  idleAngle: number;
  swingAngle: number;
}

export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
}

export const FLOOR_OFFSET_PX = 168;
export const PLAYER_TARGET_HEIGHT_PX = 260;
export const ENEMY_HEIGHT_TO_SCREEN = 4;
export const HUD_DEPTH = 10_000;

export function scaleForVisibleHeight(targetHeightPx: number, referenceHeightPx: number): number {
  if (
    !Number.isFinite(targetHeightPx) ||
    !Number.isFinite(referenceHeightPx) ||
    referenceHeightPx <= 0
  ) {
    return 1;
  }
  return targetHeightPx / referenceHeightPx;
}

/** Standing/idle opaque heights generated alongside the current atlases. */
export const CHARACTER_REFERENCE_HEIGHTS: Record<string, number> = Object.fromEntries(
  Object.entries(CHARACTER_ASSET_MANIFEST).map(([key, metadata]) => [
    key,
    metadata.referenceBodyHeight,
  ]),
);

export function characterScaleForTarget(
  spriteKey: string,
  targetHeightPx: number,
  fallbackFrameHeightPx: number,
): number {
  return scaleForVisibleHeight(
    targetHeightPx,
    CHARACTER_REFERENCE_HEIGHTS[spriteKey] ?? fallbackFrameHeightPx,
  );
}

export function characterOriginY(spriteKey: string, fallback = 0.98): number {
  const metadata = CHARACTER_ASSET_MANIFEST[spriteKey as keyof typeof CHARACTER_ASSET_MANIFEST];
  return metadata ? metadata.footAnchorY / metadata.frameHeight : fallback;
}

export const BREAKABLE_VISUALS: Record<string, SpriteVisualMetric> = {
  cajon_rompible: {
    referenceHeightPx: 165,
    targetHeightPx: 92,
    originX: 0.5,
    originY: 0.9558,
  },
  tacho_basura_rompible: {
    referenceHeightPx: 165,
    targetHeightPx: 126,
    originX: 0.5,
    originY: 0.9558,
  },
  puesto_diarios_ficticio: {
    referenceHeightPx: 165,
    targetHeightPx: 190,
    originX: 0.5,
    originY: 0.9558,
  },
  vidriera_rota: {
    referenceHeightPx: 137,
    targetHeightPx: 170,
    originX: 0.5,
    originY: 0.9558,
  },
  cono_transito: {
    referenceHeightPx: 143,
    targetHeightPx: 72,
    originX: 0.5,
    originY: 0.9558,
  },
  barril_plastico: {
    referenceHeightPx: 165,
    targetHeightPx: 120,
    originX: 0.5,
    originY: 0.9558,
  },
};

export const PICKUP_VISUALS: Record<string, SpriteVisualMetric> = {
  mate_curativo: metric(435, 52, 0.5, 0.9824),
  termo_salvador: metric(457, 66, 0.5, 0.9832),
  empanada_rotiseria: metric(304, 42, 0.5, 0.9753),
  choripan_callejero: metric(309, 45, 0.5, 0.9757),
  pizza_slice_ficticia: metric(327, 44, 0.5, 0.9777),
  botiquin_once: metric(341, 58, 0.5, 0.9778),
  cafe_quemado: metric(459, 50, 0.5, 0.9833),
  gaseosa_ficticia: metric(469, 62, 0.5, 0.9836),
  alfajor_generico: metric(363, 42, 0.5, 0.98),
  blister_misterioso: metric(336, 52, 0.5, 0.9775),
  bronca_embotellada: metric(405, 55, 0.5, 0.9812),
  monedas_sueltas: metric(310, 38, 0.5, 0.9758),
  fajo_billetes_ficticios: metric(334, 45, 0.5, 0.9784),
  pendrive_comun: metric(303, 36, 0.5, 0.9752),
  pendrive_federal: metric(338, 36, 0.5, 0.9777),
  pendrive_bitcoin: metric(329, 36, 0.5, 0.9771),
};

export const WEAPON_VISUALS: Record<string, WeaponVisualMetric> = {
  palo_escoba: weaponMetric(325, 92, 150, 0.3, 0.78, true, 0, -38),
  tubo_metalico: weaponMetric(343, 88, 135, 0.25, 0.8, true, 0, -35),
  cadena_oxidada: weaponMetric(250, 62, 110, 0.5, 0.5, true, 0, -25),
  llave_inglesa: weaponMetric(342, 72, 105, 0.78, 0.8, false, 0, -35),
  paraguas_roto: weaponMetric(340, 84, 145, 0.8, 0.83, false, 0, -32),
  tapa_tacho: weaponMetric(232, 64, 95, 0.5, 0.45, true, 0, -25),
  maletin_pesado: weaponMetric(307, 72, 90, 0.5, 0.12, true, 0, -18),
  botella_vidrio: weaponMetric(337, 68, 90, 0.5, 0.12, true, 0, -32),
  silla_plastico: weaponMetric(362, 96, 125, 0.18, 0.28, true, 0, -28),
  cajon_verdura: weaponMetric(228, 84, 105, 0.2, 0.35, true, 0, -24),
};

/** Canonical real-world proportions for decorative scenery. */
export const PROP_VISUALS: Record<string, PropVisualMetric> = {
  cableado_colgante: propMetric(260, 115, 0.7, 0.5, 0.9714),
  persiana_metalica: propMetric(355, 225, 0.72, 0.5, 0.9798),
  cartel_generico_local: propMetric(276, 130, 0.55, 0.5, 0.9798),
  reja_seguridad: propMetric(354, 210, 0.72, 0.5, 0.9786),
  posteres_rotos: propMetric(327, 140, 0.6, 0.5, 0.9769),
  cartel_anden_ilegible: propMetric(416, 145, 0.55, 0.5, 0.9817),
  farol_estacion: propMetric(388, 300, 0.62, 0.5, 0.9804),
  bolsa_basura: propMetric(280, 75, 0.42, 0.5, 0.9735),
  bicicleta_reparto: propMetric(224, 135, 0.5, 0.5, 0.9704),
  banco_anden: propMetric(284, 100, 0.5, 0.5, 0.976),
  molinete_generico: propMetric(404, 180, 0.6, 0.5, 0.9811),
  valija_vieja: propMetric(326, 70, 0.4, 0.5, 0.9769),
  carrito_carga: propMetric(342, 110, 0.5, 0.5, 0.9777),
  carrito_expedientes: propMetric(453, 125, 0.5, 0.5, 0.9831),
  carpeta_oficina: propMetric(362, 32, 0.22, 0.5, 0.9791),
  maletin_papeles: propMetric(439, 55, 0.28, 0.5, 0.9826),
  sello_administrativo: propMetric(415, 28, 0.18, 0.5, 0.9816),
  atril_ficticio: propMetric(446, 145, 0.5, 0.5, 0.9828),
};

export function visualScale(metric: SpriteVisualMetric): number {
  return scaleForVisibleHeight(metric.targetHeightPx, metric.referenceHeightPx);
}

/**
 * Escala de un asset a partir de su altura REAL declarada en metros.
 *
 * Sustituye a `visualScale` en todo lo que tiene medida del mundo real. La
 * altura en píxeles que traía el manifiesto queda sólo como reserva para
 * assets todavía sin medir, y hay un test que exige que no quede ninguno.
 */
export function realWorldScale(id: string, metric: SpriteVisualMetric): number {
  return scaleForVisibleHeight(
    targetHeightPxFor(id, metric.targetHeightPx),
    metric.referenceHeightPx,
  );
}

export function propScaleFor(propId: string, authoredPlacementScale: number): number {
  const visual = PROP_VISUALS[propId];
  if (!visual) return authoredPlacementScale;
  const placementMultiplier = authoredPlacementScale / visual.authoredScale;
  return realWorldScale(propId, visual) * placementMultiplier;
}

export function rectsIntersect(a: ScreenRect, b: ScreenRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/** Fade only when the prop is actually in front of and intersects a fighter. */
export function isOccludingFighter(prop: ScreenRect, fighters: readonly ScreenRect[]): boolean {
  return fighters.some((fighter) => prop.depth > fighter.depth && rectsIntersect(prop, fighter));
}

function metric(
  referenceHeightPx: number,
  targetHeightPx: number,
  originX: number,
  originY: number,
): SpriteVisualMetric {
  return { referenceHeightPx, targetHeightPx, originX, originY };
}

function weaponMetric(
  referenceHeightPx: number,
  targetHeightPx: number,
  heldHeightPx: number,
  gripX: number,
  gripY: number,
  pointsRight: boolean,
  idleAngle: number,
  swingAngle: number,
): WeaponVisualMetric {
  return {
    referenceHeightPx,
    targetHeightPx,
    originX: 0.5,
    originY: 0.97,
    heldHeightPx,
    gripX,
    gripY,
    pointsRight,
    idleAngle,
    swingAngle,
  };
}

function propMetric(
  referenceHeightPx: number,
  targetHeightPx: number,
  authoredScale: number,
  originX: number,
  originY: number,
): PropVisualMetric {
  return {
    referenceHeightPx,
    targetHeightPx,
    authoredScale,
    originX,
    originY,
  };
}
