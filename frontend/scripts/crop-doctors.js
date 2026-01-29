/**
 * Script to crop the composite doctor image into individual photos
 * Run: node scripts/crop-doctors.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT_IMAGE = path.join(__dirname, '../assets/images/psychiatrists/doctors-composite.png');
const OUTPUT_DIR = path.join(__dirname, '../assets/images/psychiatrists');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function cropDoctors() {
  try {
    // Get image dimensions
    const metadata = await sharp(INPUT_IMAGE).metadata();
    const { width, height } = metadata;

    console.log(`Input image: ${width}x${height}`);

    // Calculate cell dimensions (3x3 grid)
    const cellWidth = Math.floor(width / 3);
    const cellHeight = Math.floor(height / 3);

    console.log(`Each cell: ${cellWidth}x${cellHeight}`);

    // Doctor names for file naming (matching the psychiatrists array order)
    const doctors = [
      'dr-santos-cruz',    // Row 1, Col 1 - Female
      'dr-reyes',          // Row 1, Col 2 - Male
      'dr-garcia',         // Row 1, Col 3 - Female
      'dr-lim-tan',        // Row 2, Col 1 - Female (or can swap)
      'dr-dela-rosa',      // Row 2, Col 2 - Male
      'dr-aquino',         // Row 2, Col 3 - Female
      'dr-extra-1',        // Row 3, Col 1 - Male
      'dr-extra-2',        // Row 3, Col 2 - Female
      'dr-extra-3',        // Row 3, Col 3 - Male
    ];

    let index = 0;

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const left = col * cellWidth;
        const top = row * cellHeight;

        const outputPath = path.join(OUTPUT_DIR, `${doctors[index]}.png`);

        await sharp(INPUT_IMAGE)
          .extract({
            left,
            top,
            width: cellWidth,
            height: cellHeight,
          })
          // Crop to square and resize for optimal mobile display
          .resize(400, 400, {
            fit: 'cover',
            position: 'top', // Keep face centered at top
          })
          .png({ quality: 90 })
          .toFile(outputPath);

        console.log(`Created: ${doctors[index]}.png`);
        index++;
      }
    }

    console.log('\nAll doctor images cropped successfully!');
    console.log('Now update PsychiatristListScreen.tsx to use local images.');

  } catch (error) {
    console.error('Error cropping images:', error.message);
    if (error.message.includes('Input file is missing')) {
      console.log('\nMake sure to save your composite image to:');
      console.log(INPUT_IMAGE);
    }
  }
}

cropDoctors();
