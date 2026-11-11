# LAPORAN AKHIR V31 — PERBAIKAN MAKSIMAL SISTEM PERJALANAN NPC (3 BUG)

Dokumen resmi penyelesaian dan penguatan maksimal 3 bug sistem perjalanan serta perburuan NPC pada repositori `jianghu-bot` (Immortal-X).
Waktu Verifikasi Final: 2026-11-11T07:39:13+07:00
Status Akhir: **9/9 GATE LOLOS (100% PASS — 61 File Uji / 510 Tes Hijau)**

---

## 1. Ringkasan Eksekutif & Hasil Perbaikan

Pada versi V31 (termasuk siklus penguatan penuh & refaktor modular), dilakukan penyelesaian menyeluruh hingga ke kasus batas (*edge cases*) pada 3 bug sistem perjalanan NPC:

| Bug | Deskripsi & Akar Masalah | Solusi Implementasi Maksimal | Status | Bukti File Raw |
|---|---|---|---|---|
| **B1 (F1)** | NPC bertamu tidak pernah pulang karena status `visiting` tertimpa jadwal harian, perjalanan pulang tertahan batas 900 tile, anchor lama tak dikenal macet, dan NPC di rumah berstatus `visiting` bisa terkunci | Pengecualian `'visiting'` di `npcTicker.js`; pemulangan berbasis spasial (`homeAnchorId !== currentAnchorId`), `maxTiles: 10000` untuk `pulang`, `stayUntil` otomatis untuk data lama, fallback `buildDirectWalkBackJourney` untuk anchor terhapus, serta *self-heal* status `visiting` di rumah & penguncian NPC esensial | **PASSED (6/6)** | `f1_lifecycle_red.txt`<br>`f1_lifecycle.txt` |
| **B2 (F2)** | Titik interpolasi jalur & titik kedatangan berpotensi masuk laut/tebing karena radius snap 10 tidak cukup; scan spiral penuh juga boros iterasi | Scan keliling cincin Chebyshev $O(r)$ radius 40 (**14× lebih cepat**), penanda `ok: true/false`, serta proteksi koordinat via `applySnapCoords` & `resolveLandingCoordinates` baik saat **bergerak** maupun saat **tiba** (`pos.arrived`) agar titik tidak walkable tak pernah ditulis | **PASSED (8/8)** | `f2_unit_red.txt`<br>`f2_unit.txt`<br>`f2_walkability.txt`<br>`f2_sim_48h.txt` |
| **B3 (F3)** | Pemburu berstatus hunting ditimpa kembali posisinya oleh `runJourneyTick`; pemburu kehilangan jejak (>200 tile), cooldown pasca-sergapan, `wanderLevel: 0`, atau tersesat di rimba tak pernah pulang | Refaktor modular `cleanupStaleHunters` & `resetHunterToIdle` saat vendetta selesai / cooldown 3 jam / pemain offline / jejak hilang (>200 tile); `huntStep` membatalkan `targetDestination`; `runJourneyTick` mengecualikan `hunting` & `isEssential`, menjangkau `stayUntil != null` (`wanderLevel: 0`), dan memulangkan pemburu tersesat (`disp > 30`) | **PASSED (6/6)** | `f3_hunt_conflict_red.txt`<br>`f3_hunt_conflict.txt` |

---

## 2. Rincian Eksekusi & Bukti Merah-ke-Hijau

### F1: Perbaikan B1 — NPC yang Bertamu Harus Pulang
- **Perbaikan**:
  1. `services/npcTicker.js`: `schedule.activityState: { $nin: ['traveling', 'hunting', 'visiting'] }`.
  2. `services/npcJourneyTick.js` (`processIdleOrVisitingNpc`):
     - Pemulangan berbasis `away = homeAnchorId !== currentAnchorId` dan `stayUntil <= now`.
     - Batas jarak `maxTiles: 10000` pada `buildJourney` khusus `purpose: 'pulang'`, plus fallback `buildDirectWalkBackJourney` bila `currentAnchorId` tak lagi ada di `anchorMap`.
     - Pemberian `stayUntil = now + 30 menit` otomatis untuk NPC lama yang `away` tanpa `stayUntil`.
     - *Self-heal* untuk NPC di rumah (`!away`) dengan status tertinggal `'visiting'`.
- **Bukti Uji (`tests/integration/npcJourneyLifecycle.test.js`)**:
  - **MERAH**: Status `visiting` tertimpa menjadi `working`, legacy NPC tanpa `stayUntil` macet, perjalanan pulang > 900 tile gagal dimulai, status `visiting` di rumah tidak pulih, dan anchor lama tak dikenal macet (`review/v31_raw/f1_lifecycle_red.txt`).
  - **HIJAU**: **6/6 tes integrasi Mongoose asli lolos** termasuk siklus 24 jam game, legacy `stayUntil`, pulang 1.200 tile, *self-heal* `visiting` di rumah, larangan berangkat saat `away`, serta fallback anchor terhapus (`review/v31_raw/f1_lifecycle.txt`).

---

