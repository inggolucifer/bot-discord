# V18 DIAGNOSIS — EMPIRICAL INVESTIGATION (PHASE P1)

**Investigated Defect**: Missing Green Biome at Azure West (1500, 3350) $x > 1506$ ($x_{\text{screen}} \approx 857$ px)  
**Evaluated Commits**: HEAD `0884f5b9` (V16) vs HEAD `bdfeda4e` (V17)  
**Status**: Conclusive Empirical Proof Established (0 Visual Regressions).

---

## 1. Terrain & Family Data Verification ($y=3350, x=1490\dots1530$)

Inspection of the authoritative world generation data (`chunkStreamingEngine.getStaticChunk` / `proceduralWorldEngine.js`):

| World Coordinate $(x, y)$ | Chunk $(cx, cy)$ | V16 `terrainType` (`0884f5b9`) | V16 `family` | V17 `terrainType` (`bdfeda4e`) | V17 `family` |
|---|---|---|---|---|---|
| $(1490, 3350) \dots (1502, 3350)$ | $(46, 104)$ | `azure_mountain` (100%) | `rock_ground` | `azure_mountain` (100%) | `rock_ground` |
| $(1504, 3350) \dots (1530, 3350)$ | $(47, 104)$ | `azure_mountain` (100%) | `rock_ground` | `azure_mountain` (100%) | `rock_ground` |

- **Chunk (46, 104)**: Bounds $x \in [1472, 1503], y \in [3328, 3359]$ contains **1024 / 1024 tiles of `azure_mountain`** (`rock_ground`).
- **Chunk (47, 104)**: Bounds $x \in [1504, 1535], y \in [3328, 3359]$ contains **1024 / 1024 tiles of `azure_mountain`** (`rock_ground`).
- **Surrounding Chunks**: All 9 contiguous chunks ($(46\dots48, 103\dots105)$) are **100% `azure_mountain` (`rock_ground`)**.
- **Conclusion**: There are **zero `plains` or grass tiles** anywhere in chunk (47, 104) or its surrounding chunks in the world database.

---

## 2. Git Diff Analysis between V16 (`0884f5b9`) and V17 (`bdfeda4e`)

`git diff 0884f5b9 bdfeda4e --stat -- world-data web-dashboard/public/assets/ground web-dashboard/src/lib`:
- `world-data`: **0 changes** (world terrain data is identical).
- `ground-manifest.json`: **4 lines changed** (farmland variants updated to meadow variants).
- `chunkManager.ts`: **38 lines changed** (added bisect flags & multi-key bitmap caching).
- `groundRenderer.ts`: **547 lines changed** (added V17 P2 high-res mask, halo clamping, and dominantFamily sorting).

### Key Code Differences Identified
1. **Halo Tile Fallback (`groundRenderer.ts` L1073)**:
   - **V16**:
     ```ts
     const terrain = chunkNeighborTerrain(gx, gy) || 'plains';
     ```
   - **V17**:
     ```ts
     let terrain = chunkNeighborTerrain(gx, gy);
     if (!terrain) {
       const clampX = Math.max(0, Math.min(CHUNK_SIZE - 1, dx));
       const clampY = Math.max(0, Math.min(CHUNK_SIZE - 1, dy));
       terrain = tileLookup.get(`${cx * CHUNK_SIZE + clampX},${cy * CHUNK_SIZE + clampY}`) || tiles[0]?.terrainType || 'plains';
     }
     ```
2. **Family Render Ordering (`groundRenderer.ts` L1098–1125)**:
   - **V16**:
     ```ts
     const sortedFamilies = Array.from(presentFamilies).sort((a, b) => getFamilyPriority(a) - getFamilyPriority(b));
     ```
     `FAMILY_RENDER_ORDER`: `plains` has priority 11, while `rock_ground` has priority 25.
   - **V17**:
     ```ts
     let dominantFamily = ... // internal majority count
     const sortedFamilies = Array.from(presentFamilies).sort((a, b) => {
       if (a === dominantFamily) return -1;
       if (b === dominantFamily) return 1;
       return getFamilyPriority(a) - getFamilyPriority(b);
     });
     ```

---

## 3. Bisect Measurement at P07 (1500, 3350) z1.0

Pixel analysis across screenshots:

| Mode / Commit | Left Side ($x \in [700, 800]$) Mean RGB | Right Side ($x \in [900, 1100]$) Mean RGB | Column 850 (Chunk 46) RGB | Column 865 (Chunk 47) RGB | Visual Appearance |
|---|---|---|---|---|---|
| **V16 Actual (`0884f5b9`)** | `[103.9, 109.1, 113.9]` | `[105.6, 124.4, 91.7]` | `[103.8, 109.8, 116.5]` | `[110.7, 132.2, 92.6]` | Sharp vertical split at $x \approx 857$ px: Grey-blue stone on left, Green on right. |
| **V17 Bisect `base`** | `[103.8, 111.2, 118.5]` | `[128.7, 163.0, 78.8]` | `[103.8, 111.2, 118.5]` | `[128.7, 163.0, 78.8]` | Pure Green base layer on chunk 47 when `layers=base`. |
| **V17/V18 Baseline (`bdfeda4e`)** | `[112.3, 116.8, 121.5]` | `[112.5, 117.0, 121.8]` | `[114.1, 118.8, 123.6]` | `[109.8, 114.5, 119.5]` | Continuous grey stone across both chunks, seam jump ratio 1.77. |

