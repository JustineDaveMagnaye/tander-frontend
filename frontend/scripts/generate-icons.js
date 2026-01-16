/**
 * App Icon Generator Script
 *
 * Generates properly sized and padded app icons for:
 * - iOS: 1024x1024 square icon
 * - Android: Adaptive icon foreground (432x432) with safe zone padding
 * - Web: Favicon (48x48)
 * - Splash: Splash screen icon
 *
 * Run: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const ICONS_DIR = path.join(ASSETS_DIR, 'icons');
const SOURCE_LOGO = path.join(ICONS_DIR, 'tander-logo.png');

// Icon configurations
const ICONS = [
  {
    name: 'icon.png',
    size: 1024,
    padding: 0.15, // 15% padding on each side
    background: '#FFFFFF',
    outputDir: ASSETS_DIR,
  },
  {
    name: 'adaptive-icon.png',
    size: 432, // 108dp * 4 for xxxhdpi
    padding: 0.25, // 25% padding for Android safe zone (outer 18dp of 108dp can be cropped)
    background: 'transparent',
    outputDir: ASSETS_DIR,
  },
  {
    name: 'favicon.png',
    size: 48,
    padding: 0.1,
    background: '#FFFFFF',
    outputDir: ASSETS_DIR,
  },
  {
    name: 'splash-icon.png',
    size: 512,
    padding: 0.1,
    background: 'transparent',
    outputDir: ASSETS_DIR,
  },
];

async function generateIcon(config) {
  const { name, size, padding, background, outputDir } = config;
  const outputPath = path.join(outputDir, name);

  console.log(`Generating ${name} (${size}x${size})...`);

  try {
    // Get source image metadata
    const metadata = await sharp(SOURCE_LOGO).metadata();
    const sourceWidth = metadata.width;
    const sourceHeight = metadata.height;

    // Calculate the logo size with padding
    const logoSize = Math.round(size * (1 - padding * 2));

    // Determine resize dimensions maintaining aspect ratio
    const aspectRatio = sourceWidth / sourceHeight;
    let resizeWidth, resizeHeight;

    if (aspectRatio > 1) {
      // Wider than tall
      resizeWidth = logoSize;
      resizeHeight = Math.round(logoSize / aspectRatio);
    } else {
      // Taller than wide
      resizeHeight = logoSize;
      resizeWidth = Math.round(logoSize * aspectRatio);
    }

    // Resize the logo
    const resizedLogo = await sharp(SOURCE_LOGO)
      .resize(resizeWidth, resizeHeight, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Create the final icon with the logo centered
    const bgColor = background === 'transparent'
      ? { r: 0, g: 0, b: 0, alpha: 0 }
      : background;

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: bgColor,
      },
    })
      .composite([
        {
          input: resizedLogo,
          gravity: 'center',
        },
      ])
      .png()
      .toFile(outputPath);

    console.log(`  ✓ Created ${outputPath}`);
  } catch (error) {
    console.error(`  ✗ Error creating ${name}:`, error.message);
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('TANDER App Icon Generator');
  console.log('='.repeat(50));
  console.log(`Source: ${SOURCE_LOGO}\n`);

  // Check if source exists
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error('Error: Source logo not found at', SOURCE_LOGO);
    process.exit(1);
  }

  // Generate all icons
  for (const config of ICONS) {
    await generateIcon(config);
  }

  console.log('\n' + '='.repeat(50));
  console.log('Done! Icons generated successfully.');
  console.log('='.repeat(50));
  console.log('\nNext steps:');
  console.log('1. Restart your Expo dev server: npx expo start --clear');
  console.log('2. For production builds, run: npx expo prebuild --clean');
}

main().catch(console.error);
