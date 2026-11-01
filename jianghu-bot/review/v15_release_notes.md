# CATATAN RILIS V15 — PERBAIKAN FINAL (BERBASIS BUKTI)

**Repositori**: `inggolucifer/bot-discord` → `jianghu-bot`  
**Basis Git**: `319ddc6` (V14 Release)  
**Target Rilis**: **V15 Final Delivery**  
**Status Evaluasi**: **SELESAI (100% PASS — 31/31 Gerbang Lolos)**  

---

## 1. Ringkasan Eksekutif

Rilis **V15** merupakan siklus perbaikan final dan komprehensif yang menyelesaikan seluruh anomali visual, kesalahan rendering spasial, dan artefak ground macro yang teridentifikasi pada evaluasi V14, dengan pendekatan **berbasis bukti numerik otoritatif (evidence-based)**.

Sesuai aturan keras V15:
1. **Satu Perubahan = Satu Penyebab = Satu Bukti Terukur**: Setiap intervensi kode didahului audit angka dan pembuktian empiris.
2. **Zero False-PASS**: 9 suite self-test mandiri (`scripts/v15/gateSelfTest.js`) menguji sampel negatif sintetis (rel/tangga, kisi berlian, kolom sejajar, dsb.) dan memverifikasi kegagalannya sebelum gate diizinkan aktif.
3. **Laporan Otomatis**: Laporan rilis `review/report_v15.md` dan `review/v15_gates.json` dihasilkan 100% oleh script otomatis `scripts/v15/gateRunner.js` tanpa manipulasi manual.

---

## 2. Rincian Masalah & Penyelesaian (J1–J6)

### 2.1 J1: Jalan Tidak Tergambar (Road Coverage Recovery)
- **Akar Masalah**: Pada `groundRenderer.ts` (L578, L583, L635, L1125), loop `drawSoftBlobRoadPath` tidak memanggil `ctx.fill()` di setiap tile dan memanggil `ctxMB.fill()` di luar loop pada sub-path kosong. Selain itu, multi-cell connector (`hw = 0.5 * tileSize`) belum terdistribusi dengan benar ke cell pass.
- **Solusi**: Penambahan `ctx.fill()` langsung per-tile, perbaikan konektivitas multi-sel, dan registrasi aktif cell pass di `WorldCanvas.tsx`.
- **Bukti Terukur**: 12/12 titik evaluasi jalan (`review/v15_road_evaluation.json`) mencapai **coverage 1.0 (100%)** dan **ladderPass true** (Xingcun coverage 1.0, falsePositive 0.007; Xueshan coverage 1.0, falsePositive 0.029; Pass coverage 1.0, falsePositive 0.012).

### 2.2 J2: Ground Azure Biru Jenuh (Neutral Slate Stone Ground)
- **Akar Masalah**: Konfigurasi `terrainColor: '#3d5a80'` (RGB 61, 90, 128) di `regions.json` dan `canonicalRegions.ts` menghasilkan saturasi biru jenuh (`B - R = 67`) yang ditumpuk dengan multiply slate pekat `rgba(95, 110, 125, 0.35)` dan pass tint `rgba(90, 105, 120, 0.45)` di `groundRenderer.ts`.
- **Solusi**: `terrainColor` diubah menjadi abu batu netral `#6e7378` (RGB 110, 115, 120), multiply slate diturunkan ke `rgba(120, 125, 130, 0.18)`, dan pass tint ke `rgba(105, 108, 110, 0.22)`.
- **Bukti Terukur**: 8/8 titik Azure (`review/v15_azure_evaluation.json`) terukur Mean Saturation **0.081–0.142** (semua $\le 0.22$) dan selisih $|B - R|$ hanya **0.2–7.4** (jauh di bawah batas toleransi $\le 25$).

