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

## G. BALANCE PASS & ANTI-EXPLOIT VERIFICATIONS

| ID | Skenario Uji | Prosedur & Ekspektasi | Status |
|---|---|---|---|
| G-01 | **Body Tempering vs Earth Scaling** | Bandingkan Rank 5 Body Tempering dengan Rank 5 Earth pada tingkat investasi setara.<br>• *Hasil*: HP/DEF Body Tempering tidak melebihi ~1.25× Earth, dengan trade-off ATK lebih rendah (~0.75× baseline). | [ ] PASS |
| G-02 | **Blood Soul vs Thunder Baseline** | Evaluasi Rank 5 Blood Soul tanpa farm banner ekstrem vs Rank 5 Godthunder Light.<br>• *Hasil*: ATK Blood Soul tidak melebihi ~1.2× Thunder baseline (capped via `DEMONIC_RANK_ATK_MULT: 0.03` & `CORRUPTION_ATK_PERCENT_CAP: 0.06`). | [ ] PASS |
| G-03 | **Gu Combat Top 3 Active Restriction** | Pemain Gu Master memiliki 5 slot Gu ter-equip di aperture.<br>• *Hasil*: Hanya 3 Gu terkuat (`GU_COMBAT_MAX_ACTIVE_SLOTS = 3`) yang berkontribusi stat bonus ke medan tempur, dengan scaling `GU_ATK_SCALE_PER_TIER = 0.85`. | [ ] PASS |
| G-04 | **PathMod Channel Rate Penalty** | Bandingkan laju meditasi per menit antara Blood Soul (`pathMod: 1.45`) dan Earth (`pathMod: 1.05`) pada rank yang sama.<br>• *Hasil*: Channel rate Blood Soul lebih lambat (`Math.floor(baseRate / pathMod)`) sebagai harga atas daya serang dan kesulitan tribulasi. | [ ] PASS |
| G-05 | **Batas Harian Penyerapan Inti Siluman (Turbid Max)** | Lakukan penyerapan inti siluman kotor sebanyak 20 kali dalam satu hari.<br>• *Hasil*: Percobaan ke-21 ditolak HTTP 429 *"Dantianmu telah jenuh menyerap inti siluman kotor hari ini (Maksimal 20/hari)..."*, reset pada pukul 00:00 WIB. | [ ] PASS |
| G-06 | **Sanksi Tekanan Infamy & Status Buronan** | Tingkatkan infamy hingga $\ge 100$ melalui aksi demonic (blood/soul/venom).<br>• *Hasil*: Status `player.isWantedByOrthodox = true` aktif, dan di medan tempur menderita penalti stat ATK/DEF ($-2\%$ per 25 poin di atas 50, cap $-12\%$). | [ ] PASS |
| G-07 | **Probabilitas Inhalasi Spontan Raga 12%** | Uji pemanggilan `harvestEnvironmentalEssence` saat melangkah.<br>• *Hasil*: Roll ambang batas menggunakan `LAW_BALANCE.BODY_MOVE_HARVEST_CHANCE` (0.12), mencegah eksploitasi akumulasi esensi pasif berlebihan. | [ ] PASS |
| G-08 | **Gu Fusion Qi Flat Standard** | Sukseskan ritual fusi Gu di kendi penyuling.<br>• *Hasil*: Memberikan bonus $+100$ Qi Dantian (`LAW_BALANCE.GU_FUSION_SUCCESS_FLAT_QI`), mencegah lonjakan Qi eksploitatif. | [ ] PASS |

---

## P. PROGRESSION 7-HARI RANK 0, TOTAL 2–3 TAHUN & ESSENCE GATE

