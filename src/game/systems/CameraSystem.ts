import type { StageLane } from '../core/Pushbox';

export interface CameraConfig {
  followLerpX: number;
  followLerpY: number;
  softPadLeft: number;
  softPadRight: number;
  stageMinX: number;
  stageMaxX: number;
  viewportW: number;
  viewportH: number;
}

export interface ShakeProfile {
  intensity: number;
  durationMs: number;
  decay: boolean;
}

interface ShakeState {
  intensity: number;
  remaining: number;
  decay: boolean;
  offsetX: number;
  offsetY: number;
}

export class CameraSystem {
  private x = 0;
  private y = 0;
  private targetX = 0;
  private shake: ShakeState | null = null;
  private locked = false;
  private lockMinX = 0;
  private lockMaxX = 0;
  private config: CameraConfig;

  constructor(config: CameraConfig) {
    this.config = config;
  }

  follow(entityX: number, _entityY: number): void {
    if (this.locked) return;

    const desiredX = entityX - this.config.softPadLeft;
    const maxX = this.config.stageMaxX - this.config.viewportW + this.config.softPadRight;
    const clampedX = Math.max(0, Math.min(maxX, desiredX));
    this.targetX = clampedX;
  }

  update(dtMs: number): void {
    const lerpX = this.config.followLerpX;
    this.x += (this.targetX - this.x) * Math.min(lerpX, 1);

    this.clampX();

    if (this.shake) {
      this.shake.remaining -= dtMs;
      if (this.shake.remaining <= 0) {
        this.shake = null;
      } else {
        const factor = this.shake.decay ? this.shake.remaining / (this.shake.remaining + dtMs) : 1;
        const int = this.shake.intensity * factor;
        this.shake.offsetX = (Math.random() * 2 - 1) * int;
        this.shake.offsetY = (Math.random() * 2 - 1) * int * 0.5;
      }
    }
  }

  private clampX(): void {
    const maxX = this.config.stageMaxX - this.config.viewportW;
    if (this.locked) {
      this.x = Math.max(this.lockMinX, Math.min(this.lockMaxX, this.x));
    } else {
      this.x = Math.max(0, Math.min(maxX, this.x));
    }
  }

  lock(minX: number, maxX: number): void {
    this.locked = true;
    this.lockMinX = minX;
    this.lockMaxX = maxX;
    this.clampX();
  }

  unlock(): void {
    this.locked = false;
  }

  triggerShake(profile: ShakeProfile): void {
    if (this.shake && this.shake.intensity >= profile.intensity) return;
    this.shake = {
      intensity: profile.intensity,
      remaining: profile.durationMs,
      decay: profile.decay,
      offsetX: 0,
      offsetY: 0,
    };
  }

  snapTo(worldX: number): void {
    const maxX = this.config.stageMaxX - this.config.viewportW;
    this.x = Math.max(0, Math.min(maxX, worldX));
    this.targetX = this.x;
  }

  get worldX(): number {
    return this.x + (this.shake?.offsetX ?? 0);
  }

  get worldY(): number {
    return this.y + (this.shake?.offsetY ?? 0);
  }

  get isLocked(): boolean {
    return this.locked;
  }

  updateConfig(lane: StageLane): void {
    this.config.stageMinX = lane.minX;
    this.config.stageMaxX = lane.maxX;
  }
}

export function createDefaultCameraConfig(stageMaxX: number, viewportW: number, viewportH: number): CameraConfig {
  return {
    followLerpX: 0.08,
    followLerpY: 0.05,
    softPadLeft: 200,
    softPadRight: 120,
    stageMinX: 0,
    stageMaxX: stageMaxX,
    viewportW,
    viewportH,
  };
}

export const SHAKE_LIGHT: ShakeProfile = { intensity: 3, durationMs: 120, decay: true };
export const SHAKE_MEDIUM: ShakeProfile = { intensity: 7, durationMs: 220, decay: true };
export const SHAKE_HEAVY: ShakeProfile = { intensity: 14, durationMs: 350, decay: true };
export const SHAKE_BOSS: ShakeProfile = { intensity: 22, durationMs: 500, decay: true };