### 2.3 J3 & J4: Plains Cokelat-Olive & Baked Trail Macro
- **Akar Masalah**: Macro `plains_m1.webp` memuat jalan melengkung pra-render (baked path sepanjang 842px, kontras $\Delta E = 44.5$) yang terdeteksi oleh `scripts/v15/groundContentAudit.py`. Plains lama memiliki hue jerami/kering $64.7^\circ < 65^\circ$.
- **Solusi**: `plains_m1.webp` dimasukkan ke `rejectedList` di `ground-manifest-v15.json` dan dieksklusi 100% dari runtime. Dibuat formula komposit `plains_v15`:
  - 70% `meadow` (`v11/meadow_m1`, `v11/meadow_m2`, `v11/meadow_m4`)
  - 20% `forest` (`v11/forest_floor_m1`, `v11/forest_floor_m2`)
  - 10% `plains` (`v11/plains_m2`)
- **Bukti Terukur**: 6/6 titik Plains (`review/v15_plains_evaluation.json`) menghasilkan hue hijau segar **80.0°–87.7°**, saturasi **0.319–0.494**, dan rasio cokelat/olive $\le 0.092$ (batas $\le 0.40$), dengan 0% penggunaan `plains_m1`.

### 2.4 J5: Ground Aliasing 18 Macro Kotor
- **Akar Masalah**: Pemblokiran 19 file makro kotor menyebabkan 5 family memiliki $< 3$ varian bersih.
- **Solusi**: Dibuat tabel aliasing bersih `ground-alias-v15.json` dan `syncManifestAndAliases.py` yang meminjamkan varian bersih antar family tetangga, serta implementasi **Domain Warp UV** ($\pm 15\%$ deterministic offset) pada varian sekunder di `groundRenderer.ts` (L1278–L1285).
- **Bukti Terukur**: 36/36 family aktif memiliki **$\ge 3$ varian bersih**, dan **0 varian rejected** aktif digunakan (`review/v15_aliasing_evaluation.json`).

### 2.5 J6: Kepadatan Pegunungan & Lembah
- **Akar Masalah**: Sela-sela massif Azure dan Ore Teeth mengalami defisit densitas (Azure p10 = 11 < 12; Ore Teeth p10 = 11 < 13); Floating Wind Isles memiliki budget terlalu rendah (40..60) dan penolakan petak `island_reef`.
- **Solusi**:
  - `azure_mountain_range` & `ore_teeth_range`: `baseMin` dinaikkan ke 108 (budget 108..128); `roll` walkable dinaikkan ke 0.65; kuota batu kecil dinaikkan ke 16; refill target 90% dengan pinus alpine kuno (`tree_pine_ancient_v1..v2`, `tree_cypress_frost_v1`).
  - `floating_wind_isles`: `baseMin` dinaikkan ke 85 (budget 85..105); `roll` dinaikkan ke 0.65 dengan pool tematik air/karang/pulau terapung yang 100% lolos regex air.
  - Perbaikan klasifikasi petak air di `objectScatter.js` (L907, L973) menghapus bug `lake_deep`, menghasilkan 0 pelanggaran di `checkObjectsOnWater.js`.
- **Bukti Terukur**:
  - `azure_mountain_range`: median **22.5** ($\ge 20$), p10 **12.0** ($\ge 12$), emptyRatio **0.604** ($\le 0.65$) $\to$ **PASS**
  - `ore_teeth_range`: median **23.0** ($\ge 22$), p10 **13.9** ($\ge 13$), emptyRatio **0.600** ($\le 0.65$) $\to$ **PASS**
  - `hermit_highlands`: median **25.0** ($\ge 22$), p10 **15.0** ($\ge 13$), emptyRatio **0.638** ($\le 0.65$) $\to$ **PASS**
  - `floating_wind_isles`: median **19.0** ($\ge 14$), p10 **14.0** ($\ge 9$) $\to$ **PASS**
  - Seluruh 29 region stabil (worst drop hanya 2% di `border_march` $\le 10\%$).

---

