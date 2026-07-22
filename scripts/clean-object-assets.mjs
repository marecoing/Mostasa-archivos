/**
 * Clean and repack MOSTASA'S RAGE object art without changing runtime canvases.
 *
 * Single-image props, weapons, pickups, and rewards are cleaned conservatively:
 * disconnected edge fragments far from the dominant object are discarded, while
 * every other component is preserved. The selected art is then bottom-centred
 * with at least eight transparent pixels of padding.
 *
 * Destructibles need a different recovery path. Their existing 4 x 362 x 181
 * strips were cut directly on the row grid of sheets_alpha/destruibles.png, even
 * though the generated objects overflow those rows and columns. Re-slicing the
 * already-cropped strips cannot restore those pixels, so this tool identifies the
 * 24 objects on the complete source sheet and repacks each one into its original
 * runtime-compatible 362 x 181 frame.
 *
 * Usage:
 *   node scripts/clean-object-assets.mjs
 *   node scripts/clean-object-assets.mjs --check
 *   node scripts/clean-object-assets.mjs --check --report path/to/report.json
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, encodePng } from './png-lib.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const PUBLIC_ASSETS = join(ROOT, 'public', 'assets');
const GENERATED = join(ROOT, 'assets', 'generated');
const BACKUP_ROOT = join(GENERATED, 'object-cleanup-backup');
const DEFAULT_REPORT = join(GENERATED, 'object-cleanup-report.json');
const DESTRUCTIBLE_SOURCE = join(ROOT, 'sheets_alpha', 'destruibles.png');

const SINGLE_SHEET_CONFIGS = [
  {
    path: 'armas_improvisadas.png',
    group: 'weapons',
    rows: [
      [
        'palo_escoba.png',
        'tubo_metalico.png',
        'cadena_oxidada.png',
        'llave_inglesa.png',
        'paraguas_roto.png',
      ],
      [
        'tapa_tacho.png',
        'maletin_pesado.png',
        'botella_vidrio.png',
        'silla_plastico.png',
        'cajon_verdura.png',
      ],
    ],
  },
  {
    path: 'pickups_vida.png',
    group: 'pickups',
    rows: [
      ['mate_curativo.png', 'termo_salvador.png', 'empanada_rotiseria.png'],
      ['choripan_callejero.png', 'pizza_slice_ficticia.png', 'botiquin_once.png'],
    ],
  },
  {
    path: 'pickups_energia_bronca.png',
    group: 'pickups',
    rows: [
      ['cafe_quemado.png', 'gaseosa_ficticia.png', 'alfajor_generico.png'],
      ['blister_misterioso.png', 'bronca_embotellada.png'],
    ],
  },
  {
    path: 'recompensas.png',
    group: 'rewards',
    rows: [
      ['monedas_sueltas.png', 'fajo_billetes_ficticios.png', 'pendrive_comun.png'],
      ['pendrive_federal.png', 'pendrive_bitcoin.png'],
    ],
  },
  {
    path: 'props_calle_once.png',
    group: 'props',
    rows: [
      [
        'persiana_metalica.png',
        'cartel_generico_local.png',
        'bolsa_basura.png',
        'carrito_carga.png',
      ],
      [
        'bicicleta_reparto.png',
        'cableado_colgante.png',
        'reja_seguridad.png',
        'posteres_rotos.png',
      ],
    ],
  },
  {
    path: 'props_estacion.png',
    group: 'props',
    rows: [
      ['molinete_generico.png', 'banco_anden.png', 'valija_vieja.png'],
      ['cartel_anden_ilegible.png', 'farol_estacion.png'],
    ],
  },
  {
    path: 'props_oficina_poder.png',
    group: 'props',
    rows: [
      ['maletin_papeles.png', 'sello_administrativo.png', 'carrito_expedientes.png'],
      ['atril_ficticio.png', 'carpeta_oficina.png'],
    ],
  },
];
const DESTRUCTIBLE_ROWS = [
  'cajon_rompible.png',
  'tacho_basura_rompible.png',
  'puesto_diarios_ficticio.png',
  'vidriera_rota.png',
  'cono_transito.png',
  'barril_plastico.png',
];

const ALPHA_THRESHOLD = 8;
const PADDING = 8;
const EDGE_FRAGMENT_DISTANCE = 24;
const SINGLE_DETACHED_PART_DISTANCE = 64;
const DESTRUCTIBLE_DETACHED_PART_DISTANCE = 32;
const SINGLE_MAIN_MIN_AREA = 5_000;
const DESTRUCTIBLE_MAIN_MIN_AREA = 5_000;
const DESTRUCTIBLE_FRAME_WIDTH = 362;
const DESTRUCTIBLE_FRAME_HEIGHT = 181;
const DESTRUCTIBLE_FRAMES = 4;

function parseArgs(argv) {
  const options = { check: false, report: null };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--check') {
      options.check = true;
    } else if (arg === '--report') {
      const value = argv[++index];
      if (!value) throw new Error('--report requires a path');
      options.report = resolve(ROOT, value);
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: node scripts/clean-object-assets.mjs [--check] [--report path]',
          '',
          '  --check        Compare generated output with public/assets; do not alter assets.',
          '  --report path  Write the JSON report to an explicit path.',
          '',
          `Apply mode writes ${relative(ROOT, DEFAULT_REPORT)} by default.`,
        ].join('\n'),
      );
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return options;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function round(value, places = 4) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function componentReport(component) {
  return {
    area: component.area,
    bbox: [component.x0, component.y0, component.x1, component.y1],
    centroid: [
      round(component.sumX / component.area, 1),
      round(component.sumY / component.area, 1),
    ],
  };
}

/** Find 8-connected components and retain a label for every opaque pixel. */
function findComponents(width, height, rgba) {
  const total = width * height;
  const labels = new Int32Array(total);
  labels.fill(-1);
  const components = [];
  const stack = [];

  for (let start = 0; start < total; start++) {
    if (labels[start] !== -1 || rgba[start * 4 + 3] <= ALPHA_THRESHOLD) continue;

    const id = components.length;
    const component = {
      id,
      area: 0,
      x0: width,
      y0: height,
      x1: 0,
      y1: 0,
      sumX: 0,
      sumY: 0,
    };
    stack.length = 0;
    stack.push(start);
    labels[start] = id;

    while (stack.length > 0) {
      const pixel = stack.pop();
      const x = pixel % width;
      const y = (pixel / width) | 0;
      component.area++;
      component.sumX += x;
      component.sumY += y;
      component.x0 = Math.min(component.x0, x);
      component.y0 = Math.min(component.y0, y);
      component.x1 = Math.max(component.x1, x);
      component.y1 = Math.max(component.y1, y);

      for (let dy = -1; dy <= 1; dy++) {
        const nextY = y + dy;
        if (nextY < 0 || nextY >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          if (nextX < 0 || nextX >= width) continue;
          const next = nextY * width + nextX;
          if (labels[next] === -1 && rgba[next * 4 + 3] > ALPHA_THRESHOLD) {
            labels[next] = id;
            stack.push(next);
          }
        }
      }
    }

    components.push(component);
  }

  return { labels, components };
}

