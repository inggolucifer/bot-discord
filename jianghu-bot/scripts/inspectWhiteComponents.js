const sharp = require('sharp');
const path = require('path');

const uploadDir = 'C:/Users/User/.gemini/antigravity-ide/brain/820a74ec-a0f1-4b89-8c19-ae3daa271077/.user_uploaded';

async function inspectComponents(filename, colorDistThreshold) {
  const filePath = path.join(uploadDir, filename);
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const width = info.width;
  const height = info.height;
  const totalPixels = width * height;

  const isWhite = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
    if (dist <= colorDistThreshold) {
      isWhite[i] = 1;
    }
  }

  const visited = new Uint8Array(totalPixels);
  const components = [];

  for (let i = 0; i < totalPixels; i++) {
    if (isWhite[i] === 1 && visited[i] === 0) {
      const comp = [i];
      visited[i] = 1;
      let touchesBorder = false;
      let minX = i % width, maxX = minX;
      let minY = Math.floor(i / width), maxY = minY;
      let head = 0;

      while (head < comp.length) {
        const curr = comp[head++];
        const cx = curr % width;
        const cy = Math.floor(curr / width);

        if (cx === 0 || cx === width - 1 || cy === 0 || cy === height - 1) {
          touchesBorder = true;
        }
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx + 1, cy],
          [cx - 1, cy],
          [cx, cy + 1],
          [cx, cy - 1]
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (isWhite[nIdx] === 1 && visited[nIdx] === 0) {
              visited[nIdx] = 1;
              comp.push(nIdx);
            }
          }
        }
      }

      components.push({
        size: comp.length,
        touchesBorder,
        box: { minX, maxX, minY, maxY }
      });
    }
  }

  components.sort((a, b) => b.size - a.size);
  console.log(`\n=== Inspection for ${filename} (threshold ${colorDistThreshold}) ===`);
  console.log(`Total white components: ${components.length}`);
  console.log('Top 20 components:');
  components.slice(0, 20).forEach((c, i) => {
    console.log(`  #${i + 1}: size=${c.size}, touchesBorder=${c.touchesBorder}, box=[${c.box.minX},${c.box.minY} to ${c.box.maxX},${c.box.maxY}]`);
  });
}

async function run() {
  await inspectComponents('media_1792738883726.jpg', 28);
  await inspectComponents('media_1792738883726.jpg', 35);
  await inspectComponents('media_1792737500001.jpg', 28);
  await inspectComponents('media_1792737500051.jpg', 28);
}

run();
