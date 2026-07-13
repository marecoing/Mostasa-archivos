export interface AttackDef {
  id: string;
  startupFrames: number;
  activeFrames: number;
  recoveryFrames: number;
  damage: number;
  hitstunFrames: number;
  hitstopFrames: number;
  knockbackX: number;
  knockbackZ: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
  hitboxHalfW: number;
  hitboxHalfD: number;
}

export const ATTACKS: Record<string, AttackDef> = {
  light_1: {
    id: 'light_1',
    startupFrames: 3,
    activeFrames: 3,
    recoveryFrames: 8,
    damage: 8,
    hitstunFrames: 12,
    hitstopFrames: 4,
    knockbackX: 180,
    knockbackZ: 0,
    hitboxOffsetX: 50,
    hitboxOffsetY: 0,
    hitboxHalfW: 35,
    hitboxHalfD: 20,
  },
  light_2: {
    id: 'light_2',
    startupFrames: 3,
    activeFrames: 3,
    recoveryFrames: 10,
    damage: 10,
    hitstunFrames: 14,
    hitstopFrames: 4,
    knockbackX: 220,
    knockbackZ: 0,
    hitboxOffsetX: 55,
    hitboxOffsetY: 0,
    hitboxHalfW: 38,
    hitboxHalfD: 20,
  },
  light_3: {
    id: 'light_3',
    startupFrames: 4,
    activeFrames: 4,
    recoveryFrames: 18,
    damage: 16,
    hitstunFrames: 20,
    hitstopFrames: 6,
    knockbackX: 400,
    knockbackZ: 120,
    hitboxOffsetX: 60,
    hitboxOffsetY: 0,
    hitboxHalfW: 42,
    hitboxHalfD: 22,
  },
  heavy: {
    id: 'heavy',
    startupFrames: 8,
    activeFrames: 6,
    recoveryFrames: 20,
    damage: 25,
    hitstunFrames: 28,
    hitstopFrames: 8,
    knockbackX: 500,
    knockbackZ: 200,
    hitboxOffsetX: 65,
    hitboxOffsetY: 0,
    hitboxHalfW: 45,
    hitboxHalfD: 24,
  },
  air_attack: {
    id: 'air_attack',
    startupFrames: 4,
    activeFrames: 5,
    recoveryFrames: 10,
    damage: 14,
    hitstunFrames: 18,
    hitstopFrames: 5,
    knockbackX: 300,
    knockbackZ: -80,
    hitboxOffsetX: 50,
    hitboxOffsetY: 0,
    hitboxHalfW: 40,
    hitboxHalfD: 26,
  },
};

export function getTotalFrames(def: AttackDef): number {
  return def.startupFrames + def.activeFrames + def.recoveryFrames;
}

export function isActiveFrame(def: AttackDef, frame: number): boolean {
  return frame >= def.startupFrames && frame < def.startupFrames + def.activeFrames;
}

export function isStartupFrame(def: AttackDef, frame: number): boolean {
  return frame < def.startupFrames;
}

export function isRecoveryFrame(def: AttackDef, frame: number): boolean {
  return frame >= def.startupFrames + def.activeFrames && frame < getTotalFrames(def);
}