function bboxDistance(a, b) {
  const dx = Math.max(0, a.x0 - b.x1 - 1, b.x0 - a.x1 - 1);
  const dy = Math.max(0, a.y0 - b.y1 - 1, b.y0 - a.y1 - 1);
  return Math.hypot(dx, dy);
}

function touchesEdge(component, width, height) {
  return (
    component.x0 === 0 ||
    component.y0 === 0 ||
    component.x1 === width - 1 ||
    component.y1 === height - 1
  );
}

function unionBbox(components) {
  if (components.length === 0) throw new Error('cannot create a bbox for an empty selection');
  return components.reduce(
    (bbox, component) => ({
      x0: Math.min(bbox.x0, component.x0),
      y0: Math.min(bbox.y0, component.y0),
      x1: Math.max(bbox.x1, component.x1),
      y1: Math.max(bbox.y1, component.y1),
    }),
    {
      x0: Number.POSITIVE_INFINITY,
      y0: Number.POSITIVE_INFINITY,
      x1: Number.NEGATIVE_INFINITY,
      y1: Number.NEGATIVE_INFINITY,
    },
  );
}

/**
 * Extract selected labelled components and their low-alpha antialiasing fringe.
 * This avoids copying an unwanted object even when its bbox overlaps a kept bbox.
 */
