import { createHash } from 'crypto';
import {
  CONTENT_ALPHA_MIN,
  CONTENT_PADDING,
  FRAME_GUTTER,
  MAX_EDGE_CHROMA_RATIO,
  MEASURE_ALPHA_MIN,
  TARGET_FRAME_HEIGHT,
} from './character-atlas-config.mjs';

const ROOT_AREA_RATIO = 0.35;
const ROW_SEARCH_RADIUS = 0.55;
const MIN_ROW_HEIGHT_RATIO = 0.45;
const MAX_ROW_BOUNDARY_ALPHA_RATIO = 0.025;
const FRAGMENT_AMBIGUITY_PX = 2;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function roundEven(value) {
  const rounded = Math.max(2, Math.ceil(value));
  return rounded % 2 === 0 ? rounded : rounded + 1;
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function componentBoundsFromPixel(pixel, width) {
  const x = pixel % width;
  const y = Math.floor(pixel / width);
  return { x0: x, x1: x, y0: y, y1: y };
}

function extendBounds(bounds, x, y) {
  bounds.x0 = Math.min(bounds.x0, x);
  bounds.x1 = Math.max(bounds.x1, x);
  bounds.y0 = Math.min(bounds.y0, y);
  bounds.y1 = Math.max(bounds.y1, y);
}

function finishComponent(component) {
  component.width = component.x1 - component.x0 + 1;
  component.height = component.y1 - component.y0 + 1;
  component.cx = (component.x0 + component.x1) / 2;
  component.cy = (component.y0 + component.y1) / 2;
  component.area = component.pixels.length;
  return component;
}

/**
 * Find 8-connected non-zero-alpha components inside one row band. Row bands
 * are intentionally isolated: a handful of touching pixels between two
 * ImageGen rows must not merge two otherwise valid poses.
 */
function findComponentsInBand(source, y0, y1) {
  const bandHeight = y1 - y0;
  const visited = new Uint8Array(source.width * bandHeight);
  const queue = new Int32Array(source.width * bandHeight);
  const components = [];

  for (let localStart = 0; localStart < visited.length; localStart++) {
    if (visited[localStart]) continue;
    const startX = localStart % source.width;
    const startY = y0 + Math.floor(localStart / source.width);
    const sourceStart = startY * source.width + startX;
    if (source.rgba[sourceStart * 4 + 3] === 0) {
      visited[localStart] = 1;
      continue;
    }

    let head = 0;
    let tail = 0;
    queue[tail++] = localStart;
    visited[localStart] = 1;
    const bounds = componentBoundsFromPixel(sourceStart, source.width);
    const component = { ...bounds, pixels: [] };

    while (head < tail) {
      const localPixel = queue[head++];
      const x = localPixel % source.width;
      const y = y0 + Math.floor(localPixel / source.width);
      const sourcePixel = y * source.width + x;
      component.pixels.push(sourcePixel);
      extendBounds(component, x, y);

      for (let dy = -1; dy <= 1; dy++) {
        const nextY = y + dy;
        if (nextY < y0 || nextY >= y1) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          if (nextX < 0 || nextX >= source.width) continue;
          const nextLocal = (nextY - y0) * source.width + nextX;
          if (visited[nextLocal]) continue;
          const nextSource = nextY * source.width + nextX;
          if (source.rgba[nextSource * 4 + 3] === 0) continue;
          visited[nextLocal] = 1;
          queue[tail++] = nextLocal;
        }
      }
    }
    components.push(finishComponent(component));
  }
  return components;
}

function horizontalOccupancy(source) {
  const occupancy = new Int32Array(source.height);
  for (let y = 0; y < source.height; y++) {
    let count = 0;
    for (let x = 0; x < source.width; x++) {
      if (source.rgba[(y * source.width + x) * 4 + 3] > 0) count++;
    }
    occupancy[y] = count;
  }
  return occupancy;
}

