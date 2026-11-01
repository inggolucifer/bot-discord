# Laporan Diagnosis Empiris V17 (Phase P1)
Repo: `inggolucifer/bot-discord` | Branch: `main` | Head: `badaca3b` (P0)

Berdasarkan aturan V17: **"Satu perubahan = satu penyebab = satu bukti."**
Diagnosis ini didasarkan pada penangkapan aktual 48 screenshot ground-only (`&ground=only&grid=0`) dan evaluasi menggunakan alat ukur independen terkunci `verify_v17.py` dan `verify_v17_ext.py`.

---

## 1. Tabel Bisect Biome Boundary (P07 & P06)
Lokasi P07: (1500, 3350) zoom=1.0. Lokasi P06: (2200, 3340) zoom=1.0. Evaluasi: `verify_v17.py boundary <png> 1.0`.

| Titik & Layer Bisect | widthCells | widthPx | jump (ΔL) | Status Gate (widthCells >= 1.0) |
|---|---|---|---|---|
| `P07_bisect_base` | 0.0 | 0 | 60.8 | GAGAL (0 px / pisau lurus) |
| `P07_bisect_families` | 0.0 | 0 | 60.8 | GAGAL (0 px / pisau lurus) |
| `P07_bisect_variants` | 0.0 | 0 | 60.8 | GAGAL (0 px / pisau lurus) |
| `P07_bisect_all` (default) | 0.0 | 0 | 60.8 | GAGAL (0 px / pisau lurus) |
| `P06_bisect_base` | 1.0 | 1 | 56.6 | LULUS (batas awal kasar) |
| `P06_bisect_families` | 0.0 | 0 | 47.3 | GAGAL (0 px / pisau lurus) |
| `P06_bisect_variants` | 0.0 | 0 | 47.3 | GAGAL (0 px / pisau lurus) |
| `P06_bisect_all` (default) | 0.0 | 0 | 47.3 | GAGAL (0 px / pisau lurus) |

### Analisis Akar Masalah:
- **File & Baris**: `web-dashboard/src/lib/groundRenderer.ts:1094-1150`.
- **Penyebab**: Mask per-famili `scratchM` dirender pada dimensi kisi ubin $38 \times 38$ piksel (1 sel = 1 piksel mask). Saat digambar ke kanvas chunk melalui kanvas perantara, batas ubin antar famili (`rock_ground` vs `plains`) terpotong secara diskrit per-sel. Transisi G2 lama di `renderL2BiomeTransitions` hanya beroperasi pada layer non-bitmap L2 dan diabaikan pada pipeline bitmap L1.
- **Rencana Perbaikan (P2)**:
  1. Buat offscreen continuous weight map beresolusi tinggi (4 px per sel, ukuran $152 \times 152$ piksel untuk $38 \times 38$ sel).
  2. Terapkan Gaussian blur kernel multi-tap (radius $\ge 2.5$ sel) pada batas famili.
  3. Modulasi koordinat sampling batas dengan fungsi noise 2-oktaf FBM kontinu dalam koordinat dunia (`fbm(worldX * 0.15, worldY * 0.15)`), memastikan batas memiliki variasi organik RMS $\ge 0.35$ sel dan lebar transisi $\ge 1.0$ sel.

---

## 2. Tabel Bisect Farmland (P04)
Lokasi P04: (2450, 2450) zoom=1.4. Evaluasi: `verify_v17.py farm <png>`.

| Layer Bisect | Brown Ratio | Green Ratio | Water Ratio | Coherence | Status Gate (Brown <= 0.10, Green >= 0.80) |
|---|---|---|---|---|---|
| `P04_bisect_nofarm` | 0.952 (95.2%) | 0.024 (2.4%) | 0.211 | 0.102 | GAGAL (Lahan dasar 95% cokelat) |
| `P04_bisect_base` | 0.374 (37.4%) | 0.626 (62.6%) | 0.000 | 0.164 | GAGAL (Cokelat 37.4%) |
| `P04_bisect_families` | 0.341 (34.1%) | 0.652 (65.2%) | 0.211 | 0.131 | GAGAL (Cokelat 34.1%) |
| `P04_bisect_default` (all) | 0.341 (34.1%) | 0.652 (65.2%) | 0.211 | 0.131 | GAGAL (Cokelat 34.1%) |

### Analisis Akar Masalah:
- **File & Baris**: `web-dashboard/src/lib/groundRenderer.ts:92-94`, `1423-1426`, dan `1605-1607`.
- **Penyebab**:
  1. Tekstur makro dasar untuk `farmland` memuat spektrum tanah cokelat kering (`dirt`/`farmland_dry`), terbukti dari `P04_bisect_nofarm` yang memiliki rasio cokelat 95.2%.
  2. Fungsi `compositeFarmlandPaddy` pada V16 menerapkan lapisan atas `soft-light` dengan transparansi `rgba(68, 138, 48, 0.42)`. Karena bersifat soft-light, warna dasar cokelat 95% tetap tembus keluar dan menghasilkan cokelat terukur 34.1% pada gambar akhir!
  3. Uji V16 `testFarmland.js` sebelumnya memalsukan hasil dengan rumus lantai `Math.max(0.45, 1 - brownOlive)`.
