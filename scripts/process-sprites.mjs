/**
 * Sprite processor for MOSTASA'S RAGE — Escenario 1
 *
 * Takes the raw uploaded 12×8 / 10×8 / 11×8 sprite sheets on magenta
 * (#FF00FF) background and produces game-ready RGBA PNGs with the
 * magenta keyed out to transparency (+ edge despill).
 *
 * Pure Node.js (zlib only) — no native image deps.
 *
 * Input:  assets/raw/characters/{00-mostasa,01-...,10-...}.png (RGB, colorType 2)
 * Output: public/assets/characters/{id}.png                    (RGBA, colorType 6)
 */

import { inflateSync, deflateSync } from 'zlib';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// ─── CRC32 ──────────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();
function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

// ─── PNG decode (colorType 2 or 6, 8-bit, non-interlaced) ───────────────
function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a PNG');
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const interlace = buf[28];
  if (bitDepth !== 8) throw new Error(`unsupported bitDepth ${bitDepth}`);
  if (interlace !== 0) throw new Error('interlaced PNG unsupported');
  if (colorType !== 2 && colorType !== 6) throw new Error(`unsupported colorType ${colorType}`);

  const channels = colorType === 6 ? 4 : 3;

  // gather IDAT
  let off = 8;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
    if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));

  // unfilter
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos++];
      const a = x >= channels ? out[rowStart + x - channels] : 0;      // left
      const b = y > 0 ? out[rowStart - stride + x] : 0;                 // up
      const c = (x >= channels && y > 0) ? out[rowStart - stride + x - channels] : 0; // up-left
      let val;
      switch (filter) {
        case 0: val = rawByte; break;
        case 1: val = rawByte + a; break;
        case 2: val = rawByte + b; break;
        case 3: val = rawByte + ((a + b) >> 1); break;
        case 4: {
          const p = a + b - c;
          const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          const pred = (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
          val = rawByte + pred;
          break;
        }
        default: throw new Error(`bad filter ${filter}`);
      }
      out[rowStart + x] = val & 0xff;
    }
  }

  // to RGBA
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (channels === 4) {
      rgba[i * 4] = out[i * 4];
      rgba[i * 4 + 1] = out[i * 4 + 1];
      rgba[i * 4 + 2] = out[i * 4 + 2];
      rgba[i * 4 + 3] = out[i * 4 + 3];
    } else {
      rgba[i * 4] = out[i * 3];
      rgba[i * 4 + 1] = out[i * 3 + 1];
      rgba[i * 4 + 2] = out[i * 3 + 2];
      rgba[i * 4 + 3] = 255;
    }
  }
  return { width, height, rgba };
}

// ─── PNG encode (RGBA) ──────────────────────────────────────────────────
function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([lenBuf, t, data, crcBuf]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc(height * (1 + stride));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + stride)] = 0;
    rgba.subarray ?
      raw.set(Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride), y * (1 + stride) + 1) :
      null;
  }
  const compressed = deflateSync(raw, { level: 8 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}

// ─── Magenta key-out + despill ──────────────────────────────────────────
/**
 * A pixel is "magenta" when R and B are high while G is low.
 * We fully clear strong magenta, and for near-magenta edge pixels we
 * reduce the magenta tint (despill) and partially fade alpha so the
 * silhouette keeps clean anti-aliased edges.
 */
function keyMagenta(width, height, rgba) {
  const out = new Uint8Array(rgba.length);
  let cleared = 0;
  for (let i = 0; i < width * height; i++) {
    const r = rgba[i * 4], g = rgba[i * 4 + 1], b = rgba[i * 4 + 2];
    const magentaness = (r + b) / 2 - g; // high when magenta

    if (r > 180 && b > 180 && g < 110 && magentaness > 90) {
      // strong background magenta → transparent
      out[i * 4] = 0; out[i * 4 + 1] = 0; out[i * 4 + 2] = 0; out[i * 4 + 3] = 0;
      cleared++;
    } else if (magentaness > 40 && g < 150) {
      // edge despill: G is the true channel; pull R,B toward G
      const ng = g;
      const nr = Math.min(r, g + 30);
      const nb = Math.min(b, g + 30);
      // alpha faded proportionally to remaining magentaness
      const t = Math.min(1, (magentaness - 40) / 80);
      const alpha = Math.round(255 * (1 - t * 0.6));
      out[i * 4] = nr; out[i * 4 + 1] = ng; out[i * 4 + 2] = nb; out[i * 4 + 3] = alpha;
    } else {
      out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
    }
  }
  return { out, cleared };
}

// ─── Characters (uploaded sheets in repo root) ──────────────────────────
const CHARACTERS = [
  { file: '00-mostasa.png',                       id: 'mostasa',    rows: 12 },
  { file: '01-el-trapito-extorsionador.png',      id: 'enemy_001',  rows: 10 },
  { file: '02-el-cuidacoches-del-silbato.png',    id: 'enemy_002',  rows: 10 },
  { file: '03-el-mantero-de-relojes.png',         id: 'enemy_003',  rows: 10 },
  { file: '04-el-patovica-del-once.png',          id: 'enemy_004',  rows: 10 },
  { file: '05-el-cadete-de-la-bicicleta-furiosa.png', id: 'enemy_005', rows: 10 },
  { file: '06-el-changuero-del-mercado.png',      id: 'enemy_006',  rows: 10 },
  { file: '07-el-grafitero-del-subte.png',        id: 'enemy_007',  rows: 10 },
  { file: '08-el-carterista-del-anden.png',       id: 'enemy_008',  rows: 10 },
  { file: '09-el-cartonero-blindado.png',         id: 'enemy_009',  rows: 11 },
  { file: '10-el-capataz-nocturno.png',           id: 'enemy_010',  rows: 12 },
];

const FRAME = 140;
const COLS = 8;
const outDir = join(ROOT, 'public', 'assets', 'characters');
mkdirSync(outDir, { recursive: true });

console.log('Processing sprite sheets (magenta key-out)…\n');
const RAW_DIR = join(ROOT, 'assets', 'raw', 'characters');
for (const ch of CHARACTERS) {
  const inPath = join(RAW_DIR, ch.file);
  let buf;
  try { buf = readFileSync(inPath); } catch { console.log(`  ⚠ missing ${ch.file}, skipping`); continue; }

  const { width, height, rgba } = decodePng(buf);
  const expectedH = ch.rows * FRAME;
  const okDims = width === COLS * FRAME && height === expectedH;

  const { out, cleared } = keyMagenta(width, height, rgba);
  const png = encodePng(width, height, out);
  writeFileSync(join(outDir, `${ch.id}.png`), png);

  const pct = ((cleared / (width * height)) * 100).toFixed(0);
  const dimNote = okDims ? '' : `  (⚠ expected ${COLS * FRAME}×${expectedH})`;
  console.log(`  ✓ ${ch.id.padEnd(10)} ${width}×${height}  rows=${ch.rows}  keyed=${pct}%${dimNote}`);
}

console.log(`\nOutput → public/assets/characters/  (${FRAME}×${FRAME} frames, ${COLS} cols)`);