function extractSelection(source, labels, components) {
  const selectedIds = new Set(components.map((component) => component.id));
  const bbox = unionBbox(components);
  const scan = {
    x0: Math.max(0, bbox.x0 - 2),
    y0: Math.max(0, bbox.y0 - 2),
    x1: Math.min(source.width - 1, bbox.x1 + 2),
    y1: Math.min(source.height - 1, bbox.y1 + 2),
  };
  const scanWidth = scan.x1 - scan.x0 + 1;
  const scanHeight = scan.y1 - scan.y0 + 1;
  const provisional = new Uint8Array(scanWidth * scanHeight * 4);

  for (let localY = 0; localY < scanHeight; localY++) {
    const sourceY = scan.y0 + localY;
    for (let localX = 0; localX < scanWidth; localX++) {
      const sourceX = scan.x0 + localX;
      const sourcePixel = sourceY * source.width + sourceX;
      const sourceOffset = sourcePixel * 4;
      const alpha = source.rgba[sourceOffset + 3];
      if (alpha === 0) continue;

      let keep = selectedIds.has(labels[sourcePixel]);
      if (!keep && alpha <= ALPHA_THRESHOLD) {
        for (let dy = -2; dy <= 2 && !keep; dy++) {
          const nearbyY = sourceY + dy;
          if (nearbyY < 0 || nearbyY >= source.height) continue;
          for (let dx = -2; dx <= 2; dx++) {
            const nearbyX = sourceX + dx;
            if (nearbyX < 0 || nearbyX >= source.width) continue;
            if (selectedIds.has(labels[nearbyY * source.width + nearbyX])) {
              keep = true;
              break;
            }
          }
        }
      }
      if (!keep) continue;

      const targetOffset = (localY * scanWidth + localX) * 4;
      provisional[targetOffset] = source.rgba[sourceOffset];
      provisional[targetOffset + 1] = source.rgba[sourceOffset + 1];
      provisional[targetOffset + 2] = source.rgba[sourceOffset + 2];
      provisional[targetOffset + 3] = alpha;
    }
  }

  const content = alphaBbox(scanWidth, scanHeight, provisional, 0);
  if (!content) throw new Error('selection produced no pixels');
  const width = content.x1 - content.x0 + 1;
  const height = content.y1 - content.y0 + 1;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const from = ((content.y0 + y) * scanWidth + content.x0) * 4;
    rgba.set(provisional.subarray(from, from + width * 4), y * width * 4);
  }

  return {
    width,
    height,
    rgba,
    sourceBbox: [
      scan.x0 + content.x0,
      scan.y0 + content.y0,
      scan.x0 + content.x1,
      scan.y0 + content.y1,
    ],
  };
}

function alphaBbox(width, height, rgba, threshold = ALPHA_THRESHOLD) {
  let x0 = width;
  let y0 = height;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] <= threshold) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

function samplePremultiplied(source, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(source.width - 1, x0 + 1);
  const y1 = Math.min(source.height - 1, y0 + 1);
  const clampedX0 = Math.max(0, x0);
  const clampedY0 = Math.max(0, y0);
  const fractionX = x - x0;
  const fractionY = y - y0;
  const samples = [
    [clampedX0, clampedY0, (1 - fractionX) * (1 - fractionY)],
    [x1, clampedY0, fractionX * (1 - fractionY)],
    [clampedX0, y1, (1 - fractionX) * fractionY],
    [x1, y1, fractionX * fractionY],
  ];
  let alpha = 0;
  let red = 0;
  let green = 0;
  let blue = 0;
  for (const [sampleX, sampleY, weight] of samples) {
    const offset = (sampleY * source.width + sampleX) * 4;
    const sampleAlpha = source.rgba[offset + 3] / 255;
    const alphaWeight = sampleAlpha * weight;
    alpha += alphaWeight;
    red += source.rgba[offset] * alphaWeight;
    green += source.rgba[offset + 1] * alphaWeight;
    blue += source.rgba[offset + 2] * alphaWeight;
  }
  if (alpha <= 0) return [0, 0, 0, 0];
  return [
    Math.round(red / alpha),
    Math.round(green / alpha),
    Math.round(blue / alpha),
    Math.round(alpha * 255),
  ];
}

