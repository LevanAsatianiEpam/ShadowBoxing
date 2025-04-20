const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const svg2img = require('svg2img');

// Path to the source SVG
const svgPath = path.join(__dirname, 'src', 'assets', 'icons', 'boxing-glove.svg');
const iconOutputDir = path.join(__dirname, 'src', 'assets', 'icons');

// Ensure output directory exists
if (!fs.existsSync(iconOutputDir)) {
  fs.mkdirSync(iconOutputDir, { recursive: true });
}

// Read the SVG file
const svgContent = fs.readFileSync(svgPath, 'utf8');

// Define the sizes we need for the manifest
const sizes = [16, 32, 72, 96, 128, 144, 152, 192, 384, 512];

// Convert SVG to PNG for each size
async function generatePNGs() {
  try {
    console.log('Starting icon generation from SVG...');

    // Generate each size
    for (const size of sizes) {
      console.log(`Generating ${size}x${size} icon...`);
      
      // Convert SVG to PNG
      await new Promise((resolve, reject) => {
        svg2img(svgContent, { width: size, height: size }, (error, buffer) => {
          if (error) {
            reject(error);
            return;
          }
          
          // Write the PNG file
          const outputPath = path.join(iconOutputDir, `icon-${size}x${size}.png`);
          fs.writeFileSync(outputPath, buffer);
          console.log(`Created: ${outputPath}`);
          resolve();
        });
      });
    }

    // Generate ICO file with multiple sizes (16x16, 32x32, 48x48)
    console.log('Generating favicon.ico...');
    
    // For ICO file, we'll use the 16x16 and 32x32 images
    // First ensure we have those sizes
    await Promise.all(
      [16, 32].map(size => {
        return new Promise((resolve, reject) => {
          svg2img(svgContent, { width: size, height: size }, (error, buffer) => {
            if (error) {
              reject(error);
              return;
            }
            
            const outputPath = path.join(iconOutputDir, `temp-${size}.png`);
            fs.writeFileSync(outputPath, buffer);
            resolve(outputPath);
          });
        });
      })
    );

    // Use sharp to create ICO file
    const favicon16Path = path.join(iconOutputDir, 'temp-16.png');
    const favicon32Path = path.join(iconOutputDir, 'temp-32.png');
    const faviconPath = path.join(iconOutputDir, 'favicon.ico');

    // We'll use the 32x32 image as the favicon.ico
    // (proper ICO generation requires additional libraries)
    fs.copyFileSync(favicon32Path, faviconPath);
    
    console.log(`Created favicon.ico (Note: This is a PNG renamed to ICO. For proper ICO with multiple sizes, use a dedicated ICO generator)`);
    
    // Clean up temp files
    fs.unlinkSync(favicon16Path);
    fs.unlinkSync(favicon32Path);
    
    console.log('All icons generated successfully!');
    
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

// Run the generator
generatePNGs();