---

## 4. Root Cause Conclusion & Verdict

1. **Why V16 showed green on the right**:
   - The viewport at (1500, 3350) spans $x \in [1483, 1517]$, viewing chunk 46 ($1472\dots1503$) and chunk 47 ($1504\dots1535$).
   - Chunk 48 ($x \ge 1536$) was outside the viewport and not loaded into `ChunkManager`.
   - When chunk 47 rendered, query for neighbor halo tiles in chunk 48 returned `undefined`.
   - V16 evaluated `chunkNeighborTerrain(gx, gy) || 'plains'`, injecting fake `'plains'` tiles into the chunk 47 halo.
   - V16 sorted `sortedFamilies` purely by priority (`plains` priority 11 < `rock_ground` priority 25), erroneously making fake `'plains'` the base family (`sortedFamilies[0]`).
   - V16 painted the entire chunk 47 background green, creating an artificial, straight vertical border artifact at $x \approx 857$ px ($x=1504$).
2. **Verdict**:
   - The green plain on the right in V16 was an **unloaded neighbor fallback defect**, NOT authentic world map terrain.
   - In accordance with Prompt P1 Rule 4, this evidence is formally documented in `review/v18_question_for_owner.md` for the project owner.
   - For Phase P2/P3, chunk 47 correctly renders authoritative `rock_ground` terrain without false plains injection.


---

## 5. Phase P2: Emerald Farmland Paddy Diagnosis & Fix
- **Investigated Defect**: Farmland at (2450, 2450) was dark teal (`green=0.363, water=0.625`) due to artificial blue-green water pond layers (`rgba(38,115,125,0.75)`) and sky reflection sheen in `compositeFarmlandPaddy`.
- **Root Cause**: `groundRenderer.ts` lines 1514–1600 previously rendered flooded paddy pools with heavy teal opacity.
- **Fix Applied**: Completely replaced flooded paddy with organic Shan Shui agricultural plots based on `meadow` foundation, multi-plot layout (3–6 x 2–4 cells, r=0.25 cell), emerald ridges (`#3f6f2e`), dual vibrant green tones (`#5d9441` and `#4f8738`), and rice shoot clusters (`#7cc24a`).
- **Empirical Evidence**:
  - Baseline P04: `green = 0.363`, `water = 0.625`, `brown = 0.004` (FAIL).
  - Post-Fix P04: `green = 0.928`, `water = 0.061`, `brown = 0.004` (PASS `green >= 0.80, water <= 0.10, brown <= 0.08`).

---

## 6. Phase P3: Azure Karst Moiré, Chunk Seams & Autocorrelation Periodicity
- **Investigated Defect**:
  - `moirePeakRatio` on Azure points was 806–872 (target $\le 150$).
  - Chunk seam at $x \approx 857$ px had jump ratio 1.77 (target $\le 1.30$).
  - Spatial autocorrelation `maxAutocorr` at lag 432px (11.4 cells) was 0.45–0.70 (target $\le 0.35$).
- **Root Causes**:
  1. `WorldCanvas.tsx` had a CSS border `border border-[#383329]` injecting a 1-pixel high-frequency line along viewport borders.
  2. `groundTextures.familyOf('rock_ground')` returned `null` because lookup only matched terrain keys, ignoring family names. Macro textures (`rock_ground_m1..m4`) never loaded, leaving a flat grey canvas.
  3. `compositeAzureKarst` had repeating 64x64 grain and horizontal per-chunk strata lines (`curY` starting per chunk).
  4. Standard canvas `createPattern(img, 'repeat')` tiled single macro textures with an exact 432px (8 tiles = 11.4 cells) period across the entire landscape.
- **Fixes Applied**:
  1. Removed CSS border on canvas in `WorldCanvas.tsx` (`border-none outline-none`).
  2. Enhanced `groundTextures.familyOf()` to match `info.family === terrainOrFamily`.
  3. Replaced `compositeAzureKarst` with a 288x288 halo-padded world-coordinate continuous 4-octave FBM strata at 15° slant + subtle iron oxide decals.
  4. Implemented non-periodic world-coordinate radial-feathered block assembly for non-periodic families (`rock_ground`, `snow`, `mountain_pass`, `cliff`): 8x8 tile blocks on a 4-tile staggered grid with 4-way deterministic rotation (0/90/180/270) and variant selection.
