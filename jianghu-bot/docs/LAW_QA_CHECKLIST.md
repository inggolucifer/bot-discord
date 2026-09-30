# CHECKLIST QA PRODUCTION SISTEM 15 HUKUM SEMESTA (IMMORTAL-X)
> Dokumen Otoritatif Verifikasi Kualitas, Uji Smoke, dan Protokol Anti-Regresi

---

## 1. PROTOKOL UJI SMOKE & STATUS INTEGRASI

Dokumen ini berisi panduan pengujian manual maupun otomatis untuk memastikan seluruh rantai alur gameplay 15 Hukum Semesta (Law Cultivation) berjalan stabil di lingkungan production tanpa celah cheat atau regresi.

---

## A. PENGIKATAN FONDASI (LAW BINDING)

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| A-01 | **Bind Elemen dengan Catalyst Valid** | Masukkan `slot1ManualItemId` (Kitab Elemen) dan `slot2CompanionItemId` (Catalyst yang sesuai tag).<br>• *Hasil*: Sukses 200, manual dan catalyst berkurang dari tas via `splice`, tercatat di `TransactionLog` tipe `law_bind`. | [ ] PASS |
| A-02 | **Tolak Item Law di Slot 2** | Coba bind dengan item berkategori `law` pada `slot2CompanionItemId`.<br>• *Hasil*: Error 400 *"Item Kitab Hukum (Law) tidak dapat dijadikan tumbal untuk Slot 2."* | [ ] PASS |
| A-03 | **Tolak Natal Non-Common** | Coba bind `natal_artifact` atau `natal_beast` menggunakan item berkualitas Uncommon / Rare / Epic.<br>• *Hasil*: Error 400 *"hanya dapat diikat dari wadah/bibit fana berkategori Common!"* | [ ] PASS |
| A-04 | **Pewarisan Atribut Natal Artifact** | Bind `natal_artifact` dengan senjata fana (misal: *Pedang Besi Patah*).<br>• *Hasil*: Inisialisasi `boundEntity` mewarisi `artifactAtk: 15, artifactCrit: 5, artifactDef: 8, artifactRes: 4`. | [ ] PASS |
| A-05 | **Inisialisasi Embrio Natal Beast** | Bind `natal_beast` dengan item bertag `beast_egg` (misal: *Telur Satwa Roh Purba*).<br>• *Hasil*: `boundEntity.evolutionStage = 'Telur Purba'`, `isEgg = true`, `hatchedAt = null`. | [ ] PASS |
| A-06 | **Tolak Bind Kedua Kali (Permanen)** | Coba panggil `/law/bind` pada pemain yang sudah memiliki `activeLawType`.<br>• *Hasil*: Error 400 *"Kamu sudah mematri Hukum Semesta ke dalam fondasi fana. Pilihan ini bersifat PERMANEN."* | [ ] PASS |
| A-07 | **Tolak Pemain Non-Mortal** | Karakter dengan `realmIndex >= 1` (Qi Refining ke atas) memanggil `/law/bind`.<br>• *Hasil*: Error 400 *"Dantianmu telah terikat ranah Qi. Hanya tubuh fana yang murni yang dapat menerima Hukum Semesta."* | [ ] PASS |
| A-08 | **Jalur Kultivator Biasa (Ordinary Path)** | Pemain memilih jalur biasa (`isNormalCultivator: true`).<br>• *Hasil*: Terkunci dari pengikatan Law, menerima penyesuaian stat dasar, alur non-law tetap berjalan normal. | [ ] PASS |

---

## B. MEDITASI & CHANNELING

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| B-01 | **Start Tanpa Law** | Pemain tanpa Law memanggil `/law/channel/start`.<br>• *Hasil*: Error 400 *"Belum memilih Hukum Semesta (Law)."* | [ ] PASS |
| B-02 | **Gate Kondisi (Death / Battle / Dungeon)** | Coba mulai channeling saat HP = 0, sedang dalam pertempuran aktif, atau status dungeon `exploring`.<br>• *Hasil*: Ditolak dengan pesan error kondisi terkait. | [ ] PASS |
| B-03 | **Anti-Spam Cooldown (<5 Detik)** | Panggil `start` lalu `stop` berturut-turut dalam kurun waktu kurang dari 5 detik.<br>• *Hasil*: HTTP 429 *"Tunggu beberapa detik sebelum mengubah status meditasi lagi."* | [ ] PASS |
| B-04 | **Pelepasan Lock yang Bersih** | Hentikan channeling (`stop`), tunggu cooldown 5 detik selesai, lalu panggil `start` kembali.<br>• *Hasil*: Lock berhasil dilepas di blok `finally`, channeling baru dapat dimulai lancar. | [ ] PASS |
| B-05 | **Reset Daily Cap Mengikuti Waktu Jakarta (WIB)** | Uji batas menit harian menggunakan helper `getJakartaDateString()`.<br>• *Hasil*: Batas menit reset tepat pada pukul 00:00 WIB (UTC+7) terlepas dari zona waktu server hosting. | [ ] PASS |
| B-06 | **Inhalasi Esensi Outdoor Body Tempering** | Jalur `body_tempering` channeling di luar pemukiman selama $15 \times 2^{\text{rank}}$ menit.<br>• *Hasil*: Menghasilkan +1 esensi dominan wilayah ke dalam `bodyEssenceStorage`. | [ ] PASS |