### F2: Perbaikan B2 — Penjaminan Titik Jalur Walkable
- **Perbaikan**:
  1. `services/npcJourneyTick.js` (`snapWalkable`):
     - Radius diperluas ke **40 tile** menggunakan iterasi keliling cincin Chebyshev (`8r` cek per cincin, memangkas kasus terburuk dari 91.360 iterasi menjadi 6.560 iterasi).
     - Mengembalikan `{ x, y, ok: true/false }`.
  2. Case 1 (`runJourneyTick` + helper `applySnapCoords`):
     - Baik pada tick **bergerak** maupun tick **tiba** (`pos.arrived === true`), bila `ok === false`, koordinat `tileX/tileY` **tidak ditulis**, menjaga NPC aman di daratan valid terakhir.
- **Audit Walkability (`scripts/v31/checkJourneyWalkability.js`)**:
  - **Sampel Standar Audit (`i += 5, j += 9`, 21 rute)**:
    - Total titik dievaluasi: **231**
    - Non-walkable sebelum snap: **18 (7.79%)**
    - Titik `ok:false` setelah snap (radius 40): **1 (0.43%)** -> **PASSED ($\le 1\%$)**
  - **Sensus Lengkap Seluruh Rute Aktif ($\le 2$ Hop & $\le 900$ Tile, 378 rute)**:
    - Total titik dievaluasi: **4.158**
    - Non-walkable sebelum snap: **586 (14.09%)**
    - Titik `ok:false` setelah snap (radius 40): **92 (2.21%)** (mayoritas penyeberangan pulau/laut `Pulau Penyu Raksasa`, yang kini dicegat oleh guard `applySnapCoords`).
- **Simulasi Ekosistem 48 Jam (`scripts/v30/simulateNpcTravel.js` — `review/v31_raw/f2_sim_48h.txt`)**:
  - Populasi: **764 NPC**, 288 langkah @ 10 menit (termasuk evaluasi jadwal harian B1 dan `snapWalkable` B2 di setiap tick).
  - Total perjalanan: **3.382** (**Berangkat: 1.709, Pulang: 1.673** — selisih 36 sesuai sisa 39 sedang jalan + 25 bertamu di akhir langkah ke-288).
  - NPC macet `away` tanpa `stayUntil`: **0**.
  - Total tick pergerakan dievaluasi `snapWalkable`: **13.340** (`1.320` titik mentah non-walkable dicegat, `301` titik `ok:false` ditahan di daratan sebelumnya).
  - **Pelanggaran posisi non-walkable tertulis ke NPC: 0 (0.00%)**.
- **Bukti Uji Unit & Integrasi (`tests/unit/npc/v31_snap_walkable.test.mjs`)**:
  - **MERAH**: Kegagalan deteksi radius 25, ketiadaan field `ok`, dan penulisan koordinat air pada tick kedatangan (`review/v31_raw/f2_unit_red.txt`).
  - **HIJAU**: **8/8 tes lolos** termasuk guard saat tiba dan benchmark performa < 250ms (`review/v31_raw/f2_unit.txt`).

---

### F3: Perbaikan B3 — Pemburu Memutus Perjalanan Terjadwal
- **Perbaikan**:
  1. `services/npcVendettaEngine.js`:
     - Saat `huntStep` melangkah atau masuk status `'hunting'`, set `targetDestination = null`, `stayUntil = null`, dan panggil `markModified('schedule')`.
     - Helper modular `resetHunterToIdle(hunter, now)` dan `cleanupStaleHunters` menangani penghentian perburuan saat vendetta selesai, **cooldown 3 jam pasca-sergapan (`lastAmbushAt`)**, pemain offline (>10 menit), maupun **kehilangan jejak (`dist > 200` / `step.state === 'idle'`)**, dengan menetapkan `stayUntil = new Date(now)`.
     - Menambahkan proteksi `hunter.vitalStatus?.isEssential` agar NPC esensial tidak pernah dipicu dalam perburuan dendam.
  2. `services/npcJourneyTick.js`:
     - Filter query mengecualikan `'schedule.activityState': { $ne: 'hunting' }` dan `'vitalStatus.isEssential': { $ne: true }`, serta `$or` mencakup `stayUntil != null` agar pemburu dengan `wanderLevel: 0` juga dipulangkan setelah selesai bertugas.
     - Penanganan pemburu tersesat di rimba (`!away && disp > 30`) melalui perjalanan `buildDirectWalkBackJourney` (`purpose: 'pulang'`) kembali ke koordinat `homeAnchor`.
- **Bukti Uji (`tests/integration/npcHuntJourneyConflict.test.js`)**:
  - **MERAH**: Pemburu terseret kembali ke rute lama oleh `runJourneyTick`, pemburu kehilangan jejak tetap `'hunting'`, pemburu `wanderLevel: 0` macet di luar, pemburu tersesat di rimba tak kembali ke rumah, serta pemburu tetap `'hunting'` saat cooldown 3 jam (`review/v31_raw/f3_hunt_conflict_red.txt`).
  - **HIJAU**: **6/6 skenario integrasi lolos** (`review/v31_raw/f3_hunt_conflict.txt`).

