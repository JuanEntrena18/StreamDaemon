#!/usr/bin/env node
/**
 * Generate real PNG spritesheets (with alpha transparency) for the avatar system.
 * No external dependencies — uses a minimal PNG encoder.
 *
 * Usage: node scripts/generate-spritesheets.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ─── Minimal PNG writer ──────────────────────────────────────────────

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcData = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, crcData, crcBuf]);
}

function encodePNG(width, height, rgba) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // IDAT — filter type 0 (None) per row
  const rowLen = width * 4;
  const raw = Buffer.alloc(height * (1 + rowLen));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + rowLen)] = 0; // filter byte
    rgba.copy(raw, y * (1 + rowLen) + 1, y * rowLen, (y + 1) * rowLen);
  }
  const compressed = zlib.deflateSync(raw, { level: 6 });

  // IEND
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ─── Drawing helpers ─────────────────────────────────────────────────

class PixelCanvas {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = Buffer.alloc(w * h * 4, 0); // All transparent
  }

  setPixel(x, y, r, g, b, a = 255) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  fillRect(x, y, w, h, r, g, b, a = 255) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setPixel(x + dx, y + dy, r, g, b, a);
      }
    }
  }

  fillCircle(cx, cy, radius, r, g, b, a = 255) {
    const r2 = radius * radius;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy <= r2) {
          this.setPixel(cx + dx, cy + dy, r, g, b, a);
        }
      }
    }
  }

  fillRoundRect(x, y, w, h, rad, r, g, b, a = 255) {
    // Body
    this.fillRect(x + rad, y, w - 2 * rad, h, r, g, b, a);
    this.fillRect(x, y + rad, w, h - 2 * rad, r, g, b, a);
    // Corners
    this.fillCircle(x + rad, y + rad, rad, r, g, b, a);
    this.fillCircle(x + w - rad - 1, y + rad, rad, r, g, b, a);
    this.fillCircle(x + rad, y + h - rad - 1, rad, r, g, b, a);
    this.fillCircle(x + w - rad - 1, y + h - rad - 1, rad, r, g, b, a);
  }

  toPNG() {
    return encodePNG(this.w, this.h, this.data);
  }
}

// ─── Colour palettes ────────────────────────────────────────────────

const PALETTES = {
  cyberpunk: {
    body: [30, 15, 50],
    accent: [255, 0, 200],    // Neon pink
    accent2: [0, 255, 255],   // Cyan
    visor: [180, 0, 255],     // Purple visor
    eye: [0, 255, 200],
    outline: [80, 20, 120],
    boots: [40, 10, 60],
    highlight: [255, 100, 255],
  },
  default: {
    body: [60, 130, 180],     // Blue robot
    accent: [255, 160, 40],   // Orange
    accent2: [100, 200, 255], // Light blue
    visor: [40, 50, 60],      // Dark visor
    eye: [255, 220, 60],      // Yellow eyes
    outline: [30, 70, 100],
    boots: [40, 90, 130],
    highlight: [150, 220, 255],
  },
  '8bits': {
    body: [50, 180, 80],      // Green
    accent: [255, 255, 255],  // White
    accent2: [255, 200, 150], // Skin
    visor: [50, 120, 60],
    eye: [20, 20, 20],
    outline: [20, 80, 30],
    boots: [100, 60, 30],
    highlight: [120, 255, 140],
  },
};

// ─── Character drawing ──────────────────────────────────────────────

function drawCharacter(canvas, ox, oy, frameSize, palette, pose) {
  const s = frameSize / 128; // Scale factor relative to 128px base
  const p = palette;
  const { body, accent, accent2, visor, eye, outline, boots, highlight } = p;

  // Pose offsets
  const legOff = pose.legOffset || 0;
  const armOff = pose.armOffset || 0;
  const headOff = pose.headOffset || 0;
  const bodyTilt = pose.bodyTilt || 0;
  const squash = pose.squash || 1;
  const stretch = pose.stretch || 1;

  const cx = ox + frameSize / 2;
  const baseY = oy + frameSize - Math.round(8 * s);

  // ─── Boots / Feet ───
  const bootW = Math.round(14 * s);
  const bootH = Math.round(10 * s);
  // Left foot
  canvas.fillRoundRect(
    Math.round(cx - 18 * s + legOff), baseY - bootH,
    bootW, bootH, Math.round(3 * s),
    ...boots
  );
  // Right foot
  canvas.fillRoundRect(
    Math.round(cx + 4 * s - legOff), baseY - bootH,
    bootW, bootH, Math.round(3 * s),
    ...boots
  );

  // ─── Legs ───
  const legW = Math.round(10 * s);
  const legH = Math.round(20 * s * stretch);
  // Left leg
  canvas.fillRect(
    Math.round(cx - 14 * s + legOff), baseY - bootH - legH,
    legW, legH,
    ...body
  );
  // Right leg
  canvas.fillRect(
    Math.round(cx + 4 * s - legOff), baseY - bootH - legH,
    legW, legH,
    ...body
  );

  // ─── Body (torso) ───
  const torsoTop = baseY - bootH - legH;
  const torsoW = Math.round(36 * s * squash);
  const torsoH = Math.round(30 * s * stretch);
  canvas.fillRoundRect(
    Math.round(cx - torsoW / 2 + bodyTilt), torsoTop - torsoH,
    torsoW, torsoH, Math.round(6 * s),
    ...body
  );
  // Accent stripe on torso
  canvas.fillRect(
    Math.round(cx - torsoW / 2 + 3 * s + bodyTilt), torsoTop - torsoH + Math.round(8 * s),
    torsoW - Math.round(6 * s), Math.round(3 * s),
    ...accent
  );
  // Second accent line
  canvas.fillRect(
    Math.round(cx - torsoW / 2 + 3 * s + bodyTilt), torsoTop - torsoH + Math.round(14 * s),
    torsoW - Math.round(6 * s), Math.round(2 * s),
    ...accent2
  );

  // ─── Arms ───
  const armW = Math.round(8 * s);
  const armH = Math.round(22 * s);
  // Left arm
  canvas.fillRoundRect(
    Math.round(cx - torsoW / 2 - armW + bodyTilt), torsoTop - torsoH + Math.round(4 * s) - armOff,
    armW, armH, Math.round(3 * s),
    ...body
  );
  // Left hand
  canvas.fillCircle(
    Math.round(cx - torsoW / 2 - armW / 2 + bodyTilt),
    torsoTop - torsoH + Math.round(4 * s) + armH - armOff,
    Math.round(4 * s),
    ...accent2
  );
  // Right arm
  canvas.fillRoundRect(
    Math.round(cx + torsoW / 2 + bodyTilt), torsoTop - torsoH + Math.round(4 * s) + armOff,
    armW, armH, Math.round(3 * s),
    ...body
  );
  // Right hand
  canvas.fillCircle(
    Math.round(cx + torsoW / 2 + armW / 2 + bodyTilt),
    torsoTop - torsoH + Math.round(4 * s) + armH + armOff,
    Math.round(4 * s),
    ...accent2
  );

  // ─── Head ───
  const headY = torsoTop - torsoH - Math.round(24 * s) + headOff;
  const headW = Math.round(32 * s);
  const headH = Math.round(28 * s);
  canvas.fillRoundRect(
    Math.round(cx - headW / 2 + bodyTilt), headY,
    headW, headH, Math.round(8 * s),
    ...outline
  );
  // Inner head
  canvas.fillRoundRect(
    Math.round(cx - headW / 2 + 2 * s + bodyTilt), headY + Math.round(2 * s),
    headW - Math.round(4 * s), headH - Math.round(4 * s), Math.round(6 * s),
    ...body
  );
  // Visor
  canvas.fillRoundRect(
    Math.round(cx - 12 * s + bodyTilt), headY + Math.round(8 * s),
    Math.round(24 * s), Math.round(8 * s), Math.round(3 * s),
    ...visor
  );
  // Eyes on visor
  canvas.fillRect(
    Math.round(cx - 8 * s + bodyTilt), headY + Math.round(10 * s),
    Math.round(5 * s), Math.round(4 * s),
    ...eye
  );
  canvas.fillRect(
    Math.round(cx + 3 * s + bodyTilt), headY + Math.round(10 * s),
    Math.round(5 * s), Math.round(4 * s),
    ...eye
  );

  // Antenna / decoration (cyberpunk-style)
  canvas.fillRect(
    Math.round(cx - 1 * s + bodyTilt), headY - Math.round(6 * s),
    Math.round(2 * s), Math.round(8 * s),
    ...accent
  );
  canvas.fillCircle(
    Math.round(cx + bodyTilt), headY - Math.round(6 * s),
    Math.round(3 * s),
    ...highlight
  );
}

// ─── Animation poses ────────────────────────────────────────────────

const ANIMATIONS = {
  idle: [
    { headOffset: 0 },
    { headOffset: -1 },
    { headOffset: -2 },
    { headOffset: -1 },
  ],
  run: [
    { legOffset: -6, armOffset: -8, headOffset: -1 },
    { legOffset: -3, armOffset: -4, headOffset: -2 },
    { legOffset: 0, armOffset: 0, headOffset: -3 },
    { legOffset: 3, armOffset: 4, headOffset: -2 },
    { legOffset: 6, armOffset: 8, headOffset: -1 },
    { legOffset: 3, armOffset: 4, headOffset: 0 },
  ],
  jump: [
    { squash: 1.1, stretch: 0.9, headOffset: 0 },
    { squash: 0.9, stretch: 1.1, headOffset: -8, armOffset: -10 },
    { squash: 1.0, stretch: 1.0, headOffset: -4, armOffset: -6 },
  ],
  dance: [
    { bodyTilt: -4, armOffset: -10, headOffset: -1 },
    { bodyTilt: 0, armOffset: -6, headOffset: -3, squash: 1.1 },
    { bodyTilt: 4, armOffset: -10, headOffset: -1 },
    { bodyTilt: 0, armOffset: -6, headOffset: -3, squash: 1.1 },
    { bodyTilt: -6, armOffset: -14, headOffset: 0 },
    { bodyTilt: 0, armOffset: 0, headOffset: -4, squash: 0.95, stretch: 1.05 },
    { bodyTilt: 6, armOffset: -14, headOffset: 0 },
    { bodyTilt: 0, armOffset: 0, headOffset: -2 },
  ],
  hit: [
    { bodyTilt: -6, headOffset: 2 },
    { bodyTilt: 4, headOffset: -1 },
    { bodyTilt: 0, headOffset: 0 },
  ],
  wave: [
    { armOffset: -12, headOffset: -1 },
    { armOffset: -16, headOffset: -2 },
    { armOffset: -12, headOffset: -1 },
    { armOffset: -8, headOffset: 0 },
  ],
};

// ─── Generate spritesheet ───────────────────────────────────────────

function generateSpritesheet(themeName, frameSize) {
  const palette = PALETTES[themeName];
  const animNames = Object.keys(ANIMATIONS);
  const maxCols = Math.max(...animNames.map((k) => ANIMATIONS[k].length));
  const rows = animNames.length;

  const sheetW = maxCols * frameSize;
  const sheetH = rows * frameSize;

  const canvas = new PixelCanvas(sheetW, sheetH);

  for (let row = 0; row < rows; row++) {
    const animName = animNames[row];
    const frames = ANIMATIONS[animName];
    for (let col = 0; col < frames.length; col++) {
      const ox = col * frameSize;
      const oy = row * frameSize;
      drawCharacter(canvas, ox, oy, frameSize, palette, frames[col]);
    }
  }

  return canvas.toPNG();
}

// ─── Main ───────────────────────────────────────────────────────────

const themes = [
  { name: 'cyberpunk', frameSize: 128 },
  { name: 'default', frameSize: 128 },
  { name: '8bits', frameSize: 64 },
];

const spritesDir = path.resolve(__dirname, '..', 'packages', 'frontend', 'public', 'sprites');

for (const theme of themes) {
  const outDir = path.join(spritesDir, theme.name);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating ${theme.name} spritesheet (${theme.frameSize}×${theme.frameSize} frames)...`);
  const png = generateSpritesheet(theme.name, theme.frameSize);
  const outFile = path.join(outDir, 'spritesheet.png');

  // Backup old file
  if (fs.existsSync(outFile)) {
    const backupFile = path.join(outDir, 'spritesheet.old.jpg');
    if (!fs.existsSync(backupFile)) {
      fs.renameSync(outFile, backupFile);
      console.log(`  ↳ Old file backed up as spritesheet.old.jpg`);
    } else {
      fs.unlinkSync(outFile);
    }
  }

  fs.writeFileSync(outFile, png);
  console.log(`  ↳ Written ${outFile} (${png.length} bytes)`);
}

console.log('\nDone! All spritesheets are real PNGs with alpha transparency.');
