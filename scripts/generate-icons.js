#!/usr/bin/env node
// Generates PWA icons using only Node.js built-ins (no npm packages needed)
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// --- CRC32 ---
const crc32table = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crc32table[n] = c;
}
function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = crc32table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// --- PNG chunk builder ---
function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const d = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(d.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, d])));
  return Buffer.concat([lenBuf, t, d, crcBuf]);
}

// --- PNG encoder ---
function encodePNG(width, height, rgbPixels) {
  // Build raw scanlines: filter byte (0 = None) + row data
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize, 0);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 3;
      const dst = y * rowSize + 1 + x * 3;
      raw[dst]     = rgbPixels[src];
      raw[dst + 1] = rgbPixels[src + 1];
      raw[dst + 2] = rgbPixels[src + 2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  // compression, filter, interlace = 0

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Icon drawing ---
function drawIcon(size) {
  const px = Buffer.alloc(size * size * 3, 0); // black background

  const cx = size / 2;
  const cy = size / 2;

  // Outer and inner radius of the "C" ring
  const outerR = size * 0.40;
  const innerR = size * 0.24;

  // Opening angle (degrees from horizontal right axis)
  const openDeg = 48;
  const openRad = openDeg * (Math.PI / 180);

  // Anti-aliasing width in pixels
  const aa = 1.2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx); // -π to π, 0 = right

      // Is this pixel in the ring zone?
      const inRing = d >= innerR - aa && d <= outerR + aa;
      if (!inRing) continue;

      // Is this pixel in the C opening (right side, within ±openDeg)?
      const inOpening = dx > 0 && Math.abs(angle) < openRad;
      if (inOpening) continue;

      // Soft edge (anti-aliasing via alpha-blend approximation)
      let alpha = 1.0;
      if (d < innerR) alpha = Math.min(1, (d - (innerR - aa)) / aa);
      else if (d > outerR) alpha = Math.min(1, ((outerR + aa) - d) / aa);

      // Soft edge at opening boundary
      if (dx > 0) {
        const distToEdge = Math.abs(Math.abs(angle) - openRad);
        if (distToEdge < openRad * 0.05) {
          alpha = Math.min(alpha, distToEdge / (openRad * 0.05));
        }
      }

      const v = Math.round(255 * alpha);
      const i = (y * size + x) * 3;
      px[i]     = v;
      px[i + 1] = v;
      px[i + 2] = v;
    }
  }

  // Draw horizontal caps at the opening ends (top and bottom right)
  const capLen = (outerR - innerR) * 0.9;
  const capWidth = (outerR - innerR);

  for (let cap = -1; cap <= 1; cap += 2) {
    // cap = -1 → top, cap = +1 → bottom
    // The C opening ends are at angle = ±openRad
    const capAngle = cap * openRad;
    const tipX = cx + outerR * Math.cos(capAngle);
    const tipY = cy + outerR * Math.sin(capAngle);

    // Draw a small horizontal bar extending to the right
    for (let py = 0; py < size; py++) {
      for (let px2 = 0; px2 < size; px2++) {
        const rdx = px2 - tipX;
        const rdy = py - tipY;

        // Bar extends right (+x direction) and has height = capWidth
        if (rdx >= -aa && rdx <= capLen + aa && Math.abs(rdy) <= capWidth / 2 + aa) {
          // Also constrain to be in the C opening area (right side)
          if (px2 < cx) continue;

          let alpha = 1.0;
          if (rdx < 0) alpha = Math.min(alpha, (rdx + aa) / aa);
          if (rdx > capLen) alpha = Math.min(alpha, ((capLen + aa) - rdx) / aa);
          const edgeDist = Math.abs(rdy) - capWidth / 2;
          if (edgeDist > 0) alpha = Math.min(alpha, (aa - edgeDist) / aa);
          if (alpha <= 0) continue;

          const v = Math.round(255 * alpha);
          const idx = (py * size + px2) * 3;
          px[idx]     = Math.max(px[idx], v);
          px[idx + 1] = Math.max(px[idx + 1], v);
          px[idx + 2] = Math.max(px[idx + 2], v);
        }
      }
    }
  }

  return px;
}

// --- Generate all icons ---
const publicDir = path.join(__dirname, '..', 'public');

const sizes = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const { file, size } of sizes) {
  const pixels = drawIcon(size);
  const png = encodePNG(size, size, pixels);
  fs.writeFileSync(path.join(publicDir, file), png);
  console.log(`Generated ${file} (${size}x${size}, ${png.length} bytes)`);
}

console.log('Done!');