## 3. Hasil Validasi Gerbang Otoritatif (31/31 PASS)

Laporan lengkap `review/report_v15.md` mencatat **31/31 Gerbang Lolos 100%**:
1. `G_SELFTEST_V15`: PASS (9/9 self-tests)
2. `G_ROAD_COVERAGE_12PTS`: PASS (12/12 titik coverage 1.0)
3. `G_AZURE_STONE_SANITY_8PTS`: PASS (8/8 titik sat $\le 0.22$)
4. `G_PLAINS_GRASS_SANITY_6PTS`: PASS (6/6 titik hue 80.0°–87.7°)
5. `G_PLAINS_M1_EXCLUDED`: PASS (`plains_m1` 100% dieksklusi)
6. `G_GROUND_ALIASING_CLEAN_36FAM`: PASS (36/36 family $\ge 3$ varian)
7. `G_GROUND_ALIASING_ZERO_REJECTED`: PASS (0 rejected varian)
8. `G_DENSITY_AZURE_MOUNTAIN`: PASS (22.5 $\ge 20$)
9. `G_DENSITY_AZURE_P10`: PASS (12.0 $\ge 12$)
10. `G_DENSITY_AZURE_EMPTY_RATIO`: PASS (0.604 $\le 0.65$)
11. `G_DENSITY_ORE_TEETH`: PASS (23.0 $\ge 22$)
12. `G_DENSITY_ORE_TEETH_P10`: PASS (13.9 $\ge 13$)
13. `G_DENSITY_ORE_TEETH_EMPTY_RATIO`: PASS (0.600 $\le 0.65$)
14. `G_DENSITY_HERMIT_HIGHLANDS`: PASS (25.0 $\ge 22$)
15. `G_DENSITY_WIND_ISLES`: PASS (19.0 $\ge 14$)
16. `G_DENSITY_WIND_ISLES_P10`: PASS (14.0 $\ge 9$)
17. `G_DENSITY_CENTRAL_PLAINS`: PASS (29.0 $\ge 28$)
18. `G_DENSITY_NINE_SPRINGS`: PASS (28.0 $\ge 28$)
19. `G_DENSITY_NORTHERN_DESOLATE`: PASS (16.0 $\ge 16$)
20. `G_DENSITY_THUNDERSTEPPE`: PASS (16.0 $\ge 16$)
21. `G_DENSITY_BEAST_PRAIRIES`: PASS (24.0 $\ge 20$)
22. `G_DENSITY_WESTERN_GORGE`: PASS (21.0 $\ge 14$)
23. `G_DENSITY_SWORD_GORGE`: PASS (21.0 $\ge 14$)
24. `G_DENSITY_TOTAL_OBJECTS`: PASS (73.209 $\ge 70.000$)
25. `G_DENSITY_PER_CHUNK_PLAINS`: PASS (118.0 $\ge 55$)
26. `G_DENSITY_COLLINEAR_LATTICE`: PASS (0 instances)
27. `G_BARRIER_AZURE_CLOSURE`: PASS (0 kebocoran di semua window x)
28. `G_BARRIER_OFFICIAL_PASSES`: PASS (4/4 celah resmi lolos)
29. `G_ZERO_REGRESSION_TOTAL`: PASS (0 regresi di seluruh 12 check)
30. `G_GRID_CONTRACT_AUDIT`: PASS (G1–G8 100% PASS)
31. `G_AUDIT_GRID_V10`: PASS (V1–V9 100% PASS)

---

## 4. Galeri Screenshot Nyata (80 Tangkapan Dunia)

Sebanyak **80 tangkapan layar dunia nyata** berhasil diekstrak ke `review/shots_v15/` (40 titik koordinat $\times$ zoom 1.0 & 1.4), dengan **80 SHA-1 unik** (0 duplikasi), validasi pencahayaan lengkap (Mean 93.4–200.6, StdDev 27.0–58.7), dan 0 titik sampel gelap.
