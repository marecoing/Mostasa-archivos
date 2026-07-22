import { execFileSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { CHARACTER_ASSET_MANIFEST } from '../../src/game/data/CharacterAssetManifest';
import type { CharacterAssetMetadata } from '../../src/game/data/CharacterAssetManifest';

const ROOT = join(__dirname, '../..');
const JSON_MANIFEST = join(ROOT, 'public/assets/characters/character-atlas-manifest.json');

describe('character atlas generated manifest', () => {
  it('keeps the JSON and TypeScript manifests identical', () => {
    const json = JSON.parse(readFileSync(JSON_MANIFEST, 'utf8')) as unknown;
    expect(json).toEqual(CHARACTER_ASSET_MANIFEST);
  });

  it('records usable measurements and exact frame counts', () => {
    for (const entry of Object.values(CHARACTER_ASSET_MANIFEST)) {
      const metadata: CharacterAssetMetadata = entry;
      const totalCells = metadata.totalCells ?? metadata.cols * metadata.rows;
      const actualFrameCount = metadata.actualFrameCount ?? metadata.frameCount;
      const emptyCells = metadata.emptyCells ?? [];
      expect(totalCells).toBe(metadata.cols * metadata.rows);
      expect(metadata.frameCount).toBe(actualFrameCount);
      expect(actualFrameCount).toBe(totalCells - emptyCells.length);
      expect(metadata.frameWidth % 2).toBe(0);
      expect(metadata.referenceBodyHeight).toBeGreaterThan(0);
      expect(metadata.referenceBodyHeight).toBeLessThanOrEqual(metadata.frameHeight);
      expect(metadata.footAnchorY).toBeGreaterThan(0);
      expect(metadata.footAnchorY).toBeLessThan(metadata.frameHeight);
      if (metadata.pipelineVersion >= 2) {
        expect(metadata.frameHeight).toBe(224);
        expect(metadata.gutter).toBeGreaterThanOrEqual(4);
      }
      if (metadata.pipelineVersion >= 3) {
        expect(metadata.gutter).toBeGreaterThanOrEqual(8);
        expect(metadata.segmentation).toBeDefined();
        expect(metadata.segmentation?.rootCount).toBe(metadata.frameCount);
        const populatedByRow = Array.from({ length: metadata.rows }, () => metadata.cols);
        for (const cell of emptyCells) populatedByRow[Math.floor(cell / metadata.cols)]! -= 1;
        expect(metadata.segmentation?.rowRootCounts).toEqual(populatedByRow);
        expect(metadata.segmentation?.uniformScale).toBeGreaterThan(0);
      }
    }
  });

  it('declares the two intentional trailing gaps in enemy_003', () => {
    expect(CHARACTER_ASSET_MANIFEST.enemy_003.totalCells).toBe(80);
    expect(CHARACTER_ASSET_MANIFEST.enemy_003.actualFrameCount).toBe(78);
    expect(CHARACTER_ASSET_MANIFEST.enemy_003.emptyCells).toEqual([69, 79]);
  });

  it('passes the pixel-level atlas validator', () => {
    expect(() => {
      execFileSync(process.execPath, ['scripts/validate-character-atlases.mjs'], {
        cwd: ROOT,
        encoding: 'utf8',
        timeout: 30_000,
      });
    }).not.toThrow();
  });
});
