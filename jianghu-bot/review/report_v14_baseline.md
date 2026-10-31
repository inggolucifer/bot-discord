# Laporan Evaluasi Gerbang V14 (BASELINE HEAD 1cffde7)

> **Waktu Eksekusi**: 2026-10-31T12:56:40.679Z  
> **Mode**: BASELINE  
> **Total Gerbang**: 32 | **PASS**: 24 | **GAGAL**: 8  
> **Status Keseluruhan**: ❌ TERDAPAT GERBANG GAGAL

---

## Tabel Status Gerbang

| ID | Nama Gerbang | Target | Nilai Terukur | Status | Bukti (Source Path) |
|---|---|---|---|:---:|---|
| **G_SELFTEST_PIXEL_GATES** | Gate Self-Test Negative and Positive Validation | `== true boolean` | `true boolean` | 🟢 PASS | `review/v14_selftest_results.json -> allPass = true` |
| **G_DENSITY_CENTRAL_PLAINS** | Central Plains Viewport Density | `>= 28 sprites/viewport` | `29 sprites/viewport` | 🟢 PASS | `review/v14_baseline_density.json -> central_plains.sprites.median = 29` |
| **G_DENSITY_NINE_SPRINGS** | Nine Springs Delta Viewport Density | `>= 28 sprites/viewport` | `28 sprites/viewport` | 🟢 PASS | `review/v14_baseline_density.json -> nine_springs_delta.sprites.median = 28` |
| **G_DENSITY_NORTHERN_DESOLATE** | Northern Desolate Viewport Density | `>= 16 sprites/viewport` | `16 sprites/viewport` | 🟢 PASS | `review/v14_baseline_density.json -> northern_desolate.sprites.median = 16` |
| **G_DENSITY_THUNDERSTEPPE** | Thundersteppe Viewport Density | `>= 16 sprites/viewport` | `16 sprites/viewport` | 🟢 PASS | `review/v14_baseline_density.json -> thundersteppe.sprites.median = 16` |
| **G_DENSITY_BEAST_PRAIRIES** | Beast Prairies Viewport Density | `>= 20 sprites/viewport` | `24 sprites/viewport` | 🟢 PASS | `review/v14_baseline_density.json -> beast_prairies.sprites.median = 24` |
| **G_DENSITY_WESTERN_GORGE** | Western Gorge Labyrinth Viewport Density | `>= 14 sprites/viewport` | `9 sprites/viewport` | 🔴 GAGAL | `review/v14_baseline_density.json -> western_gorge_labyrinth.sprites.median = 9` |
| **G_DENSITY_SWORD_GORGE** | Sword Gorge Viewport Density | `>= 14 sprites/viewport` | `10 sprites/viewport` | 🔴 GAGAL | `review/v14_baseline_density.json -> sword_gorge.sprites.median = 10` |
| **G_DENSITY_AZURE_MOUNTAIN** | Azure Mountain Range Viewport Density | `>= 18 sprites/viewport` | `18.5 sprites/viewport` | 🟢 PASS | `review/v14_baseline_density.json -> azure_mountain_range.sprites.median = 18.5` |
| **G_DENSITY_TOTAL_OBJECTS** | Total Audited Objects in Grid | `>= 70000 objects` | `70428 objects` | 🟢 PASS | `review/v10_audit_summary.json -> totalObjects = 70428` |
| **G_DENSITY_PER_CHUNK_PLAINS** | Central Plains Per-Chunk Objects | `>= 55 objects/chunk` | `118 objects/chunk` | 🟢 PASS | `review/v14_baseline_density.json -> central_plains.perChunkObjects.median = 118` |
| **G_DENSITY_COLLINEAR_LATTICE** | Strict Collinear Lattice Instances | `== 0 instances` | `16 instances` | 🔴 GAGAL | `review/v14_baseline_density.json -> _summary.collinearLatticeCount = 16` |
| **G_BARRIER_AZURE_CLOSURE** | Azure Mountain Impassable Barrier Closure | `== 0 leak corridors` | `0 leak corridors` | 🟢 PASS | `review/v14_baseline_barrier_closure.json -> unauthorizedLeaks = 0` |
| **G_BARRIER_REACHABILITY** | Settlement Global Reachability from Xingcun | `== 31 settlements` | `31 settlements` | 🟢 PASS | `review/v14_baseline_barrier_closure.json -> reachableSettlements = 31` |
| **G_BARRIER_ZERO_HAZARD_SPAWN** | Hazard Spawns on Blocked Barrier Cells | `== 0 hazards` | `0 hazards` | 🟢 PASS | `review/v14_baseline_barrier_closure.json -> hazardSpawnsOnBarrier = 0` |
| **G_SETTLEMENT_WHITE_SQUARE** | Pale Straight-Edge Settlement Square Artifacts | `== 0 artifacts` | `0 artifacts` | 🟢 PASS | `review/v14_baseline_pixel_metrics.json -> summary.whiteSquare = 0` |
| **G_SETTLEMENT_LUM_DIFF** | Max Settlement vs Surroundings Luminance Delta | `<= 22 delta L` | `25 delta L` | 🔴 GAGAL | `review/v14_baseline_pixel_metrics.json -> summary.maxLumDiff = 25` |
| **G_ROAD_LADDER_AUTOCORR** | Road Periodic Ladder / Rail Artifacts | `== 0 artifacts` | `1 artifacts` | 🔴 GAGAL | `review/v14_baseline_pixel_metrics.json -> summary.roadLadder = 1` |
| **G_PALE_FLAT_FLOOR** | Flat Pale / Xuan Paper Unrendered Floor Area | `== 0 artifacts` | `1 artifacts` | 🔴 GAGAL | `review/v14_baseline_pixel_metrics.json -> summary.paleFlat = 1` |
| **G_STRAIGHT_SEAM** | Straight Vertical or Horizontal Chunk Seam Boundaries | `== 0 artifacts` | `1 artifacts` | 🔴 GAGAL | `review/v14_baseline_pixel_metrics.json -> summary.straightSeam = 1` |
| **G_GROUND_SEAM_4SIDES** | Ground Macro 4-Side Seam Mean Diff | `<= 4 RGB diff` | `2.46 RGB diff` | 🟢 PASS | `review/v14_baseline_ground_audit.json -> gates.G_GROUND_SEAM_4SIDES.actual = 2.46` |
| **G_GROUND_SEAM_MOSAIC_2X2** | Ground Macro 2x2 Mosaic Seam Mean Diff | `<= 5 RGB diff` | `2.46 RGB diff` | 🟢 PASS | `review/v14_baseline_ground_audit.json -> gates.G_GROUND_SEAM_MOSAIC_2X2.actual = 2.46` |
| **G_GROUND_PLAINS_LATTICE** | Plains Macro Mosaic Autocorrelation Peak | `<= 0.35 peak corr` | `0.367 peak corr` | 🔴 GAGAL | `review/v14_baseline_ground_audit.json -> gates.G_GROUND_PLAINS_LATTICE.actual = 0.367` |
| **G_GROUND_BAKED_PATHS** | Base Biome Ground Macros with Baked Paths | `== 0 macros` | `0 macros` | 🟢 PASS | `review/v14_baseline_ground_audit.json -> gates.G_GROUND_BAKED_PATHS.actual = 0` |
| **G_GROUND_CLEAN_ACTIVE** | Active Ground Families Have >= 2 Clean Variants | `== PASS status` | `PASS status` | 🟢 PASS | `review/v14_baseline_ground_audit.json -> gates.G_GROUND_CLEAN_ACTIVE.actual = "PASS"` |
| **G_SMEAR_RATIO** | Smear / Edge-Clamped Pixel Stretch Artifacts | `== 0 artifacts` | `0 artifacts` | 🟢 PASS | `review/v14_baseline_pixel_metrics.json -> summary.smear = 0` |
| **G_MOUNTAIN_SIZE_AZURE** | Mountain Footprints >= 4x2 in Mountain Regions | `>= 50 %` | `62.5 %` | 🟢 PASS | `review/v14_baseline_mountains.json -> pctGe4x2 = 62.5` |
| **G_MOUNTAIN_SIZE_XL** | Mountain Footprints >= 6x3 in Mountain Regions | `>= 15 %` | `24.5 %` | 🟢 PASS | `review/v14_baseline_mountains.json -> pctGe6x3 = 24.5` |
| **G_TINT_RED_SOLID_PIXELS** | Solid Red Footprint Tint Fill Blocks | `== 0 artifacts` | `0 artifacts` | 🟢 PASS | `review/v14_baseline_pixel_metrics.json -> summary.redTint = 0` |
| **G_GRID_CONTRACT_AUDIT** | Grid Contract V10 Integrity Check (G1-G8) | `== true boolean` | `true boolean` | 🟢 PASS | `review/grid_contract_summary.json -> allPass = true` |
| **G_AUDIT_GRID_V10** | Master Grid Contract & Collision Auditor (V1-V9) | `== true boolean` | `true boolean` | 🟢 PASS | `review/v10_audit_summary.json -> allPass = true` |
| **G_TRUTH_CHECK_HASHES** | Ground Truth Unique sha256 + phash Hashes | `>= 144 macros` | `144 macros` | 🟢 PASS | `world-data/ground-sources-v13.json -> validCount = 144` |

---
*Laporan ini dihasilkan 100% secara otomatis oleh scripts/v14/gateRunner.js tanpa intervensi manual.*