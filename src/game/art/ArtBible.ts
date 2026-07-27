/**
 * BIBLIA TÉCNICA DE ARTE — Fase 0 de la reconstrucción.
 *
 * Este archivo es la ÚNICA fuente de verdad de la escala del mundo. Es la
 * respuesta directa a la causa de raíz R-3: hasta ahora cada familia de assets
 * se autoró a un tamaño arbitrario y el tamaño final salía de multiplicadores
 * encadenados. A partir de acá todo se deriva de `PIXELS_PER_METRE` y de la
 * altura del héroe; nada se "ajusta a ojo".
 *
 * Regla que no se rompe: si un número describe el tamaño, la proporción o la
 * luz de algo que se ve en pantalla, se declara acá y se importa. Ningún
 * módulo de render puede inventar una constante de escala propia.
 */

// ---------------------------------------------------------------------------
// 1. Escala de mundo
// ---------------------------------------------------------------------------

/**
 * Conversión fundamental. Una unidad de mundo es un píxel a escala 1:1 en el
 * eje X (ver `worldToScreen` en Physics25D), así que definir píxeles por metro
 * define el metro para todo el juego.
 */
export const PIXELS_PER_METRE = 150;

/** Altura de Mostasa, de planta del pie a coronilla. Referencia de todo. */
export const HERO_HEIGHT_M = 1.76;

/** 264 px. Sustituye a PLAYER_TARGET_HEIGHT_PX, que era un valor elegido a ojo. */
export const HERO_HEIGHT_PX = HERO_HEIGHT_M * PIXELS_PER_METRE;

/** El viewport de 720 px equivale a 4.8 m de mundo en vertical. */
export const VIEWPORT_HEIGHT_M = 720 / PIXELS_PER_METRE;

/** El viewport de 1280 px equivale a 8.53 m de calle a lo ancho. */
export const VIEWPORT_WIDTH_M = 1280 / PIXELS_PER_METRE;

export function metres(m: number): number {
  return m * PIXELS_PER_METRE;
}

export function toMetres(px: number): number {
  return px / PIXELS_PER_METRE;
}

// ---------------------------------------------------------------------------
// 2. Cámara y profundidad
// ---------------------------------------------------------------------------

/**
 * Profundidad caminable, en metros. Con DEPTH_SCALE = 0.6 esto se proyecta a
 * 216 px de recorrido vertical en pantalla, que es la banda en la que un
 * brawler se lee bien: suficiente para esquivar en profundidad, no tanto como
 * para que el jugador pierda de vista al enemigo.
 */
export const WALKABLE_DEPTH_M = 2.4;

/** Altura del ojo de cámara sobre el piso. Fija el escorzo del suelo. */
export const CAMERA_HEIGHT_M = 1.9;

/**
 * La cámara mira levemente hacia abajo. No es una cámara libre: el escorzo del
 * piso ya está horneado en DEPTH_SCALE, y este número existe para que los
 * fondos se dibujen con el mismo horizonte que la proyección del gameplay.
 */
export const HORIZON_Y_PX = 214;

// ---------------------------------------------------------------------------
// 3. Proporciones del cuerpo
// ---------------------------------------------------------------------------

/**
 * Cabezas de altura. 6 es la proporción de brawler: más heroica que la
 * caricatura de 4, y con la cabeza lo bastante grande como para que la cara
 * se lea en pantalla, cosa que a 6.5 ya no pasaba. Todos los humanos del
 * juego usan esta proporción salvo excepciones declaradas.
 */
export const HEADS_TALL = 6.0;

export const HEAD_HEIGHT_M = HERO_HEIGHT_M / HEADS_TALL;

/**
 * Altura de personaje por rol, en metros. Sustituye a los multiplicadores por
 * familia que producían "los enemigos parecen enanos". Un enemigo común mide
 * lo mismo que el héroe porque en la calle la gente mide lo mismo.
 */
export const CHARACTER_HEIGHT_M = {
  hero: HERO_HEIGHT_M,
  grunt: 1.74,
  heavy: 1.92,
  runner: 1.68,
  miniBoss: 1.98,
  boss: 2.15,
} as const;

export type CharacterRole = keyof typeof CHARACTER_HEIGHT_M;

// ---------------------------------------------------------------------------
// 4. Escala de objetos
// ---------------------------------------------------------------------------

/**
 * Alturas reales, en metros, de todo lo que se apoya en la calle. Éste es el
 * antídoto directo contra "los objetos son demasiado grandes comparados con
 * los personajes": un tacho de basura mide 90 cm porque un tacho de basura
 * mide 90 cm, no porque un multiplicador lo dejó lindo.
 */
