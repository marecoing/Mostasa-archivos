/**
 * Inspection helper: composite a processed RGBA character sheet over a
 * mid-gray background with row separators + row-number ticks, so each
 * animation row can be read clearly. Output goes to scratchpad.
 *
 * Usage: node scripts/inspect-rows.mjs <id> [outPath]
 *   e.g. node scripts/inspect-rows.mjs enemy_001 /tmp/.../enemy_001_rows.png
 */

import { inflateSync, deflateSync } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c; }
  return t;
})();
function crc32(buf) { let crc = -1; for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8); return (crc ^ -1) >>> 0; }

function decodePng(buf) {
  const width = buf.readUInt32BE(16), height = buf.readUInt32BE(20);
  const colorType = buf[25];
  const channels = colorType === 6 ? 4 : 3;
  let off = 8; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
    if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[pos++]; const rowStart = y * stride;
    for (let x = 0; x < stride; x++) {
      const rawByte = raw[pos++];
      const a = x >= channels ? out[rowStart + x - channels] : 0;
      const b = y > 0 ? out[rowStart - stride + x] : 0;
      const c = (x >= channels && y > 0) ? out[rowStart - stride + x - channels] : 0;
      let val;
      switch (filter) {
        case 0: val = rawByte; break;
        case 1: val = rawByte + a; break;
        case 2: val = rawByte + b; break;
        case 3: val = rawByte + ((a + b) >> 1); break;
        case 4: { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); val = rawByte + ((pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c)); break; }
        default: throw new Error('bad filter');
      }
      out[rowStart + x] = val & 0xff;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (channels === 4) { rgba[i*4]=out[i*4]; rgba[i*4+1]=out[i*4+1]; rgba[i*4+2]=out[i*4+2]; rgba[i*4+3]=out[i*4+3]; }
    else { rgba[i*4]=out[i*3]; rgba[i*4+1]=out[i*3+1]; rgba[i*4+2]=out[i*3+2]; rgba[i*4+3]=255; }
  }
  return { width, height, rgba };
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  function chunk(type, data) { const t=Buffer.from(type,'ascii'); const l=Buffer.alloc(4); l.writeUInt32BE(data.length); const c=Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t,data]))); return Buffer.concat([l,t,data,c]); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width,0); ihdr.writeUInt32BE(height,4); ihdr[8]=8; ihdr[9]=6;
  const stride = width*4; const raw = Buffer.alloc(height*(1+stride));
  for (let y=0;y<height;y++){ raw[y*(1+stride)]=0; raw.set(Buffer.from(rgba.buffer, rgba.byteOffset + y*stride, stride), y*(1+stride)+1); }
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',deflateSync(raw,{level:6})), chunk('IEND',Buffer.alloc(0))]);
}

// ─── digit font 3×5 for row labels ──────────────────────────────────────
const DIGITS = {
  '0':[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],'1':[[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2':[[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],'3':[[1,1,1],[0,0,1],[0,1,1],[0,0,1],[1,1,1]],
  '4':[[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],'5':[[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  '6':[[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],'7':[[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
  '8':[[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],'9':[[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
};
function drawDigit(rgba, W, d, px, py, scale) {
  const g = DIGITS[d]; if (!g) return;
  for (let r=0;r<5;r++) for (let c=0;c<3;c++) if (g[r][c])
    for (let sy=0;sy<scale;sy++) for (let sx=0;sx<scale;sx++) {
      const x=px+c*scale+sx, y=py+r*scale+sy, i=(y*W+x)*4;
      rgba[i]=255; rgba[i+1]=240; rgba[i+2]=0; rgba[i+3]=255;
    }
}

const FRAME = 140, COLS = 8;
const id = process.argv[2] || 'enemy_001';
const outPath = process.argv[3] || join(ROOT, 'scratch_rows.png');

const src = decodePng(readFileSync(join(ROOT, 'public', 'assets', 'characters', `${id}.png`)));
const rows = src.height / FRAME;
const MARGIN = 26;
const W = src.width + MARGIN;
const H = src.height;
const out = new Uint8Array(W * H * 4);

// mid-gray background
for (let i = 0; i < W * H; i++) { out[i*4]=90; out[i*4+1]=92; out[i*4+2]=100; out[i*4+3]=255; }

// composite source over gray (offset by MARGIN in x)
for (let y = 0; y < src.height; y++) {
  for (let x = 0; x < src.width; x++) {
    const s = (y*src.width + x)*4;
    const a = src.rgba[s+3] / 255;
    if (a <= 0.02) continue;
    const d = (y*W + (x+MARGIN))*4;
    out[d]   = Math.round(src.rgba[s]  *a + out[d]  *(1-a));
    out[d+1] = Math.round(src.rgba[s+1]*a + out[d+1]*(1-a));
    out[d+2] = Math.round(src.rgba[s+2]*a + out[d+2]*(1-a));
    out[d+3] = 255;
  }
}

// row separators + column separators + row labels
for (let r = 0; r <= rows; r++) {
  const y = Math.min(H-1, r*FRAME);
  for (let x = 0; x < W; x++) { const i=(y*W+x)*4; out[i]=220; out[i+1]=40; out[i+2]=40; out[i+3]=255; }
}
for (let c = 0; c <= COLS; c++) {
  const x = Math.min(W-1, MARGIN + c*FRAME);
  for (let y = 0; y < H; y++) { const i=(y*W+x)*4; out[i]=50; out[i+1]=50; out[i+2]=70; out[i+3]=255; }
}
for (let r = 0; r < rows; r++) {
  const label = String(r);
  let cx = 3;
  for (const d of label) { drawDigit(out, W, d, cx, r*FRAME + 6, 4); cx += 14; }
}

writeFileSync(outPath, encodePng(W, H, out));
console.log(`${id}: ${rows} rows → ${outPath}`);
