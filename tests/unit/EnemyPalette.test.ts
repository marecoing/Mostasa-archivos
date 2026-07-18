import { describe, it, expect } from 'vitest';
import {
  paletteForStage, enemyTint, scaleColor, spriteVariant, archetypeTone,
  STAGE_ENEMY_PALETTES, DEFAULT_PALETTE,
} from '../../src/game/systems/EnemyPalette';

describe('paletteForStage', () => {
  it('returns a distinct palette per known stage and default for unknown', () => {
    expect(paletteForStage('01-once')).toBe(STAGE_ENEMY_PALETTES['01-once']);
    expect(paletteForStage('10-casa-rosada-final')).toBe(STAGE_ENEMY_PALETTES['10-casa-rosada-final']);
    expect(paletteForStage('nope')).toBe(DEFAULT_PALETTE);
  });

  it('gives every campaign stage its own tint', () => {
    const tints = Object.values(STAGE_ENEMY_PALETTES).map((p) => p.tint);
    expect(new Set(tints).size).toBe(tints.length); // all unique
  });
});

describe('scaleColor', () => {
  it('scales channels and clamps to a byte', () => {
    expect(scaleColor(0xffffff, 1)).toBe(0xffffff);
    expect(scaleColor(0xffffff, 0.5)).toBe(0x808080);
    expect(scaleColor(0x804020, 2)).toBe(0xff8040); // clamps the red channel
    expect(scaleColor(0xffffff, 0)).toBe(0x000000);
  });
});

describe('spriteVariant', () => {
  it('stays within 0.86..1.0 and differs across keys', () => {
    const a = spriteVariant('enemy_001');
    const b = spriteVariant('enemy_002');
    expect(a).toBeGreaterThanOrEqual(0.86);
    expect(a).toBeLessThanOrEqual(1.0);
    expect(a).not.toBe(b);
    expect(spriteVariant('mostasa')).toBe(0.86); // no digits → n=0
  });
});

describe('archetypeTone', () => {
  it('darkens heavies and brightens quick enemies, neutral for the rest', () => {
    expect(archetypeTone('tank')).toBeLessThan(1);
    expect(archetypeTone('speedster')).toBeGreaterThan(1);
    expect(archetypeTone('zoner')).toBeLessThan(1);
    expect(archetypeTone('grunt')).toBe(1);
    expect(archetypeTone('boss')).toBe(1);
    expect(archetypeTone('miniboss')).toBe(1);
    expect(archetypeTone('unknown')).toBe(1);
  });
});

describe('enemyTint', () => {
  it('produces a valid colour that varies by sprite within a stage', () => {
    const t1 = enemyTint('01-once', 'enemy_001');
    const t2 = enemyTint('01-once', 'enemy_002');
    expect(t1).toBeGreaterThanOrEqual(0);
    expect(t1).toBeLessThanOrEqual(0xffffff);
    expect(t1).not.toBe(t2);
  });

  it('shifts the same sprite across different stages', () => {
    const once = enemyTint('01-once', 'enemy_001');
    const rosada = enemyTint('10-casa-rosada-final', 'enemy_001');
    expect(once).not.toBe(rosada);
  });

  it('biases brightness by archetype for the same sprite and stage', () => {
    const tank = enemyTint('01-once', 'enemy_001', 'tank');
    const speed = enemyTint('01-once', 'enemy_001', 'speedster');
    const grunt = enemyTint('01-once', 'enemy_001', 'grunt');
    expect(tank).not.toBe(grunt);
    expect(speed).not.toBe(grunt);
    expect(tank).not.toBe(speed);
  });
});
