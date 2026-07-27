/**
 * ESCALA REAL DE TODO LO QUE SE VE EN PANTALLA.
 *
 * Ésta es la aplicación de la biblia de arte al juego que ya existe, y es la
 * respuesta directa a "los objetos son demasiado grandes comparados con los
 * personajes" y "las escalas de los personajes son estúpidas".
 *
 * Hasta acá, cada objeto tenía una altura en píxeles elegida a ojo. Un cajón
 * de verdulería estaba declarado en 105 px, o sea 0.70 m: el doble de un cajón
 * real. Un banco de andén en 0.67 m cuando un banco mide 0.85. Nadie podía
 * detectarlo porque no había contra qué comparar.
 *
 * Acá cada cosa se declara en METROS, que es un número que se puede discutir
 * mirando la calle, y la altura en píxeles sale de multiplicar por la escala
 * del mundo. Si mañana cambia la resolución del juego, cambia un solo número.
 */

import { HERO_HEIGHT_M, PIXELS_PER_METRE } from './ArtBible';

/**
 * Altura real, en metros, de cada objeto decorativo del juego.
 *
 * Los valores son los de la cosa real, no los que "quedaban lindos". Cuando
 * un asset representa un conjunto (un poste con su farol, una persiana con su
 * marco) se declara la altura del conjunto.
 */
export const SCENERY_HEIGHT_M = {
  cableado_colgante: 0.9,
  persiana_metalica: 2.6,
  cartel_generico_local: 0.85,
  reja_seguridad: 2.4,
  posteres_rotos: 1.1,
  cartel_anden_ilegible: 0.9,
  farol_estacion: 2.1,
  bolsa_basura: 0.55,
  bicicleta_reparto: 1.05,
  banco_anden: 0.85,
  molinete_generico: 1.2,
  valija_vieja: 0.5,
  carrito_carga: 1.15,
  carrito_expedientes: 1.0,
  carpeta_oficina: 0.32,
  maletin_papeles: 0.4,
  sello_administrativo: 0.11,
  atril_ficticio: 1.15,
} as const;

/**
 * Altura real, en metros, de cada arma agarrable, apoyada en el piso.
 *
 * Un caño de 0.82 m no puede dibujarse a 135 px (0.9 m) y una silla de plástico
 * no puede medir lo mismo que un caño. Estos números son los que hacen que
 * "los objetos que agarra el personaje" tengan sentido.
 */
export const WEAPON_HEIGHT_M = {
  palo_escoba: 1.2,
  tubo_metalico: 0.82,
  cadena_oxidada: 0.6,
  llave_inglesa: 0.38,
  paraguas_roto: 0.9,
  tapa_tacho: 0.46,
  maletin_pesado: 0.45,
  botella_vidrio: 0.28,
  silla_plastico: 0.82,
  cajon_verdura: 0.34,
} as const;

/**
 * Altura real, en metros, de los consumibles. Son objetos de mano: un mate
 * mide 12 cm, no 52 px (35 cm). Cuando un pickup se ve del tamaño de un
 * cajón, el jugador deja de creer en la escala del mundo entero.
 */
export const PICKUP_HEIGHT_M = {
  mate_curativo: 0.13,
  termo_salvador: 0.34,
  empanada_rotiseria: 0.09,
  choripan_callejero: 0.11,
  pizza_slice_ficticia: 0.1,
  botiquin_once: 0.22,
  cafe_quemado: 0.14,
  gaseosa_ficticia: 0.25,
  alfajor_generico: 0.07,
  blister_misterioso: 0.09,
  bronca_embotellada: 0.26,
  monedas_sueltas: 0.05,
  fajo_billetes_ficticios: 0.08,
  pendrive_comun: 0.06,
  pendrive_federal: 0.06,
  pendrive_bitcoin: 0.06,
} as const;

/**
 * Altura real, en metros, de los objetos rompibles. Un cajón de verdulería
 * mide 34 cm mida lo que mida su PNG, y un puesto de diarios le pasa la cabeza
 * a Mostasa.
 */
export const BREAKABLE_HEIGHT_M = {
  cajon_rompible: 0.34,
  tacho_basura_rompible: 0.9,
  puesto_diarios_ficticio: 2.1,
  vidriera_rota: 2.4,
  cono_transito: 0.7,
  barril_plastico: 0.88,
} as const;

export type SceneryId = keyof typeof SCENERY_HEIGHT_M;
export type BreakableId = keyof typeof BREAKABLE_HEIGHT_M;
export type WeaponId = keyof typeof WEAPON_HEIGHT_M;
export type PickupId = keyof typeof PICKUP_HEIGHT_M;

/** Altura en pantalla, en píxeles, de cualquier cosa declarada en metros. */
export function screenHeightPx(heightM: number): number {
  return heightM * PIXELS_PER_METRE;
}

/**
 * Altura declarada de un asset, en metros, buscando en las tres tablas.
 * Devuelve `null` si el asset no está declarado, para que el test lo cace.
 */
export function declaredHeightM(id: string): number | null {
  const tables: readonly Record<string, number>[] = [
    SCENERY_HEIGHT_M,
    WEAPON_HEIGHT_M,
    PICKUP_HEIGHT_M,
    BREAKABLE_HEIGHT_M,
  ];
  for (const table of tables) {
    const h = table[id];
    if (h !== undefined) return h;
  }
  return null;
}

/**
 * Altura en pantalla de un asset declarado. Si no está declarado devuelve el
 * valor que traía de antes, para que agregar un asset nuevo no rompa el juego
 * mientras se le mide la altura.
 */
export function targetHeightPxFor(id: string, fallbackPx: number): number {
  const m = declaredHeightM(id);
  return m === null ? fallbackPx : screenHeightPx(m);
}

/**
 * Cuánto mide un objeto comparado con Mostasa. Sirve para leer de un vistazo
 * si una altura declarada es creíble: 0.5 es "le llega a la cadera", 1.0 es
 * "lo mira a los ojos".
 */
export function fractionOfHero(heightM: number): number {
  return heightM / HERO_HEIGHT_M;
}
