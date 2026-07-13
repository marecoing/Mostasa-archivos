export interface Pushbox {
  x: number;
  y: number;
  halfW: number;
  halfD: number;
}

export interface StageLane {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function pushboxOverlap(a: Pushbox, b: Pushbox): boolean {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return dx < a.halfW + b.halfW && dy < a.halfD + b.halfD;
}

export interface PushResolution {
  ax: number;
  ay: number;
  bx: number;
  by: number;
}

export function resolvePushboxes(a: Pushbox, b: Pushbox): PushResolution {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const overlapX = a.halfW + b.halfW - Math.abs(dx);
  const overlapY = a.halfD + b.halfD - Math.abs(dy);

  if (overlapX <= 0 || overlapY <= 0) {
    return { ax: a.x, ay: a.y, bx: b.x, by: b.y };
  }

  const halfPush = 0.5;

  if (overlapX < overlapY) {
    const pushX = overlapX * halfPush * Math.sign(dx);
    return {
      ax: a.x - pushX,
      ay: a.y,
      bx: b.x + pushX,
      by: b.y,
    };
  } else {
    const pushY = overlapY * halfPush * Math.sign(dy);
    return {
      ax: a.x,
      ay: a.y - pushY,
      bx: b.x,
      by: b.y + pushY,
    };
  }
}

export function clampEntityToLane(px: number, py: number, halfW: number, halfD: number, lane: StageLane): { x: number; y: number } {
  return {
    x: Math.max(lane.minX + halfW, Math.min(lane.maxX - halfW, px)),
    y: Math.max(lane.minY + halfD, Math.min(lane.maxY - halfD, py)),
  };
}

export function buildPlayerPushbox(worldX: number, worldY: number): Pushbox {
  return { x: worldX, y: worldY, halfW: 20, halfD: 18 };
}

export function buildEnemyPushbox(worldX: number, worldY: number, halfW = 18, halfD = 16): Pushbox {
  return { x: worldX, y: worldY, halfW, halfD };
}
