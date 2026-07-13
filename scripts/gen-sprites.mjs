/**
 * Sprite sheet generator for MOSTASA'S RAGE — Escenario 1
 *
 * Generates placeholder PNG sprite sheets for every character.
 * Each animation state gets its own colour-coded row so artists
 * know exactly which frames to replace.
 *
 * Output locations (relative to project root):
 *   public/assets/player/mostasa.png
 *   public/assets/enemies/grunt.png
 *   public/assets/enemies/speedster.png
 *   public/assets/enemies/tank.png
 *   public/assets/enemies/zoner.png
 *   public/assets/enemies/miniboss.png
 *
 * Frame layout per sheet:
 *   - Each ROW = one animation state
 *   - Each CELL = one frame
 *   - Cell contains: state label text drawn in contrasting colour,
 *     frame number, and a body silhouette in the state colour
 */

import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');

// ─── CRC32 ────────────────────────────────────────────────────────────────────
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

// ─── PNG writer ───────────────────────────────────────────────────────────────
function makePng(w, h, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
    return Buffer.concat([lenBuf, t, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA

  // Build filtered scanlines (filter byte 0 = None per row)
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    for (let x = 0; x < w; x++) {
      const src = (y * w + x) * 4;
      const dst = y * (1 + w * 4) + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  const compressed = deflateSync(raw, { level: 7 });

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Pixel helpers ────────────────────────────────────────────────────────────
function hexToRgba(hex, a = 255) {
  const v = parseInt(hex.replace('#', ''), 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff, a];
}

function setPixel(buf, w, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= Math.floor(buf.length / 4 / w)) return;
  const i = (y * w + x) * 4;
  buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a;
}

function fillRect(buf, bw, x, y, rw, rh, r, g, b, a) {
  for (let dy = 0; dy < rh; dy++)
    for (let dx = 0; dx < rw; dx++)
      setPixel(buf, bw, x + dx, y + dy, r, g, b, a);
}

function drawText(buf, bw, text, px, py, r, g, b) {
  const glyphs = {
    '0':[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    '1':[[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
    '2':[[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
    '3':[[1,1,1],[0,0,1],[0,1,1],[0,0,1],[1,1,1]],
    '4':[[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
    '5':[[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
    '6':[[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
    '7':[[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
    '8':[[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
    '9':[[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
    'A':[[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'B':[[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
    'C':[[1,1,1],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'D':[[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
    'E':[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
    'F':[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
    'G':[[1,1,1],[1,0,0],[1,0,1],[1,0,1],[1,1,1]],
    'H':[[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
    'I':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'J':[[0,0,1],[0,0,1],[0,0,1],[1,0,1],[1,1,1]],
    'K':[[1,0,1],[1,1,0],[1,0,0],[1,1,0],[1,0,1]],
    'L':[[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'M':[[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
    'N':[[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
    'O':[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    'P':[[1,1,1],[1,0,1],[1,1,1],[1,0,0],[1,0,0]],
    'R':[[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
    'S':[[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
    'T':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'U':[[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    'W':[[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]],
    'X':[[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
    'Y':[[1,0,1],[1,0,1],[1,1,1],[0,1,0],[0,1,0]],
    'Z':[[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
    ' ':[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
    '-':[[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
  };
  let cx = px;
  for (const ch of text.toUpperCase()) {
    const glyph = glyphs[ch] ?? glyphs[' '];
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 3; col++)
        if (glyph[row][col]) setPixel(buf, bw, cx + col, py + row, r, g, b, 255);
    cx += 4;
  }
}

// ─── Sprite sheet builder ─────────────────────────────────────────────────────

/**
 * @typedef {{ name: string, frames: number, color: string }} AnimDef
 */

/**
 * @param {object} spec
 * @param {string} spec.id
 * @param {number} spec.fw  frame width
 * @param {number} spec.fh  frame height
 * @param {string} spec.bodyColor  hex string for body fill
 * @param {number} spec.headRadius
 * @param {AnimDef[]} spec.anims
 */
function buildSpriteSheet(spec) {
  const { fw, fh, bodyColor, headRadius, anims } = spec;
  const pad = 1; // 1px gap between frames

  const cols = anims.reduce((max, a) => Math.max(max, a.frames), 0);
  const rows = anims.length;
  const W = cols * (fw + pad) + pad;
  const H = rows * (fh + pad) + pad;

  const pixels = new Uint8Array(W * H * 4);
  // background: dark transparent
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 20; pixels[i+1] = 20; pixels[i+2] = 30; pixels[i+3] = 255;
  }

  const [br, bg, bb] = hexToRgba(bodyColor);

  anims.forEach((anim, rowIdx) => {
    const [ar, ag, ab] = hexToRgba(anim.color);

    for (let f = 0; f < anim.frames; f++) {
      const ox = pad + f * (fw + pad);
      const oy = pad + rowIdx * (fh + pad);

      // Cell background (slightly lighter dark per state)
      fillRect(pixels, W, ox, oy, fw, fh, 18, 18, 26, 255);

      // State color tint border (2px)
      fillRect(pixels, W, ox, oy, fw, 1, ar, ag, ab, 200);
      fillRect(pixels, W, ox, oy + fh - 1, fw, 1, ar, ag, ab, 200);
      fillRect(pixels, W, ox, oy, 1, fh, ar, ag, ab, 200);
      fillRect(pixels, W, ox + fw - 1, oy, 1, fh, ar, ag, ab, 200);

      // Body silhouette — rect from shoulders to feet
      const bodyW = Math.round(fw * 0.5);
      const bodyH = Math.round(fh * 0.65);
      const bodyX = ox + (fw - bodyW) / 2 | 0;
      const bodyY = oy + fh - bodyH - Math.round(fh * 0.05);

      // Body — blend between body color and state color based on frame
      const blend = f / Math.max(1, anim.frames - 1);
      const fr2 = Math.round(br * (1 - blend * 0.3) + ar * blend * 0.3);
      const fg2 = Math.round(bg * (1 - blend * 0.3) + ag * blend * 0.3);
      const fb2 = Math.round(bb * (1 - blend * 0.3) + ab * blend * 0.3);
      fillRect(pixels, W, bodyX, bodyY, bodyW, bodyH, fr2, fg2, fb2, 255);

      // Head — circle approximation via filled rect + corner cuts
      const hR = headRadius;
      const hcx = ox + fw / 2 | 0;
      const hcy = bodyY - hR;
      fillRect(pixels, W, hcx - hR + 1, hcy - hR, hR * 2 - 1, hR * 2, 244, 200, 154, 255);
      // corner cuts for roundish look
      setPixel(pixels, W, hcx - hR + 1, hcy - hR, 18, 18, 26, 255);
      setPixel(pixels, W, hcx + hR - 1, hcy - hR, 18, 18, 26, 255);
      setPixel(pixels, W, hcx - hR + 1, hcy + hR - 1, 18, 18, 26, 255);
      setPixel(pixels, W, hcx + hR - 1, hcy + hR - 1, 18, 18, 26, 255);

      // Frame number (bottom right, tiny pixel font)
      const fStr = String(f);
      const fStrX = ox + fw - fStr.length * 4 - 2;
      drawText(pixels, W, fStr, fStrX, oy + fh - 7, ar, ag, ab);

      // State name label (top left, very small)
      const label = anim.name.substring(0, Math.floor((fw - 4) / 4));
      drawText(pixels, W, label, ox + 2, oy + 2, ar, ag, ab);
    }
  });

  return makePng(W, H, pixels);
}

// ─── Character definitions ────────────────────────────────────────────────────

// Animation state colors (same meanings across all characters)
const ANIM_COLORS = {
  idle:       '#4488cc',
  walk:       '#44cc88',
  run:        '#88ddaa',
  jump:       '#88aaff',
  land:       '#5566cc',
  light_1:    '#ffaa44',
  light_2:    '#ff8822',
  light_3:    '#ff6600',
  heavy:      '#ff4400',
  air_attack: '#ff88ff',
  hurt:       '#ff4444',
  down:       '#cc2222',
  get_up:     '#cc8822',
  grab:       '#aa44ff',
  throw:      '#dd66ff',
  special:    '#ffee00',
  grabbed:    '#996633',
};

const PLAYER_ANIMS = [
  { name: 'idle',       frames:  4, color: ANIM_COLORS.idle       },
  { name: 'walk',       frames:  8, color: ANIM_COLORS.walk       },
  { name: 'run',        frames:  8, color: ANIM_COLORS.run        },
  { name: 'jump',       frames:  6, color: ANIM_COLORS.jump       },
  { name: 'land',       frames:  6, color: ANIM_COLORS.land       },
  { name: 'light-1',    frames: 14, color: ANIM_COLORS.light_1    }, // 3+3+8
  { name: 'light-2',    frames: 16, color: ANIM_COLORS.light_2    }, // 3+3+10
  { name: 'light-3',    frames: 26, color: ANIM_COLORS.light_3    }, // 4+4+18
  { name: 'heavy',      frames: 34, color: ANIM_COLORS.heavy      }, // 8+6+20
  { name: 'air-atk',   frames: 19, color: ANIM_COLORS.air_attack  }, // 4+5+10
  { name: 'hurt',       frames: 14, color: ANIM_COLORS.hurt       },
  { name: 'down',       frames: 40, color: ANIM_COLORS.down       },
  { name: 'get-up',     frames: 20, color: ANIM_COLORS.get_up     },
  { name: 'grab',       frames: 20, color: ANIM_COLORS.grab       },
  { name: 'throw',      frames: 15, color: ANIM_COLORS.throw      },
  { name: 'special',    frames: 45, color: ANIM_COLORS.special    },
];

const GRUNT_ANIMS = [
  { name: 'idle',   frames:  4, color: ANIM_COLORS.idle    },
  { name: 'walk',   frames:  8, color: ANIM_COLORS.walk    },
  { name: 'hurt',   frames:  8, color: ANIM_COLORS.hurt    },
  { name: 'down',   frames: 40, color: ANIM_COLORS.down    },
  { name: 'get-up', frames: 20, color: ANIM_COLORS.get_up  },
  { name: 'grabbed',frames:  8, color: ANIM_COLORS.grabbed },
];

const SPEEDSTER_ANIMS = [
  { name: 'idle',   frames:  4, color: ANIM_COLORS.idle    },
  { name: 'walk',   frames: 10, color: ANIM_COLORS.walk    }, // faster cycle
  { name: 'hurt',   frames:  6, color: ANIM_COLORS.hurt    },
  { name: 'down',   frames: 40, color: ANIM_COLORS.down    },
  { name: 'get-up', frames: 20, color: ANIM_COLORS.get_up  },
  { name: 'grabbed',frames:  8, color: ANIM_COLORS.grabbed },
];

const TANK_ANIMS = [
  { name: 'idle',   frames:  4, color: ANIM_COLORS.idle    },
  { name: 'walk',   frames:  8, color: ANIM_COLORS.walk    },
  { name: 'hurt',   frames: 10, color: ANIM_COLORS.hurt    }, // longer hitstun
  { name: 'down',   frames: 40, color: ANIM_COLORS.down    },
  { name: 'get-up', frames: 20, color: ANIM_COLORS.get_up  },
  { name: 'grabbed',frames:  8, color: ANIM_COLORS.grabbed },
];

const ZONER_ANIMS = [
  { name: 'idle',   frames:  6, color: ANIM_COLORS.idle    },
  { name: 'walk',   frames:  8, color: ANIM_COLORS.walk    },
  { name: 'hurt',   frames:  8, color: ANIM_COLORS.hurt    },
  { name: 'down',   frames: 40, color: ANIM_COLORS.down    },
  { name: 'get-up', frames: 20, color: ANIM_COLORS.get_up  },
  { name: 'grabbed',frames:  8, color: ANIM_COLORS.grabbed },
];

const MINIBOSS_ANIMS = [
  { name: 'idle',   frames:  6, color: ANIM_COLORS.idle    },
  { name: 'walk',   frames:  8, color: ANIM_COLORS.walk    },
  { name: 'attack', frames: 20, color: ANIM_COLORS.heavy   }, // miniboss has own attack
  { name: 'hurt',   frames: 12, color: ANIM_COLORS.hurt    },
  { name: 'down',   frames: 40, color: ANIM_COLORS.down    },
  { name: 'get-up', frames: 20, color: ANIM_COLORS.get_up  },
  { name: 'grabbed',frames:  8, color: ANIM_COLORS.grabbed },
];

// ─── Frame sizes & body colours (match EnemyData.ts / Physics) ───────────────
const CHARS = [
  {
    id: 'mostasa',
    outDir: 'player',
    fw: 64, fh: 80,
    bodyColor: '#1a3d2b',
    headRadius: 9,
    anims: PLAYER_ANIMS,
  },
  {
    id: 'grunt',
    outDir: 'enemies',
    fw: 44, fh: 80,
    bodyColor: '#8b2222',
    headRadius: 8,
    anims: GRUNT_ANIMS,
  },
  {
    id: 'speedster',
    outDir: 'enemies',
    fw: 40, fh: 72,
    bodyColor: '#228b44',
    headRadius: 7,
    anims: SPEEDSTER_ANIMS,
  },
  {
    id: 'tank',
    outDir: 'enemies',
    fw: 56, fh: 96,
    bodyColor: '#8b6622',
    headRadius: 10,
    anims: TANK_ANIMS,
  },
  {
    id: 'zoner',
    outDir: 'enemies',
    fw: 44, fh: 76,
    bodyColor: '#228888',
    headRadius: 8,
    anims: ZONER_ANIMS,
  },
  {
    id: 'miniboss',
    outDir: 'enemies',
    fw: 72, fh: 108,
    bodyColor: '#882288',
    headRadius: 12,
    anims: MINIBOSS_ANIMS,
  },
];

// ─── Generate ─────────────────────────────────────────────────────────────────
for (const char of CHARS) {
  const outDir = join(ROOT, 'public', 'assets', char.outDir);
  mkdirSync(outDir, { recursive: true });

  const png = buildSpriteSheet(char);
  const outPath = join(outDir, `${char.id}.png`);
  writeFileSync(outPath, png);

  const totalFrames = char.anims.reduce((s, a) => s + a.frames, 0);
  const cols = char.anims.reduce((m, a) => Math.max(m, a.frames), 0);
  const W = cols * (char.fw + 1) + 1;
  const H = char.anims.length * (char.fh + 1) + 1;
  console.log(`  ✓ ${char.id}.png  ${W}×${H}px  (${char.anims.length} states, ${totalFrames} frames total)`);
}

console.log('\nSprite sheets written to public/assets/player/ and public/assets/enemies/');
console.log('After build, they will be at dist/assets/player/ and dist/assets/enemies/');
console.log('\nFrame layout per file:');
console.log('  Each ROW = one animation state  |  Each CELL = one frame');
console.log('  State label + frame number rendered top-left / bottom-right of each cell');
console.log('  State colour key:');
Object.entries(ANIM_COLORS).forEach(([k, v]) => console.log(`    ${v}  →  ${k}`));
