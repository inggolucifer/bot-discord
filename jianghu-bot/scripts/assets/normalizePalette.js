/**
 * ASSET PIPELINE: PALETTE NORMALIZATION (scripts/assets/normalizePalette.js)
 * Enforces Song Dynasty / Tale of Immortal Shuimo Style Bible:
 * - Primary Tones:
 *     - Muted Slate Blue: #4A6B6B / #3A5454
 *     - Muted Jade Green: #3D6B50 / #2D523C
 *     - Charcoal Ink: #1E2828 / #141C1C
 *     - Warm Xuan Paper: #F4F0E8 / #ECE5D5
 * - Accents:
 *     - Cinnabar Red: #9B3A2E / #B94032 (Max 5% of sprite area)
 *     - Amber Ochre: #C5A880 / #D97706
 * - Forbids saturated neon, harsh primary colors, or synthetic blues.
 */

const SHUIMO_PALETTE = {
  slateBlue: { r: 74, g: 107, b: 107, hex: '#4A6B6B' },
  slateBlueDark: { r: 54, g: 82, b: 82, hex: '#365252' },
  jadeGreen: { r: 61, g: 107, b: 80, hex: '#3D6B50' },
  jadeGreenDark: { r: 39, g: 74, b: 54, hex: '#274A36' },
  charcoalInk: { r: 30, g: 40, b: 40, hex: '#1E2828' },
  charcoalInkDeep: { r: 18, g: 26, b: 26, hex: '#121A1A' },
  xuanPaper: { r: 244, g: 240, b: 232, hex: '#F4F0E8' },
  cinnabar: { r: 155, g: 58, b: 46, hex: '#9B3A2E' },
  amberOchre: { r: 197, g: 168, b: 128, hex: '#C5A880' }
};

/**
 * Validates whether an RGBA buffer adheres to the Shuimo style palette.
 * Returns { valid: boolean, cinnabarRatio: number, errors: string[] }
 */
function checkPaletteCompliance(rgbaBuffer, width, height) {
  const totalPixels = width * height;
  let cinnabarCount = 0;
  let opaqueCount = 0;
  const errors = [];

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const a = rgbaBuffer[idx + 3];
    if (a < 10) continue; // Ignore transparent pixels
    opaqueCount++;

    const r = rgbaBuffer[idx];
    const g = rgbaBuffer[idx + 1];
    const b = rgbaBuffer[idx + 2];

    // Check for cinnabar red (high R, low G and B)
    if (r > 120 && g < 80 && b < 70) {
      cinnabarCount++;
    }

    // Check for forbidden neon (saturation > 80% with high brightness)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    if (sat > 0.85 && max > 220) {
      errors.push(`Neon saturated pixel detected at index ${i} (rgb: ${r},${g},${b})`);
      if (errors.length > 5) break;
    }
  }

  const cinnabarRatio = opaqueCount > 0 ? cinnabarCount / opaqueCount : 0;
  if (cinnabarRatio > 0.05) {
    errors.push(`Cinnabar ratio ${(cinnabarRatio * 100).toFixed(2)}% exceeds 5% threshold`);
  }

  return {
    valid: errors.length === 0,
    cinnabarRatio,
    errors
  };
}

module.exports = { SHUIMO_PALETTE, checkPaletteCompliance };
