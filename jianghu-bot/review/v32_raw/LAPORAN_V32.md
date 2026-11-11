# LAPORAN AKHIR V32 — RUTE NPC LEWAT CELAH GUNUNG & LARANGAN MENUJU PULAU

Tanggal: 2026-11-11
Lingkup: `jianghu-bot/` (`utils/npcRoute.js`, `utils/npcJourney.js`, `services/npcWanderPlanner.js`, `services/npcJourneyTick.js`, `scripts/v32/checkRouteWalkability.js`, `scripts/v30/simulateNpcTravel.js`, `scripts/v28/lib/invariants.js`, `scripts/v28/auditNpcWorld.js`, `scripts/v30/gateRunner.js`).

---

## Ringkasan Eksekusi & Status Langkah

| Langkah | Deskripsi | Status | Bukti Raw |
|---|---|---|---|
| **R0** | Recon barriers, passes, anchors, dan callsite rute | SELESAI | `review/v32_raw/r0_recon.txt` |
| **F1** | Modul rute murni `utils/npcRoute.js` (Aturan 1–8) + 13 kasus uji F1 (`NaN`/boundary/multi-barrier/depth > 3) | SELESAI (PASS) | `review/v32_raw/f1_route_red.txt`, `review/v32_raw/f1_route.txt` |
| **F2** | Integrasi `routeFn` pada `buildJourney` + shared `buildLegsFromPoints` & `resolveTravelSpeed` + 5 kasus uji F2 | SELESAI (PASS) | `review/v32_raw/f2_npc_unit_red.txt`, `review/v32_raw/f2_npc_unit.txt` |
| **F3** | Larangan `island` permanen, validasi `buildJourney(..., routeFn)`, teleport pulang (`away` & `displaced`), legacy in-flight preserved | SELESAI (PASS) | `review/v32_raw/f3_planner_red.txt`, `review/v32_raw/f3_planner.txt` |
| **F4** | Sensus penuh all-pairs + audit 6 celah, simulasi 48 jam terakselerasi + audit V19, Invariant `V1-V19` | SELESAI (CATATAN: target ideal `<=0.5%` belum tercapai, `0.67%` lolos exit `<=1%`) | `review/v32_raw/f4_v19_red.txt`, `review/v32_raw/f4_v19.txt`, `review/v32_raw/f4_census.txt`, `review/v32_raw/f4_sim_48h.txt` |
| **G** | Master Gate 11 langkah (`gateRunner.js`) + Laporan V32 | SELESAI (11/11 PASS) | `review/v32_raw/gate.json`, `review/v32_raw/layout_probe.json` |

---

## Detail Pembuktian Merah -> Hijau

### F1: Modul Rute Murni (`utils/npcRoute.js`)
- **Merah (`f1_route_red.txt`)**: Exit code `1` — `Error: Cannot find module '../../../utils/npcRoute'` pada `tests/unit/npc/v32_route.test.mjs`.
- **Hijau (`f1_route.txt`)**: Exit code `0` — `Test Files 1 passed (1)`, `Tests 18 passed (18)` (13 kasus F1 `(a)`–`(m)` + 5 kasus integrasi F2 `(1)`–`(5)` termasuk guard koordinat `NaN`/`Infinity`, ujung batas exact `y=3100`, rantai multi-barrier `great_rift + azure_wall`, batas rekursi > 3, dan optimasi $O(1)$ bounding-box).

### F2: `buildJourney` Memakai `routeFn` & Shared Helpers (`utils/npcJourney.js`)
- **Merah (`f2_npc_unit_red.txt`)**: Exit code `1` — `1 failed | 28 passed (29)` test file, `3 failed | 219 passed (222)` tests.
- **Hijau (`f2_npc_unit.txt`)**: Exit code `0` — `Test Files 31 passed (31)`, `Tests 235 passed (235)` pada `npx vitest run tests/unit/npc` (termasuk shared `buildLegsFromPoints` dan `resolveTravelSpeed` tanpa duplikasi antar-modul).

### F3: Perencana Anti-Pulau, In-Flight Preservation, & Teleport Pulang (`services/npcWanderPlanner.js`, `services/npcJourneyTick.js`)
- **Merah (`f3_planner_red.txt`)**: Exit code `1` — `2 failed (2)` test files, `5 failed | 6 passed (11)` tests (`island` masih dipilih di `dermaga_donghai` bagi `realmIndex: 5`, `plan.journey` kosong, tidak ada `teleport: true`, dan NPC pulau gagal pulang di DB asli).
- **Hijau (`f3_planner.txt`)**: Exit code `0` — `Test Files 2 passed (2)`, `Tests 14 passed (14)` (`5/5` pada `v32_planner_route.test.mjs` termasuk pulang jarak jauh lintas `azure_wall > 900 tile`, + `9/9` pada `npcJourneyLifecycle.test.js` termasuk `(m)` NPC pulau terdampar, `(n)` legacy journey in-flight tetap tuntas tanpa dihitung ulang, dan `(o)` NPC tergeser di seberang rintangan teleport pulang dengan log `[NpcJourney] teleport pulang <nama>`).

