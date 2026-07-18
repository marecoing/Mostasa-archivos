/**
 * Per-stage enemy palette (Biblia §10 variedad visual). The campaign reuses a
 * shared cast of character sheets across all ten escenarios, so without a
 * distinct treatment every level's mob looks identical. This module gives each
 * stage a colour identity: a gentle multiply-tint applied to its enemies, with
 * a small deterministic variation per sprite key so the roster inside a stage
 * still reads as individuals rather than one uniform block.
 *
 * Pure, deterministic and testable — no Phaser dependency. GameScene reads a
 * tint per enemy and applies it in place of the neutral clearTint().
 */

export interface StagePalette {
  /** base multiply tint applied to the stage's enemies (near-white = subtle) */
  tint: number;
  /** short human label for the stage's visual theme (docs / debug) */
  theme: string;
}

/** Neutral fallback: no perceptible tint. */
export const DEFAULT_PALETTE: StagePalette = { tint: 0xffffff, theme: 'neutro' };

/**
 * One palette per campaign stage. Tints stay close to white so they recolour
 * the full-colour sheets gently (a warm/cool/rusty cast) rather than darkening
 * them. Themes echo each escenario's setting.
 */
export const STAGE_ENEMY_PALETTES: Record<string, StagePalette> = {
  '01-once': { tint: 0xffe8d8, theme: 'faroles cálidos' },
  '02-estacion-oxidada': { tint: 0xffd6a8, theme: 'óxido' },
  '03-pasillo-del-conurbano': { tint: 0xd6e2ff, theme: 'cemento frío' },
  '04-palermo-de-carton': { tint: 0xe4ffd6, theme: 'cartón verdoso' },
  '05-avenida-de-la-protesta': { tint: 0xffccc4, theme: 'fuego / protesta' },
  '06-catalinas-del-humo': { tint: 0xcfd0e0, theme: 'humo gris' },
  '07-puerto-del-country': { tint: 0xd2fff0, theme: 'puerto turquesa' },
  '08-galpon-del-acceso': { tint: 0xdccfff, theme: 'violeta industrial' },
  '09-pasillos-del-poder': { tint: 0xfff0c0, theme: 'dorado del poder' },
  '10-casa-rosada-final': { tint: 0xffd0e6, theme: 'rosada' },
};

export function paletteForStage(stageId: string): StagePalette {
  return STAGE_ENEMY_PALETTES[stageId] ?? DEFAULT_PALETTE;
}

/** Multiply each RGB channel of `color` by `factor`, clamped to a byte. */
export function scaleColor(color: number, factor: number): number {
  const r = Math.min(255, Math.max(0, Math.round(((color >> 16) & 0xff) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(((color >> 8) & 0xff) * factor)));
  const b = Math.min(255, Math.max(0, Math.round((color & 0xff) * factor)));
  return (r << 16) | (g << 8) | b;
}

/**
 * Deterministic brightness factor per sprite key (0.86 .. 1.00). Adjacent
 * enemy sheets land on different factors so a stage's mob isn't one flat
 * colour. Non-numeric keys fall back to full brightness.
 */
export function spriteVariant(spriteKey: string): number {
  const n = parseInt(spriteKey.replace(/\D/g, ''), 10) || 0;
  return 0.86 + ((n * 37) % 15) / 100;
}

/**
 * Brightness bias per archetype, reinforcing silhouette readability: heavies
 * read darker/bulkier, quick enemies read lighter. Special enemies keep their
 * designed look (factor 1). Unknown types are neutral.
 */
export function archetypeTone(type: string): number {
  switch (type) {
    case 'tank':
      return 0.9;
    case 'speedster':
      return 1.06;
    case 'zoner':
      return 0.96;
    default: // grunt, miniboss, boss, unknown
      return 1.0;
  }
}

/**
 * Final multiply-tint for one enemy sprite on a given stage. The optional
 * archetype biases brightness so types stay readable at a glance on top of the
 * stage's colour identity.
 */
export function enemyTint(stageId: string, spriteKey: string, type = ''): number {
  const factor = spriteVariant(spriteKey) * archetypeTone(type);
  return scaleColor(paletteForStage(stageId).tint, factor);
}
