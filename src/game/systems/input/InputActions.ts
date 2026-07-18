export const INPUT_ACTIONS = {
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
  MOVE_UP: 'move_up',
  MOVE_DOWN: 'move_down',
  JUMP: 'jump',
  RUN: 'run',
  LIGHT_ATTACK: 'light_attack',
  HEAVY_ATTACK: 'heavy_attack',
  SPECIAL: 'special',
  GRAB: 'grab',
  DODGE: 'dodge',
  PAUSE: 'pause',
  CONFIRM: 'confirm',
  CANCEL: 'cancel',
  DEBUG_TOGGLE: 'debug_toggle',
  DEBUG_HITBOX: 'debug_hitbox',
  DEBUG_SPAWN_GRUNT: 'debug_spawn_grunt',
  DEBUG_SPAWN_SPEEDSTER: 'debug_spawn_speedster',
  DEBUG_SPAWN_TANK: 'debug_spawn_tank',
  DEBUG_SPAWN_ZONER: 'debug_spawn_zoner',
  DEBUG_SPAWN_MINIBOSS: 'debug_spawn_miniboss',
  DEBUG_KILL_ENEMIES: 'debug_kill_enemies',
  DEBUG_FILL_BRONCA: 'debug_fill_bronca',
  DEBUG_ADVANCE_WAVE: 'debug_advance_wave',
} as const;

export type InputAction = (typeof INPUT_ACTIONS)[keyof typeof INPUT_ACTIONS];

export interface ActionState {
  held: boolean;
  justPressed: boolean;
  justReleased: boolean;
}

export type InputSnapshot = Readonly<Record<InputAction, ActionState>>;

export function makeEmptySnapshot(): InputSnapshot {
  const snap: Record<string, ActionState> = {};
  for (const key of Object.values(INPUT_ACTIONS)) {
    snap[key] = { held: false, justPressed: false, justReleased: false };
  }
  return snap as InputSnapshot;
}