### F4: Invariant V19 (`scripts/v28/lib/invariants.js`, `scripts/v28/auditNpcWorld.js`)
- **Merah (`f4_v19_red.txt`)**: Exit code `1` — `2 failed | 1 passed (3)` tests (`v32_invariant_v19.test.mjs`), karena journey dengan `legs` terputus maupun menyilang barrier tanpa lewat celah belum menghasilkan kode pelanggaran `V19`.
- **Hijau (`f4_v19.txt`)**: Exit code `0` — `4 passed (4)` pada `tests/unit/npc/v32_invariant_v19.test.mjs` (mencakup uji multi-barrier `great_rift + azure_wall`), dan `node scripts/v28/auditNpcWorld.js` mencetak `[AuditNpcWorld] PASSED: 0 violations! All invariants V1-V19 satisfied.` terhadap 764 NPC dan 52 anchor. Helper `validateJourneyV19` dan `createCachedWalkableFn` diekspor tunggal di `scripts/v28/lib/invariants.js`.

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
  - Dari endpoint anchor di dalam bounds barrier (Aturan 1): `96` (`94.1%` dari total kegagalan)
  - Dari medan padat alamiah di luar radius snap 40: `6` (`0.04%` dari total titik)
- **Status Walkability Celah Resmi (`passes.json`)**: `6/6` celah walkable (`SEMUA WALKABLE`)
- **Status Exit Code Skrip (`<= 1.00%`)**: Exit `0` (`PASSED`)

**Top 10 Rute Penyumbang `ok:false`**:
1. `desa_heiyan -> luoyang_kecil`: `2` titik `ok:false` (medan padat di luar radius snap 40)
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
- **Perjalanan ber-detour multi-leg di simulasi = `0`**: Terukur bahwa pada `travelGraph` nyata, anchor di dalam celah (`kaki_gunung_azure`, `makam_kaisar_pedang_purba`, `pos_perbatasan_qinghe`, dst.) sudah berfungsi sebagai simpul transit graph, sedangkan pasangan daratan non-celah melintasi `azure_wall` (`y<=2800` ke `y>=3800`) berjarak `>= 1000` tile (> batas `maxTiles = 900` berkelana). Namun `routeFn` tetap memblokir total tujuan laut/`island` dan mengawal rute lintas-celah langsung pada kepulangan jarak jauh (`maxTiles = 10000`) dan segmen `buildDirectWalkBackJourney`.

---

## Hasil Master Gate 11-Langkah (`review/v32_raw/gate.json`)

| # | Langkah | Status | Exit Code | Durasi |
|---|---|---|---|---|
| 1 | `npm test` (709 berkas `.js`) | PASS | 0 | 77.0s |
| 2 | `npx vitest run` (64 test files, 540 tests) | PASS | 0 | 86.3s |
| 3 | `node scripts/v28/auditNpcWorld.js` (V1–V19, 0 pelanggaran) | PASS | 0 | 10.6s |
| 4 | `node scripts/v28/layoutProbe.js http://localhost:3100` (0 pelanggaran) | PASS | 0 | 26.2s |
| 5 | `npm --prefix web-dashboard run build` | PASS | 0 | 76.2s |
| 6 | Cek Aset Terlarang | PASS | 0 | 18.4s |
| 7 | Cek Git Bersih | PASS | 0 | 0.1s |
| 8 | Cek Anti-Slop | PASS | 0 | 0.1s |
| 9 | `npx vitest run tests/integration/npcJourneyLifecycle.test.js tests/integration/npcHuntJourneyConflict.test.js tests/unit/npc/v31_snap_walkable.test.mjs` (23 tests) | PASS | 0 | 9.0s |
| 10 | `node scripts/v32/checkRouteWalkability.js` | PASS | 0 | 35.3s |
| 11 | `npx vitest run tests/unit/npc/v32_route.test.mjs tests/unit/npc/v32_planner_route.test.mjs` (23 tests) | PASS | 0 | 4.9s |

Hasil keseluruhan `gate.json`: `overallPass: true`, `11/11` langkah `PASS`.

---

## YANG TIDAK BERHASIL

1. **Target ideal sensus `ok:false <= 0,50%` TIDAK TERCAPAI**:
   - Angka aktual adalah **`102` dari `15.323` titik (`0.67%`)** (lolos syarat exit code skrip `<= 1.00%`, tetapi lebih tinggi dari target ideal `0.50%`).
   - **Penyebab terukur**:
     - `96` dari `102` titik `ok:false` berasal dari 4 anchor dunia (`pos_perbatasan_qinghe` di dalam `great_rift`; serta `kaki_gunung_azure`, `sekte_awan_pedang`, dan `makam_kaisar_pedang_purba` di dalam `azure_wall`) yang berada di dalam `bounds` barrier. Sesuai Aturan 1 `utils/npcRoute.js` (yang dilarang diubah), segmen dengan salah satu ujung di dalam `bounds` mengabaikan barrier tersebut sehingga segmen diagonal langsung ke/dari 4 anchor itu menyentuh petak tebing padat melebihi radius `snapWalkable` 40.
     - `6` dari `102` titik `ok:false` (`0.04%` total titik, murni medan) berasal dari rute `desa_heiyan <-> luoyang_kecil` (dan sekitarnya) akibat medan alamiah padat di luar radius `snapWalkable` 40 meskipun tidak menyilang `bounds` pada 7 barrier terdaftar.
2. **Pasangan langsung utara-ke-selatan `azure_wall` antar-anchor non-celah dunia nyata melebihi batas `900` tile**:
   - Seluruh anchor daratan utama di utara `azure_wall` (`y <= 2800`, mis. `tianjing` di `y = 2800`) hingga selatan `azure_wall` (`y >= 3800`, mis. `kota_leiyin` di `y = 3800`) berjarak `>= 1000` tile, sehingga untuk berkelana (`maxTiles = 900`) hanya pasangan `planReturnHome` (`maxTiles = 10000`) atau anchor yang lebih dekat ke celah yang dapat melintasi tembok secara langsung tanpa singgah di simpul celah.
