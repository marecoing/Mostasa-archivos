import { describe, it, expect } from 'vitest';
import { showGuidance, GUIDANCE_END_MARGIN } from '../../src/game/systems/GuidanceArrow';
import type { GuidanceInput } from '../../src/game/systems/GuidanceArrow';

function input(over: Partial<GuidanceInput> = {}): GuidanceInput {
  return {
    phase: 'traveling',
    aliveEnemies: 0,
    playerX: 500,
    laneMaxX: 4600,
    stageEnded: false,
    paused: false,
    ...over,
  };
}

describe('showGuidance', () => {
  it('shows while travelling with a clear path and stage left', () => {
    expect(showGuidance(input())).toBe(true);
  });

  it('hides while fighting', () => {
    expect(showGuidance(input({ phase: 'fighting' }))).toBe(false);
  });

  it('hides when enemies are alive', () => {
    expect(showGuidance(input({ aliveEnemies: 2 }))).toBe(false);
  });

  it('hides when the stage is over or paused', () => {
    expect(showGuidance(input({ stageEnded: true }))).toBe(false);
    expect(showGuidance(input({ paused: true }))).toBe(false);
  });

  it('hides near the end of the stage', () => {
    expect(showGuidance(input({ playerX: 4600 - GUIDANCE_END_MARGIN + 1 }))).toBe(false);
    expect(showGuidance(input({ playerX: 4600 - GUIDANCE_END_MARGIN - 1 }))).toBe(true);
  });
});
