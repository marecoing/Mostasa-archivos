import Phaser from 'phaser';
import { INPUT_ACTIONS, makeEmptySnapshot } from './InputActions';
import type { InputAction, ActionState, InputSnapshot } from './InputActions';
import {
  DEFAULT_GAMEPAD_BINDINGS,
  loadKeyboardBindings,
  saveKeyboardBindings,
  resetKeyboardBindings,
} from './InputBindings';
import type { KeyboardBindings, KeyCode, GamepadBinding } from './InputBindings';

type KeyMap = Map<InputAction, Phaser.Input.Keyboard.Key[]>;

export class InputManager {
  private keyboardPlugin: Phaser.Input.Keyboard.KeyboardPlugin | null;
  private gamepadPlugin: Phaser.Input.Gamepad.GamepadPlugin | null;
  private keyMap: KeyMap = new Map();
  private bindings: KeyboardBindings;
  private prevSnapshot: InputSnapshot = makeEmptySnapshot();
  private currentSnapshot: InputSnapshot = makeEmptySnapshot();
  private gamepadConnected = false;

  constructor(scene: Phaser.Scene) {
    this.keyboardPlugin = scene.input.keyboard ?? null;
    this.gamepadPlugin = scene.input.gamepad ?? null;
    this.bindings = loadKeyboardBindings();
    this.buildKeyMap();
    this.setupGamepadEvents();
  }

  private buildKeyMap(): void {
    this.keyMap.clear();
    if (!this.keyboardPlugin) return;

    const existing = new Map<KeyCode, Phaser.Input.Keyboard.Key>();

    for (const action of Object.values(INPUT_ACTIONS) as InputAction[]) {
      const codes = this.bindings[action] ?? [];
      const keys: Phaser.Input.Keyboard.Key[] = [];

      for (const code of codes) {
        if (!existing.has(code)) {
          existing.set(code, this.keyboardPlugin.addKey(code));
        }
        const key = existing.get(code);
        if (key) keys.push(key);
      }

      this.keyMap.set(action, keys);
    }
  }

  private setupGamepadEvents(): void {
    if (!this.gamepadPlugin) return;

    this.gamepadPlugin.on('connected', () => {
      this.gamepadConnected = true;
    });

    this.gamepadPlugin.on('disconnected', () => {
      if (!this.gamepadPlugin || this.gamepadPlugin.total === 0) {
        this.gamepadConnected = false;
      }
    });
  }

  update(): void {
    this.prevSnapshot = this.currentSnapshot;
    const next: Record<string, ActionState> = {};

    for (const action of Object.values(INPUT_ACTIONS) as InputAction[]) {
      const heldNow = this.isActionHeldRaw(action);
      const wasHeld = this.prevSnapshot[action]?.held ?? false;

      next[action] = {
        held: heldNow,
        justPressed: heldNow && !wasHeld,
        justReleased: !heldNow && wasHeld,
      };
    }

    this.currentSnapshot = next as InputSnapshot;
  }

  private isActionHeldRaw(action: InputAction): boolean {
    if (this.isKeyboardActionHeld(action)) return true;
    if (this.gamepadConnected && this.isGamepadActionHeld(action)) return true;
    return false;
  }

  private isKeyboardActionHeld(action: InputAction): boolean {
    const keys = this.keyMap.get(action);
    if (!keys) return false;
    return keys.some((k) => k.isDown);
  }

  private isGamepadActionHeld(action: InputAction): boolean {
    const pad = this.gamepadPlugin?.getPad(0);
    if (!pad) return false;

    const binding: GamepadBinding = DEFAULT_GAMEPAD_BINDINGS[action] ?? {};

    if (binding.named) {
      const name = binding.named;
      const threshold = binding.axisThreshold ?? 0.3;

      if (name === 'left' || name === 'right' || name === 'up' || name === 'down') {
        if (pad[name]) return true;
      }

      if (name === 'A') return pad.A;
      if (name === 'B') return pad.B;
      if (name === 'X') return pad.X;
      if (name === 'Y') return pad.Y;
      if (name === 'L1') return !!pad.L1;
      if (name === 'L2') return !!pad.L2;
      if (name === 'R1') return !!pad.R1;
      if (name === 'R2') return !!pad.R2;

      if (name === 'up') return pad.up || pad.leftStick.y < -threshold;
      if (name === 'down') return pad.down || pad.leftStick.y > threshold;
      if (name === 'left') return pad.left || pad.leftStick.x < -threshold;
      if (name === 'right') return pad.right || pad.leftStick.x > threshold;
    }

    if (binding.axisPositive !== undefined) {
      const threshold = binding.axisThreshold ?? 0.3;
      const axis = pad.axes[binding.axisPositive];
      if (axis && axis.getValue() > threshold) return true;
    }

    if (binding.axisNegative !== undefined) {
      const threshold = binding.axisThreshold ?? 0.3;
      const axis = pad.axes[binding.axisNegative];
      if (axis && axis.getValue() < -threshold) return true;
    }

    if (binding.buttons) {
      for (const btnIdx of binding.buttons) {
        const btn = pad.buttons[btnIdx];
        if (btn?.pressed) return true;
      }
    }

    return false;
  }

  getSnapshot(): InputSnapshot {
    return this.currentSnapshot;
  }

  isHeld(action: InputAction): boolean {
    return this.currentSnapshot[action]?.held ?? false;
  }

  justPressed(action: InputAction): boolean {
    return this.currentSnapshot[action]?.justPressed ?? false;
  }

  justReleased(action: InputAction): boolean {
    return this.currentSnapshot[action]?.justReleased ?? false;
  }

  get isGamepadActive(): boolean {
    return this.gamepadConnected;
  }

  remapKey(action: InputAction, keyCodes: KeyCode[]): void {
    this.bindings[action] = keyCodes;
    saveKeyboardBindings(this.bindings);
    this.buildKeyMap();
  }

  resetBindings(): void {
    this.bindings = resetKeyboardBindings();
    this.buildKeyMap();
  }

  getKeyCodesFor(action: InputAction): KeyCode[] {
    return [...(this.bindings[action] ?? [])];
  }

  destroy(): void {
    this.keyMap.clear();
  }
}