/** Locate deterministic low-occupancy cuts close to each expected row gap. */
function findRowBands(id, source, rows) {
  const occupancy = horizontalOccupancy(source);
  const averageHeight = source.height / rows;
  const minimumBandHeight = Math.max(2, Math.floor(averageHeight * MIN_ROW_HEIGHT_RATIO));
  const boundaries = [0];
  const boundaryAlphaPixels = [];

  for (let index = 1; index < rows; index++) {
    const target = index * averageHeight;
    const radius = averageHeight * ROW_SEARCH_RADIUS;
    const remainingBands = rows - index;
    const from = Math.max(
      boundaries[boundaries.length - 1] + minimumBandHeight,
      Math.floor(target - radius),
      1,
    );
    const to = Math.min(
      source.height - remainingBands * minimumBandHeight,
      Math.ceil(target + radius),
      source.height - 1,
    );
    if (from > to) throw new Error(`${id} row ${index}: no valid boundary search interval`);

    let bestY = from;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let y = from; y <= to; y++) {
      const score = occupancy[y - 1] + occupancy[y];
      const bandDeviation = Math.abs(y - boundaries[boundaries.length - 1] - averageHeight);
      const bestBandDeviation = Math.abs(bestY - boundaries[boundaries.length - 1] - averageHeight);
      if (score < bestScore || (score === bestScore && bandDeviation < bestBandDeviation)) {
        bestY = y;
        bestScore = score;
      }
    }

    const peakAtCut = Math.max(occupancy[bestY - 1], occupancy[bestY]);
    const ratio = peakAtCut / source.width;
    if (ratio > MAX_ROW_BOUNDARY_ALPHA_RATIO) {
      throw new Error(
        `${id} row boundary ${index} crosses ${peakAtCut}px (${(ratio * 100).toFixed(2)}% of width); ` +
          `maximum is ${(MAX_ROW_BOUNDARY_ALPHA_RATIO * 100).toFixed(2)}%`,
      );
    }
    boundaries.push(bestY);
    boundaryAlphaPixels.push(bestScore);
  }
  boundaries.push(source.height);

  return {
    bands: Array.from({ length: rows }, (_, row) => ({
      y0: boundaries[row],
      y1: boundaries[row + 1],
    })),
    boundaryAlphaPixels,
  };
}

function bboxDistance(a, b) {
  const dx = Math.max(0, a.x0 - b.x1 - 1, b.x0 - a.x1 - 1);
  const dy = Math.max(0, a.y0 - b.y1 - 1, b.y0 - a.y1 - 1);
  return Math.hypot(dx, dy);
}

function clusterFromComponents(root, components, row, col) {
  const cluster = {
    row,
    col,
    root,
    components: [...components],
    pixels: [],
    x0: root.x0,
    x1: root.x1,
    y0: root.y0,
    y1: root.y1,
  };
  for (const component of components) {
    cluster.pixels.push(...component.pixels);
    cluster.x0 = Math.min(cluster.x0, component.x0);
    cluster.x1 = Math.max(cluster.x1, component.x1);
    cluster.y0 = Math.min(cluster.y0, component.y0);
    cluster.y1 = Math.max(cluster.y1, component.y1);
  }
  cluster.width = cluster.x1 - cluster.x0 + 1;
  cluster.height = cluster.y1 - cluster.y0 + 1;
  return cluster;
}

/**
 * Segment a clean ImageGen contact sheet into exactly rows*cols poses.
 * Large body roots must be unambiguous; every smaller component is assigned
 * to the nearest body in the same row. Nothing is cycled or synthesized.
 */
