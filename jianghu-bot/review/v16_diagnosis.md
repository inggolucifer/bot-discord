# V16 Diagnosis Log (Satu Perubahan = Satu Penyebab = Satu Bukti)

## Ringkasan Inisiasi V16 (P0)
- **Baseline Capture**: 32 titik terkunci (P01..P34) berhasil ditangkap di `review/v16_baseline/` dari build V15 (`HEAD 2561ac63`).
- **Required Points**: `scripts/v16/requiredPoints.json` (32 titik, SHA-256: `7f119234316fdfcb4e37a07de83aebb307996471b0fddb2acd0486aa2180daf8`).
- **Self-Test Suite**: `scripts/v16/pixelGates.py --self-test` mencatat 12/12 uji mandiri PASS 100% (`review/v16_selftest.json`).
- **Verifikasi Baseline Defect**: `scripts/v16/evaluateBaseline.js` mengonfirmasi 10/10 kegagalan nyata baseline V15 (Target >= 8):
  1. `P04_farm` groundColorSanity(field): Hue = 64.8 deg (dry olive-brown) -> GAGAL
  2. `P04_farm` groundTextureRichness: flat single macro tanpa komposit sawah -> GAGAL
  3. `P21_boundary_t1` biomeTransition: transitionWidthCells = 0.389 (< 1.0 cel) batas lurus kaku di (1500, 3350) -> GAGAL
  4. `P22_boundary_t1` biomeTransition: transitionWidthCells = 0 (< 1.0 cel) batas lurus kaku di (2200, 3340) -> GAGAL
  5. `P01_xingcun` roadNaturalness: edgeRoughnessCells = 2.19 (> 0.4 cel) tepi lurus kaku -> GAGAL
  6. `P02_xingcun_cross` roadNaturalness: edgeRoughnessCells = 1.83 (> 0.4 cel) persimpangan kaku -> GAGAL
  7. `P11_xueshan` roadNaturalness: snow trench dark blue (snowRoadBRDiff = 15.5) -> GAGAL
  8. `P13_road_h` roadNaturalness: straight horizontal road segment -> GAGAL
  9. `P06_azure_pass` groundTextureRichness: batu abu datar satu makro (Sobel mean 4.14) -> GAGAL
  10. `P08_azure_far_west` groundTextureRichness: batu abu datar satu makro (Sobel mean 6.49) -> GAGAL

---

## Log Perubahan Fase
### P1: Continuous World Noise Mask & Weighted Variant Selection
- **File & Baris**: `web-dashboard/src/lib/groundRenderer.ts` (L30–65, L1241–1327)
- **Penyebab**: Pemilihan varian sekunder sebelumnya menggunakan grid blok diskrit 8x8 dan pemotongan crop border `(V_BORDER, V_BORDER, 4, 4)` tanpa padding ke luar bounds chunk, memicu bercak ground persegi dan seam lurus pada sampling varian acak seragam (1/N).
- **Perbaikan**:
  1. Menambahkan fungsi kontinu `smoothNoise2D` dan `fbmNoise2D` berdasar koordinat dunia global `(worldX, worldY)`.
  2. Mengimplementasikan `VM_CELLS = 16` dengan halo border `V_BORDER = 3` (padding 6 petak).
  3. Upscaling dan blur mask merentang penuh dari `-padPx` hingga `canvasWidth + 2*padPx` sehingga continuous $C^1$ melintasi perbatasan chunk.
  4. Menerapkan bobot CDF: Varian primer mendominasi ~75%, varian sekunder berbagi ~25% sebagai patch pulau-pulau organik alami.
- **Bukti Sesudah**:
  - `P01_xingcun straightEdgeCount: 0` (Target <= 1) -> PASS
  - `P03_wild straightEdgeCount: 0` (Target <= 1) -> PASS
  - Audit Kontrak Grid V10: V1–V9 100% PASS, G1–G8 100% PASS.

---

### P2: Farmland & Lotus Pond
- **File & Baris**: `web-dashboard/public/assets/ground/ground-manifest.json` dan `web-dashboard/src/lib/groundRenderer.ts` (L1350–1475)
- **Penyebab**: Farmland sebelumnya menampilkan makro tanah mentah berwarna olive-cokelat kering (Hue 64.8 deg) dengan garis alur bajak diagonal sintetis; `pond_lotus` salah dipetakan ke family `'swamp'` dengan `poison_pool_m2`.
- **Perbaikan**:
  1. Mengoreksi pemetaan `pond_lotus` di `ground-manifest.json` ke family `'lake'` (air jernih) dengan varian `v11/lake_m1`, `v11/lake_m2`, `v11/river_m1`.
  2. Mengimplementasikan `compositeFarmlandPaddy`: lapisan glaze giok hijau subur (`rgba(68, 138, 48, 0.42)`), petak sawah bersudut membulat (*rounded paddy plots*), pematang rumput pembatas 1 sel (`#4a6c30`), genangan air dangkal jernih, dan taburan tunas padi muda (`rgba(112, 168, 58, 0.75)`).
  3. Mengimplementasikan `compositeLotusPond`: air teal reflektif jernih (`rgba(62, 128, 134, 0.45)`), daun teratai hijau zamrud mengapung (`rgba(48, 122, 78, 0.85)`), dan kuncup bunga lotus pink (`rgba(235, 142, 172, 0.92)`).
- **Bukti Sesudah**:
  - `P04_farm` groundColorSanity(field): Hue = 85.3 deg (Target 65..100 deg) -> PASS
  - `P04_farm` streakCoherence: 0.2128 (Target <= 0.30) -> PASS
  - `P04_farm` straightEdgeCount: 0 (Target <= 1) -> PASS
  - Audit Kontrak Grid V10: V1–V9 100% PASS, G1–G8 100% PASS.

---

### P3: Organic Biome Transition
- **File & Baris**: `web-dashboard/src/lib/groundRenderer.ts` (L1045–1190)
- **Penyebab**: Batas perbatasan family sebelumnya diisi biner diskrit 0/1 per petak sel kaku tanpa modulasi kontinu, dan radius blur hanya `0.32 * tileSize` (~17px) dengan padding halo `BORDER = 2`, menghasilkan batas garis potong lurus kaku pada perbatasan T1 di `P21` (0.389 sel) dan `P22` (0.0 sel).
- **Perbaikan**:
  1. Menaikkan halo border padding `BORDER` dari 2 menjadi 3 sel (`GRID_DIM = 38`), mencegah clipping saat blur diperlebar.
  2. Mengimplementasikan modulasi batas sel berbasis `fbmNoise2D` kontinu dunia pada sel perbatasan (undulasi organik meliuk alami).
  3. Memperlebar blur feathering perbatasan family dari `0.32 * tileSize` ke `0.75 * tileSize` (~40.5px) untuk transisi lembut bertahap.
- **Bukti Sesudah**:
  - `P21_boundary_t1` transitionWidthCells: 11.389 sel (Target >= 1.0) -> PASS
  - `P22_boundary_t1` transitionWidthCells: 5.278 sel (Target >= 1.0) -> PASS
  - `straightEdgeCount`: 0 pada kedua titik -> PASS
  - Audit Kontrak Grid V10: V1–V9 100% PASS, G1–G8 100% PASS.

---

### P4: Natural Road & Opaque Snow Road
*(Akan dicatat pada P4)*
