import sharp from 'sharp';
import * as path from 'path';

const ICONS_DIR = path.resolve(__dirname, '..', 'public', 'icons');

async function main() {
  await sharp(path.join(ICONS_DIR, 'icon.svg'))
    .resize(192, 192)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-192.png'));

  await sharp(path.join(ICONS_DIR, 'icon.svg'))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512.png'));

  await sharp(path.join(ICONS_DIR, 'icon-maskable.svg'))
    .resize(512, 512)
    .png()
    .toFile(path.join(ICONS_DIR, 'icon-512-maskable.png'));

  // iOS ignores alpha transparency on the home screen icon; flatten onto the
  // brand red so there's no unexpected black background.
  await sharp(path.join(ICONS_DIR, 'icon.svg'))
    .resize(180, 180)
    .flatten({ background: '#e4032e' })
    .png()
    .toFile(path.join(ICONS_DIR, 'apple-touch-icon.png'));

  console.log('Icons generated in', ICONS_DIR);
}

main();