| ID | Skenario | Ekspektasi | Status |
|---|---|---|---|
| P-01 | **Rank 0 Onboarding 7 Hari** | Pemain baru melakukan channeling rajin dengan stok esensi cukup (70 mnt/hari).<br>• *Hasil*: Menyelesaikan Rank 0 (Stage 0..9) dalam **±7.0 hari** (total 13.715 Qi). Mini-breakthrough Stage 0 tercapai pada Hari ke-1 (~30 menit). | [ ] PASS |
| P-02 | **Total Waktu Rank 0..8 (~2.5–3.5 Tahun)** | Evaluasi waktu kumulatif channel efektif dari Rank 0 hingga Rank 8.<br>• *Hasil*: Jumlah hari efektif berada di rentang [850, 1100] hari (kalibrasi tepat **934.99 hari / 30.7 bulan kalender murni**). | [ ] PASS |
| P-03 | **Channel saat currentEssence = 0 (Mutlak 0 Qi)** | Meditasi dengan bar esensi kosong (`currentEssence <= 0`).<br>• *Hasil*: `qiGained = 0`, `isEssenceDepleted = true`, **TIDAK ADA drip Qi 15%**. Meditasi terhenti hingga esensi diserap. | [ ] PASS |
| P-04 | **Isi bar sesuai law tags lalu channel** | Serap item sesuai profil Law lalu lakukan channeling meditasi.<br>• *Hasil*: `currentEssence` bertambah saat absorb; saat channel, `cultivationLaw.qi` bertambah dan `currentEssence` berkurang sesuai digest rate. | [ ] PASS |
| P-05 | **Item law salah tag** | Serap item bahan spiritual yang tidak cocok dengan tag Law aktif.<br>• *Hasil*: Ditolak HTTP 400 *"Item [...] tidak memiliki intisari yang cocok..."*. | [ ] PASS |
| P-06 | **Over-tier item** | Serap item dengan Tier > Ranah pemain (misal Tier 3 pada Rank 0).<br>• *Hasil*: Ditolak HTTP 400 sesuai `getTierAffinity(playerTier, itemTier).allowed === false`. | [ ] PASS |
| P-07 | **Daily demonic cap** | Melebihi batas konsumsi harian demonic (turbid, blood, venom, dll).<br>• *Hasil*: Ditolak HTTP 429, reset otomatis pada pukul 00:00 WIB. | [ ] PASS |
| P-08 | **Estimasi script assertions** | Jalankan `node jianghu-bot/scripts/estimate_law_days.js`.<br>• *Hasil*: Script memvalidasi `assert(rank0Days >= 6 && rank0Days <= 8)` dan `assert(sumDays >= 850 && sumDays <= 1100)` dengan status **LULUS**. | [ ] PASS |
| P-09 | **Combat Qi Isolation** | Mengeluarkan jurus sakti di arena pertarungan.<br>• *Hasil*: `session.player.qi` (Combat Qi) berkurang, sedangkan `cultivationLaw.qi` (Xiuwei) **TIDAK PERNAH BERKURANG**. | [ ] PASS |
| P-10 | **Bootstrap 40 Esensi di Awal** | Login/Status karakter baru Rank 0 dengan Qi 0 dan Essence 0.<br>• *Hasil*: Diberikan bootstrap 40 Esensi (`BOOTSTRAP_ESSENCE: 40`) dan flag `essenceBootstrapDone = true`. Pemain endgame yang mengosongkan bar tidak akan di-refill. | [ ] PASS |
| P-11 | **Soft Addiction Hooks & ProgressionFeel Payload** | Request `GET /law/status`.<br>• *Hasil*: Mengembalikan payload `progressionFeel: { rankTargetDays: 7, stageProgressPct, etaMinutesThisStage, etaDaysThisStage, etaDaysThisRank, essenceMinutesLeft, dailyCapMinutes, nextDopamine, hintText }` serta `essence.etaDaysToNextStage`. | [ ] PASS |
| P-12 | **Daily Epiphany Balance (+5% Qi & +10 Essence)** | Klaim pencerahan harian via `claimDailyEpiphany`.<br>• *Hasil*: Memberikan $+5\%$ Qi dari maxQi stage saat ini (bukan 10%), $+10$ Esensi, $+25\sim40$ Tembaga, dan tercatat di `lastEpiphanyClaimAt`. | [ ] PASS |

---

## H. HARDENING LAW SYSTEM: GERBANG STAGE 10, BUGFIX TURBID, ESSENCE-FIRST QI & POLISH