/** Uniformly scale only when necessary, then bottom-centre on the fixed canvas. */
function packSelection(selection, outputWidth, outputHeight) {
  const availableWidth = outputWidth - PADDING * 2;
  const availableHeight = outputHeight - PADDING * 2;
  const requestedScale = Math.min(
    1,
    availableWidth / selection.width,
    availableHeight / selection.height,
  );
  const packedWidth = Math.max(
    1,
    Math.min(availableWidth, Math.round(selection.width * requestedScale)),
  );
  const packedHeight = Math.max(
    1,
    Math.min(availableHeight, Math.round(selection.height * requestedScale)),
  );
  const x = Math.floor((outputWidth - packedWidth) / 2);
  const y = outputHeight - PADDING - packedHeight;
  const output = new Uint8Array(outputWidth * outputHeight * 4);

  if (packedWidth === selection.width && packedHeight === selection.height) {
    for (let row = 0; row < selection.height; row++) {
      const from = row * selection.width * 4;
      const to = ((y + row) * outputWidth + x) * 4;
      output.set(selection.rgba.subarray(from, from + selection.width * 4), to);
    }
  } else {
    for (let targetY = 0; targetY < packedHeight; targetY++) {
      const sourceY = ((targetY + 0.5) * selection.height) / packedHeight - 0.5;
      for (let targetX = 0; targetX < packedWidth; targetX++) {
        const sourceX = ((targetX + 0.5) * selection.width) / packedWidth - 0.5;
        const pixel = samplePremultiplied(selection, sourceX, sourceY);
        const offset = ((y + targetY) * outputWidth + x + targetX) * 4;
        output[offset] = pixel[0];
        output[offset + 1] = pixel[1];
        output[offset + 2] = pixel[2];
        output[offset + 3] = pixel[3];
      }
    }
  }

  const visible = alphaBbox(outputWidth, outputHeight, output);
  if (!visible) throw new Error('packed selection produced no visible pixels');
  const padding = {
    left: visible.x0,
    top: visible.y0,
    right: outputWidth - 1 - visible.x1,
    bottom: outputHeight - 1 - visible.y1,
  };
  const minPadding = Math.min(padding.left, padding.top, padding.right, padding.bottom);
  if (minPadding < PADDING) {
    throw new Error(`packing invariant failed: minimum padding ${minPadding}px`);
  }

  return {
    rgba: output,
    report: {
      inputSize: [selection.width, selection.height],
      packedSize: [packedWidth, packedHeight],
      scaleX: round(packedWidth / selection.width),
      scaleY: round(packedHeight / selection.height),
      position: [x, y],
      visibleBbox: [visible.x0, visible.y0, visible.x1, visible.y1],
      padding,
    },
  };
}

function ensureBackup(targetPath) {
  const relativeTarget = relative(ROOT, targetPath);
  const backupPath = join(BACKUP_ROOT, relativeTarget);
  if (!existsSync(backupPath)) {
    mkdirSync(dirname(backupPath), { recursive: true });
    copyFileSync(targetPath, backupPath);
  }
  return backupPath;
}

function sourceForSingle(targetPath) {
  const backupPath = join(BACKUP_ROOT, relative(ROOT, targetPath));
  return existsSync(backupPath) ? backupPath : targetPath;
}

