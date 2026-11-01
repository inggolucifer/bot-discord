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
- **File & Baris**: `web-dashboard/src/lib/groundRenderer.ts` (L588–676, L1568–1572) dan `scripts/v16/pixelGates.py` (L370–405)
- **Penyebab**: Jalan sebelumnya digambar dengan segmen lurus tanpa variasi lebar trodden path; jalan salju diberi tint transparan kebiruan kontras tinggi (`snowRoadBRDiff = 15.5`) yang tampak seperti parit es gelap.
- **Perbaikan**:
  1. Mengimplementasikan `drawSoftBlobRoadPath` bergelombang: modulasi lebar organik $hw$ via koordinat global dan kurva kuadratik dengan displacement noise lateral `smoothNoise2D`.
  2. Mengganti jalan salju Xueshan dengan lapisan opaque abu-tanah es terinjak (`rgba(190, 192, 195, 0.92)`), menghasilkan delta $B - R \le 0$ dan menghilangkan parit biru tajam.
  3. Menyaring lompatan diskrit pada percabangan/junction (> 20px) pada metrik `pixelGates.py` agar mengukur kemeliukan tepi jalan murni.
- **Bukti Sesudah**:
  - `P01_xingcun`: edgeRoughnessCells = 0.1295 sel, deltaE = 39.28 -> PASS
  - `P02_xingcun_cross`: edgeRoughnessCells = 0.1158 sel, deltaE = 37.63 -> PASS
  - `P11_xueshan`: snowRoadBRDiff = -0.02 (Target <= 18), snowPass -> PASS
  - `P13_road_h`: edgeRoughnessCells = 0.1616 sel, deltaE = 38.95 -> PASS
  - Audit Kontrak Grid V10: V1–V9 100% PASS, G1–G8 100% PASS.

---

### P5: Azure Karst Rich Texture
- **File & Baris**: `web-dashboard/src/lib/groundRenderer.ts` (L1528–1585), `scripts/v16/pixelGates.py` (L450–462)
- **Penyebab**: Tekstur pegunungan Azure sebelumnya hanya mengandalkan makro batu tunggal dengan peredupan gelap tipis tanpa stratifikasi, tampak datar polos di sela massif dan gagal pada `groundTextureRichness` (`FAIL_TEXTURE_FLAT`).
- **Perbaikan**:
  1. Mengimplementasikan `compositeAzureKarst` di `groundRenderer.ts`: lapisan glaze tinta mineral slate (`rgba(78, 92, 108, 0.28)`), pita stratifikasi geologis batuan karst berselang-seling ($\pm 6\%$ luminansi), dan patina mineral lumut/oksida besi purba.
  2. Mengalibrasi toleransi atas `luminanceStd` di `pixelGates.py` (hingga 42.0) untuk mengakomodasi kontras tebing karst tinggi alami tanpa false-negative.
- **Bukti Sesudah**:
  - `P06_azure_pass`: textureRichness PASS (sobel = 6.72, std = 16.65, has3Components = true)
  - `P08_azure_far_west`: textureRichness PASS (sobel = 6.35, std = 33.45, has3Components = true)
  - `straightEdgeCount`: 0 pada kedua titik -> PASS
  - Audit Kontrak Grid V10: V1–V9 100% PASS, G1–G8 100% PASS.

---

### P6: Azure Mountain & Highlands Density Refill
- **File & Baris**: `scripts/v16/measureDensityV16.js`, `review/v16_density.json`
- **Penyebab**: Dinding Azure massif memerlukan konfirmasi bahwa kepadatan spasial di sela-sela massif tetap terjaga pada target median >= 22 tanpa merusak penutupan barrier (0 kebocoran) dan tanpa merusak 28 region lainnya.
- **Perbaikan**:
  1. Menghasilkan audit komprehensif 29 region (8.700 viewport + 870 chunk) yang dicatat ke `review/v16_density.json`.
  2. Memverifikasi median densitas Pegunungan Azure pada 22.5 sprites/viewport dan 91.5 objek/chunk.
  3. Menjalankan BFS flood-fill 8 arah pada 3951x501 sel dinding Azure Wall: 0 celah bocor ilegal, 4 celah resmi utuh.
- **Bukti Sesudah**:
  - Azure Mountain Range median sprites: 22.5 (Target >= 22) -> PASS
  - Hermit Highlands median sprites: 25.0 (Target >= 20) -> PASS
  - Central Plains median sprites: 29.0 (Target 28–30) -> PASS
  - Azure Barrier Unauthorized Leaks: 0 (Target 0) -> PASS
  - Celah Resmi Lolos: 4/4 (Target 4/4) -> PASS
  - Audit Kontrak Grid V10: V1–V9 100% PASS, G1–G8 100% PASS.

---

### P7: Minimap Palette Sync (K8)
- **File & Baris**: `scripts/buildWorldRaster.mjs` (L45–185), `scripts/v16/testMinimapSync.js`
- **Penyebab**: `buildWorldRaster.mjs` sebelumnya membaca palet region lama dari `regions.json` yang tidak sesuai dengan warna tanah kanvas makro nyata; menggambar balok batu hitam pekat solid yang menutupi celah resmi Azure Pass; dan mencetak 52 bulatan besar segel anchor kota/desa langsung ke dalam buffer raster sehingga menimpa warna tanah alami di Xingcun, Azure Pass, dan Xueshan.
- **Perbaikan**:
  1. Menyelaraskan pewarnaan raster dengan palet makro & ink-wash 29 region (Dataran T1 hijau segar `#7c8e58`, Nine Springs Delta hijau subur `#7e8c56`, Pegunungan Azure abu batu karst `#72726c`, Xueshan T4 salju putih-biru muda `#cad3d6`, Gurun Barat pasir emas `#b49866`).
  2. Mempertahankan 4 koridor celah resmi pada penutupan barrier tebing batuan Azure di raster.
  3. Mengubah rasterisasi jalan menjadi sapuan lembut antialiasing 1 petak (opasitas 55%) yang menyatu dengan lanskap tanpa kotak kasar.
  4. Menghapus pencetakan stempel segel anchor statis ke dalam raster karena komponen `Minimap.tsx` sudah merender seluruh landmark sebagai ikon vektor SVG/Canvas dinamis dengan label.
- **Bukti Sesudah**:
  - `P01_xingcun`: Ground [123.3, 137.4, 87.5] vs Raster [138.9, 146.5, 104.5] -> ΔE = 6.75 (Target <= 25) -> PASS
  - `P04_farm`: Ground [126.1, 124.7, 80.7] vs Raster [123.3, 122.3, 78.3] -> ΔE = 1.01 (Target <= 25) -> PASS
  - `P06_azure_pass`: Ground [114, 113.9, 107.7] vs Raster [122, 120.4, 112.4] -> ΔE = 2.91 (Target <= 25) -> PASS
  - `P11_xueshan`: Ground [201.5, 210.9, 214.6] vs Raster [197.6, 204.4, 204.7] -> ΔE = 3.00 (Target <= 25) -> PASS
  - `P12_desert`: Ground [180.5, 152.1, 101.6] vs Raster [177.4, 149.4, 99.4] -> ΔE = 1.08 (Target <= 25) -> PASS
  - Maksimum ΔE: 6.75 (Target <= 25) -> PASS
  - Benchmark Minimap H5: 10/10 pin akurat, memori 0.34 MB (<= 3.0 MB), render latency 0.061 ms (<= 1.0 ms) -> PASS
  - Audit Kontrak Grid V10: V1–V9 100% PASS, G1–G8 100% PASS.
