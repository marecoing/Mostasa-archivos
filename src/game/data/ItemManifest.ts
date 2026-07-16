/**
 * Item manifest — weapons, pickups and rewards.
 * Sourced from the uploaded drop + asset-manifest.json. Single-frame
 * sprites served from public/assets/{weapons,pickups,rewards}/.
 *
 * Gameplay values (weapon damage, pickup effect) come from the manifest
 * and the Biblia Maestra §13.
 */

export type PickupEffect = 'health' | 'energy' | 'rage' | 'money' | 'collectible' | 'key_item';

export interface WeaponDef {
  id: string;
  path: string;
  displayName: string;
  damage: number;
  /** number of hits before the weapon breaks (Biblia §13) */
  durability: number;
}

export interface PickupDef {
  id: string;
  path: string;
  displayName: string;
  effect: PickupEffect;
  /** magnitude of the effect (hp/bronca restored, points, …) */
  amount: number;
}

export const WEAPONS: Record<string, WeaponDef> = {
  palo_escoba:    { id: 'palo_escoba',    path: 'assets/weapons/palo_escoba.png',    displayName: 'Palo de Escoba',  damage: 8,  durability: 8 },
  tubo_metalico:  { id: 'tubo_metalico',  path: 'assets/weapons/tubo_metalico.png',  displayName: 'Tubo Metálico',   damage: 12, durability: 8 },
  cadena_oxidada: { id: 'cadena_oxidada', path: 'assets/weapons/cadena_oxidada.png', displayName: 'Cadena Oxidada',  damage: 10, durability: 8 },
  llave_inglesa:  { id: 'llave_inglesa',  path: 'assets/weapons/llave_inglesa.png',  displayName: 'Llave Inglesa',   damage: 14, durability: 5 },
  paraguas_roto:  { id: 'paraguas_roto',  path: 'assets/weapons/paraguas_roto.png',  displayName: 'Paraguas Roto',   damage: 6,  durability: 5 },
  tapa_tacho:     { id: 'tapa_tacho',     path: 'assets/weapons/tapa_tacho.png',     displayName: 'Tapa de Tacho',   damage: 7,  durability: 8 },
  maletin_pesado: { id: 'maletin_pesado', path: 'assets/weapons/maletin_pesado.png', displayName: 'Maletín Pesado',  damage: 9,  durability: 8 },
  botella_vidrio: { id: 'botella_vidrio', path: 'assets/weapons/botella_vidrio.png', displayName: 'Botella',         damage: 8,  durability: 3 },
  silla_plastico: { id: 'silla_plastico', path: 'assets/weapons/silla_plastico.png', displayName: 'Silla',           damage: 10, durability: 5 },
  cajon_verdura:  { id: 'cajon_verdura',  path: 'assets/weapons/cajon_verdura.png',  displayName: 'Cajón de Verdura', damage: 11, durability: 5 },
};

export const PICKUPS: Record<string, PickupDef> = {
  mate_curativo:      { id: 'mate_curativo',      path: 'assets/pickups/mate_curativo.png',      displayName: 'Mate',       effect: 'health', amount: 15 },
  termo_salvador:     { id: 'termo_salvador',     path: 'assets/pickups/termo_salvador.png',     displayName: 'Termo',      effect: 'health', amount: 20 },
  empanada_rotiseria: { id: 'empanada_rotiseria', path: 'assets/pickups/empanada_rotiseria.png', displayName: 'Empanada',   effect: 'health', amount: 18 },
  choripan_callejero: { id: 'choripan_callejero', path: 'assets/pickups/choripan_callejero.png', displayName: 'Choripán',   effect: 'health', amount: 25 },
  pizza_slice_ficticia:{ id: 'pizza_slice_ficticia', path: 'assets/pickups/pizza_slice_ficticia.png', displayName: 'Pizza', effect: 'health', amount: 22 },
  botiquin_once:      { id: 'botiquin_once',      path: 'assets/pickups/botiquin_once.png',      displayName: 'Botiquín',   effect: 'health', amount: 40 },
  cafe_quemado:       { id: 'cafe_quemado',       path: 'assets/pickups/cafe_quemado.png',       displayName: 'Café',       effect: 'energy', amount: 20 },
  gaseosa_ficticia:   { id: 'gaseosa_ficticia',   path: 'assets/pickups/gaseosa_ficticia.png',   displayName: 'Gaseosa',    effect: 'energy', amount: 15 },
  alfajor_generico:   { id: 'alfajor_generico',   path: 'assets/pickups/alfajor_generico.png',   displayName: 'Alfajor',    effect: 'energy', amount: 18 },
  blister_misterioso: { id: 'blister_misterioso', path: 'assets/pickups/blister_misterioso.png', displayName: 'Blíster',    effect: 'energy', amount: 25 },
  bronca_embotellada: { id: 'bronca_embotellada', path: 'assets/pickups/bronca_embotellada.png', displayName: 'Bronca Embotellada', effect: 'rage', amount: 40 },
};

export const REWARDS: Record<string, PickupDef> = {
  monedas_sueltas:         { id: 'monedas_sueltas',         path: 'assets/rewards/monedas_sueltas.png',         displayName: 'Monedas',          effect: 'money',       amount: 25 },
  fajo_billetes_ficticios: { id: 'fajo_billetes_ficticios', path: 'assets/rewards/fajo_billetes_ficticios.png', displayName: 'Fajo de Billetes', effect: 'money',       amount: 100 },
  pendrive_comun:          { id: 'pendrive_comun',          path: 'assets/rewards/pendrive_comun.png',          displayName: 'Pendrive',         effect: 'collectible', amount: 1 },
  pendrive_federal:        { id: 'pendrive_federal',        path: 'assets/rewards/pendrive_federal.png',        displayName: 'Pendrive Federal', effect: 'key_item',    amount: 1 },
  pendrive_bitcoin:        { id: 'pendrive_bitcoin',        path: 'assets/rewards/pendrive_bitcoin.png',        displayName: 'Pendrive Bitcoin', effect: 'collectible', amount: 1 },
};

export const WEAPON_LIST: WeaponDef[] = Object.values(WEAPONS);
export const PICKUP_LIST: PickupDef[] = Object.values(PICKUPS);
export const REWARD_LIST: PickupDef[] = Object.values(REWARDS);

/** All droppable consumables (pickups + rewards) keyed by id. */
export const DROPPABLES: Record<string, PickupDef> = { ...PICKUPS, ...REWARDS };
