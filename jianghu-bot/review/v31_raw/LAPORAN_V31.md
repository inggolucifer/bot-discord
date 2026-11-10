# LAPORAN AKHIR V31 — PERBAIKAN KECIL SISTEM PERJALANAN NPC (3 BUG)

Dokumen resmi penyelesaian 3 bug sistem perjalanan dan perburuan NPC pada repositori `jianghu-bot` (Immortal-X).
Waktu Selesai: 2026-11-10T09:45:00+07:00
Status Akhir: **9/9 GATE LOLOS (100% PASS)**

---

## 1. Ringkasan Eksekutif & Hasil Perbaikan

Pada versi V31, dilakukan perbaikan terarah terhadap 3 bug konkret yang ditemukan pada engine pergerakan spasial NPC V30:

| Bug | Deskripsi & Akar Masalah | Solusi Implementasi | Status | Bukti File Raw |
|---|---|---|---|---|
| **B1 (F1)** | NPC tiba di tujuan tidak pernah pulang karena `runScheduleBatchTick` menimpa status `visiting` menjadi aktivitas harian (`working`/`socializing`). | Pengecualian `'visiting'` dari `runScheduleBatchTick` (`$nin: ['traveling', 'hunting', 'visiting']`), pemulangan berbasis relasi spasial (`homeAnchorId` vs `currentAnchorId`), dan batas tinggal `stayUntil`. | **PASSED** | `f1_lifecycle_red.txt`<br>`f1_lifecycle.txt` |
| **B2 (F2)** | Titik interpolasi jalur berpotensi masuk laut/gunung karena radius snap 10 tidak cukup menjangkau daratan. | Perluasan radius `snapWalkable` ke 40 tile dengan penanda `ok: true/false`. Koordinat NPC dipertahankan di daratan lama bila `ok: false`. | **PASSED** | `f2_unit_red.txt`<br>`f2_unit.txt`<br>`f2_walkability.txt` |
| **B3 (F3)** | Pemburu yang sedang dalam perjalanan terjadwal ditimpa kembali posisinya ke rute lama oleh `runJourneyTick`. | `huntStep` secara eksplisit membatalkan `targetDestination` (`null`), `runJourneyTick` mengabaikan NPC berstatus `hunting`, dan pemburu yang selesai bertugas di luar rumah dijadwalkan pulang secara otomatis. | **PASSED** | `f3_hunt_conflict_red.txt`<br>`f3_hunt_conflict.txt` |

---

## 2. Rincian Eksekusi & Bukti Merah-ke-Hijau

### F1: Perbaikan B1 — NPC yang Bertamu Harus Pulang
- **Akar Masalah**:
  1. `runScheduleBatchTick` (tiap 5 menit) mengeksekusi `evaluateNpcSchedule` pada semua NPC yang bukan `traveling` atau `hunting`. Akibatnya, NPC yang baru tiba di kota tujuan dengan status `visiting` langsung diubah menjadi `working`, `socializing`, atau `sleeping` di pemukiman asalnya.
  2. `runJourneyTick` Case 2 mensyaratkan `activityState === 'visiting'` untuk memulai perjalanan pulang. Karena status sudah tertimpa, NPC tidak pernah pulang.
- **Perbaikan**:
  1. `services/npcTicker.js`: `schedule.activityState: { $nin: ['traveling', 'hunting', 'visiting'] }`.
  2. `services/npcJourneyTick.js`: Evaluasi pemulangan berbasis posisi nyata (`away = homeAnchorId !== currentAnchorId`) dan kedaluwarsa `stayUntil`. NPC legacy tanpa `stayUntil` diberi batas tinggal 30 menit lalu dipulangkan.
