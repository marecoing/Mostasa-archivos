/**
 * CONTORNOS DEL CUERPO — Fase 1, segunda pasada.
 *
 * La primera pasada dibujaba el personaje con cápsulas y círculos sobre los
 * huesos. Eso no es arte: es andamiaje. Un miembro real no es un tubo de ancho
 * constante — tiene deltoides, tiene pantorrilla, tiene muñeca.
 *
 * Acá cada parte del cuerpo es una SILUETA AUTORADA a mano, en metros, y el
 * esqueleto sólo la transporta y la orienta. Es el mismo principio de la
 * animación de recorte profesional: se dibuja el personaje una vez, bien, y
 * después se lo mueve. El rig sigue garantizando que el volumen no cambie
 * entre cuadros (R-2), pero ahora lo que se mueve es un dibujo y no un tubo.
 *
 * Sistema de coordenadas de los miembros:
 *   v = posición a lo largo del hueso, 0 en la articulación padre, 1 en la hija
 *   u = desplazamiento lateral en metros, positivo hacia el frente del personaje
 *
 * Sistema de coordenadas de la cabeza: unidades de radio de cabeza, x hacia
 * adelante, y hacia arriba.
 */

export interface UV {
  u: number;
  v: number;
}

export interface XY {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Brazos
// ---------------------------------------------------------------------------

/** Brazo, hombro a codo. Ancho en el deltoides, afinado hacia el codo. */
export const UPPER_ARM: readonly UV[] = [
  { u: 0.086, v: -0.06 },
  { u: 0.092, v: 0.12 },
  { u: 0.074, v: 0.42 },
  { u: 0.06, v: 0.74 },
  { u: 0.054, v: 1.0 },
  { u: -0.05, v: 1.03 },
  { u: -0.058, v: 0.72 },
  { u: -0.07, v: 0.4 },
  { u: -0.088, v: 0.1 },
  { u: -0.09, v: -0.06 },
];

/** Antebrazo, codo a muñeca. Panza del braquiorradial arriba, muñeca fina. */
export const FOREARM: readonly UV[] = [
  { u: 0.056, v: -0.02 },
  { u: 0.066, v: 0.16 },
  { u: 0.056, v: 0.46 },
  { u: 0.042, v: 0.8 },
  { u: 0.036, v: 1.0 },
  { u: -0.034, v: 1.0 },
  { u: -0.04, v: 0.78 },
  { u: -0.052, v: 0.44 },
  { u: -0.062, v: 0.14 },
  { u: -0.058, v: -0.02 },
];

/**
 * Mano cerrada en puño, con el pulgar cruzado por delante. Un puño se lee
 * mucho mejor que una mano abierta en un juego de peleas, y además es la pose
 * correcta la mayor parte del tiempo.
 */
export const FIST: readonly UV[] = [
  { u: 0.05, v: 0.0 },
  { u: 0.078, v: 0.24 },
  { u: 0.086, v: 0.52 },
  { u: 0.07, v: 0.82 },
  { u: 0.03, v: 1.0 },
  { u: -0.03, v: 1.0 },
  { u: -0.066, v: 0.8 },
  { u: -0.076, v: 0.5 },
  { u: -0.062, v: 0.2 },
  { u: -0.05, v: 0.0 },
];

/** Nudillos: marca interna que le da lectura al puño sin dibujar dedos. */
export const KNUCKLES: readonly UV[] = [
  { u: 0.062, v: 0.62 },
  { u: 0.05, v: 0.86 },
  { u: -0.03, v: 0.88 },
  { u: -0.046, v: 0.64 },
];

/** Puño de la manga, que corta el brazo antes de la mano. */
export const CUFF: readonly UV[] = [
  { u: 0.05, v: 0.86 },
  { u: 0.056, v: 1.06 },
  { u: -0.05, v: 1.06 },
  { u: -0.056, v: 0.86 },
];

// ---------------------------------------------------------------------------
// Piernas
// ---------------------------------------------------------------------------

/** Muslo, cadera a rodilla. Grueso arriba, con la rodilla marcada abajo. */
export const THIGH: readonly UV[] = [
  { u: 0.105, v: -0.1 },
  { u: 0.112, v: 0.14 },
  { u: 0.098, v: 0.48 },
  { u: 0.082, v: 0.82 },
  { u: 0.076, v: 1.02 },
  { u: -0.072, v: 1.02 },
  { u: -0.082, v: 0.78 },
  { u: -0.098, v: 0.42 },
  { u: -0.11, v: 0.12 },
  { u: -0.108, v: -0.1 },
];

/** Pantorrilla, rodilla a tobillo. El gemelo va atrás, en el lado -u. */
export const CALF: readonly UV[] = [
  { u: 0.072, v: -0.02 },
  { u: 0.066, v: 0.24 },
  { u: 0.05, v: 0.6 },
  { u: 0.042, v: 0.9 },
  { u: 0.04, v: 1.0 },
  { u: -0.04, v: 1.0 },
  { u: -0.05, v: 0.88 },
  { u: -0.062, v: 0.62 },
  { u: -0.094, v: 0.26 },
  { u: -0.082, v: 0.02 },
];

/**
 * Borceguí. Se dibuja en el marco del pie — v de 0 en el tobillo a 1 en la
 * punta — y baja hasta la planta, que apoya en el piso.
 */
export const BOOT: readonly XY[] = [
  { x: -0.085, y: 0.16 },
  { x: -0.095, y: 0.02 },
  { x: -0.09, y: -0.075 },
  { x: 0.02, y: -0.09 },
  { x: 0.15, y: -0.088 },
  { x: 0.185, y: -0.05 },
  { x: 0.175, y: 0.02 },
  { x: 0.1, y: 0.07 },
  { x: 0.03, y: 0.11 },
  { x: 0.0, y: 0.17 },
];

/** Suela: banda oscura que apoya en el piso y separa el pie del asfalto. */
export const SOLE: readonly XY[] = [
  { x: -0.092, y: -0.045 },
  { x: -0.09, y: -0.09 },
  { x: 0.02, y: -0.095 },
  { x: 0.152, y: -0.09 },
  { x: 0.186, y: -0.05 },
  { x: 0.17, y: -0.032 },
  { x: 0.02, y: -0.04 },
];

// ---------------------------------------------------------------------------
// Torso
// ---------------------------------------------------------------------------

/**
 * Campera. Marco pelvis→pecho: v = 0 en la pelvis, 1 en la línea de hombros.
 * Baja hasta v = -0.4 porque la campera cubre la cadera, y se abre en los
 * hombros. Es más angosta que la línea de hombros a propósito: si el torso
 * tapa el brazo lejano, el personaje se ve con un solo brazo.
 */
export const JACKET: readonly UV[] = [
  { u: 0.135, v: -0.42 },
  { u: 0.155, v: -0.18 },
  { u: 0.152, v: 0.16 },
  { u: 0.158, v: 0.56 },
  { u: 0.152, v: 0.86 },
  { u: 0.118, v: 1.0 },
  { u: 0.05, v: 1.02 },
  { u: -0.05, v: 1.02 },
  { u: -0.12, v: 1.0 },
  { u: -0.155, v: 0.86 },
  { u: -0.16, v: 0.56 },
  { u: -0.156, v: 0.16 },
  { u: -0.158, v: -0.18 },
  { u: -0.138, v: -0.42 },
];

/** Solapa y cierre: la línea vertical que parte la campera y le da volumen. */
export const LAPEL: readonly UV[] = [
  { u: 0.052, v: 1.02 },
  { u: 0.086, v: 0.78 },
  { u: 0.076, v: 0.34 },
  { u: 0.07, v: -0.32 },
  { u: 0.016, v: -0.36 },
  { u: 0.022, v: 0.34 },
  { u: 0.03, v: 0.8 },
];

/** Plano iluminado de la campera, del lado de la llave de luz. */
export const JACKET_LIGHT: readonly UV[] = [
  { u: -0.062, v: 1.0 },
  { u: -0.15, v: 0.86 },
  { u: -0.14, v: 0.5 },
  { u: -0.128, v: 0.06 },
  { u: -0.13, v: -0.36 },
  { u: -0.07, v: -0.38 },
  { u: -0.066, v: 0.3 },
];

/** Remera bajo la campera: asoma en el cuello. */
export const COLLAR: readonly UV[] = [
  { u: 0.062, v: 0.98 },
  { u: 0.05, v: 1.12 },
  { u: -0.05, v: 1.12 },
  { u: -0.062, v: 0.98 },
];

// ---------------------------------------------------------------------------
// Cabeza
// ---------------------------------------------------------------------------

/**
 * Cráneo, mandíbula, mentón y nariz, en unidades de radio de cabeza. Ésta es
 * la diferencia entre un personaje y una pelota con pelo: la cara tiene perfil.
 */
export const HEAD: readonly XY[] = [
  { x: 0.12, y: 1.0 },
  { x: 0.56, y: 0.86 },
  { x: 0.82, y: 0.54 },
  { x: 0.86, y: 0.18 },
  { x: 0.8, y: 0.04 },
  { x: 1.02, y: -0.06 },
  { x: 0.86, y: -0.2 },
  { x: 0.84, y: -0.34 },
  { x: 0.72, y: -0.62 },
  { x: 0.44, y: -0.86 },
  { x: 0.06, y: -0.94 },
  { x: -0.36, y: -0.84 },
  { x: -0.68, y: -0.54 },
  { x: -0.86, y: -0.1 },
  { x: -0.84, y: 0.44 },
  { x: -0.6, y: 0.82 },
  { x: -0.24, y: 1.0 },
];

/** Media luz sobre la frente y el pómulo, del lado de la llave. */
export const HEAD_LIGHT: readonly XY[] = [
  { x: 0.06, y: 0.98 },
  { x: -0.3, y: 0.94 },
  { x: -0.62, y: 0.72 },
  { x: -0.8, y: 0.3 },
  { x: -0.76, y: -0.16 },
  { x: -0.5, y: -0.6 },
  { x: -0.34, y: -0.3 },
  { x: -0.3, y: 0.3 },
  { x: -0.1, y: 0.72 },
];

/**
 * Pelo peinado hacia atrás, con entradas. Deja la frente y la cara libres —
 * un casquete que tapa toda la cabeza convierte al personaje en una bola.
 */
export const HAIR: readonly XY[] = [
  { x: 0.6, y: 0.62 },
  { x: 0.5, y: 0.95 },
  { x: 0.05, y: 1.14 },
  { x: -0.5, y: 1.06 },
  { x: -0.92, y: 0.7 },
  { x: -1.08, y: 0.2 },
  { x: -1.02, y: -0.3 },
  { x: -0.86, y: -0.24 },
  { x: -0.9, y: 0.2 },
  { x: -0.76, y: 0.62 },
  { x: -0.42, y: 0.9 },
  { x: 0.02, y: 0.98 },
  { x: 0.4, y: 0.82 },
  { x: 0.52, y: 0.6 },
];

/** Patilla: baja delante de la oreja y le da edad al personaje. */
export const SIDEBURN: readonly XY[] = [
  { x: -0.16, y: 0.66 },
  { x: 0.04, y: 0.6 },
  { x: 0.02, y: 0.1 },
  { x: -0.18, y: 0.14 },
];

/** Oreja. */
export const EAR: readonly XY[] = [
  { x: -0.22, y: 0.24 },
  { x: -0.06, y: 0.2 },
  { x: -0.04, y: -0.12 },
  { x: -0.24, y: -0.16 },
];

/** Ceja. Un solo trazo, pero es lo que le da expresión a la cara. */
export const BROW: readonly XY[] = [
  { x: 0.4, y: 0.44 },
  { x: 0.76, y: 0.32 },
  { x: 0.78, y: 0.22 },
  { x: 0.4, y: 0.3 },
];

/** Ojo, bajo la ceja. */
export const EYE: readonly XY[] = [
  { x: 0.48, y: 0.2 },
  { x: 0.68, y: 0.14 },
  { x: 0.66, y: 0.02 },
  { x: 0.48, y: 0.08 },
];

/** El bigote de Mostasa. Es la firma del personaje. */
export const MOUSTACHE: readonly XY[] = [
  { x: 0.34, y: -0.28 },
  { x: 0.66, y: -0.22 },
  { x: 0.8, y: -0.26 },
  { x: 0.76, y: -0.38 },
  { x: 0.6, y: -0.4 },
  { x: 0.34, y: -0.4 },
];

/** Sombra bajo el mentón: separa la cabeza del cuello. */
export const JAW_SHADOW: readonly XY[] = [
  { x: 0.62, y: -0.68 },
  { x: 0.3, y: -0.9 },
  { x: -0.1, y: -0.96 },
  { x: -0.12, y: -0.78 },
  { x: 0.28, y: -0.72 },
];

/** Cuello. Marco pecho→cuello, como los miembros. */
export const NECK: readonly UV[] = [
  { u: 0.07, v: -0.1 },
  { u: 0.062, v: 0.6 },
  { u: 0.058, v: 1.1 },
  { u: -0.062, v: 1.1 },
  { u: -0.07, v: 0.6 },
  { u: -0.076, v: -0.1 },
];
