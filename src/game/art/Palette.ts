/**
 * PALETA CERRADA — Fase 0 de la reconstrucción.
 *
 * Todo lo que se dibuja sale de acá. Una paleta cerrada es la razón por la que
 * juegos como Hotline Miami o Katana ZERO se ven de una pieza: no hay forma de
 * que un asset "no combine" si no existe ningún color fuera de la lista.
 *
 * El mundo es Buenos Aires de noche bajo alumbrado de vapor de sodio. De ahí
 * salen los tres ejes de la paleta: el asfalto azulado, el halo naranja de la
 * lámpara, y el neón de los carteles como contraluz.
 */

export type Hex = number;

/** Tinta. El contorno y la silueta. Nunca negro puro: negro puro se ve muerto. */
export const INK = 0x11141d;
export const INK_SOFT = 0x1d2231;

/** Asfalto y sombra ambiente. Frío, azulado, es el "papel" del juego. */
export const ASPHALT_DEEP = 0x1a2030;
export const ASPHALT = 0x2b3242;
export const ASPHALT_LIT = 0x3d4659;

/** Vereda: gris cálido, más claro que la calzada, separa las bandas de piso. */
export const PAVEMENT = 0x4a4d52;
export const PAVEMENT_LIT = 0x63666c;

/** Luz de sodio. El halo cálido que define la hora del día del juego entero. */
export const SODIUM_CORE = 0xffd98a;
export const SODIUM = 0xf2b04e;
export const SODIUM_DEEP = 0xb87433;

/**
 * Mostaza. El color propio de Mostasa — el chiste está en el nombre y funciona
 * como identidad de marca. Es el único amarillo saturado que usa un personaje,
 * así que el jugador nunca pierde de vista al héroe en una pantalla llena.
 */
export const MUSTARD = 0xd9a21b;
export const MUSTARD_LIT = 0xf0c247;
export const MUSTARD_DARK = 0x8f6510;

/** Neón de cartel: el contraluz frío que despega a los personajes del fondo. */
export const NEON_TEAL = 0x2fb6a8;
export const NEON_MAGENTA = 0xc4478f;

/** Piel, en tres tonos. Un solo tono base con su luz y su sombra. */
export const SKIN = 0xc98d63;
export const SKIN_LIT = 0xe0a97d;
export const SKIN_SHADE = 0x8f6044;

/** Ropa de enemigos. Fríos y desaturados: nunca compiten con el mostaza. */
export const CLOTH_BLUE = 0x3a4a6b;
export const CLOTH_BLUE_LIT = 0x52658a;
export const CLOTH_GREY = 0x4d5460;
export const CLOTH_GREY_LIT = 0x6a7280;
export const CLOTH_OLIVE = 0x55603f;
export const CLOTH_OLIVE_LIT = 0x717d57;

/** Rojo. Reservado para daño y peligro. No se usa como color decorativo. */
export const DANGER = 0xc8384a;
export const DANGER_LIT = 0xe4576a;

/** Blanco sucio. Impactos, destellos, tipografía del HUD. */
export const BONE = 0xe8e4da;

/**
 * La lista completa. Un test verifica que ningún módulo de render use un color
 * que no esté acá dentro — es el mecanismo que hace cumplir la regla en vez de
 * confiar en la disciplina.
 */
export const CLOSED_PALETTE: readonly Hex[] = [
  INK,
  INK_SOFT,
  ASPHALT_DEEP,
  ASPHALT,
  ASPHALT_LIT,
  PAVEMENT,
  PAVEMENT_LIT,
  SODIUM_CORE,
  SODIUM,
  SODIUM_DEEP,
  MUSTARD,
  MUSTARD_LIT,
  MUSTARD_DARK,
  NEON_TEAL,
  NEON_MAGENTA,
  SKIN,
  SKIN_LIT,
  SKIN_SHADE,
  CLOTH_BLUE,
  CLOTH_BLUE_LIT,
  CLOTH_GREY,
  CLOTH_GREY_LIT,
  CLOTH_OLIVE,
  CLOTH_OLIVE_LIT,
  DANGER,
  DANGER_LIT,
  BONE,
];

export function isInPalette(color: Hex): boolean {
  return CLOSED_PALETTE.includes(color);
}

export function toCss(color: Hex): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/**
 * Cada tono base con su versión iluminada y su versión en sombra. El renderer
 * elige la variante según la dirección de luz declarada en la biblia de arte,
 * en vez de multiplicar el color por un factor arbitrario: así la luz se ve
 * autorada y no calculada.
 */
export interface ToneRamp {
  lit: Hex;
  base: Hex;
  shade: Hex;
}

export const RAMPS = {
  skin: { lit: SKIN_LIT, base: SKIN, shade: SKIN_SHADE },
  mustard: { lit: MUSTARD_LIT, base: MUSTARD, shade: MUSTARD_DARK },
  clothBlue: { lit: CLOTH_BLUE_LIT, base: CLOTH_BLUE, shade: INK_SOFT },
  clothGrey: { lit: CLOTH_GREY_LIT, base: CLOTH_GREY, shade: INK_SOFT },
  clothOlive: { lit: CLOTH_OLIVE_LIT, base: CLOTH_OLIVE, shade: INK_SOFT },
  asphalt: { lit: ASPHALT_LIT, base: ASPHALT, shade: ASPHALT_DEEP },
  pavement: { lit: PAVEMENT_LIT, base: PAVEMENT, shade: ASPHALT },
  sodium: { lit: SODIUM_CORE, base: SODIUM, shade: SODIUM_DEEP },
  danger: { lit: DANGER_LIT, base: DANGER, shade: INK_SOFT },
} as const satisfies Record<string, ToneRamp>;

export type RampName = keyof typeof RAMPS;
