/**
 * ASSET PIPELINE: FIT & SCALE (scripts/assets/fitScale.js)
 * Computes target scaling based on cell footprint * 100px, preserving aspect ratio.
 */

function computeFitDimensions(origWidth, origHeight, targetCw, targetCh, cellPx = 100, isRetina = false) {
  const multiplier = isRetina ? 2 : 1;
  const targetBaseW = targetCw * cellPx * multiplier;
  const targetBaseH = targetCh * cellPx * multiplier;

  const aspectRatio = origWidth / Math.max(1, origHeight);
  let finalW = targetBaseW;
  let finalH = Math.round(targetBaseW / aspectRatio);

  // If height is less than base height, elevate to meet base height
  if (finalH < targetBaseH) {
    finalH = targetBaseH;
    finalW = Math.round(targetBaseH * aspectRatio);
  }

  return {
    targetWidth: finalW,
    targetHeight: finalH,
    scaleX: +(finalW / origWidth).toFixed(3),
    scaleY: +(finalH / origHeight).toFixed(3)
  };
}

module.exports = { computeFitDimensions };

if (require.main === module) {
  console.log('Fit Scale Helper Loaded.');
}
