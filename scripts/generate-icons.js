const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 table for PNG chunks
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

function generatePNG(size, isMaskable = false) {
  const width = size;
  const height = size;

  // Raw uncompressed scanlines: each row = 1 byte filter (0) + width * 4 bytes RGBA
  const rowLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowLen);

  const cx = width / 2;
  const cy = height / 2;
  const radius = isMaskable ? width * 0.48 : width * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLen;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background color: Deep indigo (#4f46e5 to #312e81 gradient)
      let r = 79, g = 70, b = 229, a = 255;
      const gradRatio = (x + y) / (width + height);
      r = Math.floor(79 - gradRatio * 30);
      g = Math.floor(70 - gradRatio * 24);
      b = Math.floor(229 - gradRatio * 100);

      if (!isMaskable) {
        // Rounded squircle mask for standard icon
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > radius) {
          a = 0;
        }
      }

      // Draw checkmark symbol inside
      const nx = (x - cx) / (width * 0.35);
      const ny = (y - cy) / (height * 0.35);

      // Checkmark line segments
      const inLine1 = (nx >= -0.6 && nx <= -0.1 && Math.abs(ny - (nx + 0.3)) < 0.18);
      const inLine2 = (nx >= -0.1 && nx <= 0.6 && Math.abs(ny - (-nx * 1.2 + 0.08)) < 0.18);

      if ((inLine1 || inLine2) && a > 0) {
        // Bright white checkmark
        r = 255;
        g = 255;
        b = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG Signature
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // deflate
  ihdrData[11] = 0; // filter 0
  ihdrData[12] = 0; // no interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT (Deflate raw scanlines)
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generatePNG(192));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generatePNG(512));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable.png'), generatePNG(512, true));

console.log('✅ Generated 192x192, 512x512, and maskable PNG icons successfully.');