export function segmentCharacterSource(id, layout, source) {
  const rowBands = findRowBands(id, source, layout.rows);
  const clusters = [];
  const rowRootCounts = [];
  let fragmentCount = 0;
  let sourceVisiblePixels = 0;

  for (let row = 0; row < layout.rows; row++) {
    const band = rowBands.bands[row];
    const expectedRoots = layout.rowCounts?.[row] ?? layout.cols;
    const components = findComponentsInBand(source, band.y0, band.y1);
    sourceVisiblePixels += components.reduce((sum, component) => sum + component.area, 0);
    if (components.length < expectedRoots) {
      throw new Error(
        `${id} row ${row}: found only ${components.length} alpha components for ${expectedRoots} poses`,
      );
    }

    const byArea = [...components].sort((a, b) => b.area - a.area);
    const provisionalRoots = byArea.slice(0, expectedRoots);
    const baselineArea = median(provisionalRoots.map((component) => component.area));
    const minimumRootArea = Math.max(64, Math.floor(baselineArea * ROOT_AREA_RATIO));
    const roots = components
      .filter((component) => component.area >= minimumRootArea)
      .sort((a, b) => a.cx - b.cx);
    rowRootCounts.push(roots.length);

    if (roots.length !== expectedRoots) {
      const areas = byArea
        .slice(0, expectedRoots + 3)
        .map((component) => component.area)
        .join(', ');
      throw new Error(
        `${id} row ${row}: found ${roots.length} body roots, expected ${expectedRoots}; ` +
          `root cutoff=${minimumRootArea}px, largest areas=[${areas}]`,
      );
    }

    const gaps = roots.slice(1).map((root, index) => root.cx - roots[index].cx);
    const medianGap = median(gaps);
    if (gaps.some((gap) => gap < medianGap * 0.35)) {
      throw new Error(`${id} row ${row}: body roots have an ambiguous horizontal ordering`);
    }

    const attachments = new Map(roots.map((root) => [root, [root]]));
    const fragments = components.filter((component) => !attachments.has(component));
    fragmentCount += fragments.length;

    for (const fragment of fragments) {
      const ranked = roots
        .map((root) => ({ root, distance: bboxDistance(fragment, root) }))
        .sort((a, b) => a.distance - b.distance || a.root.cx - b.root.cx);
      if (ranked.length > 1 && ranked[1].distance - ranked[0].distance <= FRAGMENT_AMBIGUITY_PX) {
        throw new Error(
          `${id} row ${row}: ${fragment.area}px fragment at (${fragment.cx.toFixed(1)},${fragment.cy.toFixed(1)}) ` +
            `is ambiguous between two poses`,
        );
      }
      attachments.get(ranked[0].root).push(fragment);
    }

    roots.forEach((root, col) => {
      clusters.push(clusterFromComponents(root, attachments.get(root), row, col));
    });
  }

  const expectedFrameCount =
    layout.rowCounts?.reduce((sum, count) => sum + count, 0) ?? layout.cols * layout.rows;
  if (clusters.length !== expectedFrameCount) {
    throw new Error(`${id}: segmented ${clusters.length} poses, expected ${expectedFrameCount}`);
  }

  const clusteredPixels = clusters.reduce((sum, cluster) => sum + cluster.pixels.length, 0);
  if (clusteredPixels !== sourceVisiblePixels) {
    throw new Error(
      `${id}: component assignment lost ${sourceVisiblePixels - clusteredPixels} visible pixels`,
    );
  }

  return {
    clusters,
    metrics: {
      strategy: 'alpha-components-voronoi-v3',
      sourceWidth: source.width,
      sourceHeight: source.height,
      rootCount: clusters.length,
      fragmentCount,
      rowRootCounts,
      rowBounds: rowBands.bands.map((band) => [band.y0, band.y1]),
      rowBoundaryAlphaPixels: rowBands.boundaryAlphaPixels,
      sourceVisiblePixels,
    },
  };
}

