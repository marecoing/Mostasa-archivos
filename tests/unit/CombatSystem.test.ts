import { describe, it, expect, beforeEach } from 'vitest';
import { checkPlayerHitsEnemies, checkGrabRange, getRadialHits } from '../../src/game/systems/CombatSystem';
import { EnemyEntity } from '../../src/game/entities/EnemyEntity';
import { ENEMY_TYPES } from '../../src/game/data/EnemyData';
import { ATTACKS } from '../../src/game/data/AttackData';

const LANE = { minX: -800, maxX: 800, minY: 0, maxY: 200 };

function makeEnemy(x: number, y: number, type = 'grunt'): EnemyEntity {
  return new EnemyEntity(x, y, ENEMY_TYPES[type]!);
}

describe('checkPlayerHitsEnemies', () => {
  let enemies: EnemyEntity[];

  beforeEach(() => {
    enemies = [];
  });

  it('returns empty when no enemies', () => {
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, []);
    expect(hits).toEqual([]);
  });

  it('hits enemy directly in front of player', () => {
    const enemy = makeEnemy(80, 100);
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, enemies);
    expect(hits).toContain(0);
  });

  it('does not hit enemy behind player (facing -1 with positive X offset)', () => {
    // facing left (-1), hitbox goes left: offsetX * -1 = -50
    // enemy is at x=80, far to the right — should miss
    const enemy = makeEnemy(80, 100);
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, -1, ATTACKS['light_1']!, enemies);
    expect(hits).not.toContain(0);
  });

  it('hits enemy on the left when facing left', () => {
    const enemy = makeEnemy(-80, 100);
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, -1, ATTACKS['light_1']!, enemies);
    expect(hits).toContain(0);
  });

  it('does not hit dead enemy', () => {
    const enemy = makeEnemy(80, 100);
    enemy.dead = true;
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, enemies);
    expect(hits).toEqual([]);
  });

  it('does not hit already-hit enemy (hitThisSwing)', () => {
    const enemy = makeEnemy(80, 100);
    enemy.hitThisSwing = true;
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, enemies);
    expect(hits).toEqual([]);
  });

  it('does not hit enemy that is not in same depth', () => {
    const enemy = makeEnemy(80, 200); // far depth
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, enemies);
    expect(hits).toEqual([]);
  });

  it('does not hit enemy with large Z difference', () => {
    const enemy = makeEnemy(80, 100);
    enemy.pos.z = 200; // far above player (player Z = 0)
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, enemies);
    expect(hits).toEqual([]);
  });

  it('does not hit enemy too far away horizontally', () => {
    const enemy = makeEnemy(400, 100);
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, enemies);
    expect(hits).toEqual([]);
  });

  it('hits multiple enemies in range', () => {
    enemies.push(makeEnemy(60, 100));
    enemies.push(makeEnemy(75, 100));
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, enemies);
    expect(hits).toContain(0);
    expect(hits).toContain(1);
  });

  it('does not hit GET_UP enemy (invulnerable)', () => {
    const enemy = makeEnemy(80, 100);
    enemy.fsm.receiveKnockdown();
    for (let i = 0; i < 40; i++) enemy.fsm.tick();
    // now in GET_UP — isVulnerable() returns false
    expect(enemy.fsm.currentState).toBe('get_up');
    enemies.push(enemy);
    const hits = checkPlayerHitsEnemies(0, 100, 0, 1, ATTACKS['light_1']!, enemies);
    expect(hits).toEqual([]);
  });
});

describe('checkGrabRange', () => {
  let enemies: EnemyEntity[];

  beforeEach(() => {
    enemies = [];
  });

  it('returns -1 when no enemies', () => {
    expect(checkGrabRange(0, 100, 1, [])).toBe(-1);
  });

  it('returns index when enemy is within grab range in front', () => {
    enemies.push(makeEnemy(50, 100));
    expect(checkGrabRange(0, 100, 1, enemies)).toBe(0);
  });

  it('returns -1 when enemy is behind player', () => {
    enemies.push(makeEnemy(-80, 100));
    expect(checkGrabRange(0, 100, 1, enemies)).toBe(-1);
  });

  it('returns -1 when enemy is too far', () => {
    enemies.push(makeEnemy(200, 100));
    expect(checkGrabRange(0, 100, 1, enemies)).toBe(-1);
  });

  it('returns -1 for dead enemy', () => {
    const enemy = makeEnemy(50, 100);
    enemy.dead = true;
    enemies.push(enemy);
    expect(checkGrabRange(0, 100, 1, enemies)).toBe(-1);
  });

  it('returns -1 when enemy not in same depth', () => {
    enemies.push(makeEnemy(50, 200));
    expect(checkGrabRange(0, 100, 1, enemies)).toBe(-1);
  });

  it('returns first grabbable enemy index', () => {
    enemies.push(makeEnemy(300, 100)); // out of range
    enemies.push(makeEnemy(40, 100));  // in range
    expect(checkGrabRange(0, 100, 1, enemies)).toBe(1);
  });

  it('returns -1 for GET_UP enemy', () => {
    const enemy = makeEnemy(50, 100);
    enemy.fsm.receiveKnockdown();
    for (let i = 0; i < 40; i++) enemy.fsm.tick();
    enemies.push(enemy);
    expect(checkGrabRange(0, 100, 1, enemies)).toBe(-1);
  });
});

describe('getRadialHits', () => {
  let enemies: EnemyEntity[];

  beforeEach(() => {
    enemies = [];
  });

  it('returns empty when no enemies', () => {
    expect(getRadialHits(0, 100, [], 150)).toEqual([]);
  });

  it('returns enemy within radius', () => {
    enemies.push(makeEnemy(80, 100));
    const hits = getRadialHits(0, 100, enemies, 150);
    expect(hits).toContain(0);
  });

  it('does not return enemy outside radius', () => {
    enemies.push(makeEnemy(200, 100));
    const hits = getRadialHits(0, 100, enemies, 150);
    expect(hits).toEqual([]);
  });

  it('does not return dead enemy', () => {
    const enemy = makeEnemy(80, 100);
    enemy.dead = true;
    enemies.push(enemy);
    const hits = getRadialHits(0, 100, enemies, 150);
    expect(hits).toEqual([]);
  });

  it('does not return enemy not in same depth', () => {
    enemies.push(makeEnemy(80, 300));
    const hits = getRadialHits(0, 100, enemies, 150);
    expect(hits).toEqual([]);
  });

  it('returns multiple enemies within radius', () => {
    enemies.push(makeEnemy(50, 100));
    enemies.push(makeEnemy(-60, 100));
    enemies.push(makeEnemy(300, 100));
    const hits = getRadialHits(0, 100, enemies, 150);
    expect(hits).toContain(0);
    expect(hits).toContain(1);
    expect(hits).not.toContain(2);
  });

  it('includes GET_UP enemy (radial has no vulnerability check)', () => {
    const enemy = makeEnemy(80, 100);
    enemy.fsm.receiveKnockdown();
    for (let i = 0; i < 40; i++) enemy.fsm.tick();
    enemies.push(enemy);
    const hits = getRadialHits(0, 100, enemies, 150);
    expect(hits).toContain(0);
  });
});
