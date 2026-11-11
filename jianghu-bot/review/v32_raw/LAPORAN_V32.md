# LAPORAN AKHIR V32 — RUTE NPC LEWAT CELAH GUNUNG & LARANGAN MENUJU PULAU

Tanggal: 2026-11-11
Lingkup: `jianghu-bot/` (`utils/npcRoute.js`, `utils/npcJourney.js`, `services/npcWanderPlanner.js`, `services/npcJourneyTick.js`, `scripts/v32/checkRouteWalkability.js`, `scripts/v30/simulateNpcTravel.js`, `scripts/v28/lib/invariants.js`, `scripts/v28/auditNpcWorld.js`, `scripts/v30/gateRunner.js`).

---

## Ringkasan Eksekusi & Status Langkah

| Langkah | Deskripsi | Status | Bukti Raw |
|---|---|---|---|
| **R0** | Recon barriers, passes, anchors, dan callsite rute | SELESAI | `review/v32_raw/r0_recon.txt` |
| **F1** | Modul rute murni `utils/npcRoute.js` (Aturan 1–8) + 10 kasus uji unit | SELESAI (PASS) | `review/v32_raw/f1_route_red.txt`, `review/v32_raw/f1_route.txt` |
| **F2** | Integrasi parameter opsional `routeFn` pada `buildJourney` + 4 uji tambahan | SELESAI (PASS) | `review/v32_raw/f2_npc_unit_red.txt`, `review/v32_raw/f2_npc_unit.txt` |
| **F3** | Larangan `island` permanen, validasi `buildJourney(..., routeFn)`, teleport pulang | SELESAI (PASS) | `review/v32_raw/f3_planner_red.txt`, `review/v32_raw/f3_planner.txt` |
| **F4** | Sensus penuh all-pairs, simulasi 48 jam V32, invariant V19 & audit `V1-V19` | SELESAI (CATATAN: target ideal `<=0.5%` belum tercapai, `0.67%` lolos exit `<=1%`) | `review/v32_raw/f4_v19_red.txt`, `review/v32_raw/f4_v19.txt`, `review/v32_raw/f4_census.txt`, `review/v32_raw/f4_sim_48h.txt` |
| **G** | Master Gate 11 langkah (`gateRunner.js`) + Laporan V32 | SELESAI (11/11 PASS) | `review/v32_raw/gate.json`, `review/v32_raw/layout_probe.json` |

---

## Detail Pembuktian Merah -> Hijau

### F1: Modul Rute Murni (`utils/npcRoute.js`)
- **Merah (`f1_route_red.txt`)**: Exit code `1` — `Error: Cannot find module '../../../utils/npcRoute'` pada `tests/unit/npc/v32_route.test.mjs`.
- **Hijau (`f1_route.txt`)**: Exit code `0` — `Test Files 1 passed (1)`, `Tests 10 passed (10)` untuk seluruh kasus `(a)` s/d `(j)` (segmen bebas barrier, lintasan `azure_wall` lewat `mist_pass`/`north_pass`, sub-segmen koridor celah, simetri balik arah, `west_cliff` lewat `merchant_pass` sumbu X, `great_rift` lewat `chain_bridge` sumbu Y, blokir `pulau_penyu_raksasa` + barrier tanpa celah, abaikan barrier jika endpoint di dalam bounds, determinisme integer & deduplikasi, dan validasi detour terkecil).

### F2: `buildJourney` Memakai `routeFn` (`utils/npcJourney.js`)
- **Merah (`f2_npc_unit_red.txt`)**: Exit code `1` — `1 failed | 28 passed (29)` test file, `3 failed | 219 passed (222)` tests (kasus `(2)`, `(3)`, `(4)` di `v32_route.test.mjs` gagal sebelum `routeFn` ditambahkan ke `buildJourney`).
- **Hijau (`f2_npc_unit.txt`)**: Exit code `0` — `Test Files 29 passed (29)`, `Tests 222 passed (222)` pada `npx vitest run tests/unit/npc` (perilaku tanpa `routeFn` tetap identik, `legs.length > jumlah anchor - 1`, batas `maxTiles = 900` dihitung setelah detour, dan `positionAt` terinterpolasi akurat).

### F3: Perencana Anti-Pulau & Teleport Pulang (`services/npcWanderPlanner.js`, `services/npcJourneyTick.js`)
- **Merah (`f3_planner_red.txt`)**: Exit code `1` — `2 failed (2)` test files, `5 failed | 6 passed (11)` tests:
  - `(a)` Gagal karena `realmIndex: 5` di `dermaga_donghai` masih memilih tujuan bertipe `'island'`.
  - `(b)` & `(c)` Gagal karena `plan.journey` belum tersedia dan belum melewati koridor celah.
  - `(d)` Gagal karena `planReturnHome` belum menghasilkan `{ teleport: true }`.
  - `(m)` Integrasi DB asli gagal karena NPC di `pulau_penyu_raksasa` tetap berstatus di pulau (`Expected: "dermaga_donghai"`, `Received: "pulau_penyu_raksasa"`).
- **Hijau (`f3_planner.txt`)**: Exit code `0` — `Test Files 2 passed (2)`, `Tests 11 passed (11)`, termasuk tes integrasi Mongoose asli `(m)` yang men-teleportasi NPC terdampar ke `(3920, 2700)` dan mencetak log `[NpcJourney] teleport pulang Pengelana Terdampar Pulau`.