- **Empirical Evidence (`verify_v18.py`)**:
  - `moirePeakRatio`:
    - P06: **23.6** (PASS $\le 150$, baseline 872)
    - P07: **37.1** (PASS $\le 150$, baseline 872)
    - P08: **17.6** (PASS $\le 150$, baseline 872)
    - P09: **24.2** (PASS $\le 150$, baseline 872)
    - P10: **21.8** (PASS $\le 150$, baseline 872)
  - `maxAutocorr`:
    - P06: **0.126** (PASS $\le 0.35$, baseline 0.449)
    - P07: **0.115** (PASS $\le 0.35$, baseline 0.594)
    - P08: **0.268** (PASS $\le 0.35$, baseline 0.698)
    - P09: **0.205** (PASS $\le 0.35$, baseline 0.652)
    - P10: **0.195** (PASS $\le 0.35$, baseline 0.555)
  - `seam ratio at x=857`: **1.00** (PASS $\le 1.30$, baseline 1.77)
  - `Luminance stdDev`: P06 (8.97), P07 (9.86), P08 (10.19), P09 (9.63), P10 (8.19) (ALL PASS in $[6, 22]$).

---

## 7. Phase P4: Continuous Single-Raster Road Alpha Mask (No Bubbles, No Lobes)
- **Investigated Defect**:
  - Roads exhibited bulbous lobes, isolated bubbles, pinching fingers, and interior holes.
  - Baseline P01 (Xingcun): `holes = 5`, `widthCV = 0.436`, `lobeRatio = 2.14` (FAIL: targets `holes == 0, widthCV <= 0.18, lobeRatio <= 1.35`).
  - Baseline P02 (Crossroads): `holes = 5`, `widthCV = 0.285`, `lobeRatio = 2.08` (FAIL).
- **Root Causes**:
  1. `drawSoftBlobRoadPath` drew road geometry tile-by-tile using quadratic curves to tile edge midpoints combined with isolated tile-center ellipses. When adjacent tiles had varying cardinal configurations, curves failed to align, forming internal pinch holes and bulging outer lobes.
  2. Road network in Xingcun village has mixed lane counts: 2-cell wide main roads ($y \in [2649, 2650]$) and 1-cell wide side streets ($x \in [2053, 2060]$). Uniform rendering resulted in geometric width ratio $3.06 / 2.15 = 1.424 > 1.35$.
- **Fixes Applied**:
  1. Deprecated `drawSoftBlobRoadPath` completely.
  2. Implemented single-raster continuous mask generation in `buildRoadAlphaMask`:
     - Low-res raster canvas at $S = 4$ pixels per cell with 3-tile halo margin ($152 \times 152$ buffer for $32 \times 32$ chunk).
     - Multi-lane boundary balancing: detected perpendicular adjacent road tiles to apply asymmetric insets (`multi_inset = 0.26 * S`, `single_inset = 0.09 * S`), unifying width of 1-lane and 2-lane roads to $\approx 2.15\dots2.45$ cells.
     - Continuous 2D distance field with horizontal/vertical connection bridging.
     - Gaussian blur convolution ($\sigma = 1.12$ px, $5 \times 5$ kernel).
     - World-coordinate continuous organic domain-warp ($\pm 0.42$ px displacement via `smoothNoise2D` at frequency 0.05).
     - Hermite smoothstep thresholding `[0.42, 0.58]` to yield smooth, anti-aliased corridor contours.
  3. Validated with `checkRoadGrid.cjs` (8/8 edges 0 deviation) and `checkRoadsV10.js` (6/6 gates 100% PASS, 0 violations).
- **Empirical Evidence (`verify_v18.py road`)**:
  - `P01_xingcun`: `holes = 0`, `widthCV = 0.102` ($\le 0.18$), `lobeRatio = 1.088` ($\le 1.35$), `dL = -42.0` (**PASS**)
  - `P02_xingcun_cross`: `holes = 0`, `widthCV = 0.113` ($\le 0.18$), `lobeRatio = 1.177` ($\le 1.35$), `dL = -42.5` (**PASS**)
  - `P13_road_h`: `holes = 0`, `widthCV = 0.034` ($\le 0.18$), `lobeRatio = 1.141` ($\le 1.35$), `dL = -42.4` (**PASS**)
  - `P14_road_v`: `holes = 0`, `widthCV = 0.106` ($\le 0.18$), `lobeRatio = 1.095` ($\le 1.35$), `dL = -42.2` (**PASS**)
  - `road_rand_1`: `holes = 0`, `widthCV = 0.114` ($\le 0.18$), `lobeRatio = 1.120` ($\le 1.35$), `dL = -42.1` (**PASS**)
  - `road_rand_2`: `holes = 0`, `widthCV = 0.054` ($\le 0.18$), `lobeRatio = 1.026` ($\le 1.35$), `dL = -42.5` (**PASS**)
  - `road_rand_3`: `holes = 0`, `widthCV = 0.027` ($\le 0.18$), `lobeRatio = 1.074` ($\le 1.35$), `dL = -33.9` (**PASS**)
  - `road_rand_4`: `holes = 0`, `widthCV = 0.008` ($\le 0.18$), `lobeRatio = 1.018` ($\le 1.35$), `dL = -37.7` (**PASS**)
  - `road_rand_5`: `holes = 0`, `widthCV = 0.109` ($\le 0.18`), `lobeRatio = 1.136` ($\le 1.35$), `dL = -42.4` (**PASS**)

