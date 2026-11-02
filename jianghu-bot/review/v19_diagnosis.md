# Diagnosis Masalah V19 (review/v19_diagnosis.md)

## F1 — Analisis & Verifikasi Persegi Olive di Xingcun (2050, 2650)

### 1. Data Riil Terrain dan GridFamilies pada Sel (2050..2055, 2650..2655)
Melalui pembacaan langsung dari `chunkStreamingEngine.js` pada chunk `(cx=64, cy=82)`:

| Sel Dunia (x, y) | Terrain Sumber | `gridFamilies` | Tetangga Sisi Kardinal Road | Deskripsi Tetangga [N, S, W, E] |
|---|---|---|:---:|---|
| (2050, 2650) | `settlement` | `settlement_floor` | 1 | N: plains, S: settlement, W: road_stone, E: settlement |
| (2051, 2650) | `settlement` | `settlement_floor` | 1 | N: road_stone, S: settlement, W: settlement, E: settlement |
| (2052, 2650) | `settlement` | `settlement_floor` | 2 | N: road_stone, S: settlement, W: settlement, E: road_stone |
| (2053, 2650) | `road_stone` | `road_stone` | 3 | N: road_stone, S: road_stone, W: settlement, E: road_stone |
| (2050, 2651) | `settlement` | `settlement_floor` | 1 | N: settlement, S: settlement, W: road_stone, E: settlement |
| (2051, 2651) | `settlement` | `settlement_floor` | 0 | N: settlement, S: settlement, W: settlement, E: settlement |
| (2052, 2651) | `settlement` | `settlement_floor` | 1 | N: settlement, S: settlement, W: settlement, E: road_stone |
| (2053, 2651) | `road_stone` | `road_stone` | 2 | N: road_stone, S: road_stone, W: settlement, E: plains |
| (2050, 2652) | `settlement` | `settlement_floor` | 0 | N: settlement, S: plains, W: plains, E: settlement |
| (2051, 2652) | `settlement` | `settlement_floor` | 0 | N: settlement, S: plains, W: settlement, E: settlement |
| (2052, 2652) | `settlement` | `settlement_floor` | 1 | N: settlement, S: plains, W: settlement, E: road_stone |
| (2053, 2652) | `road_stone` | `road_stone` | 2 | N: road_stone, S: road_stone, W: settlement, E: plains |

### 2. Verifikasi Empiris Penyebab Persegi Olive (Bukan Asumsi)
1. **Perbedaan Tekstur Sumber**:
   - `road_stone` menggunakan aset `v11/road_stone_m1..4.webp` dengan rata-rata RGB `[124.7, 119.2, 108.2]` (batu abu netral Song Dynasty).
   - `settlement_floor` menggunakan aset `v11/settlement_floor_m1..4.webp` dengan rata-rata RGB `[172.8, 154.2, 109.1]` (warna kekuningan/olive pekat).
2. **Lapisan Tint Bertumpuk**:
   - Pada `groundRenderer.ts` baris 1963–1969, terdapat sapuan tambahan:
     `ctxT.fillStyle = 'rgba(180, 160, 135, 0.08)'` khusus untuk `F === 'settlement_floor'`, memperparah deviasi warna ke arah kuning-olive.
3. **Mekanisme Tumpang Tindih Mask**:
   - Fungsi `buildRoadAlphaMask` (L1061) memiliki predikat `isRoadOrSettlement` yang menganggap `settlement_floor` sebagai sambungan koridor jalan dan memperluas batas persegi jalan ke arahnya (L1102–1116).
   - Namun karena `settlement_floor` dirender di layer independen (FAMILY_RENDER_ORDER index 29 sebelum `road_stone` index 30) dengan tekstur olive dan tint kuning, interior petak pemukiman menampakkan batas tegas persegi berwarna olive di piksel (720–830, 440–530), dengan selisih kanal RGB terukur sebesar **18.44 > 12.0**.

### 3. Solusi Perbaikan
1. Menyelaraskan tekstur pemukiman di dataran: ketika `F === 'settlement_floor'`, gunakan `effectiveFamily = 'road_stone'` (tekstur batu abu netral yang sama persis dengan koridor jalan) jika berada di lingkungan dataran/budaya.
2. Menghapus sapuan tint `rgba(180, 160, 135, 0.08)` pada `settlement_floor`.
3. Mengintegrasikan petak `settlement_floor` yang bertetangga jalan secara halus ke dalam koridor jalan sehingga tidak ada tepi lurus atau persegi warna berbeda.