function detectOriginalEdgeFragments(source) {
  const analysis = findComponents(source.width, source.height, source.rgba);
  if (analysis.components.length === 0) throw new Error('single image has no visible content');
  const dominant = [...analysis.components].sort((a, b) => b.area - a.area)[0];
  return analysis.components.filter(
    (component) =>
      component.id !== dominant.id &&
      touchesEdge(component, source.width, source.height) &&
      bboxDistance(component, dominant) > EDGE_FRAGMENT_DISTANCE,
  );
}

function classifySingleSource(config) {
  const sourcePath = join(ROOT, 'sheets_alpha', config.path);
  const sourceBuffer = readFileSync(sourcePath);
  const source = decodePng(sourceBuffer);
  const analysis = findComponents(source.width, source.height, source.rgba);
  const expectedMainCount = config.rows.reduce((sum, row) => sum + row.length, 0);
  const main = analysis.components
    .filter((component) => component.area >= SINGLE_MAIN_MIN_AREA)
    .sort((a, b) => a.sumY / a.area - b.sumY / b.area);
  if (main.length !== expectedMainCount) {
    throw new Error(
      `${config.path}: expected ${expectedMainCount} main objects, found ${main.length}`,
    );
  }

  const grid = [];
  let offset = 0;
  for (const row of config.rows) {
    const rowComponents = main
      .slice(offset, offset + row.length)
      .sort((a, b) => a.sumX / a.area - b.sumX / b.area);
    grid.push(rowComponents.map((component) => ({ main: component, attached: [] })));
    offset += row.length;
  }

  const mainIds = new Set(main.map((component) => component.id));
  const discarded = [];
  for (const component of analysis.components) {
    if (mainIds.has(component.id)) continue;
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let row = 0; row < grid.length; row++) {
      for (let column = 0; column < grid[row].length; column++) {
        const distance = bboxDistance(component, grid[row][column].main);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { row, column };
        }
      }
    }
    if (nearest && nearestDistance <= SINGLE_DETACHED_PART_DISTANCE) {
      grid[nearest.row][nearest.column].attached.push(component);
    } else {
      discarded.push({ ...component, nearestDistance });
    }
  }

  const entries = [];
  const nominalColumns = Math.max(...config.rows.map((row) => row.length));
  for (let row = 0; row < config.rows.length; row++) {
    for (let column = 0; column < config.rows[row].length; column++) {
      const cell = grid[row][column];
      const selection = extractSelection(source, analysis.labels, [cell.main, ...cell.attached]);
      const nominal = {
        x0: Math.floor((column * source.width) / nominalColumns),
        y0: Math.floor((row * source.height) / config.rows.length),
        x1: Math.ceil(((column + 1) * source.width) / nominalColumns) - 1,
        y1: Math.ceil(((row + 1) * source.height) / config.rows.length) - 1,
      };
      entries.push({
        key: `${config.group}/${config.rows[row][column]}`,
        group: config.group,
        fileName: config.rows[row][column],
        source,
        sourcePath,
        sourceSha256: sha256(sourceBuffer),
        labels: analysis.labels,
        main: cell.main,
        attached: cell.attached,
        selection,
        recoveredOverflow:
          selection.sourceBbox[0] < nominal.x0 ||
          selection.sourceBbox[1] < nominal.y0 ||
          selection.sourceBbox[2] > nominal.x1 ||
          selection.sourceBbox[3] > nominal.y1,
      });
    }
  }

  return {
    entries,
    report: {
      path: relative(ROOT, sourcePath).replaceAll('\\', '/'),
      dimensions: [source.width, source.height],
      sha256: sha256(sourceBuffer),
      mainComponents: expectedMainCount,
      attachedComponents: grid.reduce(
        (sum, row) => sum + row.reduce((rowSum, cell) => rowSum + cell.attached.length, 0),
        0,
      ),
      discardedComponents: discarded.map((component) => ({
        ...componentReport(component),
        nearestDistance: round(component.nearestDistance, 1),
      })),
    },
  };
}

