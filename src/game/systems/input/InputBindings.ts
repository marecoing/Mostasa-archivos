import Phaser from 'phaser';
import type { InputAction } from './InputActions';

const KC = Phaser.Input.Keyboard.KeyCodes;

export type KeyCode = number;

export interface GamepadBinding {
  buttons?: number[];
  axisPositive?: number;
  axisNegative?: number;
  axisThreshold?: number;
  dpad?: 'up' | 'down' | 'left' | 'right';
  named?: 'A' | 'B' | 'X' | 'Y' | 'L1' | 'L2' | 'R1' | 'R2' | 'up' | 'down' | 'left' | 'right';
}

export type KeyboardBindings = Record<InputAction, KeyCode[]>;
export type GamepadBindings = Record<InputAction, GamepadBinding>;

export const DEFAULT_KEYBOARD_BINDINGS: KeyboardBindings = {
  move_left: [KC.LEFT, KC.A],
  move_right: [KC.RIGHT, KC.D],
  move_up: [KC.UP, KC.W],
  move_down: [KC.DOWN, KC.S],
  jump: [KC.SPACE],
  run: [KC.SHIFT],
  light_attack: [KC.J],
  heavy_attack: [KC.K],
  special: [KC.L],
  grab: [KC.I],
  pause: [KC.ESC],
  confirm: [KC.ENTER],
  cancel: [KC.ESC],
  debug_toggle: [KC.F1],
  debug_hitbox: [KC.F2],
  debug_spawn_grunt: [KC.F3],
  debug_spawn_speedster: [KC.F4],
  debug_spawn_tank: [KC.F5],
  debug_spawn_zoner: [KC.F6],
  debug_spawn_miniboss: [KC.F7],
  debug_kill_enemies: [KC.F8],
  debug_fill_bronca: [KC.F9],
  debug_advance_wave: [KC.F10],
};

export const DEFAULT_GAMEPAD_BINDINGS: GamepadBindings = {
  move_left: { named: 'left', axisNegative: 0, axisThreshold: 0.3 },
  move_right: { named: 'right', axisPositive: 0, axisThreshold: 0.3 },
  move_up: { named: 'up', axisNegative: 1, axisThreshold: 0.3 },
  move_down: { named: 'down', axisPositive: 1, axisThreshold: 0.3 },
  jump: { named: 'A' },
  run: { named: 'L2' },
  light_attack: { named: 'X' },
  heavy_attack: { named: 'Y' },
  special: { named: 'B' },
  grab: { named: 'R1' },
  pause: { buttons: [9] },
  confirm: { named: 'A' },
  cancel: { named: 'B' },
  debug_toggle: {},
  debug_hitbox: {},
  debug_spawn_grunt: {},
  debug_spawn_speedster: {},
  debug_spawn_tank: {},
  debug_spawn_zoner: {},
  debug_spawn_miniboss: {},
  debug_kill_enemies: {},
  debug_fill_bronca: {},
  debug_advance_wave: {},
};

const STORAGE_KEY = 'mostasa_keybindings_v1';

export function loadKeyboardBindings(): KeyboardBindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_KEYBOARD_BINDINGS };
    const parsed = JSON.parse(raw) as Partial<KeyboardBindings>;
    return { ...DEFAULT_KEYBOARD_BINDINGS, ...parsed };
  } catch {
    return { ...DEFAULT_KEYBOARD_BINDINGS };
  }
}

export function saveKeyboardBindings(bindings: KeyboardBindings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // Storage not available — fail silently
  }
}

export function resetKeyboardBindings(): KeyboardBindings {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  return { ...DEFAULT_KEYBOARD_BINDINGS };
}
