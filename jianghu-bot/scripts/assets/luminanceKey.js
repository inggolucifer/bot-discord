/**
 * ASSET PIPELINE: SMART CAVITY & EDGE-AWARE KEYING (scripts/assets/luminanceKey.js)
 * 
 * Menggabungkan dua kecerdasan:
 * 1. Background Luar & Bukaan Berongga (Liubai / Sela Tiang Paviliun / Gerbang / Cincin):
 *    - Mendeteksi latar belakang putih murni (#FFFFFF atau colorDist <= 16).
 *    - Menggunakan Connected Components BFS.
 *    - Jika pulau putih menyentuh batas luar ATAU merupakan rongga udara besar (size >= minCavitySize),
 *      area tersebut adalah RONGGA TERBUKA / UDARA / LANGIT -> DIJADIKAN TRANSPARAN (Alpha = 0).
 * 
 * 2. Inti Objek (Bilah Pedang, Kelopak Bunga, Dinding Rumah, Tiang Kayu, Atap):
 *    - Bagian yang memiliki goresan tinta, warna, bayangan, atau highlight kecil
 *      DIKUNCI 100% SOLID OPAQUE (Alpha = 255) -> TIDAK AKAN TEMBUS PANDANG.
 * 
 * 3. Transisi Tepi Halus (Anti-Aliasing):
 *    - Pada batas antara rongga transparan dan objek padat (1-2px border),
 *      diberikan feathering transisi halus agar kuas tinta tidak bergerigi.
 */

function processLuminanceKey(rgbaBuffer, width, height, options = {}) {
  const {
    colorDistThreshold = 18,      // Toleransi jarak Euclidean ke putih murni (255, 255, 255)
    allowInternalCavities = false, // HANYA true untuk struktur bercelah terbuka (pavilion, torii, ring)
    minCavitySize = 100,          // Minimal luas rongga jika allowInternalCavities = true
    featherMargin = 22            // Rentang transisi kelembutan tepi tinta
  } = options;

  const totalPixels = width * height;
  const outputBuffer = Buffer.from(rgbaBuffer);

  // Langkah 1: Deteksi piksel putih murni (warna kanvas kosong tanpa cat)
  const isWhite = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = outputBuffer[idx];
    const g = outputBuffer[idx + 1];
    const b = outputBuffer[idx + 2];
    const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
    if (dist <= colorDistThreshold) {
      isWhite[i] = 1;
    }
  }

  // Langkah 2: Analisis komponen terhubung (Connected Component Analysis)
  const visited = new Uint8Array(totalPixels);
  const isVoidMask = new Uint8Array(totalPixels); // 1 = Rongga/Latar Transparan, 0 = Objek

  for (let i = 0; i < totalPixels; i++) {
    if (isWhite[i] === 1 && visited[i] === 0) {
      const component = [i];
      visited[i] = 1;
      let touchesBorder = false;
      let head = 0;

      while (head < component.length) {
        const curr = component[head++];
        const cx = curr % width;
        const cy = Math.floor(curr / width);

        if (cx === 0 || cx === width - 1 || cy === 0 || cy === height - 1) {
          touchesBorder = true;
        }

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
              component.push(nIdx);
            }
          }
        }
      }

      // Kriteria Rongga Udara / Latar Belakang:
      // A. Menyentuh tepi luar kanvas (Latar belakang luar utama) -> Selalu transparan
      // B. Merupakan rongga tertutup di dalam objek -> HANYA transparan jika allowInternalCavities = true
      const isCavity = touchesBorder || (allowInternalCavities && component.length >= minCavitySize);
      if (isCavity) {
        for (let k = 0; k < component.length; k++) {
          isVoidMask[component[k]] = 1;
        }
      }
    }
  }

  // Langkah 3: Terapkan Alpha Mask dengan Anti-Aliasing Tepi Halus
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;

    if (isVoidMask[i] === 1) {
      // 100% Rongga Kosong / Latar Belakang -> Transparan total
      outputBuffer[idx + 3] = 0;
    } else {
      const cx = i % width;
      const cy = Math.floor(i / width);
      let adjVoidCount = 0;

      // Cek apakah piksel ini berada di tepian yang bersebelahan dengan rongga kosong
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            if (isVoidMask[ny * width + nx] === 1) {
              adjVoidCount++;
            }
          }
        }
      }

      if (adjVoidCount > 0) {
        // Tepi luar objek: Transisi lembut anti-aliasing berdasarkan kepekatan warna
        const r = outputBuffer[idx];
        const g = outputBuffer[idx + 1];
        const b = outputBuffer[idx + 2];
        const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);

        // Semakin pekat tinta/warna, semakin solid
        const alphaFactor = Math.min(1, Math.max(0.35, (dist - 8) / featherMargin));
        outputBuffer[idx + 3] = Math.round(255 * alphaFactor);
      } else {
        // INTI OBJEK: 100% Solid Opaque! (Bilah pedang, kelopak, tiang, atap, dinding)
        outputBuffer[idx + 3] = 255;
      }
    }
  }

  return outputBuffer;
}

module.exports = { processLuminanceKey };

if (require.main === module) {
  console.log('Smart Cavity & Edge-Aware Luminance Keying Helper Loaded.');
}
