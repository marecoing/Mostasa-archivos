import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { castForStage } from '../../src/game/data/WaveManifest';
import { CHARACTER_SHEETS } from '../../src/game/systems/CharacterAnimator';
import { STAGES } from '../../src/game/data/StageManifest';

const PUBLIC = join(__dirname, '../../public');

/** PNG dimensions straight from the IHDR header — no decoding needed. */
function pngInfo(rel: string): { width: number; height: number; bytes: number } {
  const buf = readFileSync(join(PUBLIC, rel));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), bytes: buf.length };
}

/** Uncompressed RGBA texture memory a PNG occupies once uploaded to the GPU. */
function gpuMb(rel: string): number {
  const { width, height } = pngInfo(rel);
  return (width * height * 4) / 1024 / 1024;
}

function fileMb(rel: string): number {
  return pngInfo(rel).bytes / 1024 / 1024;
}

const sheetFile = (key: string): string =>
  CHARACTER_SHEETS.find((s) => s.key === key)?.file ??
  (() => {
    throw new Error(`unknown character sheet ${key}`);
  })();

/**
 * Asset budget guards (audit finding AUD-01). The character atlases are the
 * dominant cost in this project: loading all eleven up front spent ~148 MB of
 * texture memory and ~23 MB of download before the title screen appeared.
 * Splitting each stage's cast into an up-front set and a streamed boss set
 * brought the blocking cost down. These thresholds exist so that regression
 * shows up in CI as a failing test rather than in a manual audit months later.
 *
 * Raising a threshold is a deliberate decision, not a fix — if a change needs
 * more budget, say so in the commit.
 */
describe('asset budget — blocking load for Escenario 1', () => {
  const cast = castForStage('01-once');

  it('defers the mini-boss and boss sheets out of the blocking load', () => {
    expect(cast.deferred).toContain('enemy_009');
    expect(cast.deferred).toContain('enemy_010');
    expect(cast.upfront).not.toContain('enemy_009');
    expect(cast.upfront).not.toContain('enemy_010');
  });

  it('always has the player sheet up front', () => {
    expect(cast.upfront).toContain('mostasa');
  });

  it('keeps up-front character download under 20 MB', () => {
    const mb = cast.upfront.reduce((sum, k) => sum + fileMb(sheetFile(k)), 0);
    expect(mb).toBeLessThan(20);
  });

  it('keeps up-front character texture memory under 120 MB', () => {
    const mb = cast.upfront.reduce((sum, k) => sum + gpuMb(sheetFile(k)), 0);
    expect(mb).toBeLessThan(120);
  });

  it('streams a meaningful amount rather than deferring token assets', () => {
    const deferredMb = cast.deferred.reduce((sum, k) => sum + gpuMb(sheetFile(k)), 0);
    expect(deferredMb).toBeGreaterThan(25);
  });
});

describe('asset budget — stage backdrops', () => {
  it('keeps each stage panel set under 32 MB of texture memory', () => {
    for (const stage of STAGES) {
      if (!stage.runtimeReady) continue;
      const mb = stage.panelPaths.reduce((sum, p) => sum + gpuMb(p), 0);
      expect(mb, `${stage.id} panels`).toBeLessThan(32);
    }
  });

  it('ships no unreferenced art in the served stage folders', () => {
    const referenced = new Set(STAGES.flatMap((s) => s.panelPaths.map((p) => p.split('/').pop())));
    const stagesDir = join(PUBLIC, 'assets/stages');
    for (const dir of readdirSync(stagesDir)) {
      const full = join(stagesDir, dir);
      if (!statSync(full).isDirectory()) continue;
      for (const file of readdirSync(full)) {
        if (!file.endsWith('.png')) continue;
        expect(referenced.has(file), `assets/stages/${dir}/${file} is served but never loaded`).toBe(
          true,
        );
      }
    }
  });
});
