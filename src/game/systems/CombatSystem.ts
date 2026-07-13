import { sameDepth } from '../core/Physics25D';
import type { AttackDef } from '../data/AttackData';
import type { EnemyEntity } from '../entities/EnemyEntity';

export function checkPlayerHitsEnemies(
  playerX: number,
  playerY: number,
  playerZ: number,
  playerFacing: 1 | -1,
  attack: AttackDef,
  enemies: readonly EnemyEntity[],
): number[] {
  const hitIndices: number[] = [];
  const hbX = playerX + attack.hitboxOffsetX * playerFacing;
  const hbY = playerY + attack.hitboxOffsetY;

  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy || enemy.dead || !enemy.fsm.isVulnerable()) continue;
    if (enemy.hitThisSwing) continue;
    if (!sameDepth(playerY, enemy.pos.y, 36)) continue;
    if (Math.abs(playerZ - enemy.pos.z) > 50) continue;

    const dx = Math.abs(hbX - enemy.pos.x);
    const dy = Math.abs(hbY - enemy.pos.y);

    if (dx < attack.hitboxHalfW + enemy.halfW && dy < attack.hitboxHalfD + enemy.halfD) {
      hitIndices.push(i);
    }
  }

  return hitIndices;
}

export function checkGrabRange(
  playerX: number,
  playerY: number,
  playerFacing: 1 | -1,
  enemies: readonly EnemyEntity[],
): number {
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy || enemy.dead || !enemy.fsm.isVulnerable()) continue;
    if (!sameDepth(playerY, enemy.pos.y, 30)) continue;

    const dx = enemy.pos.x - playerX;
    const inFront = playerFacing * dx > -20;
    if (!inFront) continue;

    if (Math.abs(dx) < 72) return i;
  }
  return -1;
}

export function getRadialHits(
  playerX: number,
  playerY: number,
  enemies: readonly EnemyEntity[],
  radius: number,
): number[] {
  const hitIndices: number[] = [];
  for (let i = 0; i < enemies.length; i++) {
    const enemy = enemies[i];
    if (!enemy || enemy.dead) continue;
    if (!sameDepth(playerY, enemy.pos.y, 50)) continue;
    if (Math.abs(playerX - enemy.pos.x) < radius) hitIndices.push(i);
  }
  return hitIndices;
}