| ID | Skenario | Ekspektasi | Status |
|---|---|---|---|
| H-01 | **Bind di Mortal Stage 5** | Karakter Mortal Tahap 5 mencoba mematri Hukum Semesta via `POST /law/bind`.<br>• *Hasil*: Ditolak HTTP 400 *"Gerbang Hukum Semesta baru terbuka pada Fondasi Fana Tahap 10. Sempurnakan dulu tubuh fana-mu."*. | [ ] PASS |
| H-02 | **Bind di Mortal Stage 10** | Karakter Mortal Tahap 10 mematri Hukum Semesta via `POST /law/bind`.<br>• *Hasil*: Sukses (HTTP 200), terdaftar `activeLawType`, dan langsung di-bootstrap dengan 40 Esensi (`BOOTSTRAP_ESSENCE: 40`), `essenceBootstrapDone = true`, `maxEssence = 100`, `qi = 0`. | [ ] PASS |
| H-03 | **Channel Tanpa Law** | Karakter Mortal tanpa Law aktif mencoba `POST /law/channel/start`.<br>• *Hasil*: Ditolak HTTP 400 *"Kamu belum memilih dan mematri Hukum Semesta..."*. | [ ] PASS |
| H-04 | **Mortal systemCultivation Tanpa Essence** | Karakter Mortal bermeditasi jalur fana biasa (`systemCultivation`).<br>• *Hasil*: Tetap berjalan normal tanpa memerlukan `currentEssence` Law (Fondasi Fana tidak memakai bar esensi Law). | [ ] PASS |
| H-05 | **Turbid Item Tier 3** | Praktisi Turbid Core melahap inti monster Tier 3.<br>• *Hasil*: Penambahan esensi dihitung menggunakan `itemTier = 3` dan efisiensi tier affinity (bukan terselubung variable shadow menjadi Tier 1). `resolveItemTier()` konsisten di semua absorb routes. | [ ] PASS |
| H-06 | **Absorb Spam & Essence-First** | Pemain melakukan spam konsumsi item esensi berkali-kali.<br>• *Hasil*: `currentEssence` bertambah hingga batas maksimal, namun Qi kultivasi (`cultivationLaw.qi`) **TIDAK MELONJAK** dari instant Qi (`INSTANT_QI_ON_ABSORB: 0`). Kemajuan Qi murni melalui channel + digest bar. | [ ] PASS |
| H-07 | **Essence 0 Channel Mutlak 0 Qi** | Memulai atau menyinkronkan channeling saat `currentEssence = 0`.<br>• *Hasil*: `qiGained = 0`, dantian tidak menghasilkan Qi kultivasi sama sekali hingga esensi diisi ulang. | [ ] PASS |
| H-08 | **Formula Hari Rank 0 Tetap ~7 Hari** | Verifikasi kurva progresi Rank 0 via `estimate_law_days.js`.<br>• *Hasil*: Progresi Rank 0 tetap terkalibrasi pada **±7 hari** (target ~7 hari), dan total Rank 0..8 tetap **~2.56 tahun** (935 hari channeling efektif). | [ ] PASS |

---

## 2. CARA MENJALANKAN SMOKE TEST CEPAT

Jalankan perintah pengujian konsistensi dan sintaks di terminal:

```bash
# 1. Verifikasi sintaks dan require module
node --check jianghu-bot/web-api/routes/lawCultivation.js
node --check jianghu-bot/utils/lawCultivationEngine.js
node --check jianghu-bot/models/Player.js
node --check jianghu-bot/utils/playerCombat.js
node --check jianghu-bot/services/movementService.js

# 2. Verifikasi ketiadaan conflict markers
git grep -n "^<<<<<<<"
git grep -n "^======="
git grep -n "^>>>>>>>"

# 3. Jalankan estimasi progresi 7 hari Rank 0 + 2.5 tahun Rank 0..8
node jianghu-bot/scripts/estimate_law_days.js

# 4. Jalankan seeding item penting Law
node jianghu-bot/scripts/seedLawHardeningItems.js
```
