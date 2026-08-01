/**
 * Prepare Rise Up Kids store listing assets for Google Play + App Store.
 * Usage (from app/): node store-assets/prepare-store-assets.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = __dirname;
const appRoot = path.join(__dirname, '..');

const BRAND_BG = { r: 212, g: 230, b: 227, alpha: 1 }; // mint matching Coming Soon / brand

const dirs = {
  playFeature: path.join(root, 'play-store'),
  playPhone: path.join(root, 'play-store', 'phone-screenshots'),
  playTablet: path.join(root, 'play-store', 'tablet-screenshots'),
  applePhone: path.join(root, 'app-store', 'iphone-6.7-inch-landscape'),
  applePhoneSafe: path.join(root, 'app-store', 'iphone-6.7-inch-landscape-apple-safe'),
  appleIpad: path.join(root, 'app-store', 'ipad-12.9-inch-landscape'),
  appleIpadSafe: path.join(root, 'app-store', 'ipad-12.9-inch-landscape-apple-safe'),
  source: path.join(root, 'source'),
};

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function fitExact(input, width, height, output) {
  await sharp(input)
    .resize(width, height, {
      fit: 'contain',
      background: BRAND_BG,
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
}

async function coverExact(input, width, height, output) {
  await sharp(input)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(output);
}

async function main() {
  Object.values(dirs).forEach(ensureDir);

  const sources = {
    feature: path.join(root, 'feature.png'),
    shots: [1, 2, 3, 4, 5].map((n) => ({
      n,
      file: path.join(root, `${n}.png`),
    })),
    icon: path.join(appRoot, 'assets', 'images', 'icon1024.png'),
  };

  for (const p of [sources.feature, sources.icon, ...sources.shots.map((s) => s.file)]) {
    if (!fs.existsSync(p)) throw new Error(`Missing asset: ${p}`);
  }

  // Keep originals mirrored under source/ for clarity
  for (const shot of sources.shots) {
    fs.copyFileSync(shot.file, path.join(dirs.source, `${shot.n}.png`));
  }
  fs.copyFileSync(sources.feature, path.join(dirs.source, 'feature.png'));

  // Google Play feature graphic MUST be 1024 x 500
  await coverExact(
    sources.feature,
    1024,
    500,
    path.join(dirs.playFeature, 'feature-graphic-1024x500.png')
  );

  // Google Play hi-res icon 512 x 512
  await sharp(sources.icon)
    .resize(512, 512, { fit: 'cover' })
    .png()
    .toFile(path.join(dirs.playFeature, 'hi-res-icon-512x512.png'));

  // App Store / Play still use 1024 icon from app binary; copy for listing convenience
  fs.copyFileSync(sources.icon, path.join(dirs.playFeature, 'app-icon-1024x1024.png'));
  ensureDir(path.join(root, 'app-store'));
  fs.copyFileSync(sources.icon, path.join(root, 'app-store', 'app-icon-1024x1024.png'));

  // Apple-safe set: no Kid's Wall tab visible in phone chrome (1 = home overview, 4 = StarCam)
  const appleSafe = new Set([1, 4]);

  // Promo slide from feature graphic (helps Apple meet 3-screenshot minimum without Kid's Wall UI)
  const featurePhone = path.join(dirs.applePhone, '00-feature-iphone-6.7-2796x1290.png');
  const featureIpad = path.join(dirs.appleIpad, '00-feature-ipad-12.9-2732x2048.png');
  await fitExact(sources.feature, 2796, 1290, featurePhone);
  await fitExact(sources.feature, 2732, 2048, featureIpad);
  fs.copyFileSync(featurePhone, path.join(dirs.applePhoneSafe, '00-feature-iphone-6.7-2796x1290.png'));
  fs.copyFileSync(featureIpad, path.join(dirs.appleIpadSafe, '00-feature-ipad-12.9-2732x2048.png'));

  for (const shot of sources.shots) {
    const base = String(shot.n).padStart(2, '0');

    // Play phone: 1920x1080 already valid; normalize copy
    await fitExact(
      shot.file,
      1920,
      1080,
      path.join(dirs.playPhone, `${base}-phone-1920x1080.png`)
    );

    // Play 7" tablet landscape common size
    await fitExact(
      shot.file,
      1920,
      1200,
      path.join(dirs.playTablet, `${base}-tablet-1920x1200.png`)
    );

    // App Store iPhone 6.7" landscape: 2796 x 1290
    const applePhoneOut = path.join(
      dirs.applePhone,
      `${base}-iphone-6.7-2796x1290.png`
    );
    await fitExact(shot.file, 2796, 1290, applePhoneOut);

    // App Store iPad Pro 12.9" landscape: 2732 x 2048
    const appleIpadOut = path.join(
      dirs.appleIpad,
      `${base}-ipad-12.9-2732x2048.png`
    );
    await fitExact(shot.file, 2732, 2048, appleIpadOut);

    if (appleSafe.has(shot.n)) {
      fs.copyFileSync(
        applePhoneOut,
        path.join(dirs.applePhoneSafe, `${base}-iphone-6.7-2796x1290.png`)
      );
      fs.copyFileSync(
        appleIpadOut,
        path.join(dirs.appleIpadSafe, `${base}-ipad-12.9-2732x2048.png`)
      );
    }
  }

  console.log('Store assets prepared under app/store-assets/');
  console.log('  play-store/feature-graphic-1024x500.png');
  console.log('  play-store/hi-res-icon-512x512.png');
  console.log('  play-store/phone-screenshots/ (5)');
  console.log('  app-store/iphone-6.7-inch-landscape/');
  console.log('  app-store/iphone-6.7-inch-landscape-apple-safe/ (no Kid\'s Wall tab)');
  console.log('  app-store/ipad-12.9-inch-landscape-apple-safe/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