### F4: Invariant V19 (`scripts/v28/lib/invariants.js`, `scripts/v28/auditNpcWorld.js`)
- **Merah (`f4_v19_red.txt`)**: Exit code `1` — `2 failed | 1 passed (3)` tests (`v32_invariant_v19.test.mjs`), karena journey ber-`legs` terputus maupun menyilang `azure_wall`/`eastern_sea_coast` belum menghasilkan kode pelanggaran `V19`.
- **Hijau (`f4_v19.txt`)**: Exit code `0` — `3 passed (3)` pada `tests/unit/npc/v32_invariant_v19.test.mjs`, dan `node scripts/v28/auditNpcWorld.js` mencetak `[AuditNpcWorld] PASSED: 0 violations! All invariants V1-V19 satisfied.` terhadap 764 NPC dan 52 anchor.

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
| NPC Macet `away` Tanpa `stayUntil` | `0` | `0` | Konsisten `0` |
| Pelanggaran NPC Esensial Berjalan | `0` | `0` | Konsisten `0` |
| Pelanggaran Jarak Berangkat > 900 Tile | `0` | `0` | Konsisten `0` |
| Pelanggaran Koordinat Non-Integer | `0` | `0` | Konsisten `0` |
| Panjang Rata-rata Perjalanan | — | `386.9` tile | `13696` move ticks; `293` titik `ok:false` dipertahankan di daratan lama |

**Penjelasan selisih `+134` perjalanan dibanding V31**: Berbeda dari perkiraan awal bahwa jumlah perjalanan menurun karena rute diblokir, pada V32 kandidat tujuan diuji dengan `buildJourney(..., routeFn: defaultRouteFn)` *sebelum* `pickWeighted` di `chooseDestination`. Akibatnya roll harian NPC yang valid tidak lagi terbuang pada kandidat yang baru ditolak setelah dipilih (`island`, terblokir, atau detour > 900 tile), sehingga rata-rata jarak valid menjadi `386.9` tile dan lebih banyak perjalanan berangkat-pulang tuntas dalam 48 jam game.

---

## Hasil Master Gate 11-Langkah (`review/v32_raw/gate.json`)

| # | Langkah | Status | Exit Code | Durasi |
|---|---|---|---|---|
| 1 | `npm test` (709 berkas `.js`) | PASS | 0 | 67.8s |
| 2 | `npx vitest run` (64 test files, 532 tests) | PASS | 0 | 67.0s |
| 3 | `node scripts/v28/auditNpcWorld.js` (V1–V19, 0 pelanggaran) | PASS | 0 | 8.8s |
| 4 | `node scripts/v28/layoutProbe.js http://localhost:3100` (0 pelanggaran) | PASS | 0 | 21.9s |
| 5 | `npm --prefix web-dashboard run build` | PASS | 0 | 55.5s |
| 6 | Cek Aset Terlarang | PASS | 0 | 18.3s |
| 7 | Cek Git Bersih | PASS | 0 | 0.1s |
| 8 | Cek Anti-Slop | PASS | 0 | 0.1s |
| 9 | `npx vitest run tests/integration/npcJourneyLifecycle.test.js tests/integration/npcHuntJourneyConflict.test.js tests/unit/npc/v31_snap_walkable.test.mjs` (21 tests) | PASS | 0 | 9.0s |
| 10 | `node scripts/v32/checkRouteWalkability.js` | PASS | 0 | 30.0s |
| 11 | `npx vitest run tests/unit/npc/v32_route.test.mjs tests/unit/npc/v32_planner_route.test.mjs` (18 tests) | PASS | 0 | 4.6s |

Hasil keseluruhan `gate.json`: `overallPass: true`, `11/11` langkah `PASS`.

---

## YANG TIDAK BERHASIL

1. **Target ideal sensus `ok:false <= 0,50%` TIDAK TERCAPAI**:
   - Angka aktual adalah **`102` dari `15.323` titik (`0.67%`)** (lolos syarat exit code skrip `<= 1.00%`, tetapi lebih tinggi dari target ideal `0.50%`).
   - **Penyebab terukur**:
     - Empat anchor dunia (`pos_perbatasan_qinghe` di dalam `great_rift`; serta `kaki_gunung_azure`, `sekte_awan_pedang`, dan `makam_kaisar_pedang_purba` di dalam `azure_wall`) memiliki koordinat di dalam `bounds` barrier. Sesuai Aturan 1 `utils/npcRoute.js` (yang dilarang diubah), segmen dengan salah satu ujung di dalam `bounds` mengabaikan barrier tersebut sehingga segmen diagonal langsung ke/dari 4 anchor itu menyentuh petak tebing padat lebih dari radius `snapWalkable` 40.
     - Rute `desa_heiyan -> luoyang_kecil` (dan simetrinya) menyumbang titik `ok:false` karena medan padat alamiah di luar radius `snapWalkable` 40 meskipun tidak menyilang `bounds` pada 7 barrier terdaftar.
2. **Pasangan langsung utara-ke-selatan `azure_wall` antar-anchor non-celah dunia nyata melebihi batas `900` tile**:
   - Seluruh anchor daratan utama di utara `azure_wall` (`y <= 2800`, mis. `tianjing` di `y = 2800`) hingga selatan `azure_wall` (`y >= 3800`, mis. `kota_leiyin` di `y = 3800`) berjarak `>= 1000` tile, sehingga untuk berkelana (`maxTiles = 900`) rute langsung melintasi `azure_wall` tanpa berhenti di anchor celah tengah (`kaki_gunung_azure` / `sekte_awan_pedang` / `makam_kaisar_pedang_purba`) tetap ditolak karena batas 900 tile. Pengujian `(c)` di `v32_planner_route.test.mjs` memverifikasi perilaku lintasan celah baik dengan anchor berjarak `<= 900` across `azure_wall`.
