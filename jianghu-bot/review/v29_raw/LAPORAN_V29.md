# LAPORAN V29 — PERBAIKAN FINAL NPC
**Tanggal**: 2026-11-09  
**Proyek**: Jianghu Bot (Immortal-X)  
**Status Keseluruhan**: **100% PASS** (Semua Gate Lolos P0–P7)

---

## 1. Tabel Ringkasan Status P0–P7

| Bagian | Deskripsi Singkat | Status | Bukti File / Log |
|---|---|---|---|
| **P0** | Perbaikan bug endpoint ambush (404 akibat pemanggilan `loadPlayer`) | **PASS** | `review/v29_raw/p0_red.txt`, `review/v29_raw/p0_green.txt` |
| **P1** | Sinkronisasi NPC cerita nyata & perlindungan vital status | **PASS** | `review/v29_raw/essential_sources.txt`, `review/v29_raw/p1_audit.txt` |
| **P2** | Eliminasi item hantu & ObjectId sampah pada `request_favor` | **PASS** | `review/v29_raw/p2_favor.txt`, `tests/integration/npcRequestFavor.test.js` |
| **P3** | Penghapusan berkas tangkapan layar pihak ketiga (`toi_scenery`, `xihua_standing`) | **PASS** | `review/v29_raw/p3_assets.txt` (0 kecocokan) |
| **P4** | Layar penuh portal, z-index 2147483000, 4 tombol utama + "Lainnya", mobile 44px | **PASS** | `web-dashboard/src/components/npc/NpcDialogueScene.tsx` |
| **P5** | Eksekusi layout probe otomatis Chromium (4 kombinasi viewport) | **PASS** | `review/v29_raw/layout_probe.json`, 4 berkas PNG tangkapan layar |
| **P6** | Lokalisasi ranah 100% Bahasa Indonesia, StatRow label normal | **PASS** | `review/v29_raw/p6_labels.txt`, `tests/unit/npcLabels.test.js` |
| **P7** | Master gate runner (6 langkah sekuensial) | **PASS** | `review/v29_raw/gate.json` (Semua gate lulus) |

---

## 2. Bukti Merah -> Hijau P0 (Endpoint Ambush)

### Masalah Asli
Pada `web-api/routes/npcInteraction.js`, pemanggilan `loadPlayer(req.user.id || req.user.userId)` mengirim string bukan objek `req.user`, mengakibatkan fungsi mengembalikan `null` dan seluruh request pending ambush mengembalikan `404 Not Found`.

### Bukti Uji MERAH (Sebelum Perbaikan)
```text
  FAIL  tests/integration/npcAmbushRoutes.test.js > NPC Ambush Routes Integration (P0) > GET /api/npc/ambush/pending returns 200 and loads pending ambush for owner
  AssertionError: expected 404 to be 200
  - Expected: 200
  + Received: 404

  FAIL  tests/integration/npcAmbushRoutes.test.js > NPC Ambush Routes Integration (P0) > POST /api/npc/ambush/:id/resolve with choice fight resolves ambush
  AssertionError: expected 404 to be 200
  - Expected: 200
  + Received: 404

  Test Files  1 failed (1)
       Tests  2 failed | 1 passed (3)
```

### Bukti Uji HIJAU (Setelah Perbaikan)
```text
 RUN  v5.0.5 D:/gitub/bot-discord/jianghu-bot

 ✓ tests/integration/npcAmbushRoutes.test.js (3 tests) 3598ms
   ✓ NPC Ambush Routes Integration (P0) (3)
     ✓ GET /api/npc/ambush/pending returns 200 and loads pending ambush for owner 576ms
     ✓ POST /api/npc/ambush/:id/resolve with choice fight resolves ambush 130ms
     ✓ POST /api/npc/ambush/:id/resolve from another player returns 403 or 404 without changing ambush 58ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
```

---

## 3. Daftar NPC Esensial Nyata (P1)

NPC yang secara aktif dirujuk oleh kode sistem dan alur pemukiman/sekte awal telah didaftarkan ke `world-data/npc-essential-v27.json` dan diproteksi:
1. `Shuang Ke` (`npc_shuang_ke`) — Sekte Awan Pedang
2. `Wu Binglin` (`npc_wu_binglin`) — Desa Xingcun
3. `Yin Ci` (`npc_yin_ci`) — Kota XiTong
4. `Li Keke` (`npc_li_keke`) — Desa Bamboo Grove
5. Ditambah 14 tetua dan tokoh inti pemukiman lainnya (total 18 NPC esensial).

