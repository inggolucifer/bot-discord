/**
 * ASSET PIPELINE: TRIM & PADDING (scripts/assets/trimPadding.js)
 * Computes non-transparent bounding box with 2px padding.
 */

function calculateTrimBounds(rgbaBuffer, width, height, alphaThreshold = 5, padding = 2) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = rgbaBuffer[idx + 3];
      if (alpha > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return { minX: 0, minY: 0, maxX: width - 1, maxY: height - 1, width, height };
  }

  const pMinX = Math.max(0, minX - padding);
  const pMinY = Math.max(0, minY - padding);
  const pMaxX = Math.min(width - 1, maxX + padding);
  const pMaxY = Math.min(height - 1, maxY + padding);

  return {
    minX: pMinX,
    minY: pMinY,
    maxX: pMaxX,
    maxY: pMaxY,
    width: pMaxX - pMinX + 1,
    height: pMaxY - pMinY + 1
  };
}

module.exports = { calculateTrimBounds };

if (require.main === module) {
  console.log('Trim Padding Helper Loaded.');
}