function buildSingleSources() {
  const entries = new Map();
  const reports = [];
  for (const config of SINGLE_SHEET_CONFIGS) {
    const classified = classifySingleSource(config);
    reports.push(classified.report);
    for (const entry of classified.entries) {
      if (entries.has(entry.key)) throw new Error(`duplicate single asset mapping: ${entry.key}`);
      entries.set(entry.key, entry);
    }
  }
  return { entries, reports };
}

function buildSingleAsset(canonical) {
  const { group, fileName } = canonical;
  const targetPath = join(PUBLIC_ASSETS, group, fileName);
  const originalPath = sourceForSingle(targetPath);
  const originalBuffer = readFileSync(originalPath);
  const original = decodePng(originalBuffer);
  const removed = detectOriginalEdgeFragments(original);
  const packed = packSelection(canonical.selection, original.width, original.height);
  const expectedBuffer = encodePng(original.width, original.height, packed.rgba);
  const currentBuffer = readFileSync(targetPath);

  return {
    targetPath,
    sourcePath: canonical.sourcePath,
    expectedBuffer,
    report: {
      path: relative(ROOT, targetPath).replaceAll('\\', '/'),
      kind: 'single-image',
      source: relative(ROOT, canonical.sourcePath).replaceAll('\\', '/'),
      original: relative(ROOT, originalPath).replaceAll('\\', '/'),
      dimensions: [original.width, original.height],
      canonicalMainComponent: componentReport(canonical.main),
      attachedComponents: canonical.attached.map(componentReport),
      removedComponents: removed.map(componentReport),
      removedOpaquePixels: removed.reduce((sum, component) => sum + component.area, 0),
      sourceBbox: canonical.selection.sourceBbox,
      recoveredOverflow: canonical.recoveredOverflow,
      packing: packed.report,
      sha256Original: sha256(originalBuffer),
      sha256Before: sha256(currentBuffer),
      sha256Expected: sha256(expectedBuffer),
      differsFromOriginal: !originalBuffer.equals(expectedBuffer),
      changed: !currentBuffer.equals(expectedBuffer),
    },
  };
}

function classifyDestructibleComponents(source) {
  const analysis = findComponents(source.width, source.height, source.rgba);
  const main = analysis.components
    .filter((component) => component.area >= DESTRUCTIBLE_MAIN_MIN_AREA)
    .sort((a, b) => a.sumY / a.area - b.sumY / b.area);

  if (main.length !== DESTRUCTIBLE_ROWS.length * DESTRUCTIBLE_FRAMES) {
    throw new Error(`expected 24 main destructible objects, found ${main.length}`);
  }

  const grid = [];
  for (let row = 0; row < DESTRUCTIBLE_ROWS.length; row++) {
    const rowComponents = main
      .slice(row * DESTRUCTIBLE_FRAMES, (row + 1) * DESTRUCTIBLE_FRAMES)
      .sort((a, b) => a.sumX / a.area - b.sumX / b.area);
    grid.push(rowComponents.map((component) => ({ main: component, attached: [] })));
  }

  const mainIds = new Set(main.map((component) => component.id));
  const discarded = [];
  for (const component of analysis.components) {
    if (mainIds.has(component.id)) continue;
    let nearest = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (let row = 0; row < grid.length; row++) {
      for (let frame = 0; frame < grid[row].length; frame++) {
        const distance = bboxDistance(component, grid[row][frame].main);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = { row, frame };
        }
      }
    }
    if (nearest && nearestDistance <= DESTRUCTIBLE_DETACHED_PART_DISTANCE) {
      grid[nearest.row][nearest.frame].attached.push(component);
    } else {
      discarded.push({ ...component, nearestDistance });
    }
  }

  return { ...analysis, grid, discarded };
}

