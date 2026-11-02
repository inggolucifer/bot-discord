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