- **Rencana Perbaikan (P3)**:
  1. Ubah dasar makro sawah dan lahan hijau menjadi palet hijau subur sejati (`meadow_m1`, `meadow_m2` / `#4d7c38`).
  2. Dalam `compositeFarmlandPaddy`, gunakan mode blending `source-over` solid untuk petak sawah: dasar petak hijau segar berair (`#4a7c36`, `#3d6c2c`), pematang rumput hijau zamrud gelap (`#24421b`, `#1b3514`), dan pantulan langit halus.
  3. Hapus seluruh serpihan jerami kuning/cokelat kering dan sapuan olive.
  4. Hasil yang ditargetkan: `brown <= 0.08` (<0.10), `green >= 0.85` (>0.80), `coherence <= 0.25` (<0.30).

---

## 3. Tabel Bisect Jalan Alami (P01 & P11)
Lokasi P01: Xingcun (2050, 2650) zoom=1.4. Lokasi P11: Xueshan (2350, 4300) zoom=1.4. Evaluasi: `verify_v17_ext.py road <png> 1.4`.

| Titik & Layer Bisect | Right-Angle Corners | Staircase Patterns | Edge Roughness (cells) | Contrast ΔL | Status Gate |
|---|---|---|---|---|---|
| `P01_bisect_noroad` | 99 (N/A) | 99 (N/A) | 0.000 | 0.00 | N/A (Tanpa jalan) |
| `P01_bisect_default` | 7 | 0 | 3.962 | 25.73 | GAGAL (7 sudut siku, rough 3.962 > 0.14) |
| `P11_bisect_noroad` | 99 (N/A) | 99 (N/A) | 0.000 | 0.00 | N/A (Tanpa jalan) |
| `P11_bisect_default` | 0 | 0 | 1.105 | 45.31 | GAGAL (Roughness 1.105 > 0.14) |

### Analisis Akar Masalah:
- **File & Baris**: `web-dashboard/src/lib/groundRenderer.ts:588-660` (`drawSoftBlobRoadPath`) dan `1630-1640`.
- **Penyebab**:
  1. `drawSoftBlobRoadPath` menggambar jalan petak demi petak (per-tile) menggunakan stempel lingkaran/blob terputus dengan pemotongan koordinat sel diskrit. Sambungan antar-sel membentuk sudut 90 derajat (7 right-angle corners pada P01) dan tepi gerigi berlebih (`edgeRoughCells = 3.962`).
  2. Pada Xueshan (P11), jalan salju menggunakan sapuan abu-abu transparan yang bergerigi dan tidak menyatu menjadi pita salju padat yang alami.
- **Rencana Perbaikan (P4)**:
  1. Rombak penggambaran jalan menjadi **Single Continuous Corridor Mask**:
     - Kelompokkan sel jalan yang bertetangga dalam satu chunk menjadi segmen kontur kontinu.
     - Gambar centerline spline / Bezier halus yang menghubungkan pusat-pusat sel jalan.
     - Gambar pita koridor tebal dengan lebar 0.65–0.75 sel.
     - Lakukan morphological dilation & Gaussian edge smoothing pada mask jalan (4 px per sel).
     - Tambahkan modulasi noise lateral frekuensi tinggi beramplitudo rendah ($\pm 0.08$ sel) untuk menghasilkan tekstur alami tepi jalan tanpa membentuk tangga atau sudut siku.
  2. Untuk jalan salju Xueshan:
     - Render sebagai koridor salju padat (`#dce7ee`, `#c8d8e4`) dengan lekukan lembut dan sedikit batu alam yang mengintip di tengah, bukan `fillRect` transparan berundak.
  3. Hasil yang ditargetkan: `rightAngleCorners == 0`, `staircase == 0`, `edgeRoughCells` dalam rentang $[0.05, 0.14]$.

---

## 4. Analisis Tekstur Pegunungan Azure (P06, P07, P08, P09, P10)
Hasil evaluasi baseline pada 5 titik Azure (`verify_v17_ext.py strata <png>`):
- Baseline menunjukkan periodic horizontal autocorrelation tinggi (lag-2 ac = -0.526 di P07, run horizontal 7.84 sel), dan variasi mikroskopis lokal yang datar.
- **File & Baris**: `web-dashboard/src/lib/groundRenderer.ts:1618` (`compositeAzureKarst`) dan `1530-1595`.
- **Penyebab**:
  - `compositeAzureKarst` hanya menggunakan satu makro batu dan menambahkan garis-garis horizontal berulang secara periodik (`sin(worldY * 0.4)`).
