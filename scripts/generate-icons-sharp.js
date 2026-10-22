const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconsDir = path.join(publicDir, 'icons');
const appDir = path.join(__dirname, '..', 'app');

fs.mkdirSync(iconsDir, { recursive: true });

// 100% Solid, Fully Opaque, High-Contrast SVG Icon
// Zero transparency in corners ensures Linux / GTK / Wayland / Chromium will never render black squares
// 80% safe-zone emblem ensures Android maskable icons never clip the checklist or text
function createSvg(size) {
  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#4f46e5" />
        <stop offset="100%" stop-color="#3730a3" />
      </linearGradient>
    </defs>

    <!-- 1. Solid Opaque Background: NO transparent corners (rx=0) prevents Linux black corner artifacts -->
    <rect width="${size}" height="${size}" fill="url(#brandGrad)" />

    <!-- 2. Center Card (Inside 70% safe zone for Android circular mask and Linux docks) -->
    <g transform="translate(${size * 0.16}, ${size * 0.16})">
      <!-- White card base -->
      <rect width="${size * 0.68}" height="${size * 0.68}" rx="${size * 0.12}" fill="#ffffff" />
      
      <!-- Top header accent pill on card -->
      <rect x="${size * 0.18}" y="${size * 0.08}" width="${size * 0.32}" height="${size * 0.07}" rx="${size * 0.035}" fill="#4f46e5" />
      
      <!-- Emerald Green Checkmark -->
      <path d="M ${size * 0.20} ${size * 0.34} L ${size * 0.30} ${size * 0.44} L ${size * 0.48} ${size * 0.24}" 
            fill="none" 
            stroke="#10b981" 
            stroke-width="${size * 0.065}" 
            stroke-linecap="round" 
            stroke-linejoin="round" />
            
      <!-- Bold "YHD" Brand Typography -->
      <text x="${size * 0.34}" y="${size * 0.58}" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${size * 0.11}" font-weight="900" fill="#1e1b4b" text-anchor="middle" letter-spacing="${size * 0.005}">YHD</text>
    </g>
  </svg>
  `;
}

async function run() {
  const svg192 = Buffer.from(createSvg(192));
  const svg512 = Buffer.from(createSvg(512));

  // 1. Generate Manifest Icons
  await sharp(svg192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  await sharp(svg512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  await sharp(svg512).png().toFile(path.join(iconsDir, 'icon-maskable.png'));

  // 2. Generate Public Root Icons
  await sharp(svg192).png().toFile(path.join(publicDir, 'icon.png'));
  await sharp(svg192).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  
  // Create multi-size ICO for public/favicon.ico
  // Sharp can output PNG or we can save 32x32 / 48x48 PNGs
  const svg32 = Buffer.from(createSvg(32));
  await sharp(svg32).png().toFile(path.join(publicDir, 'favicon-32.png'));
  await sharp(svg32).png().toFile(path.join(publicDir, 'favicon.ico'));

  // 3. Generate App Router Root Icons (Next.js automatically discovers app/icon.png & app/favicon.ico)
  await sharp(svg192).png().toFile(path.join(appDir, 'icon.png'));
  await sharp(svg192).png().toFile(path.join(appDir, 'apple-icon.png'));
  await sharp(svg32).png().toFile(path.join(appDir, 'favicon.ico'));

  console.log('✅ Generated 100% solid, fully opaque icons with zero transparent corners across public/ and app/.');
}

run().catch(console.error);