export const OBJECT_HEIGHT_M = {
  tacho_basura: 0.9,
  cajon_verduleria: 0.34,
  banco_plaza: 0.85,
  poste_luz: 4.6,
  telefono_publico: 1.35,
  puesto_diarios: 2.1,
  vidriera: 2.4,
  cono_obra: 0.7,
  neumatico: 0.62,
  bolsa_residuos: 0.55,
} as const;

/**
 * Longitudes de arma, en metros, medidas por el mango. Las armas se autoran
 * con un eje declarado y un punto de agarre; nunca se rotan "hasta que quede".
 */
export const WEAPON_LENGTH_M = {
  tubo_metalico: 0.82,
  palo_escoba: 1.2,
  llave_inglesa: 0.38,
  botella_vidrio: 0.28,
  paraguas_roto: 0.9,
} as const;

/**
 * Un objeto que el personaje levanta con una mano no puede superar este largo.
 * Regla de legibilidad: por encima de esto el arma tapa al personaje y el
 * jugador pierde la lectura del combate.
 */
export const MAX_ONE_HANDED_LENGTH_M = 1.25;

// ---------------------------------------------------------------------------
// 5. Luz
// ---------------------------------------------------------------------------

/**
 * Una sola dirección de luz para TODO el juego: personajes, props, fondos y
 * efectos. Ésta es la regla que mata R-1 — dos lenguajes visuales conviviendo
 * sólo es posible cuando cada uno trae su propia luz.
 *
 * La escena es Buenos Aires de noche bajo alumbrado de vapor de sodio: la
 * llave viene de arriba y de la izquierda de pantalla, cálida; el relleno es
 * frío y viene del cielo; el contraluz es el neón de los carteles, detrás y a
 * la derecha.
 */
export const KEY_LIGHT_AZIMUTH_DEG = -35;
export const KEY_LIGHT_ELEVATION_DEG = 62;
export const RIM_LIGHT_AZIMUTH_DEG = 145;

/** Cuánto oscurece la cara en sombra respecto del tono base. */
export const SHADE_STEP = 0.22;

/** Cuánto aclara la cara iluminada respecto del tono base. */
export const LIGHT_STEP = 0.14;

// ---------------------------------------------------------------------------
// 6. Silueta y contorno
// ---------------------------------------------------------------------------

/**
 * Grosor del contorno de tinta, en metros, para que escale con el mundo en vez
 * de engordar o adelgazar cuando algo se acerca o se aleja.
 */
export const OUTLINE_WIDTH_M = 0.022;

/** 3.3 px a escala 1:1. */
export const OUTLINE_WIDTH_PX = OUTLINE_WIDTH_M * PIXELS_PER_METRE;

/**
 * Reglas de silueta, verificables por test:
 * un personaje tiene que ser reconocible en negro puro sobre blanco.
 */
export const SILHOUETTE_RULES = {
  /** Fracción mínima del alto que ocupa el ancho de hombros: da presencia. */
  minShoulderRatio: 0.26,
  /** Ningún miembro puede ser más fino que esto o desaparece en movimiento. */
  minLimbWidthM: 0.07,
  /** Separación mínima entre miembro y torso para que la silueta no se funda. */
  minLimbGapM: 0.03,
} as const;

// ---------------------------------------------------------------------------
// 7. Animación
// ---------------------------------------------------------------------------

/**
 * Cuadros clave por acción. NO son imágenes: son poses del rig entre las que
 * el motor interpola. Ésta es la respuesta a R-2 — un rig no puede "hervir",
 * porque el volumen del cuerpo lo define el esqueleto y no cambia entre
 * cuadros.
 *
 * El conteo sigue la convención de animación 2D de acción: pocas claves, bien
 * espaciadas, con anticipación y descanso.
 */
export const KEYFRAMES_PER_ACTION = {
  idle: 4,
  walk: 8,
  run: 8,
  attack_1: 5,
  attack_2: 5,
  attack_3: 7,
  heavy: 8,
  jump: 5,
  dodge: 6,
  hurt: 4,
  knockdown: 6,
  getup: 6,
} as const;

/**
 * Frecuencia de pose. El render corre a 60 fps, pero las poses se muestrean a
 * 24 para que el movimiento tenga peso de animación dibujada y no de
 * interpolación de motor. Es una decisión estética deliberada.
 */
export const POSE_SAMPLE_HZ = 24;

/**
 * Cuadros de golpe congelado en el impacto. Es lo que hace que un golpe se
 * "sienta"; sin esto el combate parece que no conecta.
 */
export const HITSTOP_FRAMES = {
  light: 3,
  heavy: 6,
  special: 10,
} as const;