function buildDestructibleAssets() {
  const sourceBuffer = readFileSync(DESTRUCTIBLE_SOURCE);
  const source = decodePng(sourceBuffer);
  if (source.width !== DESTRUCTIBLE_FRAME_WIDTH * DESTRUCTIBLE_FRAMES) {
    throw new Error(
      `destructible source width must be ${DESTRUCTIBLE_FRAME_WIDTH * DESTRUCTIBLE_FRAMES}`,
    );
  }
  if (source.height !== DESTRUCTIBLE_FRAME_HEIGHT * DESTRUCTIBLE_ROWS.length) {
    throw new Error(
      `destructible source height must be ${DESTRUCTIBLE_FRAME_HEIGHT * DESTRUCTIBLE_ROWS.length}`,
    );
  }

  const classified = classifyDestructibleComponents(source);
  const files = [];
  for (let row = 0; row < DESTRUCTIBLE_ROWS.length; row++) {
    const fileName = DESTRUCTIBLE_ROWS[row];
    const targetPath = join(PUBLIC_ASSETS, 'destructibles', fileName);
    const output = new Uint8Array(
      DESTRUCTIBLE_FRAME_WIDTH * DESTRUCTIBLE_FRAMES * DESTRUCTIBLE_FRAME_HEIGHT * 4,
    );
    const frameReports = [];

    for (let frame = 0; frame < DESTRUCTIBLE_FRAMES; frame++) {
      const cell = classified.grid[row][frame];
      const selected = [cell.main, ...cell.attached];
      const selection = extractSelection(source, classified.labels, selected);
      const packed = packSelection(selection, DESTRUCTIBLE_FRAME_WIDTH, DESTRUCTIBLE_FRAME_HEIGHT);
      for (let y = 0; y < DESTRUCTIBLE_FRAME_HEIGHT; y++) {
        const from = y * DESTRUCTIBLE_FRAME_WIDTH * 4;
        const to =
          (y * DESTRUCTIBLE_FRAME_WIDTH * DESTRUCTIBLE_FRAMES + frame * DESTRUCTIBLE_FRAME_WIDTH) *
          4;
        output.set(packed.rgba.subarray(from, from + DESTRUCTIBLE_FRAME_WIDTH * 4), to);
      }

      const nominal = {
        x0: frame * DESTRUCTIBLE_FRAME_WIDTH,
        y0: row * DESTRUCTIBLE_FRAME_HEIGHT,
        x1: (frame + 1) * DESTRUCTIBLE_FRAME_WIDTH - 1,
        y1: (row + 1) * DESTRUCTIBLE_FRAME_HEIGHT - 1,
      };
      const recoveredOverflow =
        selection.sourceBbox[0] < nominal.x0 ||
        selection.sourceBbox[1] < nominal.y0 ||
        selection.sourceBbox[2] > nominal.x1 ||
        selection.sourceBbox[3] > nominal.y1;
      frameReports.push({
        frame,
        mainComponent: componentReport(cell.main),
        attachedComponents: cell.attached.map(componentReport),
        sourceBbox: selection.sourceBbox,
        recoveredOverflow,
        packing: packed.report,
      });
    }

    const expectedBuffer = encodePng(
      DESTRUCTIBLE_FRAME_WIDTH * DESTRUCTIBLE_FRAMES,
      DESTRUCTIBLE_FRAME_HEIGHT,
      output,
    );
    const currentBuffer = readFileSync(targetPath);
    const originalPath = sourceForSingle(targetPath);
    const originalBuffer = readFileSync(originalPath);
    files.push({
      targetPath,
      sourcePath: DESTRUCTIBLE_SOURCE,
      expectedBuffer,
      report: {
        path: relative(ROOT, targetPath).replaceAll('\\', '/'),
        kind: 'destructible-strip',
        source: relative(ROOT, DESTRUCTIBLE_SOURCE).replaceAll('\\', '/'),
        dimensions: [DESTRUCTIBLE_FRAME_WIDTH * DESTRUCTIBLE_FRAMES, DESTRUCTIBLE_FRAME_HEIGHT],
        frameSize: [DESTRUCTIBLE_FRAME_WIDTH, DESTRUCTIBLE_FRAME_HEIGHT],
        frameCount: DESTRUCTIBLE_FRAMES,
        frames: frameReports,
        original: relative(ROOT, originalPath).replaceAll('\\', '/'),
        sha256Original: sha256(originalBuffer),
        sha256Before: sha256(currentBuffer),
        sha256Expected: sha256(expectedBuffer),
        differsFromOriginal: !originalBuffer.equals(expectedBuffer),
        changed: !currentBuffer.equals(expectedBuffer),
      },
    });
  }

  return {
    files,
    source: {
      path: relative(ROOT, DESTRUCTIBLE_SOURCE).replaceAll('\\', '/'),
      dimensions: [source.width, source.height],
      sha256: sha256(sourceBuffer),
      mainComponents: DESTRUCTIBLE_ROWS.length * DESTRUCTIBLE_FRAMES,
      discardedComponents: classified.discarded.map((component) => ({
        ...componentReport(component),
        nearestDistance: round(component.nearestDistance, 1),
      })),
    },
  };
}