- **Rencana Perbaikan (P5)**:
  - Kembalikan ambang batas `texture_richness_std_max` ke **22** (nilai V15) tanpa pelonggaran.
  - Multi-macro blend: Padukan minimal dua makro batu karst dengan rotasi dan offset berbeda.
  - Modulasi strata horizontal dengan 2D simplex/fbm noise frekuensi menengah untuk mematahkan garis lurus sehingga `maxHorizontalRunCells < 10.0` sel dan autokorelasi periodik hancur.

---

Diagnosis empiris ini memetakan penyebab langsung, bukti kuantitatif awal, dan arsitektur perbaikan yang siap diimplementasikan pada P2 s/d P5.

---

## 5. Bukti dan Hasil Verifikasi Phase P2 (Batas Biome Organik Kontinu)

### 5.1 Implementasi
1. **Weight Map Mask Resolusi Tinggi ($152 \times 152$)**:
   - `groundRenderer.ts:1100-1245`: MASK_SCALE ditingkatkan menjadi 4 px/sel ($152 \times 152$ piksel) dengan continuous world-space FBM noise displacement vector ($\pm 2.5$ sel) dan broad Gaussian blur radius $1.5 \times \text{tileSize}$ (81 px).
2. **Koreksi Clamping Fallback Neighbor & Base Family Selection**:
   - `groundRenderer.ts:1075-1090`: Mengeliminasi injeksi palsu `'plains'` pada batas chunk halo melalui clamping koordinat ke batas internal chunk (`clampX`, `clampY`).
   - Base family ditentukan secara otoritatif oleh famili internal dominan (`chunkInternalFamilyCounts`), mencegah kanvas rumput Central Plains bocor di bioma pegunungan Azure.
3. **Penyatuan Strata Karst Kontinu Lintas Chunk**:
   - `groundRenderer.ts:1574`: Mengeliminasi `cx * 19` pada seed pita batuan karst dan beralih ke koordinat dunia kontinu `Math.floor(worldY * 8)`, menghapus diskontinuitas jahitan antar-chunk secara total (`rows = 0` pada P07..P09).

### 5.2 Tabel Hasil Pengujian 15 Titik (P06..P10 dan P20..P29)
Evaluasi resmi menggunakan alat ukur independen terkunci `verify_v17.py boundary` dan `verify_v17.py straight` pada mode `&ground=only&grid=0`:

| Titik Evaluasi | Zoom | jump (ΔL) | widthCells (Target >= 1.0) | straight rows | straight rmsCells (Target >= 0.35 atau rows < 10) | Status Gate P2 |
|---|---|---|---|---|---|---|
| `P06_azure_pass` | 1.0 | 9.3 | 1.61 | 61 | 1.216 | **PASS** |
| `P07_azure_west` | 1.0 | 1.9 | 1.89 | 0 | None (tanpa garis lurus) | **PASS** |
| `P08_azure_far_west` | 1.0 | 2.8 | 2.39 | 0 | None (tanpa garis lurus) | **PASS** |
| `P09_azure_east` | 1.0 | 1.9 | 2.13 | 0 | None (tanpa garis lurus) | **PASS** |
| `P10_azure_mist` | 1.0 | 8.4 | 2.00 | 116 | 3.936 | **PASS** |
| `P20_boundary_t1` | 1.4 | 10.6 | 1.92 | 179 | 5.482 | **PASS** |
| `P21_boundary_t1` | 1.4 | 11.0 | 1.88 | 179 | 5.471 | **PASS** |
| `P22_boundary_t1` | 1.4 | 11.2 | 1.92 | 179 | 5.584 | **PASS** |
| `P23_boundary_t1` | 1.4 | 12.8 | 1.84 | 179 | 5.264 | **PASS** |
| `P24_boundary_t1` | 1.4 | 10.9 | 1.94 | 179 | 5.835 | **PASS** |
| `P25_boundary_azure` | 1.0 | 10.2 | 1.24 | 93 | 3.806 | **PASS** |
| `P26_boundary_azure` | 1.0 | 11.5 | 1.63 | 98 | 3.496 | **PASS** |
| `P27_boundary_azure` | 1.0 | 9.6 | 1.29 | 95 | 5.414 | **PASS** |
| `P28_boundary_azure` | 1.0 | 10.3 | 1.58 | 84 | 5.624 | **PASS** |
| `P29_boundary_azure` | 1.0 | 7.3 | 1.76 | 69 | 5.781 | **PASS** |

### 5.3 Audit Regresi Gerbang Wajib
- `checkBarrierClosure.js`: **PASS** (Celah resmi 4/4 lolos, Celah ilegal/bocor = 0).
- `auditGridV10.js` (V1–V9): **PASS 100%** (0 pelanggaran di 833 chunk).
- `testGridContract.js` (G1–G8): **PASS 100%** (0 pelanggaran).