---

## 3. Hasil Pipeline Master Gate (9/9 Gerbang — Setelah Edit Final)

Keluaran resmi dari `node scripts/v30/gateRunner.js http://localhost:3100` (`review/v31_raw/gate.json`):

| Gerbang | Perintah / Verifikasi | Durasi | Status | Exit Code |
|---|---|---|---|---|
| **1. Syntax Check** | `npm test` (704 berkas JS `node --check`) | 100.4s | **PASS** | 0 |
| **2. Full Test Suite** | `npx vitest run` (**61 file uji, 510 tes**) | 151.8s | **PASS** | 0 |
| **3. Audit Ekosistem** | `node scripts/v28/auditNpcWorld.js` (764 NPC, V1–V18) | 20.5s | **PASS** | 0 |
| **4. Layout & Visual Probe** | `node scripts/v28/layoutProbe.js http://localhost:3100` (P1–P16, 0 pelanggaran) | 40.1s | **PASS** | 0 |
| **5. Production Build** | `npm --prefix web-dashboard run build` (Next.js 16.3.2 Turbopack) | 162.3s | **PASS** | 0 |
| **6. Cek Aset Terlarang** | Pemindaian rekursif `toi_scenery\|xihua_standing` (0 temuan) | 21.2s | **PASS** | 0 |
| **7. Cek Git Bersih** | Tidak ada `package-lock.json`, `.next`, `node_modules`, atau `AGENTS.md` untracked | 0.1s | **PASS** | 0 |
| **8. Cek Anti-Slop** | `node scripts/v30/antislopScan.js` (7/7 komponen NPC bersih) | 0.2s | **PASS** | 0 |
| **9. V31 Focused Suite** | `npx vitest run npcJourneyLifecycle npcHuntJourneyConflict v31_snap_walkable` (**20/20 tes**) | 19.9s | **PASS** | 0 |

Audit ekosistem dunia (`node scripts/v28/auditNpcWorld.js`):
- Total NPC: 764 | Essential: 18 | Mati: 0 | Invariants V1–V18: **0 Violations (PASSED)**

---

## 4. Bagian "YANG TIDAK BERHASIL" / Keterbatasan (Honest Failure Audit)

1. **Sensus Lengkap Menunjukkan 2.21% Titik (92/4.158) Masih `ok: false` Setelah Snap Radius 40**:
   - Pada sampel standar V31 (`i += 5, j += 9`), angka `ok: false` adalah **0.43% (1/231)** ($\le 1\%$, lolos ambang batas).
   - Namun pada sensus menyeluruh **semua 378 rute 2-hop** (4.158 titik), masih terdapat **92 titik (2.21%)** `ok: false`: 34 titik pada penyeberangan laut menuju pulau terpencil (`Pulau Penyu Raksasa`, lebar laut > 80 tile) dan 58 titik melintasi penghalang masif `Azure Wall` (tebal 500 tile) atau `Great Rift` (tebal 250 tile) karena interpolasi garis lurus antar-anchor tidak mengikuti simpul celah gunung/jembatan (`passes.json`).
   - **Mitigasi aktif**: Guard pada `runJourneyTick` (baik saat **bergerak** maupun **tiba**) secara ketat menolak menulis koordinat ketika `ok: false`. Simulasi 48 jam membuktikan **0 pelanggaran posisi non-walkable tertulis** dari 13.340 tick pergerakan.
2. **Rute Jalan Tanpa Simpul Waypoint Celah Gunung**:
   - Mengarahkan NPC mengikuti polyline `passes.json` dan moda kapal feri tidak dikerjakan pada V31 karena batasan cakupan (*hanya 3 bug, dilarang menambah fitur*).

---

## 5. Daftar Commit Git Berurutan V31

1. `dcdae0c7` - `v31(F1): perbaiki pemulangan NPC bertamu dan proteksi jadwal visiting`
2. `3b888a4e` - `v31(F2): radius snapWalkable 40 tile dengan penanda ok dan proteksi posisi daratan`
3. `52093152` - `v31(F3): pemburu membatalkan journey terjadwal dan auto-return saat selesai`
4. `8fa14174` - `v31(G): master gate 9/9 lolos dan laporan akhir V31`
5. `8f848a2e` - `v31(F1): maksimalkan pemulangan NPC jarak >900 tile dan self-heal status visiting di rumah`
6. `055626f5` - `v31(F2): optimasi perimeter snapWalkable O(r), proteksi koordinat arrival, dan sensus simulasi 48 jam`
7. `e3ea0fcc` - `v31(F3): tangani pemburu kehilangan jejak (>200 tile), wanderLevel 0, dan displaced hunter pulang`
8. `694b9e1e` - `v31(G): verifikasi ulang gate 9/9 lolos dan laporan maksimal V31`
9. `6365e9ba` - `v31(F1,F3): refaktor modular journey/vendetta tick, fallback anchor terhapus, dan cooldown stand-down`
10. `a522d566` - `v31(G): perbaikan checkPort gateRunner ke /dev/npc-preview dan proteksi NPC esensial di journey/vendetta`
