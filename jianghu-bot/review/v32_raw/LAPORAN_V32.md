# LAPORAN AKHIR V32 — RUTE NPC LEWAT CELAH GUNUNG & LARANGAN MENUJU PULAU

Tanggal: 2026-11-11
Lingkup: `jianghu-bot/` (`utils/npcRoute.js`, `utils/npcJourney.js`, `services/npcWanderPlanner.js`, `services/npcJourneyTick.js`, `scripts/v32/checkRouteWalkability.js`, `scripts/v30/simulateNpcTravel.js`, `scripts/v28/lib/invariants.js`, `scripts/v28/auditNpcWorld.js`, `scripts/v30/gateRunner.js`).

---

## Ringkasan Eksekusi & Status Langkah

| Langkah | Deskripsi | Status | Bukti Raw |
|---|---|---|---|
| **R0** | Recon barriers, passes, anchors, dan callsite rute | SELESAI | `review/v32_raw/r0_recon.txt` |
| **F1** | Modul rute murni `utils/npcRoute.js` (Aturan 1–8, reject AABB $O(1)$, guard `NaN`/batas) + 13 kasus uji F1 | SELESAI (PASS) | `review/v32_raw/f1_route_red.txt`, `review/v32_raw/f1_route.txt` |
| **F2** | Integrasi `routeFn` pada `buildJourney` + shared `buildLegsFromPoints` (guard non-finite) & `resolveTravelSpeed` + 5 kasus uji F2 | SELESAI (PASS) | `review/v32_raw/f2_npc_unit_red.txt`, `review/v32_raw/f2_npc_unit.txt` |
| **F3** | Larangan `island` permanen, validasi `buildJourney(..., routeFn)`, fallback langsung `planReturnHome`, teleport pulang, legacy in-flight preserved | SELESAI (PASS) | `review/v32_raw/f3_planner_red.txt`, `review/v32_raw/f3_planner.txt` |
| **F4** | Sensus penuh all-pairs + audit 6 celah + V19, simulasi 48 jam (`37.1s`) + audit V19, Invariant `V1-V19` | SELESAI (CATATAN: target ideal `<=0.5%` belum tercapai, `0.67%` lolos exit `<=1%`) | `review/v32_raw/f4_v19_red.txt`, `review/v32_raw/f4_v19.txt`, `review/v32_raw/f4_census.txt`, `review/v32_raw/f4_sim_48h.txt` |
| **G** | Master Gate 11 langkah (`gateRunner.js`) + Laporan V32 | SELESAI (11/11 PASS) | `review/v32_raw/gate.json`, `review/v32_raw/layout_probe.json` |

---

## Detail Pembuktian Merah -> Hijau

### F1: Modul Rute Murni (`utils/npcRoute.js`)
- **Merah (`f1_route_red.txt`)**: Exit code `1` — `Error: Cannot find module '../../../utils/npcRoute'` pada `tests/unit/npc/v32_route.test.mjs`.
- **Hijau (`f1_route.txt`)**: Exit code `0` — `Test Files 1 passed (1)`, `Tests 18 passed (18)` (13 kasus F1 `(a)`–`(m)` + 5 kasus F2 `(1)`–`(5)` termasuk guard koordinat non-finite, titik tepat di tepi batas `y=3100`, rantai multi-barrier `great_rift + azure_wall`, batas rekursi > 3, dan penolakan waypoint `routeFn` non-finite).

### F2: `buildJourney` Memakai `routeFn` & Shared Helpers (`utils/npcJourney.js`)
- **Merah (`f2_npc_unit_red.txt`)**: Exit code `1` — `1 failed | 28 passed (29)` test file, `3 failed | 219 passed (222)` tests.
- **Hijau (`f2_npc_unit.txt`)**: Exit code `0` — `Test Files 31 passed (31)`, `Tests 236 passed (236)` pada `npx vitest run tests/unit/npc` (mencakup helper bersama `buildLegsFromPoints` yang menolak waypoint `NaN` sebagai `null` serta `resolveTravelSpeed`).

### F3: Perencana Anti-Pulau, Fallback Kepulangan, & Teleport Darurat (`services/npcWanderPlanner.js`, `services/npcJourneyTick.js`)
- **Merah (`f3_planner_red.txt`)**: Exit code `1` — `2 failed (2)` test files, `5 failed | 6 passed (11)` tests (`island` masih dipilih di `dermaga_donghai` bagi `realmIndex: 5`, `plan.journey` kosong, tidak ada `teleport: true`, dan NPC pulau gagal pulang di DB asli).
- **Hijau (`f3_planner.txt`)**: Exit code `0` — `Test Files 2 passed (2)`, `Tests 15 passed (15)`:
  - `v32_planner_route.test.mjs`: `6/6` lolos, termasuk `(e)` pulang daratan `> 900` tile lintas celah dan `(f)` fallback rute daratan langsung `[asal, rumah]` jika jalur graph tercemar simpul `island`.
  - `npcJourneyLifecycle.test.js` (DB Mongoose asli): `9/9` lolos, termasuk `(m)` NPC pulau terdampar, `(n)` legacy journey in-flight tetap tuntas tanpa dihitung ulang, dan `(o)` NPC idle tergeser di seberang rintangan teleport pulang dengan log `[NpcJourney] teleport pulang <nama>`.

