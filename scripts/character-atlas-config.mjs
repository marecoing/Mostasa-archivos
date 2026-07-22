/**
 * Logical layout and quality contract for ImageGen character atlases.
 *
 * Sources are RGBA contact sheets. Their pixel dimensions and spacing may be
 * irregular, but their logical row/column count is fixed. The v3 builder
 * validates alpha components, then repacks every unique pose without stretch.
 */

export const TARGET_FRAME_HEIGHT = 224;
export const FRAME_GUTTER = 8;
export const CONTENT_PADDING = 10;
export const CONTENT_ALPHA_MIN = 8;
export const MEASURE_ALPHA_MIN = 16;
export const MAX_EDGE_CHROMA_RATIO = 0.01;

export const CHARACTER_LAYOUTS = Object.freeze({
  mostasa: { cols: 10, rows: 9 },
  enemy_001: { cols: 10, rows: 8 },
  enemy_002: { cols: 9, rows: 8 },
  // The final two rows intentionally contain nine poses. Their trailing
  // cells stay transparent and are declared in generated metadata.
  enemy_003: { cols: 10, rows: 8, rowCounts: [10, 10, 10, 10, 10, 10, 9, 9] },
  enemy_004: { cols: 9, rows: 9 },
  enemy_005: { cols: 10, rows: 9 },
  enemy_006: { cols: 10, rows: 9 },
  enemy_007: { cols: 9, rows: 8 },
  enemy_008: { cols: 10, rows: 8 },
  enemy_009: { cols: 8, rows: 11 },
  enemy_010: { cols: 10, rows: 9 },
});

export const CHARACTER_IDS = Object.freeze(Object.keys(CHARACTER_LAYOUTS));

export function sourceFileFor(id) {
  return `${id}-alpha.png`;
}

export function outputFileFor(id) {
  return `${id}.png`;
}
