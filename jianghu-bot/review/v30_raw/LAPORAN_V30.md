# LAPORAN AKHIR V30 — SISTEM PERJALANAN NPC, PERBURUAN NYATA, DAN INTEGRITAS MASTER GATE

Dokumen otoritatif penyelesaian pekerjaan arsitektur V30 pada repositori `jianghu-bot` (Immortal-X).
Waktu Selesai: 2026-11-09T23:35:04+07:00
Status Akhir: **8/8 GATE LOLOS (100% PASS)**

---

## 1. Ringkasan Eksekutif

Pada versi V30, dilakukan restrukturisasi menyeluruh terhadap ekosistem NPC Jianghu untuk menyelesaikan 6 temuan audit mendasar (T1 s/d T6):
1. **Perpindahan Nyata NPC (Real Spatiotemporal Movement)**: Menggantikan status statis semu menjadi pergerakan deterministik berbasis graph 52 anchor, metrik jarak Chebyshev, interpolasi waktu linier dengan snapping petak walkable, dan perencana tujuan (wander planner) berbasis bobot region (60/40) serta ranah kultivasi.
2. **Perburuan & Sergapan Nyata (Active Hunting & Dual Ambush System)**: Mengubah pemburu pasif menjadi pelacak aktif yang melangkah mendekat ($\text{step} = \min(40, \text{dist} - 24)$) ke arah pemain online, mematuhi radius eksklusi permukiman, serta mengimplementasikan **Hostile Ambush** bagi NPC dengan afinitas $\le -60$ berdampingan dengan **Vendetta Ambush** keluarga.
3. **Penyempurnaan Master Gate & Layout Probe**: Mengaktifkan 8 gate otomatis tanpa hardcoded pass, menambahkan pemindai statis anti-slop/anti-emas, pengujian pilihan aksi dialog yang menembus animasi ketik (P13–P16), dan pembersihan total sisa elemen yang di-deprecate (Feng Shui).

---

## 2. Jawaban Terukur atas Temuan Audit

### T1: Data Perpindahan Nyata NPC
- **Masalah Sebelum V30**: Koordinat `tx, ty` NPC tidak pernah berubah di jadwal (`npcScheduler.js`), status `traveling` hanya label teks tanpa pergerakan.
- **Solusi V30**:
  - Modul murni interpolasi linier `utils/npcJourney.js` (`positionAt`).
  - Pemilihan tujuan deterministik `services/npcWanderPlanner.js` via Mulberry32 RNG.
  - Tick eksekusi berkala `services/npcJourneyTick.js` yang terintegrasi di `services/npcTicker.js`.
- **Bukti Terukur (Simulasi 48 Jam Game, 288 Langkah @ 10 Menit dari `review/v30_raw/m5_travel_sim.txt`)**:
  - Total populasi: 764 NPC (120 wanderer aktif, ~15.71%).
  - Jumlah perjalanan terlaksana: **3.382 perjalanan**.
  - Rata-rata jarak perjalanan: **391,9 petak (tile)**.
  - Sebaran destinasi unik: **45 anchor** dari 52 anchor dunia.
  - Pelanggaran batas jarak (> 900 tile): **0**.
  - Pelanggaran koordinat non-integer: **0**.
  - Pelanggaran NPC esensial berjalan: **0 (100% menetap)**.

### T2: Bukti Perburuan Nyata (Active Hunter Stalking)
- **Masalah Sebelum V30**: Ambush hanya memeriksa jarak hunter ke pemain jika pemain kebetulan mendekat ($\le 24$ tile).
- **Solusi V30**: `services/npcHuntEngine.js` mengeksekusi `huntStep`. Hunter dari jarak 100 tile secara aktif melangkah mendekati pemain dalam 1 tick menjadi $\le 60$ tile dan masuk status `hunting`.
- **Bukti Tes Integrasi (`tests/integration/npcHuntAmbush.test.js`)**:
  - Kasus 1: Pemain di (100, 100), hunter di (200, 100) (jarak 100). Setelah 1 tick: `updatedHunter.tileX` menjadi 160 (`toBeLessThan(200)`), status `schedule.activityState = 'hunting'` (**PASSED**).
  - Kasus 2: Hunter berada di jarak 20 tile ($\le 24$) memicu `NpcAmbush` bertipe `vendetta` (**PASSED**).
  - Kasus 3: Pemain di dalam radius eksklusi permukiman (Desa Damai, $R=10$) kebal sergapan dan hunter tidak menerobos (**PASSED**).

### T3: Bukti Ambush Permusuhan (Hostile Ambush)
- **Masalah Sebelum V30**: NPC yang sangat membenci pemain ($\text{affinity} \le -60$) tidak pernah menyerang jika bukan anggota keluarga korban dendam.
- **Solusi V30**: `runVendettaTick` memindai `NpcPlayerRelation` dengan afinitas $\le -60$, cooldown 6 jam, peluang 10% per tick, menghasilkan `NpcAmbush` dengan `kind: 'hostile'` dan `reason: 'benci'`.
- **Bukti Tes Integrasi (`tests/integration/npcHuntAmbush.test.js`)**:
  - Kasus 4: NPC afinitas -80 pada jarak 8 tile memicu sergapan hostile; tick kedua dalam kurun waktu < 6 jam diblokir cooldown (**PASSED**).
  - Kasus 5: NPC afinitas -30 (> -60) tidak memicu sergapan (**PASSED**).
  - Kasus 6: NPC esensial walau afinitas -90 dilarang menyergap (**PASSED**).
  - Kasus 7: Pemain offline (> 10 menit tidak aktif) tidak pernah disergap (**PASSED**).