### F4: Invariant V19 (`scripts/v28/lib/invariants.js`, `scripts/v28/auditNpcWorld.js`)
- **Merah (`f4_v19_red.txt`)**: Exit code `1` — `2 failed | 1 passed (3)` tests (`v32_invariant_v19.test.mjs`).
- **Hijau (`f4_v19.txt`)**: Exit code `0` — `4 passed (4)` pada `tests/unit/npc/v32_invariant_v19.test.mjs`, dan `node scripts/v28/auditNpcWorld.js` mencetak `[AuditNpcWorld] PASSED: 0 violations! All invariants V1-V19 satisfied.` terhadap 764 NPC dan 52 anchor.

---

## Hasil Sensus Penuh All-Pairs (`review/v32_raw/f4_census.txt`)

Dijalankan pada seluruh pasangan terurut 52 anchor (`52 × 51 = 2.652` pasangan) menggunakan `travelGraph.shortestPath` (kunci nama), `toAnchorPath`, larangan pulau, `buildJourney({ ..., routeFn: defaultRouteFn })`, dan `snapWalkable` radius 40 pada tiap 10% setiap leg:

- **Jumlah Pasangan Anchor Dicoba**: `2652`
- **Jumlah Rute Diterima (Valid & <= 900 tile)**: `605`
- **Jumlah Rute Ditolak Total**: `2047`
  - Tidak ada jalur / `< 2` anchor: `0`
  - Larangan pulau (`island` tujuan/transit): `102`
  - Diblokir barrier tanpa celah / kedalaman > 3: `0`
  - Jarak setelah detour > 900 tile: `1945`
- **Total Titik Leg Dievaluasi**: `15323`
- **Titik Non-Walkable Sebelum Snap**: `1334` (`8.71%`)
- **Titik `ok:false` Setelah Snap (Radius 40)**: `102` (`0.67%`)
  - Dari anchor endpoint/transit di dalam bounds barrier (Aturan 1): **`102` (`100%` penyebab `ok:false`)**
  - Dari medan padat murni di luar bounds barrier: **`0` (`0.00%`)**
- **Pelanggaran Invariant V19 pada `605` Rute Valid**: `0`
- **Status Walkability Celah Resmi (`passes.json`)**: `6/6` celah walkable (`SEMUA WALKABLE`)
- **Status Exit Code Skrip (`<= 1.00%`)**: Exit `0` (`PASSED`)

**Top 10 Rute Penyumbang `ok:false`**:
1. `desa_heiyan -> luoyang_kecil`: `2` titik `ok:false` (transit `pos_perbatasan_qinghe` di dalam barrier `great_rift`)
2. `desa_xingcun -> kaki_gunung_azure`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)
3. `desa_xingcun -> makam_kaisar_pedang_purba`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)
4. `desa_xingcun -> sekte_awan_pedang`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)
5. `dusun_kebun_persik -> kaki_gunung_azure`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)
6. `dusun_kebun_persik -> makam_kaisar_pedang_purba`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)
7. `dusun_kebun_persik -> sekte_awan_pedang`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)
8. `gua_purba_bunga_aprikot -> kaki_gunung_azure`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)
9. `gua_purba_bunga_aprikot -> makam_kaisar_pedang_purba`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)
10. `gua_purba_bunga_aprikot -> sekte_awan_pedang`: `2` titik `ok:false` (endpoint di dalam barrier `azure_wall`)

---

## Perbandingan Simulasi 48 Jam V32 vs V31 (`review/v32_raw/f4_sim_48h.txt`)

| Metrik | V31 | V32 | Selisih / Catatan |
|---|---|---|---|
| Jumlah Perjalanan Terjadi | `3382` | `3516` | `+134` (Berangkat: `1776`, Pulang: `1740`, Teleport Pulang: `0`) |
| Pelanggaran Posisi Non-Walkable Tertulis | `0` | `0` | Konsisten `0` |
| Pelanggaran Tujuan Pulau (`island`) | N/A | `0` | Nol tujuan pulau |
| Pelanggaran Invariant V19 Sepanjang Simulasi | N/A | `0` | Diverifikasi via `validateJourneyV19` di seluruh `3516` perjalanan |
| NPC Macet `away` Tanpa `stayUntil` | `0` | `0` | Konsisten `0` |
| Pelanggaran NPC Esensial Berjalan | `0` | `0` | Konsisten `0` |
| Pelanggaran Jarak Berangkat > 900 Tile | `0` | `0` | Konsisten `0` |
| Pelanggaran Koordinat Non-Integer | `0` | `0` | Konsisten `0` |
| Panjang Rata-rata Perjalanan | — | `386.9` tile | `13696` move ticks; `293` titik `ok:false` dipertahankan di daratan lama |

