/**
 * Generates the PWA icons for the merchant dashboard into `public/icons/`
 * without any image dependencies (pure Node: zlib + hand-rolled PNG encoder).
 *
 * Design: gold rounded square (brand #F0A500), navy coin (#0F172A), gold
 * lightning bolt — matches the app's amber/slate palette.
 *
 * Run once and commit the output: `node scripts/generate-icons.mjs`.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'icons');

const GOLD = [240, 165, 0, 255]; // #F0A500
const NAVY = [15, 23, 42, 255]; // #0F172A

// Lightning bolt as a polygon in unit coordinates (y grows downward), scaled
// to fit inside the coin.
const BOLT = [
  [-0.15, -1.0],
  [0.4, -1.0],
  [0.4, -0.15],
  [-0.35, 0.55],
  [-0.35, 0.15],
  [0.15, 0.15],
  [0.15, 1.0],
  [-0.45, 1.0],
  [-0.45, 0.1],
  [0.15, -0.6],
];

// ─── Minimal PNG encoder ─────────────────────────────────────────────────────
const CRC_TABLE = new Int32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, pixels.byteOffset + y * stride, stride).copy(
      raw,
      y * (stride + 1) + 1,
    );
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ─── Drawing helpers ─────────────────────────────────────────────────────────
function inRoundedRect(px, py, size, radius) {
  const min = radius;
  const max = size - radius;
  if (px >= min && px <= max) return true;
  if (py >= min && py <= max) return true;
  const cx = px < min ? min : max;
  const cy = py < min ? min : max;
  return (px - cx) ** 2 + (py - cy) ** 2 <= radius ** 2;
}

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Render one icon.
 * @param {number} size side length in pixels
 * @param {{ rounded?: boolean; maskable?: boolean }} options
 *   rounded: transparent outside the rounded square (app icons).
 *   maskable: full-bleed square with content kept inside the safe zone.
 */
function renderIcon(size, { rounded = true, maskable = false } = {}) {
  const pixels = new Uint8Array(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = size * 0.22;
  // Maskable icons must keep artwork inside the inner 80% safe zone.
  const coinRadius = size * (maskable ? 0.29 : 0.36);
  const bolt = BOLT.map(([x, y]) => [cx + x * coinRadius * 0.68, cy + y * coinRadius * 0.68]);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      if (rounded && !inRoundedRect(px, py, size, cornerRadius)) {
        continue; // transparent corner
      }

      if ((px - cx) ** 2 + (py - cy) ** 2 <= coinRadius ** 2) {
        const color = pointInPolygon(px, py, bolt) ? GOLD : NAVY;
        pixels[idx] = color[0];
        pixels[idx + 1] = color[1];
        pixels[idx + 2] = color[2];
        pixels[idx + 3] = color[3];
      } else {
        pixels[idx] = GOLD[0];
        pixels[idx + 1] = GOLD[1];
        pixels[idx + 2] = GOLD[2];
        pixels[idx + 3] = GOLD[3];
      }
    }
  }
  return encodePng(size, size, pixels);
}

mkdirSync(outDir, { recursive: true });

const icons = [
  { name: 'icon-192.png', size: 192, options: {} },
  { name: 'icon-512.png', size: 512, options: {} },
  { name: 'icon-maskable-512.png', size: 512, options: { maskable: true } },
  { name: 'apple-touch-icon.png', size: 180, options: { rounded: false } },
];

for (const icon of icons) {
  const png = renderIcon(icon.size, icon.options);
  writeFileSync(join(outDir, icon.name), png);
  console.log(`[generate-icons] wrote public/icons/${icon.name} (${icon.size}x${icon.size})`);
}
