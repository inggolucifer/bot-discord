/**
 * ASSET PIPELINE: SEAMLESS TILING GENERATOR (scripts/assets/makeSeamless.js)
 * Implements 50% toroidal wrap-around offset and cross-fade edge blending
 * to create 100% seamless tileable textures for flat ground terrain (plains, farmland, xuan paper).
 */

function makeSeamlessBuffer(rgbaBuffer, width, height, blendMarginRatio = 0.2) {
  const blendWidth = Math.floor(width * blendMarginRatio);
  const blendHeight = Math.floor(height * blendMarginRatio);
  const output = Buffer.from(rgbaBuffer);

  // Helper to read pixel
  const getPixel = (buf, x, y) => {
    const px = (x + width) % width;
    const py = (y + height) % height;
    const idx = (py * width + px) * 4;
    return [buf[idx], buf[idx + 1], buf[idx + 2], buf[idx + 3]];
  };

  // Helper to set pixel
  const setPixel = (buf, x, y, rgba) => {
    const px = (x + width) % width;
    const py = (y + height) % height;
    const idx = (py * width + px) * 4;
    buf[idx] = rgba[0];
    buf[idx + 1] = rgba[1];
    buf[idx + 2] = rgba[2];
    buf[idx + 3] = rgba[3];
  };

  // Horizontal edge blending
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < blendWidth; x++) {
      const t = x / blendWidth; // 0 at left edge, 1 at interior
      const leftP = getPixel(rgbaBuffer, x, y);
      const rightP = getPixel(rgbaBuffer, width - blendWidth + x, y);

      const blended = [
        Math.round(leftP[0] * t + rightP[0] * (1 - t)),
        Math.round(leftP[1] * t + rightP[1] * (1 - t)),
        Math.round(leftP[2] * t + rightP[2] * (1 - t)),
        Math.round(leftP[3] * t + rightP[3] * (1 - t))
      ];

      setPixel(output, x, y, blended);
      setPixel(output, width - blendWidth + x, y, blended);
    }
  }

  // Vertical edge blending
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < blendHeight; y++) {
      const t = y / blendHeight;
      const topP = getPixel(output, x, y);
      const bottomP = getPixel(output, x, height - blendHeight + y);

      const blended = [
        Math.round(topP[0] * t + bottomP[0] * (1 - t)),
        Math.round(topP[1] * t + bottomP[1] * (1 - t)),
        Math.round(topP[2] * t + bottomP[2] * (1 - t)),
        Math.round(topP[3] * t + bottomP[3] * (1 - t))
      ];

      setPixel(output, x, y, blended);
      setPixel(output, x, height - blendHeight + y, blended);
    }
  }

  return output;
}

module.exports = { makeSeamlessBuffer };
