#!/usr/bin/env node
// Generates PWA icons and favicon from public/logo.png using sharp.
// Usage: node scripts/generate-icons.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const appDir = path.join(__dirname, '..', 'src', 'app');
const logoPath = path.join(publicDir, 'logo.png');

// Build a minimal ICO file containing a single embedded PNG.
// Modern ICO format (Windows Vista+) supports PNG data directly.
function buildIco(pngBuffer, width, height) {
  const ICONDIR_SIZE = 6;
  const ICONDIRENTRY_SIZE = 16;
  const dataOffset = ICONDIR_SIZE + ICONDIRENTRY_SIZE;
  const buf = Buffer.alloc(dataOffset + pngBuffer.length);

  buf.writeUInt16LE(0, 0);  // Reserved
  buf.writeUInt16LE(1, 2);  // Type: ICO
  buf.writeUInt16LE(1, 4);  // 1 image

  buf.writeUInt8(width >= 256 ? 0 : width, 6);
  buf.writeUInt8(height >= 256 ? 0 : height, 7);
  buf.writeUInt8(0, 8);   // Color count (0 = 256+)
  buf.writeUInt8(0, 9);   // Reserved
  buf.writeUInt16LE(1, 10);  // Color planes
  buf.writeUInt16LE(32, 12); // Bits per pixel
  buf.writeUInt32LE(pngBuffer.length, 14);
  buf.writeUInt32LE(dataOffset, 18);

  pngBuffer.copy(buf, dataOffset);
  return buf;
}

async function main() {
  if (!fs.existsSync(logoPath)) {
    console.error('logo.png not found at', logoPath);
    process.exit(1);
  }

  const pngSizes = [
    { file: path.join(publicDir, 'icon-512.png'), size: 512 },
    { file: path.join(publicDir, 'icon-192.png'), size: 192 },
    { file: path.join(publicDir, 'apple-touch-icon.png'), size: 180 },
  ];

  for (const { file, size } of pngSizes) {
    await sharp(logoPath)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(file);
    console.log(`Generated ${path.basename(file)} (${size}x${size})`);
  }

  // favicon.ico — 32x32 PNG wrapped in ICO container
  const favicon32 = await sharp(logoPath)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  const ico = buildIco(favicon32, 32, 32);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), ico);
  console.log('Generated src/app/favicon.ico (32x32)');

  console.log('Done!');
}

main().catch(err => { console.error(err); process.exit(1); });
