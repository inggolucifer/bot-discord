# Dokumen Diagnosis V15 — Investigasi Bukti & Perbaikan Terukur

Repositori: `inggolucifer/bot-discord` → `jianghu-bot`  
Basis Git: `319ddc6` (V14 Release)  
Target: **V15 Final Delivery**

---

## 1. Ringkasan Baseline & Bukti Awal (P0)

Sesuai aturan keras V15: **Satu perubahan = satu penyebab = satu bukti**. Seluruh gerbang baru telah diverifikasi melalui 9 self-test mandiri (`scripts/v15/gateSelfTest.js`) dan baseline tercatat di `review/v15_baseline_gates.json`.

| ID | Masalah | File & Baris Penyebab | Bukti Sebelum (Baseline) | Rencana Perbaikan Terukur | Bukti Sesudah |
|---|---|---|---|---|---|
| **J1** | Jalan tidak tergambar (coverage < 0.85) | `groundRenderer.ts` L578, L583, L635, L1125 | Xingcun `roadCoverage: 0.142` (FAIL), Xueshan `roadCoverage: 0.247` (FAIL) | Tambahkan `ctx.fill()` di setiap tile dalam helper, hapus `ctxMB.fill()` di luar loop, dukung multi-cell road | Menunggu P1 |
| **J2** | Ground Azure biru jenuh (sat > 0.22) | `regions.json` L38, `canonicalRegions.ts` L203, `groundRenderer.ts` L1317, L1356 | Azure patch `sat: 0.245 > 0.22`, `diff \|B-R\|: 22.6`, warna RGB (90, 102, 114) | Ubah `terrainColor` dari `#3d5a80` ke `#6e7378`, kurangi multiply slate & pass tint | **LULUS P2**: 8/8 titik Azure sat 0.081–0.142 (semua $\le 0.22$), diff \|B-R\| 0.2–7.4 ($\le 25$) |
| **J3** | Plains cokelat-olive & baked trail | `ground-manifest-v14.json` plains [1, 2], `plains_m1.webp` | `plains_m1.webp` `hasBakedPath: true` (flagged 2 komponen, aspect 3.23 & 2.94), Plains patch `hue: 64.7° < 65°` | Buat komposit `plains_v15` (70% meadow, 20% forest, 10% plains_m2; 0% plains_m1/m3/m4) | Menunggu P3 |
| **J4** | Audit buta (False PASS) | `pixelMetrics.py` & `groundContentAudit.py` | Gate ladder melaporkan PASS pada jalan kosong; audit tekstur loloskan jalan diagonal | Implementasikan `roadCoverage` dan `bakedPath` (aspect >= 3.5 / length >= 400px, Delta-E >= 12) | 9/9 self-tests PASS (`v15_selftest.json`) |
| **J5** | 18 macro kotor tanpa aliasing memadai | `ground-manifest-v14.json` | 18 file rejectedList, beberapa family < 3 varian bersih | Domain warp UV varian sekunder + aliasing family tetangga di `ground-alias-v15.json` | Menunggu P4 |
| **J6** | Kepadatan pegunungan p10 rendah | `objectScatter.js` & `measureViewport.js` | Azure p10: 11 (target >= 12), Ore Teeth p10: 12 (target >= 13), Wind Isles: 11 (target >= 14) | Tambahkan variasi objek tematik non-barrier pada sel walkable sela massif | Menunggu P5 |

---

## 2. Status Evaluasi Gerbang Baseline P0
- `GATE_BASELINE_ROAD_COVERAGE_XINGCUN`: `0.142` (FAIL - Sesuai Ekspektasi Baseline)
- `GATE_BASELINE_ROAD_COVERAGE_XUESHAN`: `0.247` (FAIL - Sesuai Ekspektasi Baseline)
- `GATE_BASELINE_AZURE_STONE_COLOR`: `sat=0.245, |B-R|=22.6` (FAIL - Sesuai Ekspektasi Baseline)
- `GATE_BASELINE_PLAINS_GRASS_COLOR`: `hue=64.7°, sat=0.364` (FAIL - Sesuai Ekspektasi Baseline)
- `GATE_BASELINE_BAKED_PATH_PLAINS_M1`: `hasBakedPath=true` (FAIL - Sesuai Ekspektasi Baseline)
- **Status Gate P0**: **100% LULUS** (9/9 Self-Tests PASS, Baseline Akurat Mendeteksi 5 Cacat Utama).

---

## 3. Bukti Terukur Phase P2: Ground Azure Abu Batu Netral (J2)

### 3.1 Akar Cacat
- `regions.json` & `canonicalRegions.ts` mengonfigurasi `azure_mountain_range.palette.terrainColor` sebagai `#3d5a80` (RGB 61, 90, 128), menyuntikkan dominansi biru kuat (`B - R = 67`).
- `groundRenderer.ts` mengalikan `rock_ground` dan `canyon_floor` dengan multiply slate pekat `rgba(95, 110, 125, 0.35)` dan pass tint `rgba(90, 105, 120, 0.45)`.

### 3.2 Solusi Terukur
- `terrainColor` diubah menjadi `#6e7378` (RGB 110, 115, 120).
- Multiply slate dikurangi menjadi netral stone `rgba(120, 125, 130, 0.18)` dan pass tint menjadi gravel tint `rgba(105, 108, 110, 0.22)`.

### 3.3 Hasil Evaluasi Otoritatif (8 Titik di `review/v15_azure_evaluation.json`)
| Titik | Koordinat | Mean RGB | \|B - R\| (Target $\le 25$) | Mean Sat (Target $\le 0.22$) | Mean Val [0.38..0.65] | Status |
|---|---|---|---|---|---|---|
| `azure_01_pass_north` | (2200, 3340) | [111.1, 113.2, 111.3] | 0.2 | 0.084 | 0.455 | **PASS** |
| `azure_02_ridge_west` | (1500, 3350) | [118.0, 121.2, 120.4] | 2.4 | 0.088 | 0.475 | **PASS** |
| `azure_03_high_peak` | (1800, 3350) | [121.1, 126.5, 126.5] | 5.4 | 0.081 | 0.496 | **PASS** |
| `azure_04_pass_south` | (2600, 3340) | [112.5, 115.3, 118.4] | 5.9 | 0.091 | 0.452 | **PASS** |
| `azure_05_mid_ridge` | (2800, 3350) | [116.8, 119.8, 122.0] | 5.2 | 0.085 | 0.470 | **PASS** |
| `azure_06_inner_valley` | (3000, 3350) | [113.9, 117.1, 120.2] | 6.3 | 0.088 | 0.459 | **PASS** |
| `azure_07_east_bastion` | (3300, 3350) | [107.2, 109.5, 111.0] | 3.8 | 0.142 | 0.429 | **PASS** |
| `azure_08_cliff_edge` | (3500, 3350) | [96.9, 99.0, 104.3] | 7.4 | 0.112 | 0.388 | **PASS** |

- **Ringkasan Gate P2**: **8/8 Titik LULUS 100%**.
- **Kontrak Grid V10**: V1–V9 PASS (0 violation), G1–G8 PASS (0 violation).