---

## C. TEROBOSAN RANAH & PIL (BREAKTHROUGH)

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| C-01 | **Tolak Pil Tier Mismatch di Slot** | Pasang pil Tier 2 untuk target Rank 1 melalui `/law/breakthrough/set-pill`.<br>• *Hasil*: Error 400 *"tidak cocok dengan target Rank 1! Pil penerobosan wajib bertier persis 1 (±0)."* | [ ] PASS |
| C-02 | **Pemasangan Pil Tier Cocok** | Pasang *Pil Pembersih Sumsum Fana* (Tier 1) untuk Rank 0 $\to$ 1.<br>• *Hasil*: Sukses 200, `GET /law/status` menampilkan `breakthroughPillSlot` terisi dan `majorBreakthroughSuccessRate` naik ke 95%. | [ ] PASS |
| C-03 | **Major Breakthrough Tanpa Pil (Risiko Deviasi)** | Lakukan major breakthrough tanpa pil saat Qi penuh. Simulasikan kegagalan roll RNG.<br>• *Hasil*: Peluang dasar 30–40%, kegagalan menyebabkan kehilangan 50% Qi (`Math.floor(maxQi * 0.50)`). | [ ] PASS |
| C-04 | **Major Breakthrough Dengan Pil (Proteksi Penuh)** | Lakukan major breakthrough dengan pil terpasang. Simulasikan kegagalan roll RNG.<br>• *Hasil*: Peluang 85–95%, kegagalan menyerap deviasi batin sehingga **0% Qi hilang** (Qi tetap utuh). | [ ] PASS |
| C-05 | **Konsumsi Pil Saat Ritual Terobos** | Jalankan major breakthrough dengan pil.<br>• *Hasil*: Item pil terpotong 1 pcs dari tas inventori dan `breakthroughPillSlot` dikosongkan. | [ ] PASS |
| C-06 | **Gate 9 Bagian Tubuh Body Tempering** | Karakter `body_tempering` mencoba terobos ke Rank R dengan salah satu bagian tubuh $< R \times 2$.<br>• *Hasil*: Error 400 merinci daftar bagian tubuh yang belum tuntas beserta level saat ini vs syarat. | [ ] PASS |
| C-07 | **Evolusi Satwa Roh & Stat Artefak Otomatis** | Major breakthrough berhasil pada `natal_beast` / `natal_artifact`.<br>• *Hasil*: Satwa menetas (`Anak Satwa Roh` di Rank 1, `Dewasa` di Rank 3, `Siluman` di Rank 5, `Avatar` di Rank 7); stat ATK/DEF bertambah deterministik. | [ ] PASS |

---

## D. SISTEM MASTER GU (§3.2)

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| D-01 | **Batas Maksimal Slot per Rank** | Coba pasang Gu kedua pada karakter Rank 0 (`getGuMaxSlots(0) === 1`).<br>• *Hasil*: Ditolak error kapasitas slot Gu penuh sesuai rank saat ini. | [ ] PASS |
| D-02 | **Pelepasan Gu Bersih dengan Pil Penenang** | Lepas Gu dengan memiliki *Pil Penenang Gu* (`sedative_pill`).<br>• *Hasil*: Gu kembali ke inventori, 1x pil penenang terkonsumsi, tanpa efek samping. | [ ] PASS |
| D-03 | **Pelepasan Paksa Gu Tanpa Pil (Backlash)** | Lepas Gu tanpa memiliki pil penenang di tas.<br>• *Hasil*: Gu terlepas namun memicu *Gu Backlash*: HP $-20\%$ Max (clamped min 1), Vitality $-20\%$ selama 2 jam (`guBacklashUntil`). | [ ] PASS |
| D-04 | **Formula Fusi Gu Exact Rate** | Fusi Gu prioritas Tier $P$ dengan tumbal Tier sama menggunakan Crucible Tier $C$.<br>• *Hasil*: Rate dihitung $\max(10\%, \min(95\%, 85\% - (P \times 18\%) + (C \times 6\%)))$. Tumbal terhapus; jika sukses Tier prioritas $+1$, satiety penuh. | [ ] PASS |
| D-05 | **Pemberian Pakan Gu & Tier Affinity** | Beri makan Gu dengan item pakan.<br>• *Hasil*: Satiety pulih, item pakan berkurang, mematuhi batasan tier affinity jika pakan bertier. | [ ] PASS |

---