function makeClusterCrop(source, cluster) {
  const margin = 2;
  const width = cluster.width + margin * 2;
  const height = cluster.height + margin * 2;
  const rgba = new Uint8Array(width * height * 4);
  const originX = cluster.x0 - margin;
  const originY = cluster.y0 - margin;
  for (const sourcePixel of cluster.pixels) {
    const sourceX = sourcePixel % source.width;
    const sourceY = Math.floor(sourcePixel / source.width);
    const destinationPixel = (sourceY - originY) * width + sourceX - originX;
    const sourceIndex = sourcePixel * 4;
    const destinationIndex = destinationPixel * 4;
    rgba[destinationIndex] = source.rgba[sourceIndex];
    rgba[destinationIndex + 1] = source.rgba[sourceIndex + 1];
    rgba[destinationIndex + 2] = source.rgba[sourceIndex + 2];
    rgba[destinationIndex + 3] = source.rgba[sourceIndex + 3];
  }
  return { width, height, rgba, originX, originY };
}

function samplePremultipliedBilinear(image, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  const samples = [
    [x0, y0, (1 - tx) * (1 - ty)],
    [x0 + 1, y0, tx * (1 - ty)],
    [x0, y0 + 1, (1 - tx) * ty],
    [x0 + 1, y0 + 1, tx * ty],
  ];

  let alpha = 0;
  let premulR = 0;
  let premulG = 0;
  let premulB = 0;
  for (const [sampleX, sampleY, weight] of samples) {
    if (
      weight === 0 ||
      sampleX < 0 ||
      sampleY < 0 ||
      sampleX >= image.width ||
      sampleY >= image.height
    ) {
      continue;
    }
    const index = (sampleY * image.width + sampleX) * 4;
    const sampleAlpha = image.rgba[index + 3] / 255;
    const alphaWeight = sampleAlpha * weight;
    alpha += alphaWeight;
    premulR += image.rgba[index] * alphaWeight;
    premulG += image.rgba[index + 1] * alphaWeight;
    premulB += image.rgba[index + 2] * alphaWeight;
  }

  if (alpha <= 1 / 65535) return [0, 0, 0, 0];
  return [
    clamp(Math.round(premulR / alpha), 0, 255),
    clamp(Math.round(premulG / alpha), 0, 255),
    clamp(Math.round(premulB / alpha), 0, 255),
    clamp(Math.round(alpha * 255), 0, 255),
  ];
}

function renderClusterIntoAtlas(source, cluster, destination, metadata, scale) {
  const crop = makeClusterCrop(source, cluster);
  const frameX = cluster.col * metadata.frameWidth;
  const frameY = cluster.row * metadata.frameHeight;
  const destinationCenterX = (metadata.frameWidth - 1) / 2;
  const destinationFootY = metadata.frameHeight - CONTENT_PADDING - 1;
  const sourceCenterX = (cluster.x0 + cluster.x1) / 2;

  for (let y = FRAME_GUTTER; y < metadata.frameHeight - FRAME_GUTTER; y++) {
    const sourceY = cluster.y1 + (y - destinationFootY) / scale;
    const cropY = sourceY - crop.originY;
    if (cropY < -1 || cropY > crop.height) continue;
    for (let x = FRAME_GUTTER; x < metadata.frameWidth - FRAME_GUTTER; x++) {
      const sourceX = sourceCenterX + (x - destinationCenterX) / scale;
      const cropX = sourceX - crop.originX;
      if (cropX < -1 || cropX > crop.width) continue;
      const pixel = samplePremultipliedBilinear(crop, cropX, cropY);
      if (pixel[3] === 0) continue;
      const outputX = frameX + x;
      const outputY = frameY + y;
      const outputIndex = (outputY * destination.width + outputX) * 4;
      destination.rgba[outputIndex] = pixel[0];
      destination.rgba[outputIndex + 1] = pixel[1];
      destination.rgba[outputIndex + 2] = pixel[2];
      destination.rgba[outputIndex + 3] = pixel[3];
    }
  }
}

/**
 * Segment and repack an atlas with one isotropic scale for the whole sheet.
 * Frames are bottom-centred on the same foot line with a verified gutter.
 */