- **Bukti Uji (`tests/integration/npcJourneyLifecycle.test.js`)**:
  - **MERAH (Sebelum Perbaikan)**:
    ```
    FAIL tests/integration/npcJourneyLifecycle.test.js
    AssertionError: expected 'working' to be 'visiting'
    AssertionError: expected null not to be null
    ```
  - **HIJAU (Setelah Perbaikan)**:
    ```
    ✓ tests/integration/npcJourneyLifecycle.test.js (2 tests) 1464ms
      ✓ Full lifecycle: depart -> travel mid-way protected -> arrive visiting -> stay protected from schedule -> return home -> idle -> depart 24h later
      ✓ (h) Legacy NPC (away from home without stayUntil) receives stayUntil and eventually returns home
    ```

---

### F2: Perbaikan B2 — Penjaminan Titik Jalur Walkable
- **Akar Masalah**:
  Pada jalur antar-anchor yang melintasi perairan lebar atau pegunungan curam, radius snapping 10 tile tidak mampu menemukan daratan, sehingga titik tidak walkable ditulis mentah ke jadwal NPC.
- **Perbaikan**:
  1. `services/npcJourneyTick.js` (`snapWalkable`):
     - Radius spiral diperbesar hingga 40 tile.
     - Mengembalikan `{ x, y, ok: true }` saat menemukan petak walkable.
     - Mengembalikan `{ x, y, ok: false }` jika radius 40 tetap tidak menemukan petak daratan.
  2. Case 1 (`runJourneyTick`): Jika `snapped.ok === false`, koordinat `tileX/tileY` tidak diperbarui ke DB, menjaga posisi daratan NPC sebelumnya dan hanya mempertahankan status `traveling`.
- **Hasil Audit Rute Nyata (`scripts/v31/checkJourneyWalkability.js`)**:
  ```
  === HASIL AUDIT WALKABILITY TITIK PERJALANAN NPC (V31 F2) ===
  Jumlah Rute Sampel Teruji: 21
  Total Titik Jalur Dievaluasi: 231
  Jumlah Titik Non-Walkable Sebelum Snap: 18 (7.79%)
  Jumlah Titik ok:false Setelah Snap (Radius 40): 1 (0.43%)
  Status Ambang Batas (<= 1%): PASSED (LOLOS)
  ```
  *Keterangan: 1 titik tersisa (0.43% <= 1%) yang berada di tengah perairan dalam kini terlindungi 100% oleh guard `snapped.ok !== false`, sehingga NPC tidak pernah terdorong masuk ke air.*
- **Bukti Uji Unit & Integrasi (`tests/unit/npc/v31_snap_walkable.test.mjs`)**:
  - **MERAH**: 5 failed (ketiadaan field `ok`, kegagalan deteksi jarak 25, dan koordinat tetap tertulis).
  - **HIJAU**: 5 passed (100% lulus).

---

### F3: Perbaikan B3 — Pemburu Memutus Perjalanan Terjadwal
- **Akar Masalah**:
  Ketika NPC sedang dalam perjalanan (`schedule.targetDestination.type === 'journey'`) lalu dipanggil berburu oleh `huntStep`, `targetDestination` tidak dihapus. Pada tick berikutnya, `runJourneyTick` menganggap perjalanan masih aktif dan memindahkan posisi NPC kembali ke rute lama.
- **Perbaikan**:
  1. `services/npcVendettaEngine.js`:
     - Saat hunter melangkah (`step.moved`) atau masuk status siaga (`step.state === 'hunting'`), set `hunter.schedule.targetDestination = null`, `hunter.schedule.stayUntil = null`, dan panggil `hunter.markModified('schedule')`.
     - Saat perburuan selesai (`shouldStop`), jika hunter berada di luar rumah (`curAnchor !== homeAnchor`) dan `stayUntil` kosong, set `stayUntil = new Date(now)` agar siklus F1 memulangkannya ke rumah.
  2. `services/npcJourneyTick.js`:
     - Menambahkan filter query `'schedule.activityState': { $ne: 'hunting' }`.
     - Menambahkan guard `if (npc.schedule?.activityState === 'hunting') continue;`.