### Invariant V15 & Audit Hasil
- Invariant V15 ditambahkan pada `scripts/v28/lib/invariants.js` untuk memastikan semua NPC cerita di `essential_sources.txt` memiliki `vitalStatus.isEssential: true`.
- Hasil `node scripts/v28/auditNpcWorld.js`:
  ```text
  [AuditNpcWorld] Auditing 764 NPCs across 52 anchors...
  [AuditNpcWorld] Stats: {
    totalNpcs: 764,
    essentialCount: 18,
    deadCount: 0,
    uniqueLocations: 764,
    totalFamilies: 8,
    populatedAnchors: 46
  }
  [AuditNpcWorld] PASSED: 0 violations! All invariants V1-V15 satisfied.
  ```

### Catatan Transparansi: NPC Cerita Tambahan (`missing_story_npcs.txt`)
Beberapa ID NPC statis lama dari generator pemukiman legacy dicatat pada `review/v29_raw/missing_story_npcs.txt`:
- `npc_port_1` (Kapten Zhang Hai)
- `npc_port_3` (Tetua Mo)
- `npc_city_2` (Saudagar Jin Fugui)
- `npc_sect_1` (Tetua Qing Feng)
- `npc_outpost_1` (Panglima Gao)
- `npc_outpost_2` (Pemimpin Kafilah Lu)
- `npc_village_1` (Kakek Wu)
Tokoh-tokoh ini tidak direkayasa secara sepihak ke dalam ekosistem dinamis; mereka terdokumentasi rapi untuk fase penggabungan quest selanjutnya.

---

## 4. Bukti Bebas Item Hantu pada `request_favor` (P2)

### Perubahan
1. Filter ketat: Hanya item dengan `!equippedSlot`, `quantity > 0`, dan `itemId` valid yang dapat diberikan.
2. Tidak ada lagi pembuatan `new ObjectId()` acak. Jika item NPC belum memiliki `itemId`, dilakukan pencarian definisi ke koleksi `Item.findOne({ name })`. Jika tidak ditemukan, item dilewati.
3. Jika NPC tidak memiliki item bebas yang terdaftar di database, fungsi mengembalikan `{ success: false, reason: 'npc_nothing_to_give' }` tanpa memotong stamina atau mengubah afinitas.
4. Item yang berhasil dipindahkan ditumpuk (stacked) ke inventori pemain, dan stamina pemain dipotong sesuai biaya aksi (5 stamina).

### Hasil Uji Integrasi Mongoose Asli (`tests/integration/npcRequestFavor.test.js`)
```text
 RUN  v5.0.5 D:/gitub/bot-discord/jianghu-bot

 ✓ tests/integration/npcRequestFavor.test.js (5 tests) 1855ms
   ✓ 1. Item terpasang (!equippedSlot) TIDAK diambil oleh request_favor
   ✓ 2. Item tanpa definisi di koleksi Item dilewati
   ✓ 3. Item pemain memiliki itemId yang VALID dan terdaftar di koleksi Item DB (tidak ada ObjectId baru)
   ✓ 4. Kuantitas item pada inventori NPC berkurang 1 dan stamina pemain dipotong 5
   ✓ 5. Jika NPC tidak memiliki item yang valid, kembalikan reason npc_nothing_to_give

 Test Files  1 passed (1)
      Tests  5 passed (5)
```

---

## 5. Penghapusan Aset Pihak Ketiga (P3)

Berkas yang dihapus secara permanen:
- `web-dashboard/public/assets/npc/toi_scenery_background.jpg`
- `web-dashboard/public/assets/npc/xihua_standing_perfect.png`

Pencarian verifikasi:
```bash
git grep -En "toi_scenery|xihua_standing" web-dashboard web-api
# Hasil: 0 kecocokan (exit code 1)
```
- Komponen `InkBackdrop.tsx` kini murni SVG prosedural 3 lapis pegunungan tinta warna datar tanpa filter blur atau linear gradient.
- Seluruh tampilan dialog kini menggunakan siluet wuxia proporsional (`Silhouette.tsx`).

---

## 6. Adegan Dialog Layar Penuh & Tata Letak Tombol (P4)

1. **Portaling ke Body**: `createPortal(content, document.body)` dengan `position: fixed; inset: 0; z-index: 2147483000; background: var(--npc-night, #0e0f12);` menutup seluruh header navigasi situs secara mutlak.
2. **Scroll Lock**: `document.body.style.overflow = 'hidden'` saat modal terbuka, dan dipulihkan kembali saat ditutup.
3. **Penyederhanaan Aksi**:
   - 4 Tombol Utama: `Bicara`, `Beri Hadiah`, `Adu Latih`, `Pamit`.
   - 1 Tombol Toggle `Lainnya` yang membuka menu sekunder: `Berdebat`, `Latihan Bersama`, `Minta Bantuan`, `Lihat Profil`, serta tombol `Kembali`.
   - Di mobile (`<640px`): Grid 2 kolom dengan tinggi tombol minimal 44px di atas kotak dialog.
   - Penataan vertikal `mb-8 sm:mb-9` menjamin tombol pilihan tidak menimpa nameplate "Xi Hua" / "Pendekar" di atas kotak teks dialog.
   - Siluet NPC di mobile dibatasi `max-h-[45vh]` dengan padding bawah sehingga bebas tumpang tindih.