**Penjelasan hasil simulasi**:
- **Selisih `+134` perjalanan dibanding V31**: Pada V32 kandidat tujuan diuji dengan `buildJourney(..., routeFn: defaultRouteFn)` *sebelum* `pickWeighted` di `chooseDestination`. Akibatnya roll harian NPC yang valid tidak lagi terbuang pada kandidat yang ditolak pasca-pemilihan (`island`, terblokir, atau detour > 900 tile), sehingga rata-rata jarak valid menjadi `386.9` tile dan lebih banyak perjalanan berangkat-pulang tuntas dalam 48 jam game.
- **Perjalanan ber-detour multi-leg di simulasi = `0`**: Terukur bahwa pada `travelGraph` nyata, anchor di dalam celah (`kaki_gunung_azure`, `makam_kaisar_pedang_purba`, `pos_perbatasan_qinghe`, dst.) sudah berfungsi sebagai simpul transit graph, sedangkan pasangan daratan non-celah melintasi `azure_wall` (`y<=2800` ke `y>=3800`) berjarak `>= 1000` tile (> batas `maxTiles = 900` berkelana). Namun pada uji sensus rute langsung antar seluruh `2.652` pasangan anchor, `defaultRouteFn` menghasilkan **`1.462` rute ber-celah + `1.086` rute lurus = `2.548` rute valid dengan `0` pelanggaran V19**, dan memblokir tepat `104` rute (`102` penyeberangan laut pulau + `2` penyeberangan langsung `mirror_lake_water`).

---

## Hasil Master Gate 11-Langkah (`review/v32_raw/gate.json`)

| # | Langkah | Status | Exit Code | Durasi |
|---|---|---|---|---|
| 1 | `npm test` (709 berkas `.js`) | PASS | 0 | 76.6s |
| 2 | `npx vitest run` (64 test files, 541 tests) | PASS | 0 | 90.3s |
| 3 | `node scripts/v28/auditNpcWorld.js` (V1–V19, 0 pelanggaran) | PASS | 0 | 12.0s |
| 4 | `node scripts/v28/layoutProbe.js http://localhost:3100` (0 pelanggaran) | PASS | 0 | 27.7s |
| 5 | `npm --prefix web-dashboard run build` | PASS | 0 | 47.0s |
| 6 | Cek Aset Terlarang | PASS | 0 | 17.1s |
| 7 | Cek Git Bersih | PASS | 0 | 0.1s |
| 8 | Cek Anti-Slop | PASS | 0 | 0.2s |
| 9 | `npx vitest run tests/integration/npcJourneyLifecycle.test.js tests/integration/npcHuntJourneyConflict.test.js tests/unit/npc/v31_snap_walkable.test.mjs` (23 tests) | PASS | 0 | 12.6s |
| 10 | `node scripts/v32/checkRouteWalkability.js` | PASS | 0 | 42.2s |
| 11 | `npx vitest run tests/unit/npc/v32_route.test.mjs tests/unit/npc/v32_planner_route.test.mjs` (24 tests) | PASS | 0 | 5.8s |

Hasil keseluruhan `gate.json`: `overallPass: true`, `11/11` langkah `PASS`.

---

## YANG TIDAK BERHASIL

1. **Target ideal sensus `ok:false <= 0,50%` TIDAK TERCAPAI**:
   - Angka aktual adalah **`102` dari `15.323` titik (`0.67%`)** (lolos syarat exit code skrip `<= 1.00%`, tetapi lebih tinggi dari target ideal `0.50%`).
   - **Penyebab terukur (100% terisolasi)**: Seluruh **`102` dari `102` titik `ok:false`** berasal dari 4 anchor dunia yang berada di dalam `bounds` barrier — baik sebagai **endpoint** (`kaki_gunung_azure`, `sekte_awan_pedang`, `makam_kaisar_pedang_purba` di dalam `azure_wall`) maupun sebagai **simpul transit** (`pos_perbatasan_qinghe` di dalam `great_rift` pada rute `desa_heiyan <-> luoyang_kecil / dermaga_teluk_sembilan`). Sesuai Aturan 1 `utils/npcRoute.js` (yang dilarang diubah), segmen yang melibatkan anchor di dalam `bounds` mengabaikan barrier terkait sehingga segmen diagonalnya menyentuh tebing di luar radius `snapWalkable` 40. Titik di luar rute ber-anchor dalam barrier mencatat **`0` (`0.00%`)** kegagalan `ok:false`.
2. **Pasangan langsung utara-ke-selatan `azure_wall` antar-anchor non-celah dunia nyata melebihi batas `900` tile**:
   - Seluruh anchor daratan utama di utara `azure_wall` (`y <= 2800`, mis. `tianjing` di `y = 2800`) hingga selatan `azure_wall` (`y >= 3800`, mis. `kota_leiyin` di `y = 3800`) berjarak `>= 1000` tile, sehingga untuk berkelana (`maxTiles = 900`) hanya kepulangan (`planReturnHome`, `maxTiles = 10000`) atau anchor yang lebih dekat ke celah yang dapat melintasi tembok secara langsung tanpa singgah di simpul celah.
