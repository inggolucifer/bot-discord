# Laporan Evaluasi Gerbang V13 (BASELINE HEAD a34b58e)

> **Waktu Eksekusi**: 2026-10-31T04:57:23.986Z  
> **Mode**: BASELINE  
> **Total Gerbang**: 26 | **PASS**: 9 | **GAGAL**: 17  
> **Status Keseluruhan**: ❌ TERDAPAT GERBANG GAGAL

---

## Tabel Status Gerbang

| ID | Nama Gerbang | Target | Nilai Terukur | Status | Bukti (Source Path) |
|---|---|---|---|:---:|---|
| **G_DENSITY_CENTRAL_PLAINS** | Central Plains Viewport Density | `>= 28 sprites/viewport` | `7 sprites/viewport` | 🔴 GAGAL | `review/v13_baseline_density.json -> central_plains.sprites.median = 7` |
| **G_DENSITY_NINE_SPRINGS** | Nine Springs Delta Viewport Density | `>= 28 sprites/viewport` | `5 sprites/viewport` | 🔴 GAGAL | `review/v13_baseline_density.json -> nine_springs_delta.sprites.median = 5` |
| **G_DENSITY_NORTHERN_DESOLATE** | Northern Desolate Viewport Density | `>= 16 sprites/viewport` | `2 sprites/viewport` | 🔴 GAGAL | `review/v13_baseline_density.json -> northern_desolate.sprites.median = 2` |
| **G_DENSITY_THUNDERSTEPPE** | Thundersteppe Viewport Density | `>= 16 sprites/viewport` | `2 sprites/viewport` | 🔴 GAGAL | `review/v13_baseline_density.json -> thundersteppe.sprites.median = 2` |
| **G_DENSITY_BEAST_PRAIRIES** | Beast Prairies Viewport Density | `>= 20 sprites/viewport` | `8 sprites/viewport` | 🔴 GAGAL | `review/v13_baseline_density.json -> beast_prairies.sprites.median = 8` |
| **G_DENSITY_TOTAL_OBJECTS** | Total Audited Objects in Grid | `>= 70000 objects` | `47173 objects` | 🔴 GAGAL | `review/v10_audit_summary.json -> totalObjects = 47173` |
| **G_DENSITY_PER_CHUNK_PLAINS** | Central Plains Per-Chunk Objects | `>= 55 objects/chunk` | `30 objects/chunk` | 🔴 GAGAL | `review/v13_baseline_density.json -> central_plains.perChunkObjects.median = 30` |
| **G_DENSITY_COLLINEAR_LATTICE** | Strict Collinear Lattice Instances | `== 0 instances` | `0 instances` | 🟢 PASS | `review/v13_baseline_density.json -> _summary.collinearLatticeCount = 0` |
| **G_BARRIER_AZURE_CLOSURE** | Azure Mountain Impassable Barrier Closure | `== 0 leak corridors` | `380 leak corridors` | 🔴 GAGAL | `review/v13_baseline_barrier_closure.json -> unauthorizedLeaks = 380` |
| **G_BARRIER_REACHABILITY** | Settlement Global Reachability from Xingcun | `== 31 settlements` | `31 settlements` | 🟢 PASS | `review/v13_baseline_barrier_closure.json -> reachableSettlements = 31` |
| **G_BARRIER_ZERO_HAZARD_SPAWN** | Hazard Spawns on Blocked Barrier Cells | `== 0 hazards` | `0 hazards` | 🟢 PASS | `review/v13_baseline_barrier_closure.json -> hazardSpawnsOnBarrier = 0` |
| **G_SETTLEMENT_WHITE_SQUARE** | Pale Straight-Edge Settlement Square Artifacts | `== 0 artifacts` | `1 artifacts` | 🔴 GAGAL | `review/v13_baseline_pixel_metrics.json -> summary.whiteSquare = 1` |
| **G_SETTLEMENT_LUM_DIFF** | Max Settlement vs Surroundings Luminance Delta | `<= 22 delta L` | `29.3 delta L` | 🔴 GAGAL | `review/v13_baseline_pixel_metrics.json -> summary.maxLumDiff = 29.3` |
| **G_ROAD_LADDER_AUTOCORR** | Road Periodic Ladder / Rail Artifacts | `== 0 artifacts` | `0 artifacts` | 🟢 PASS | `review/v13_baseline_pixel_metrics.json -> summary.roadLadder = 0` |
| **G_GROUND_SEAM_4SIDES** | Ground Macro 4-Side Seam Mean Diff | `<= 4 RGB diff` | `2.36 RGB diff` | 🟢 PASS | `review/v13_baseline_ground_audit.json -> gates.G_GROUND_SEAM_4SIDES.actual = 2.36` |
| **G_GROUND_SEAM_MOSAIC_2X2** | Ground Macro 2x2 Mosaic Seam Mean Diff | `<= 5 RGB diff` | `2.36 RGB diff` | 🟢 PASS | `review/v13_baseline_ground_audit.json -> gates.G_GROUND_SEAM_MOSAIC_2X2.actual = 2.36` |
| **G_GROUND_PLAINS_LATTICE** | Plains Macro Mosaic Lag-512 Autocorrelation Peak | `<= 0.45 peak corr` | `0.998 peak corr` | 🔴 GAGAL | `review/v13_baseline_ground_audit.json -> gates.G_GROUND_PLAINS_LATTICE.actual = 0.998` |
| **G_GROUND_BAKED_PATHS** | Base Biome Ground Macros with Baked Paths | `== 0 macros` | `0 macros` | 🟢 PASS | `review/v13_baseline_ground_audit.json -> gates.G_GROUND_BAKED_PATHS.actual = 0` |
| **G_GROUND_CLEAN_ACTIVE** | Active Ground Families Have >= 2 Clean Variants | `== PASS status` | `FAIL status` | 🔴 GAGAL | `review/v13_baseline_ground_audit.json -> gates.G_GROUND_CLEAN_ACTIVE.actual = "FAIL"` |
| **G_SMEAR_RATIO** | Smear / Edge-Clamped Pixel Stretch Artifacts | `== 0 artifacts` | `1 artifacts` | 🔴 GAGAL | `review/v13_baseline_pixel_metrics.json -> summary.smear = 1` |
| **G_MOUNTAIN_SIZE_AZURE** | Mountain Footprints >= 4x2 in Mountain Regions | `>= 50 %` | `0.57 %` | 🔴 GAGAL | `review/v13_baseline_mountains.json -> pctGe4x2 = 0.57` |
| **G_MOUNTAIN_SIZE_XL** | Mountain Footprints >= 6x3 in Mountain Regions | `>= 15 %` | `0.57 %` | 🔴 GAGAL | `review/v13_baseline_mountains.json -> pctGe6x3 = 0.57` |
| **G_TINT_RED_SOLID_PIXELS** | Solid Red Footprint Tint Fill Blocks | `== 0 artifacts` | `1 artifacts` | 🔴 GAGAL | `review/v13_baseline_pixel_metrics.json -> summary.redTint = 1` |
| **G_GRID_CONTRACT_AUDIT** | Grid Contract V10 Integrity Check (G1-G8) | `== true boolean` | `true boolean` | 🟢 PASS | `review/grid_contract_summary.json -> allPass = true` |
| **G_AUDIT_GRID_V10** | Master Grid Contract & Collision Auditor (V1-V9) | `== true boolean` | `true boolean` | 🟢 PASS | `review/v10_audit_summary.json -> allPass = true` |
| **G_TRUTH_CHECK_HASHES** | Ground Truth Unique sha256 + phash Hashes | `>= 144 macros` | `141 macros` | 🔴 GAGAL | `world-data/ground-sources-v13.json -> validCount = 141` |

---
*Laporan ini dihasilkan 100% secara otomatis oleh scripts/v13/gateRunner.js tanpa intervensi manual.*