- **Bukti Uji (`tests/integration/npcHuntJourneyConflict.test.js`)**:
  - **MERAH**:
    ```
    FAIL tests/integration/npcHuntJourneyConflict.test.js
    AssertionError: expected 'traveling' to be 'hunting'
    AssertionError: expected null not to be null
    ```
  - **HIJAU**:
    ```
    ✓ tests/integration/npcHuntJourneyConflict.test.js (2 tests) 1638ms
      ✓ (a) Hunter traveling on a journey cancels journey upon hunting; runJourneyTick does not overwrite coordinates
      ✓ (b) When vendetta is resolved, hunter becomes idle; if away from home, eventually returns via runJourneyTick
    ```

---

## 3. Hasil Pipeline Master Gate (9/9 Gerbang)

Keluaran resmi dari `node scripts/v30/gateRunner.js http://localhost:3100`:
```
======================================================
[GATE SUMMARY TABLE V30]
======================================================
| Step | Status | Duration | Exit Code |
|---|---|---|---|
| 1. npm test (704 JS files node --check)     | PASS | 78.8s | 0 |
| 2. npx vitest run (59 test files, 497 tests)| PASS | 96.1s | 0 |
| 3. node scripts/v28/auditNpcWorld.js        | PASS | 11.3s | 0 |
| 4. node scripts/v28/layoutProbe.js (P1-P16) | PASS | 33.8s | 0 |
| 5. npm --prefix web-dashboard run build     | PASS | 75.0s | 0 |
| 6. Cek Aset Terlarang (0 forbidden assets) | PASS | 18.6s | 0 |
| 7. Cek Git Bersih                           | PASS | 0.2s  | 0 |
| 8. Cek Anti-Slop (7 NPC components clean)   | PASS | 0.2s  | 0 |
| 9. npx vitest run tests V31 (9 tests)       | PASS | 10.9s | 0 |
======================================================
Overall Result: ALL GATES PASSED (100%)
```

Audit ekosistem dunia (`node scripts/v28/auditNpcWorld.js`):
- Total NPC: 764
- Essential Count: 18
- Dead Count: 0
- Invariants V1–V18: **0 Violations (PASSED)**

---

## 4. Bagian "YANG TIDAK BERHASIL" / Keterbatasan (Honest Failure Audit)

Sesuai aturan transparansi Jianghu Bot:
1. **Titik Jalur di Tengah Danau Luas (0.43%)**:
   - Terdapat 1 titik sampel pada penyeberangan Danau Shuijing di mana radius 40 tile daratan terdekat tetap tidak terjangkau (karena lebar danau > 80 tile).
   - **Solusi yang diterapkan**: Titik ini ditandai `ok: false`. Algoritma `runJourneyTick` menolak menulis koordinat air tersebut ke database, sehingga NPC tetap berada di daratan tepi danau terdekat sampai segmen perjalanan berikutnya mencapai daratan seberang. NPC tidak pernah tampil di atas air.
2. **Perjalanan NPC Tidak Menghitung Moda Kapal/Ferry Penyeberangan**:
   - Penyeberangan air saat ini masih menggunakan interpolasi Chebyshev langsung tanpa tiket dermaga (berbeda dengan pemain yang menggunakan moda rakit bambu atau perahu cepat). Hal ini merupakan batasan arsitektur graph 52 anchor saat ini dan dapat ditingkatkan pada rilis masa depan dengan memperkenalkan node dermaga transit khusus NPC.

---

## 5. Daftar Commit Git Berurutan V31

1. `dcdae0c7` - `v31(F1): perbaiki pemulangan NPC bertamu dan proteksi jadwal visiting`
2. `3b888a4e` - `v31(F2): radius snapWalkable 40 tile dengan penanda ok dan proteksi posisi daratan`
3. `52093152` - `v31(F3): pemburu membatalkan journey terjadwal dan auto-return saat selesai`
