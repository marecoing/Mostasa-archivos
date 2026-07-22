/** Validate generated/current character atlases against their manifest. */

import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { decodePng } from './png-lib.mjs';
import { CHARACTER_IDS, CHARACTER_LAYOUTS, outputFileFor } from './character-atlas-config.mjs';
import { validateCharacterAtlas } from './character-atlas-lib.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, '..');
const OUTPUT_DIR = join(ROOT, 'public', 'assets', 'characters');
const MANIFEST_PATH = join(OUTPUT_DIR, 'character-atlas-manifest.json');

function parseIds(argv) {
  const index = argv.indexOf('--ids');
  if (index < 0) return [...CHARACTER_IDS];
  const value = argv[index + 1];
  if (!value) throw new Error('--ids requires a comma-separated value');
  const ids = [
    ...new Set(
      value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];
  for (const id of ids) {
    if (!CHARACTER_LAYOUTS[id]) throw new Error(`unknown character id: ${id}`);
  }
  return ids;
}

function validateMetadataShape(id, metadata) {
  const errors = [];
  if (!metadata || typeof metadata !== 'object') return [`${id}: missing manifest entry`];
  for (const key of [
    'frameWidth',
    'frameHeight',
    'cols',
    'rows',
    'frameCount',
    'referenceBodyHeight',
    'footAnchorY',
    'gutter',
    'pipelineVersion',
  ]) {
    if (!Number.isInteger(metadata[key]) || metadata[key] < 0) errors.push(`${id}: invalid ${key}`);
  }
  if (metadata.pipelineVersion >= 3) {
    for (const key of ['totalCells', 'actualFrameCount']) {
      if (!Number.isInteger(metadata[key]) || metadata[key] < 0)
        errors.push(`${id}: invalid ${key}`);
    }
    if (
      !Array.isArray(metadata.emptyCells) ||
      metadata.emptyCells.some((cell) => !Number.isInteger(cell) || cell < 0)
    ) {
      errors.push(`${id}: invalid emptyCells`);
    }
  }
  if (typeof metadata.file !== 'string' || metadata.file.length === 0)
    errors.push(`${id}: invalid file`);
  return errors;
}

function main() {
  if (!existsSync(MANIFEST_PATH)) throw new Error(`missing manifest: ${MANIFEST_PATH}`);
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  const ids = parseIds(process.argv.slice(2));
  const allErrors = [];

  for (const id of ids) {
    const metadata = manifest[id];
    const shapeErrors = validateMetadataShape(id, metadata);
    if (shapeErrors.length > 0) {
      allErrors.push(...shapeErrors);
      continue;
    }
    const atlasPath = join(OUTPUT_DIR, outputFileFor(id));
    if (!existsSync(atlasPath)) {
      allErrors.push(`${id}: missing atlas ${atlasPath}`);
      continue;
    }
    const image = decodePng(readFileSync(atlasPath));
    // v3 is the first strict component-segmented contract. Older entries are
    // accepted during incremental migration but never treated as regenerated.
    const expectedLayout = metadata.pipelineVersion >= 3 ? CHARACTER_LAYOUTS[id] : null;
    const result = validateCharacterAtlas(id, image, metadata, expectedLayout);
    if (result.errors.length > 0)
      allErrors.push(...result.errors.map((error) => `${id}: ${error}`));
    const metrics = result.metrics;
    if (metrics) {
      const residue =
        metrics.edgePixels === 0 ? 0 : (metrics.chromaResidue / metrics.edgePixels) * 100;
      console.log(
        `${id.padEnd(10)} ok frames=${metadata.frameCount}` +
          ` pipeline=v${metadata.pipelineVersion}` +
          ` soft=${metrics.semiTransparent}` +
          ` gutterLeaks=${metrics.gutterLeaks}` +
          ` chroma=${residue.toFixed(3)}%` +
          ` duplicates=${metrics.duplicateFrames}`,
      );
    }
  }

  if (allErrors.length > 0) {
    throw new Error(`character atlas validation failed:\n  - ${allErrors.join('\n  - ')}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