## E. DEMONIC DAO & DUNIA SPASIAL

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| E-01 | **Turbid Core Over-Tier Rejected** | Praktisi `demonic_turbid_core` Rank 0 mencoba menyerap Inti Siluman Tier 3.<br>• *Hasil*: Ditolak error 400 *"Item di atas ranahmu. Dantian menolak menyerap."* | [ ] PASS |
| E-02 | **Penetralan Racun & HP Floor 1** | Praktisi `demonic_myriad_venom` meminum racun atau terkena DoT racun pertempuran.<br>• *Hasil*: Kerusakan racun dikurangi toleransi bisa; efek racun internal **tidak pernah membunuh pemain (clamped min 1 HP)**. | [ ] PASS |
| E-03 | **Tolak Upeti Altar Beda Koordinat** | Panggil `/demonic/pact-tribute` saat koordinat pemain `(tileX, tileY)` berbeda dari lokasi Altar Kurban Abyss.<br>• *Hasil*: Error 400 *"Kamu harus berdiri di atas Altar Kurban Abyss milikmu untuk menyembah!"* | [ ] PASS |
| E-04 | **Sukses Upeti di Atas Altar** | Berdiri tepat di atas petak altar dan setor upeti.<br>• *Hasil*: `abyssalTributeDueAt` diperpanjang 7 hari, `abyssalCurseLevel = 0`, kutukan dinetralkan. | [ ] PASS |
| E-05 | **Penerapan Kutukan Abyss Overdue** | Simulasi waktu melewati batas tenggat upeti.<br>• *Hasil*: Terlambat 0–7 hari memicu Kutukan Tingkat 1 ($-30\%$ HP/ATK/DEF/SPD); terlambat $>7$ hari memicu Tingkat 2 ($-60\%$ stats). | [ ] PASS |
| E-06 | **Timer Aman Wilayah Gelap Nether** | Praktisi `demonic_nether_darkness` menjelajah di luar zona Nether (`southern_demon_domain`, `ancient_tomb`, dll).<br>• *Hasil*: Timer aman berkurang; jika habis memicu `hasNetherDebuff = true` ($-50\%$ stats tempur). Masuk kembali ke zona Nether langsung menetralkan debuff. | [ ] PASS |
| E-07 | **Inhalasi Esensi Raga Saat Melangkah Spasial** | Praktisi `body_tempering` melangkah di grid peta dunia.<br>• *Hasil*: Setiap langkah sukses memiliki peluang 20% memanen esensi alam sesuai cuaca dan wilayah lokal. | [ ] PASS |

---

## F. ISOLASI COMBAT QI & SISTEM TEMPUR

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| F-01 | **Inisialisasi Combat Qi di Sesi Tempur** | Memulai duel pertempuran.<br>• *Hasil*: `session.player.maxQi` dan `qi` dihitung sesuai formula:<br>$\text{MaxCombatQi} = 50 + (\text{RealmIndex} \times 25) + \lfloor\text{Stat\_Energy} \times 0.5\rfloor + \lfloor\text{Stat\_Focus} \times 0.3\rfloor$. | [ ] PASS |
| F-02 | **Isolasi Mutlak: Skill Tidak Mengurangi Xiuwei** | Cast skill berbiaya Qi pada sesi pertempuran.<br>• *Hasil*: `session.player.qi` (Combat Qi) berkurang sesuai cost. `player.cultivationLaw.qi` (Cultivation Qi) **TIDAK PERNAH BERKURANG**. | [ ] PASS |
| F-03 | **Tolak Cast Skill Jika Combat Qi Kurang** | Combat Qi tersisa lebih kecil daripada biaya skill.<br>• *Hasil*: Jurus ditolak dan pemain dipaksa menggunakan Basic Attack untuk memulihkan Combat Qi. | [ ] PASS |
| F-04 | **Pemulihan Qi Serangan Dasar (Basic Attack)** | Eksekusi serangan dasar di arena tempur.<br>• *Hasil*: Memberikan pemulihan $+5$ Combat Qi pada sesi pertempuran. | [ ] PASS |
| F-05 | **Regenerasi Qi per Ronde Pertempuran** | Setiap pergantian ronde pertempuran selesai.<br>• *Hasil*: Memulihkan Combat Qi sebesar $\text{Regen} = 5 + (\text{RealmIndex} \times 2) + \lfloor\text{Stat\_Vitality} \times 0.05\rfloor$. | [ ] PASS |

---

## 2. CARA MENJALANKAN SMOKE TEST CEPAT

Jalankan perintah pengujian konsistensi dan sintaks di terminal:

```bash
# 1. Verifikasi sintaks dan require module
node --check jianghu-bot/web-api/routes/lawCultivation.js
node --check jianghu-bot/utils/lawCultivationEngine.js
node --check jianghu-bot/utils/playerCombat.js
node --check jianghu-bot/services/movementService.js

# 2. Verifikasi ketiadaan conflict markers
git grep -n "^<<<<<<<"
git grep -n "^======="
git grep -n "^>>>>>>>"

# 3. Jalankan seeding item penting Law
node jianghu-bot/scripts/seedLawHardeningItems.js
```