export function buildCharacterAtlas(id, layout, source) {
  const segmentation = segmentCharacterSource(id, layout, source);
  const maximumHeight = Math.max(...segmentation.clusters.map((cluster) => cluster.height));
  const maximumWidth = Math.max(...segmentation.clusters.map((cluster) => cluster.width));
  const uniformScale = (TARGET_FRAME_HEIGHT - CONTENT_PADDING * 2) / maximumHeight;
  const frameWidth = roundEven(maximumWidth * uniformScale + CONTENT_PADDING * 2);
  const frameHeight = TARGET_FRAME_HEIGHT;
  const width = frameWidth * layout.cols;
  const height = frameHeight * layout.rows;
  const image = { width, height, rgba: new Uint8Array(width * height * 4) };

  const renderMetadata = { frameWidth, frameHeight };
  for (const cluster of segmentation.clusters) {
    renderClusterIntoAtlas(source, cluster, image, renderMetadata, uniformScale);
  }

  const measurements = measureReferencePose(image, {
    frameWidth,
    frameHeight,
    cols: layout.cols,
    rows: layout.rows,
  });
  const totalCells = layout.cols * layout.rows;
  const emptyCells = [];
  for (let row = 0; row < layout.rows; row++) {
    const populated = layout.rowCounts?.[row] ?? layout.cols;
    for (let col = populated; col < layout.cols; col++) emptyCells.push(row * layout.cols + col);
  }
  const actualFrameCount = segmentation.clusters.length;

  return {
    image,
    metadata: {
      file: `assets/characters/${id}.png`,
      frameWidth,
      frameHeight,
      cols: layout.cols,
      rows: layout.rows,
      frameCount: actualFrameCount,
      totalCells,
      actualFrameCount,
      emptyCells,
      referenceBodyHeight: measurements.referenceBodyHeight,
      footAnchorY: measurements.footAnchorY,
      gutter: FRAME_GUTTER,
      pipelineVersion: 3,
      segmentation: {
        ...segmentation.metrics,
        uniformScale: Number(uniformScale.toFixed(6)),
      },
    },
  };
}

