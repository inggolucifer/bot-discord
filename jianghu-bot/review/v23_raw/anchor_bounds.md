# Analisis dan Keputusan Otoritatif Batas Spasial Anchor (G1.5)

Dokumen ini mencatat investigasi dan keputusan resmi atas temuan butir 1.8 mengenai dua anchor pemukiman yang berada di luar kotak pembatas (*Axis-Aligned Bounding Box / AABB*) sederhana pada `regions.json`:

---

## 1. Temuan Data
1. **`sarang_naga_karang_timur`**:
   - Koordinat Anchor: $(x: 3880, y: 2750)$
   - Region: `ore_teeth_range`
   - AABB Bounds `regions.json`: `minX: 3400, maxX: 3850, minY: 2400, maxY: 3200`
   - Deviasi: Koordinat $X = 3880$ berada 30 petak di sebelah timur batas $maxX = 3850$.
   - Hasil `worldRegionEngine.getRegionAt(3880, 2750)`: `ore_teeth_range` (Sesuai 100%).

2. **`dermaga_teluk_sembilan`**:
   - Koordinat Anchor: $(x: 2500, y: 2300)$
   - Region: `nine_springs_delta`
   - AABB Bounds `regions.json`: `minX: 2200, maxX: 2600, minY: 2350, maxY: 2550`
   - Deviasi: Koordinat $Y = 2300$ berada 50 petak di sebelah utara batas $minY = 2350$.
   - Hasil `worldRegionEngine.getRegionAt(2500, 2300)`: `nine_springs_delta` (Sesuai 100%).

---

## 2. Analisis Teknis & Arsitektur
- Mesin penentu wilayah dunia Jianghu (`worldRegionEngine.js` mendelegasikan ke `worldData.js`) **TIDAK MENGGUNAKAN** kotak AABB sederhana untuk mendeteksi wilayah pemain.
- Mesin menggunakan **raster matrix 50×50 dengan domain-warping kontinu** (Perlin/Simplex noise) sehingga perbatasan wilayah berbentuk organik dan melengkung secara alami, bukan kotak kaku.
- Kotak `bounds` pada `regions.json` hanyalah estimasi kasar *bounding box* awal saat proyek pertama kali diinisialisasi.

---

## 3. Keputusan Otoritatif
- **Posisi kedua anchor DIPERTAHANKAN** pada koordinat aslinya.
- Mengubah posisi anchor akan melanggar konsistensi 52 anchor kanonikal V20 dan merusak formasi pemukiman yang telah disetujui.
- Mesin `getRegionAt(x, y)` tetap menjadi **Single Source of Truth (SSOT)** otoritatif tertinggi penentuan wilayah di seluruh runtime dan audit.
