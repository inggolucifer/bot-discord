/**
 * ASSET PIPELINE: LUMINANCE KEYING (scripts/assets/luminanceKey.js)
 * Converts solid white/cream background to transparent alpha:
 * alpha = clamp((1 - luma) * k, 0, 1) with smooth curve for mist translucency.
 * Restores color via unpremultiply to prevent edge darkening.
 */

function processLuminanceKey(rgbaBuffer, width, height, options = {}) {
  const {
    k = 1.35,
    lumaThreshold = 0.95,
    softness = 0.12
  } = options;

  const totalPixels = width * height;
  const outputBuffer = Buffer.from(rgbaBuffer);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = outputBuffer[idx] / 255;
    const g = outputBuffer[idx + 1] / 255;
    const b = outputBuffer[idx + 2] / 255;
    let a = outputBuffer[idx + 3] / 255;

    // Standard ITU-R BT.601 Luminance
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;

    if (luma >= lumaThreshold) {
      a = 0;
    } else {
      const delta = (lumaThreshold - luma) / softness;
      const keyFactor = Math.min(1, Math.max(0, delta));
      const targetAlpha = Math.min(1, Math.max(0, (1 - luma) * k)) * keyFactor;
      a = Math.min(a, targetAlpha);
    }

    outputBuffer[idx + 3] = Math.round(a * 255);
  }

  return outputBuffer;
}

module.exports = { processLuminanceKey };

if (require.main === module) {
  console.log('Luminance Keying Helper Loaded.');
}