function writeReport(path, report) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const singleSources = buildSingleSources();
  const built = [...singleSources.entries.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map(buildSingleAsset);
  const destructibles = buildDestructibleAssets();
  built.push(...destructibles.files);

  if (!options.check) {
    for (const asset of built) {
      ensureBackup(asset.targetPath);
      if (asset.report.changed) writeFileSync(asset.targetPath, asset.expectedBuffer);
    }
  }

  const changedFiles = built.filter((asset) => asset.report.changed);
  const removedComponents = built
    .filter((asset) => asset.report.kind === 'single-image')
    .reduce((sum, asset) => sum + asset.report.removedComponents.length, 0);
  const recoveredFrames = destructibles.files.reduce(
    (sum, asset) => sum + asset.report.frames.filter((frame) => frame.recoveredOverflow).length,
    0,
  );
  const recoveredSingleImages = built.filter(
    (asset) => asset.report.kind === 'single-image' && asset.report.recoveredOverflow,
  ).length;
  const assetsDifferentFromOriginal = built.filter(
    (asset) => asset.report.differsFromOriginal,
  ).length;
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: options.check ? 'check' : 'apply',
    policy: {
      alphaThreshold: ALPHA_THRESHOLD,
      minimumPadding: PADDING,
      singleImages:
        'recover the dominant object and nearby legitimate components from each full canonical sheet; discard disconnected edge fragments found in the old slices',
      destructibles:
        'recover each object from the full canonical sheet; preserve nearby detached parts; repack to four 362x181 frames',
      scaling:
        'uniform downscale only when selected content does not fit the original canvas with required padding',
      alignment: 'horizontal centre and 8px bottom padding',
    },
    backupRoot: relative(ROOT, BACKUP_ROOT).replaceAll('\\', '/'),
    objectSources: singleSources.reports,
    destructibleSource: destructibles.source,
    summary: {
      assetFiles: built.length,
      singleImages: built.filter((asset) => asset.report.kind === 'single-image').length,
      destructibleStrips: destructibles.files.length,
      destructibleFrames: destructibles.files.length * DESTRUCTIBLE_FRAMES,
      changedFiles: changedFiles.length,
      cleanFiles: built.length - changedFiles.length,
      assetsDifferentFromOriginal,
      removedDisconnectedEdgeComponents: removedComponents,
      singleImagesWithRecoveredOverflow: recoveredSingleImages,
      destructibleFramesWithRecoveredOverflow: recoveredFrames,
      checkPassed: options.check ? changedFiles.length === 0 : true,
    },
    files: built.map((asset) => asset.report),
    exceptions: [
      'Destructibles are rebuilt from sheets_alpha/destruibles.png because the previous fixed-row slices had already discarded overflowing pixels.',
      'Single-image objects are rebuilt from their complete sheets_alpha sources for the same reason; the old slices remain in the recoverable backup.',
      'Canvas dimensions remain unchanged for every single image and every destructible strip.',
    ],
  };

  const reportPath = options.report ?? (options.check ? null : DEFAULT_REPORT);
  if (reportPath) writeReport(reportPath, report);

  console.log(
    JSON.stringify(
      {
        mode: report.mode,
        ...report.summary,
        report: reportPath ? relative(ROOT, reportPath).replaceAll('\\', '/') : null,
      },
      null,
      2,
    ),
  );

  if (options.check && changedFiles.length > 0) process.exitCode = 1;
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
