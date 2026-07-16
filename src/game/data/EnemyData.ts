export interface EnemyStats {
  type: string;
  hp: number;
  walkSpeed: number;
  halfW: number;
  halfD: number;
  color: number;
  height: number;
}

export const ENEMY_TYPES: Record<string, EnemyStats> = {
  grunt: {
    type: 'grunt',
    hp: 60,
    walkSpeed: 80,
    halfW: 18,
    halfD: 16,
    color: 0x8b2222,
    height: 68,
  },
  speedster: {
    type: 'speedster',
    hp: 40,
    walkSpeed: 140,
    halfW: 16,
    halfD: 14,
    color: 0x228b44,
    height: 60,
  },
  tank: {
    type: 'tank',
    hp: 120,
    walkSpeed: 50,
    halfW: 24,
    halfD: 20,
    color: 0x8b6622,
    height: 80,
  },
  zoner: {
    type: 'zoner',
    hp: 50,
    walkSpeed: 70,
    halfW: 16,
    halfD: 16,
    color: 0x228888,
    height: 64,
  },
  miniboss: {
    type: 'miniboss',
    hp: 200,
    walkSpeed: 60,
    halfW: 28,
    halfD: 22,
    color: 0x882288,
    height: 90,
  },
  boss: {
    type: 'boss',
    hp: 650,
    walkSpeed: 70,
    halfW: 30,
    halfD: 24,
    color: 0xcc4422,
    height: 100,
  },
};