function frameAlphaBounds(image, metadata, col, row, alphaMin = MEASURE_ALPHA_MIN) {
  const frameX = col * metadata.frameWidth;
  const frameY = row * metadata.frameHeight;
  let x0 = metadata.frameWidth;
  let y0 = metadata.frameHeight;
  let x1 = -1;
  let y1 = -1;
  let count = 0;

  for (let y = 0; y < metadata.frameHeight; y++) {
    for (let x = 0; x < metadata.frameWidth; x++) {
      const index = ((frameY + y) * image.width + frameX + x) * 4;
      if (image.rgba[index + 3] <= alphaMin) continue;
      count++;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return { x0, y0, x1, y1, count };
}

/** Measure the canonical standing reference from logical animation row 0. */
export function measureReferencePose(image, metadata) {
  const heights = [];
  const feet = [];
  for (let col = 0; col < metadata.cols; col++) {
    const bounds = frameAlphaBounds(image, metadata, col, 0);
    if (bounds.count === 0) continue;
    heights.push(bounds.y1 - bounds.y0 + 1);
    feet.push(bounds.y1);
  }
  if (heights.length !== metadata.cols) {
    throw new Error(`reference row has ${heights.length}/${metadata.cols} non-empty frames`);
  }
  return {
    referenceBodyHeight: median(heights),
    footAnchorY: median(feet),
  };
}

function hashFrame(image, metadata, col, row) {
  const hash = createHash('sha256');
  for (let y = 0; y < metadata.frameHeight; y++) {
    const offset = ((row * metadata.frameHeight + y) * image.width + col * metadata.frameWidth) * 4;
    hash.update(
      Buffer.from(image.rgba.buffer, image.rgba.byteOffset + offset, metadata.frameWidth * 4),
    );
  }
  return hash.digest('hex');
}

function isInGutter(x, y, metadata) {
  const rightStart = metadata.frameWidth - metadata.gutter;
  const bottomStart = metadata.frameHeight - metadata.gutter;
  return x < metadata.gutter || x >= rightStart || y < metadata.gutter || y >= bottomStart;
}

/** Validate one decoded atlas and return metrics suitable for CI output. */
export function validateCharacterAtlas(id, image, metadata, expectedLayout = null) {
  const errors = [];
  const totalCells = metadata.totalCells ?? metadata.cols * metadata.rows;
  const actualFrameCount = metadata.actualFrameCount ?? metadata.frameCount;
  const emptyCells = metadata.emptyCells ?? [];
  if (image.width !== metadata.frameWidth * metadata.cols) {
    errors.push(`width ${image.width} != ${metadata.frameWidth}*${metadata.cols}`);
  }
  if (image.height !== metadata.frameHeight * metadata.rows) {
    errors.push(`height ${image.height} != ${metadata.frameHeight}*${metadata.rows}`);
  }
  if (totalCells !== metadata.cols * metadata.rows) {
    errors.push(`totalCells ${totalCells} != ${metadata.cols * metadata.rows}`);
  }
  if (metadata.frameCount !== actualFrameCount) {
    errors.push(`frameCount ${metadata.frameCount} != actualFrameCount ${actualFrameCount}`);
  }
  if (actualFrameCount !== totalCells - emptyCells.length) {
    errors.push(
      `actualFrameCount ${actualFrameCount} != ${totalCells}-${emptyCells.length} empty cells`,
    );
  }
  if (metadata.frameWidth % 2 !== 0) errors.push(`frameWidth ${metadata.frameWidth} is not even`);
  if (
    expectedLayout &&
    (metadata.cols !== expectedLayout.cols || metadata.rows !== expectedLayout.rows)
  ) {
    errors.push(
      `logical grid ${metadata.cols}x${metadata.rows} != ${expectedLayout.cols}x${expectedLayout.rows}`,
    );
  }
  if (expectedLayout) {
    const expectedEmptyCells = [];
    for (let row = 0; row < expectedLayout.rows; row++) {
      const populated = expectedLayout.rowCounts?.[row] ?? expectedLayout.cols;
      for (let col = populated; col < expectedLayout.cols; col++) {
        expectedEmptyCells.push(row * expectedLayout.cols + col);
      }
    }
    if (JSON.stringify(emptyCells) !== JSON.stringify(expectedEmptyCells)) {
      errors.push(
        `declared empty cells [${emptyCells.join(', ')}] != expected [${expectedEmptyCells.join(', ')}]`,
      );
    }
  }
  if (metadata.pipelineVersion >= 3) {
    const segmentation = metadata.segmentation;
    if (!segmentation || segmentation.strategy !== 'alpha-components-voronoi-v3') {
      errors.push('missing v3 segmentation metadata');
    } else {
      if (segmentation.rootCount !== actualFrameCount) {
        errors.push(
          `segmented roots ${segmentation.rootCount} != actualFrameCount ${actualFrameCount}`,
        );
      }
      const expectedRowCounts =
        expectedLayout?.rowCounts ?? Array.from({ length: metadata.rows }, () => metadata.cols);
      if (
        segmentation.rowRootCounts.length !== metadata.rows ||
        segmentation.rowRootCounts.some((count, row) => count !== expectedRowCounts[row])
      ) {
        errors.push(`invalid per-row root counts [${segmentation.rowRootCounts.join(', ')}]`);
      }
      if (!(segmentation.uniformScale > 0)) errors.push('uniformScale must be positive');
      if (!(segmentation.sourceVisiblePixels > 0))
        errors.push('sourceVisiblePixels must be positive');
    }
  }
  if (errors.length > 0) return { id, errors, metrics: null };

  let semiTransparent = 0;
  let visible = 0;
  let gutterLeaks = 0;
  let edgePixels = 0;
  let chromaResidue = 0;
  const hashes = new Map();
  const emptyCellSet = new Set(emptyCells);

  for (let row = 0; row < metadata.rows; row++) {
    for (let col = 0; col < metadata.cols; col++) {
      const frameIndex = row * metadata.cols + col;
      const bounds = frameAlphaBounds(image, metadata, col, row, CONTENT_ALPHA_MIN);
      if (emptyCellSet.has(frameIndex)) {
        if (bounds.count > 0) errors.push(`declared empty frame r${row}c${col} contains alpha`);
        continue;
      }
      if (bounds.count === 0) errors.push(`frame r${row}c${col} is unexpectedly empty`);
      const hash = hashFrame(image, metadata, col, row);
      if (hashes.has(hash)) {
        const prior = hashes.get(hash);
        if (metadata.pipelineVersion >= 2) errors.push(`frame r${row}c${col} duplicates ${prior}`);
      } else {
        hashes.set(hash, `r${row}c${col}`);
      }

      const frameX = col * metadata.frameWidth;
      const frameY = row * metadata.frameHeight;
      for (let y = 0; y < metadata.frameHeight; y++) {
        for (let x = 0; x < metadata.frameWidth; x++) {
          const index = ((frameY + y) * image.width + frameX + x) * 4;
          const alpha = image.rgba[index + 3];
          if (alpha > 0 && alpha < 255) semiTransparent++;
          if (alpha > CONTENT_ALPHA_MIN) visible++;
          if (alpha > 0 && isInGutter(x, y, metadata)) gutterLeaks++;
          if (alpha <= CONTENT_ALPHA_MIN) continue;

          const neighbours = [
            x > 0 ? index - 4 : -1,
            x + 1 < metadata.frameWidth ? index + 4 : -1,
            y > 0 ? index - image.width * 4 : -1,
            y + 1 < metadata.frameHeight ? index + image.width * 4 : -1,
          ];
          const onAlphaEdge = neighbours.some(
            (neighbour) => neighbour < 0 || image.rgba[neighbour + 3] <= CONTENT_ALPHA_MIN,
          );
          if (!onAlphaEdge) continue;
          edgePixels++;
          const red = image.rgba[index];
          const green = image.rgba[index + 1];
          const blue = image.rgba[index + 2];
          const greenKey = green > 100 && green - Math.max(red, blue) > 55;
          const magentaKey = red > 100 && blue > 100 && (red + blue) / 2 - green > 55;
          if (greenKey || magentaKey) chromaResidue++;
        }
      }
    }
  }

  const measurements = measureReferencePose(image, metadata);
  if (measurements.referenceBodyHeight !== metadata.referenceBodyHeight) {
    errors.push(
      `referenceBodyHeight ${metadata.referenceBodyHeight} != measured ${measurements.referenceBodyHeight}`,
    );
  }
  if (measurements.footAnchorY !== metadata.footAnchorY) {
    errors.push(`footAnchorY ${metadata.footAnchorY} != measured ${measurements.footAnchorY}`);
  }

  if (metadata.pipelineVersion >= 2) {
    const minimumSoftPixels = Math.max(32, Math.floor(visible * 0.0005));
    if (semiTransparent < minimumSoftPixels) {
      errors.push(
        `soft alpha has ${semiTransparent} pixels; expected at least ${minimumSoftPixels}`,
      );
    }
    if (gutterLeaks > 0)
      errors.push(`transparent gutter contains ${gutterLeaks} non-zero alpha pixels`);
    const residueRatio = edgePixels === 0 ? 0 : chromaResidue / edgePixels;
    if (residueRatio > MAX_EDGE_CHROMA_RATIO) {
      errors.push(
        `edge chroma residue ${(residueRatio * 100).toFixed(2)}% exceeds ${(MAX_EDGE_CHROMA_RATIO * 100).toFixed(2)}%`,
      );
    }
  }

  return {
    id,
    errors,
    metrics: {
      visible,
      semiTransparent,
      gutterLeaks,
      edgePixels,
      chromaResidue,
      duplicateFrames: actualFrameCount - hashes.size,
    },
  };
}