### T4: 8 Master Gate Terverifikasi (Keluaran Asli dari `review/v30_raw/gate.json`)
Semua 8 gerbang lulus 100% dengan exit code 0:
| Gerbang | Perintah / Pemeriksaan | Durasi | Status | Exit Code |
|---|---|---|---|---|
| **1. Syntax Check** | `npm test` (`node scripts/syntaxCheckAll.js`, 700 berkas JS) | 71.2s | **PASS** | 0 |
| **2. Test Suite** | `npx vitest run` (58 file uji, 490 pengujian unit & integrasi) | 59.0s | **PASS** | 0 |
| **3. Audit Ekosistem** | `node scripts/v28/auditNpcWorld.js` (764 NPC, Invariants V1–V18) | 10.2s | **PASS** | 0 |
| **4. Layout & Visual Probe** | `node scripts/v28/layoutProbe.js http://localhost:3100` (P1–P16, pilihan aksi dialog) | 23.4s | **PASS** | 0 |
| **5. Production Build** | `npm --prefix web-dashboard run build` (Next.js 16.3.2 Turbopack) | 76.1s | **PASS** | 0 |
| **6. Cek Aset Terlarang** | Pemindaian rekursif string `toi_scenery|xihua_standing` | 16.9s | **PASS** | 0 |
| **7. Cek Git Bersih** | Verifikasi tidak ada `package-lock.json`, `.next`, `AGENTS.md` liar | 0.1s | **PASS** | 0 |
| **8. Cek Anti-Slop** | Pemindaian 7 komponen UI NPC (`antislopScan.js`, 0 token terlarang) | 0.1s | **PASS** | 0 |

### T5: Bukti Penghapusan "Feng Shui"
- Seluruh baris Feng Shui pada `NpcProfilePanel.tsx` telah dihapus.
- Verifikasi: `grep -rn "Feng Shui" web-dashboard/src/components/npc` menghasilkan 0 kemunculan.

### T6: Integritas Git Ignore Root Repo
- Root repo `.gitignore` telah ditambahkan `/review/`.
- `git ls-files review` di root repo tidak lagi men-track `review/v29_raw/` atau `review/v30_raw/` liar.
- `jianghu-bot/review/v30_raw/` tetap ter-track secara rapi di dalam subdirektori proyek.

---

## 3. Daftar Commit Berurutan V30

Diambil langsung dari `git log --oneline`:
1. `d9ccf0df` - `v30(G0): perbaiki gate, scanner antislop, probe overlay pilihan aksi, dan hapus Feng Shui`
2. `c07714a0` - `v30(M0): skema wanderLevel, update seed snapshot, dan invariant V16-V18`
3. `f9123590` - `v30(M1): modul matematika perjalanan npcJourney dan pengujian Chebyshev`
4. `b3d3fe5c` - `v30(M2): perencana tujuan npcWanderPlanner dengan bobot region dan durasi singgah`
5. `9118986c` - `v30(M3): service npcJourneyTick, integrasi loop ticker, dan proteksi jadwal`
6. `f7b5ff78` - `v30(M4): tampilan label aktivitas perjalanan NPC pada nearby, profil, dan dialog`
7. `2fe942bb` - `v30(M5): skrip simulasi perjalanan 48 jam dan laporan bukti travel`
8. `ef2a5eaf` - `v30(H0): skema kind dan reason pada NpcAmbush serta lastAmbushAt pada relation`
9. `ffc3376f` - `v30(H1): engine pergerakan pemburu npcHuntEngine dengan Chebyshev dan eksklusi pemukiman`
10. `7c795f19` - `v30(H2): integrasi pergerakan pemburu huntStep dan hostile ambush pada vendetta engine`
11. `abe18bf0` - `v30(H3): endpoint dan dialog sergapan membedakan vendetta dan hostile`
12. `7f29da8c` - `v30(G0): integrasi label aktivitas inline nameplate dialog dan perbaikan timeout checkPort gate runner`

---

## 4. Hasil Audit Dunia V1–V18

Keluaran resmi dari `scripts/v28/auditNpcWorld.js`:
```json
{
  "totalNpcs": 764,
  "essentialCount": 18,
  "deadCount": 0,
  "uniqueLocations": 764,
  "totalFamilies": 8,
  "populatedAnchors": 46,
  "wandererCount": 120,
  "wandererPercent": "15.71%",
  "invariantsChecked": [
    "V1: NPC count exactly 764",
    "V2: Anchor validity across 52 world anchors",
    "V3: Facility validity in settlements",
    "V4: Schedule completeness and activity state",
    "V5: Spatial integrity and coordinate clamping",
    "V6: Walkable tile placement",
    "V7: Cultivation tier and realm consistency",
    "V8: Attribute bounds (HP, ATK, DEF, Agility)",
    "V9: Personality vector normalization",
    "V10: Dialog tree integrity and node linking",
    "V11: Family social graph coherence",
    "V12: Inventory item validity",
    "V13: Mongoose schema validation (0 errors)",
    "V14: No NaN or undefined fields",
    "V15: Essential story NPC protection",
    "V16: Wanderer proportion between 8% and 20% (15.71%)",
    "V17: Essential NPCs have wanderLevel 0 and no journey target",
    "V18: Valid journey legs and timing structure"
  ],
  "violations": 0,
  "status": "PASSED"
}
```

---

## 5. Catatan untuk Rilis Berikutnya

1. **Visualisasi Ikon Pelancong Spasial**: Di masa mendatang, pemain yang berpapasan dengan NPC yang sedang `traveling` di alam liar dapat melihat siluet pengelana yang melangkah di peta mikro-grid spasial Tale of Immortal.
2. **Dynamic Caravan Event**: NPC pengrajin/pedagang yang melakukan perjalanan antar kota dapat dikelompokkan menjadi karavan dagang berkala yang berpotensi diserang bandit atau dibantu pemain.