4. **Token Warna**: Menggunakan `--npc-parchment` (`#d8d2c0`), border `--npc-parchment-edge`, dan teks tinta `--npc-ink`. Tidak ada tombol abu-abu `#cfcfcf`.

---

## 7. Hasil Layout Probe & Bukti Visual (P5)

Layout probe dijalankan menggunakan Playwright Chromium terhadap 4 kombinasi viewport dan halaman (`?view=dialogue` dan `?view=profile` pada `390x844` dan `1440x900`).

### Hasil Eksekusi (`review/v29_raw/layout_probe.json`)
```json
{
  "status": "PASS",
  "totalViolations": 0,
  "combinationsTested": 4,
  "results": [
    {
      "view": "dialogue",
      "viewport": "mobile",
      "dimensions": "390x844",
      "violations": [],
      "status": "PASS"
    },
    {
      "view": "dialogue",
      "viewport": "desktop",
      "dimensions": "1440x900",
      "violations": [],
      "status": "PASS"
    },
    {
      "view": "profile",
      "viewport": "mobile",
      "dimensions": "390x844",
      "violations": [],
      "status": "PASS"
    },
    {
      "view": "profile",
      "viewport": "desktop",
      "dimensions": "1440x900",
      "violations": [],
      "status": "PASS"
    }
  ]
}
```

### Berkas Tangkapan Layar Tersimpan di `review/v29_raw/`:
1. `dlg_mobile.png` (390x844 — Dialog VN Mobile)
2. `dlg_desktop.png` (1440x900 — Dialog VN Desktop)
3. `prof_mobile.png` (390x844 — Panel Profil 5 Pilar Mobile)
4. `prof_desktop.png` (1440x900 — Panel Profil 5 Pilar Desktop)

---

## 8. Lokalisasi Ranah & Format Label (P6)

1. Fungsi `formatRealm(realmIndex, stage)` pada `npcLabels.ts` memetakan seluruh ranah kultivasi (0..8+) ke istilah resmi Bahasa Indonesia:
   - 0: Fondasi Fana
   - 1: Pemurnian Qi
   - 2: Pembangunan Fondasi
   - 3: Inti Emas
   - 4: Jiwa Baru Lahir
   - 5: Pembentukan Jiwa
   - 6: Pemurnian Kekosongan
   - 7: Penyatuan Tubuh
   - 8: Kenaikan Agung
   - Tahap: early -> Tahap Awal, middle -> Tahap Tengah, late -> Tahap Akhir, peak -> Tahap Puncak.
   - Contoh: Index 4 + 'late' -> `"Jiwa Baru Lahir Tahap Akhir"`.
   - String berbahasa Inggris seperti `"Nascent Soul (VI) Akhir"` disanitasi secara otomatis.
2. `StatRow.tsx`:
   - Label menggunakan `white-space: normal` dan `min-width: 40%`.
   - Properti `truncate` dan `text-overflow: ellipsis` pada label dihapus seluruhnya.
   - Nilai atribut rata kanan (`text-right`) dengan angka tabular.
3. Hasil tes unit (`tests/unit/npcLabels.test.js`):
   ```text
    ✓ tests/unit/npcLabels.test.js (3 tests) 263ms
      ✓ 1. formatRealm is defined and exported as function
      ✓ 2. Setiap realmIndex 0..N (N dari region-ladder-v23.json) menghasilkan string murni tanpa kata terlarang
      ✓ 3. Translates "Nascent Soul (VI) Akhir" and English inputs properly into Indonesian
   ```

---

## 9. Hasil Master Gate Runner (`gateRunner.js` — P7)

Seluruh 6 tahap validasi dijalankan secara terotomasi dan sekuensial melalui `node scripts/v29/gateRunner.js`.

### Tabel Keluaran Resmi
| Step | Perintah | Status | Durasi | Kode Keluar |
|---|---|---|---|---|
| **1. npm test** | `npm.cmd test` (`syntaxCheckAll.js`) | **PASS** | 150.9s | 0 |
| **2. npx vitest run** | `npx.cmd vitest run` (51 file, 442 tes) | **PASS** | 102.7s | 0 |
| **3. auditNpcWorld** | `node scripts/v28/auditNpcWorld.js` | **PASS** | 14.1s | 0 |
| **4. layoutProbe** | `node scripts/v28/layoutProbe.js http://localhost:3100` | **PASS** | 47.5s | 0 |
| **5. web-dashboard build** | `npm.cmd --prefix web-dashboard run build` | **PASS** | 57.6s | 0 |
| **6. git status clean** | `git status -s` (cek file terlarang) | **PASS** | 0.4s | 0 |

**Hasil Keseluruhan**: **ALL GATES PASSED (100%)**  
Salinan data mentah lengkap tersimpan di `review/v29_raw/gate.json`.
