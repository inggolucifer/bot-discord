# Catatan Perubahan & Penambahan Ambang Gerbang V14 (Gate Changes)

Dokumen ini mencatat seluruh perubahan ambang gerbang (thresholds), pengetatan, dan gerbang baru dari V13 ke V14 sesuai Aturan Keras 4 & 5.

---

## 1. Gerbang Baru (New Gates V14)

| ID Gerbang | Nama Gerbang | Target Ambang | Alasan & Bukti Kebutuhan |
|---|---|---|---|
| `G_SELFTEST_PIXEL_GATES` | Gate Self-Test Negative and Positive Validation | `== true` | Mencegah terulangnya false PASS pada gate visual. Menjalankan 4 uji negatif (gambar sintetis cacat wajib GAGAL) dan 2 uji positif (gambar bersih wajib PASS) melalui `scripts/v14/gateSelfTest.js`. |
| `G_PALE_FLAT_FLOOR` | Flat Pale / Xuan Paper Unrendered Floor Area | `== 0` | Mengatasi temuan H3 (lantai pucat/krem tanpa tekstur di Azure pada shot `e_azure` dan `h_wall`). Mendeteksi area datar $\ge 4\times 3$ sel dengan $L > 210$ dan $\text{std}(L) < 6.0$. |
| `G_STRAIGHT_SEAM` | Straight Vertical or Horizontal Chunk Seam Boundaries | `== 0` | Mengatasi temuan H3 (garis batas kontur lurus pemisah chunk). Mendeteksi garis kontur lurus vertikal/horizontal $\ge 150$ px dengan $\Delta\text{RGB} > 20$. |
| `G_DENSITY_WESTERN_GORGE` | Western Gorge Labyrinth Viewport Density | `>= 14` sprites/vp | Mengatasi temuan H4 (kepadatan lembah turun dari 16 ke 7). Menjamin koridor ngarai barat tidak gersang. |
| `G_DENSITY_SWORD_GORGE` | Sword Gorge Viewport Density | `>= 14` sprites/vp | Mengatasi temuan H4 (kepadatan sword gorge turun dari 19 ke 10). Menjamin vegetasi dan pilar batu ngarai pedang memadai. |
| `G_DENSITY_AZURE_MOUNTAIN` | Azure Mountain Range Viewport Density | `>= 18` sprites/vp | Mengatasi temuan H4 (kepadatan azure mountain turun dari 24 ke 17). Menjamin formasi batuan & flora pegunungan azure tidak kosong. |

---

## 2. Gerbang yang Diperketat / Diperbarui (Tightened Gates)

| ID Gerbang | Ambang Lama (V13) | Ambang Baru (V14) | Alasan Perubahan |
|---|---|---|---|
| `G_ROAD_LADDER_AUTOCORR` | `== 0` (lag tetap) | `== 0` (multi-lag + block detector) | V13 melaporkan PASS padahal jalan di Xingcun dan Frost berpola balok rel periodik. Algoritma diperbarui menggunakan 1D residual autocorrelation lintas lag 20–140 px serta deteksi balok periodik seragam ($\sigma < 0.22$, $\Delta L > 10$). |
| `G_GROUND_PLAINS_LATTICE` | `<= 0.45` | `<= 0.35` | V13 melaporkan 0.293 (PASS) padahal mosaik 2x2 `plains_m1` membentuk kisi berlian diagonal nyata. Ambang diperketat ke 0.35 dengan penambahan deteksi korelasi diagonal multi-lag dan rasio puncak FFT 2D ($\ge 300$). |

---

## 3. Gerbang yang Dipertahankan dari V13 (Preserved Gates)
- `G_DENSITY_CENTRAL_PLAINS` (`>= 28`)
- `G_DENSITY_NINE_SPRINGS` (`>= 28`)
- `G_DENSITY_NORTHERN_DESOLATE` (`>= 16`)
- `G_DENSITY_THUNDERSTEPPE` (`>= 16`)
- `G_DENSITY_BEAST_PRAIRIES` (`>= 20`)
- `G_DENSITY_TOTAL_OBJECTS` (`>= 70000`)
- `G_DENSITY_PER_CHUNK_PLAINS` (`>= 55`)
- `G_DENSITY_COLLINEAR_LATTICE` (`== 0`)
- `G_BARRIER_AZURE_CLOSURE` (`== 0`)
- `G_BARRIER_REACHABILITY` (`== 31`)
- `G_BARRIER_ZERO_HAZARD_SPAWN` (`== 0`)
- `G_SETTLEMENT_WHITE_SQUARE` (`== 0`)
- `G_SETTLEMENT_LUM_DIFF` (`<= 22.0`)
- `G_GROUND_SEAM_4SIDES` (`<= 4.0`)
- `G_GROUND_SEAM_MOSAIC_2X2` (`<= 5.0`)
- `G_GROUND_BAKED_PATHS` (`== 0`)
- `G_GROUND_CLEAN_ACTIVE` (`== PASS`)
- `G_SMEAR_RATIO` (`== 0`)
- `G_MOUNTAIN_SIZE_AZURE` (`>= 50.0%`)
- `G_MOUNTAIN_SIZE_XL` (`>= 15.0%`)
- `G_TINT_RED_SOLID_PIXELS` (`== 0`)
- `G_GRID_CONTRACT_AUDIT` (`== true`)
- `G_AUDIT_GRID_V10` (`== true`)
- `G_TRUTH_CHECK_HASHES` (`>= 144`)
