# JIANGHU BOT & IMMORTAL-X: MASTER AI ARCHITECTURE GUIDE (AGENTS.md)

Selamat datang di repositori **Jianghu Bot (Immortal-X)**. Dokumen ini adalah instruksi otoritatif tertinggi untuk setiap agen AI (Antigravity, Gemini, Copilot, dsb.) yang bekerja pada basis kode ini. **Baca dan pahami dokumen ini secara menyeluruh sebelum melakukan modifikasi apa pun.**

---

## 1. Identitas & Visi Proyek

**Jianghu Bot (Immortal-X)** adalah game Wuxia/Xianxia MMORPG hibrida terdistribusi yang menggabungkan:
1. **Bot Discord Terkelola** (Interaksi teks, slash command, notifikasi event real-time).
2. **Web Dashboard Modern** (Peta dunia Tale of Immortal 5000x5000, mikro-grid eksplorasi spasial, minigame profesi interaktif, sistem pertarungan turn-based, visualisasi inventori dan kultivasi).

Filosofi Desain:
- **Server Authoritative**: Semua kalkulasi spasial, konsumsi stamina, peluang ambush, transaksi ekonomi, dan perolehan barang dihitung secara deterministik dan terlindungi di server backend.
- **Rich Aesthetics**: Menggunakan antarmuka gelap premium (Dark Ink Wuxia style), aksen emas/amber (`#c5a880`), gradien sutra, dan glassmorphism.
- **Aset 1-to-1 Sinkron**: Semua nama item, monster, NPC, dan fasilitas yang membutuhkan gambar memiliki slot terdaftar di `web-dashboard/src/config/globalAssets.ts` dengan fallback visual/emoji elegan.

---

## 2. Struktur Repositori & Tech Stack

```
d:\gitub\bot-discord\
├── AGENTS.md                                # Dokumen ini (Panduan Utama AI)
├── MongoDB\                                 # Direktori data lokal database MongoDB
└── jianghu-bot\
    ├── commands\                            # Discord Slash Commands (/profil, /status, dll)
    ├── config\                              # Konfigurasi zona, iklim, stamina, travel
    │   └── zones\                           # Konfigurasi zona mikro & peta makro
    ├── models\                              # Mongoose Database Models (Schema)
    │   ├── Player.js                        # Data karakter, posisi grid, equipment, stats
    │   ├── Item.js                          # Katalog item, rank, category, stats, mounts
    │   ├── Monster.js                       # Data monster ambush & bestiary
    │   ├── Sect.js                          # Data sekte, balai, ujian masuk, fasilitas
    │   ├── Location.js                      # Pemukiman, bangunan, dermaga, fasilitas
    │   ├── DungeonInstance.js               # Sesi labirin gua kuno aktif
    │   └── PropertyStructure.js             # Struktur interior bangunan aset mandiri
    ├── scripts\                             # Skrip seeder, migrasi, dan patch database
    │   └── seedJianghuMasterEcosystem.js    # Master Seeder Bersih dari 0
    ├── services\                            # Service lapisan bisnis (movement, grid, dll)
    │   └── movementService.js               # Engine pergerakan mikro-grid spasial
    ├── utils\                               # Modul authoritative math & helper
    │   ├── explorationMath.js               # Stamina, mount discount, ambush rate, speed
    │   ├── thermodynamicsEngine.js          # Suhu grid, toleransi ranah, hipotermia
    │   ├── propertyManager.js               # Kompresi RLE denah interior & furnitur
    │   ├── binaryProtocol.js                # Protokol biner 12-byte packed stream
    │   ├── playerCombat.js                  # Agregasi stat tempur (HP, ATK, DEF, SPD)
    │   ├── dungeonMazeGenerator.js          # Generator labirin prosedural DFS 8x8, 20x20, 40x40
    │   └── stamina.js                       # Regenerasi & limitasi stamina
    ├── web-api\                             # Backend Express.js REST API & Socket.io
    │   ├── middlewares\                     # Auth token JWT middleware
    │   ├── routes\                          # Endpoint API (/equipment, /world, /sectExam, /dungeon, /ferry)
    │   └── server.js                        # Server entrypoint Express & Socket.io
    └── web-dashboard\                       # Frontend Web Dashboard (Next.js 15 App Router)
        ├── src\
        │   ├── app\                         # Next.js Pages ((dashboard)/profile, world, etc)
        │   ├── components\
        │   │   ├── dungeon\                 # DungeonMazeExplorer (Grid gua & fog of war)
        │   │   ├── ferry\                   # FerryCrossingModal (Penyeberangan air)
        │   │   ├── sect\                    # SectEntranceExamModal (Turnamen masuk sekte)
        │   │   ├── minigames\               # 6 Minigame Profesi (Tempa, Alkimia, Mancing, dll)
        │   │   └── map\                     # TaleOfImmortalCanvas, Grid view, Settlement
        │   ├── config\
        │   │   └── globalAssets.ts          # Sentralisasi URL aset gambar & emoji fallback
        │   └── types\
        │       └── game.ts                  # Kontrak TypeScript terpadu (ItemData, EquipmentSlots)
```

---

## 3. Aturan Inti & Formula Authoritative

### 3.1. Sistem Mount & Efisiensi Stamina
- **Slot Equipment**: `equipment.mount` (menyimpan referensi ke item kategori `'mount'`).
- **Sinkronisasi**: Saat pemain memasang item kategori `'mount'` di `/api/equipment/equip`, server menyinkronkan `player.equippedMount = item.mountType || item.name`.
- **Pengurangan Stamina Langkah**:
  $$C_{\text{final}} = \max\left(0.2, C_{\text{base}} - R_{\text{mount}}\right)$$
  - Di mana $R_{\text{mount}}$ adalah nilai `staminaReduction` dari mount (misal 0.5 s/d 2.5 stamina per petak).
  - Batas minimum $0.2$ stamina per petak menjaga keadilan ekonomi dan mencegah cheat pergerakan tak terbatas.
- **Sifat Khusus**:
  - `flying_sword`: Dapat melintasi tebing terjal/pegunungan batu tanpa terhalang.
  - `ship` / `wooden_boat`: Dapat melintasi air lautan/sungai lebar tanpa halangan.

### 3.2. Labirin Gua Kuno Prosedural ($8\times8$, $20\times20$, $40\times40$)
- Menggunakan algoritma **Recursive Backtracker (DFS)** untuk membuat jalur lorong yang selalu memiliki solusi (*solvable*).
- **Skala Ukuran**:
  - **Rank 1 (Mortal)**: $8 \times 8$, 1-2 jebakan ringan (-10 HP), 1 peti harta (Perak & bijih besi), monster pemula.
  - **Rank 2 (Spiritual)**: $20 \times 20$, 4-6 jebakan duri/miasma (-25 HP / -5 Stamina), 2-3 peti harta (Batu roh rendah & herba), monster buas.
  - **Rank 3 (Immortal)**: $40 \times 40$, labirin kompleks bercabang, gas beracun, sarang bos kuno, artefak peninggalan.
- **Fog of War**: Petak di luar radius pandang pemain (2-3 tile) tertutup kabut hitam sampai dilalui.

### 3.3. Ujian Masuk Sekte & Turnamen Sparring
- Ujian sekte tidak dibuka setiap saat; memiliki jadwal/event berkala atau tiket kualifikasi (`Plakat Ujian Sekte` atau `Surat Rekomendasi Tetua`).
- Tahapan Seleksi (3 Babak):
  1. **Uji Kuda-Kuda**: Validasi ketahanan fisik (Minigame Kata QTE atau syarat status STA).
  2. **Uji Sirkulasi Qi**: Validasi kapasitas spiritual (Acupoint Pulse atau index Realm).
  3. **Duel Turnamen**: Pertarungan turn-based melawan calon murid pendaftar penantang.

### 3.4. Dermaga & Moda Penyeberangan Air
- **Rakit Bambu (Ekonomis)**: Tiket murah (20 Perak), perjalanan nyata dengan countdown 30 detik diiringi animasi ombak air dan kesempatan memancing di atas rakit.
- **Kapal Cepat / Pedang Terbang (Mewah)**: Tiket premium (150 Perak / 1 Giok), tiba seketika (*instant arrival*) di dermaga tujuan.

### 3.5. Sistem Gulungan Law & Pengikatan Fondasi Fana (Mortal Only Law Binding)
- **Aturan Ranah Mutlak**: Gulungan Hukum Alam (`category: 'law'`) **HANYA DAPAT DIGUNAKAN KETIKA PEMAIN MASIH DI RANAH MORTAL (`realmIndex === 0`)**.
- **Prinsip Lore**: Tubuh fana yang masih murni adalah satu-satunya wadah yang dapat mematri intisari Dao dasar. Begitu menembus ranah Qi Refining (`realmIndex >= 1`), dantian telah terikat dan menolak penyerapan hukum fondasi baru.
- **Batasan Jumlah**: Setiap kultivator hanya dapat mengikat **1 Hukum Alam Utama seumur hidup** (`player.laws.length === 1`). Hukum ini menentukan elemen spiritual dan bonus multiplikator stat fundamental.

### 3.6. Sistem Manual Teknik & Syarat Kemahiran (Mastery & Realm Prerequisites)
- Kitab jurus teknik (`category: 'manual'`) memiliki sistem validasi persyaratan (*prerequisites*) sebelum dapat dipelajari di `/api/inventory/use-manual`:
  1. **Syarat Ranah Kultivasi (`minRealmIndex`)**: Kapasitas dantian pemain harus mencapai level ranah minimal (misal: *Kitab Pedang Angin Puyuh* butuh ranah Qi Refining / Index 1).
  2. **Syarat Kemahiran Senjata / Profesi (`requiredSkillType` & `requiredSkillPoints`)**: Pemain wajib melatih kemahiran senjata terkait (contoh: Kemahiran Pedang / `kungfuSkills.sword >= 30`, atau Kemahiran Pukulan / `kungfuSkills.fist >= 15`).
  3. **Syarat Afiliasi Sekte (`requiredSectId`)**: Manual esoteris sekte hanya dapat dipelajari oleh murid sah sekte tersebut dengan pangkat yang mencukupi.
  4. **Progres Pemahaman**: Dimulai dari Level 0 dan ditingkatkan bertahap melalui meditasi pemahaman waktu nyata (*timeToComprehendHours*).

### 3.7. Monster Spasial Grid & Sistem Pertarungan Turn-Based Interaktif (Battle Arena V2)
- **Penempatan Spasial**: Monster ditempatkan secara eksplisit pada petak koordinat tertentu (`ZoneTile.spawnedMonster`), contoh petak uji coba **(2452, 2481)** untuk *Serigala Roh Darah* (`wolf_azure`).
- **Zero Clutter Policy**: Petak kosong tanpa monster **DILARANG** menampilkan icon monster `👹`. Hanya petak dengan monster aktif yang merender aura crimson merah dan icon siluman.
- **Pemicu & Isolasi Modal Penuh**: Klik tombol `[⚔️ Tantang]` memicu `/api/battle/start` (targetType `'monster'`), membuka modal `BattleArena` berisolasi penuh (`fixed inset-0 z-[99999] w-screen h-screen bg-[#070a14]`) yang menutupi seluruh widget HUD/drawer di latar belakang tanpa tumpang tindih.
- **Antarmuka Gaya Pokemon / RPG Maker (Fight & Run)**:
  - **Mode COMMAND (Pilihan Utama)**: Menampilkan 2 tombol besar bergaya wuxia: `[⚔️ BERTARUNG (FIGHT)]` dan `[🏃 KABUR (RUN)]`.
  - **Mode SKILLS (Pilihan Jurus)**: Terbuka saat `BERTARUNG` diklik, merender bar jurus dalam grid responsif yang terisolasi rapi di dalam container tanpa tembus ke samping layar, dilengkapi tombol `[← Kembali ke Menu Aksi]`.
- **Dukungan Pertarungan 1-8 Musuh & Tim Sekutu (Allies)**:
  - Menampung hingga 8 musuh: maksimal 4 musuh aktif di medan tempur (`session.enemies`), sisanya mengintai di antrian cadangan (`session.enemyQueue`).
  - Ketika salah satu musuh aktif gugur, musuh terdepan di antrian langsung dipromosikan melangkah maju ke medan tempur.
  - Pemain dapat membawa hingga 3 sekutu pendamping (Pet / NPC) yang secara otomatis melancarkan serangan bantuan setiap putaran.
- **Immediate Round-Trip Turn Architecture (Anti-Lag & Anti-Cheat)**:
  - Eksekusi aksi `/api/battle/action/:battleId` menyelesaikan ronde penuh dalam 1 request HTTP (<100ms): Serangan Pemain $\to$ Bantuan Sekutu $\to$ Promosi Antrian Musuh $\to$ Balasan AI Musuh $\to$ DoT Status Tick $\to$ Regenerasi Qi/Stance $\to$ Giliran Pemain Langsung Dipulihkan (`turnQueue = [playerEntity.entityId]`).
  - Mengeliminasi jeda polling 1000ms dan error palsu `"Belum giliranmu untuk menyerang!"`.
- **Sistem Status Efek (Buff & Debuff)**:
  - `poison`: Mengurangi HP korban setiap akhir ronde (badge `☠️`).
  - `stun`: Melumpuhkan target sehingga melewatkan gilirannya pada ronde terkait (badge `⚡`).
  - `defense_up`: Menahan 50% damage serangan lawan ronde ini (badge `🛡️`).
- **Sistem Kematian & Masa Pemulihan Dantian 4 Jam (Death Recovery)**:
  - Jika HP pemain mencapai 0, karakter mengalami luka fatal (`status: 'lost'`).
  - Terkena sanksi pemulihan dantian selama **4 jam diam di tempat** (`player.deathRecoveryUntil = Date.now() + 4 * 3600 * 1000`).
  - Selama masa ini, pemain dilarang memulai pertempuran baru dan disajikan timer hitung mundur pemulihan secara real-time.
- **Penghapusan Monster yang Dikalahkan (Defeated Monster Removal)**:
  - Monster yang dikalahkan disimpan ke dalam koleksi database `DefeatedMonsterTile` dengan jadwal respawn (default 1 jam).
  - Endpoint peta `/api/world/tiles` menyaring dan menghapus monster dari petak tersebut sehingga tidak muncul lagi sampai masa respawn selesai.

### 3.8. Kategori Senjata & Disiplin KungFu (Weapon Categories & Discipline Map)
Setiap senjata di database `Item` (kategori `'weapon'`) dipetakan ke disiplin beladiri (`player.kungfuSkills`) menggunakan fungsi `resolveWeaponDiscipline(item)` di `utils/kungfuMastery.js`. Pemetaan ini menentukan nama aksi, ikon, elemen, dan efek pasif basic attack di medan tempur.

#### Tabel Pemetaan Senjata & Basic Attack Adaptif

| Disiplin KungFu | Senjata yang Di-equip | Nama Aksi Battle | Ikon | Elemen | Bonus Unik |
|---|---|---|---|---|---|
| `sword` | Pedang, Jiandao | **Tebasan Pedang** | 🗡️ | Logam (*Metal*) | +5% Crit Rate |
| `saber` | Golok, Katana, Dao | **Tebas Golok** | ⚔️ | Logam (*Metal*) | +25% Stance Damage |
| `staff` | Tongkat, Tombak, Gada | **Sapuan Senjata** | 🥢 | Tanah (*Earth*) | **AoE ke SEMUA musuh aktif** |
| `fist` | Sarung Tangan, Cakar | **Pukulan Telak** | 👊 | Netral (*Physical*) | Pemulihan +5 Qi saat mendarat |
| `hiddenWeapon` | Jarum Racun, Shuriken | **Lemparan Rahasia** | 🎯 | Netral (*Physical*) | 15% Peluang Racun (*Poison*) |
| `finger` | Totokan Jari (Unarmed) | **Totokan Meridian** | 👆 | Netral (*Physical*) | 20% Peluang Lumpuh (*Stun*) 1 Ronde |
| `fist` (unarmed) | Tangan Kosong | **Tinju Tangan Kosong** | 👊 | Netral (*Physical*) | Pemulihan +5 Qi saat mendarat |

#### Aturan Disiplin Non-Tempur
Disiplin beladiri non-senjata langsung (`melody`, `healing`, `wineArt`, `qimen`, `special`, `core`, `stealing`, `forging`) menggunakan basic attack fallback **Tinju Tangan Kosong** (`fist`).

#### Formula Kekuatan Basic Attack Adaptif
$$\text{Power} = 10 + \lfloor\text{baseAtk}_{\text{weapon}} \times 0.3\rfloor + \lfloor\text{Level}_{\text{kungfu}} \times 0.1\rfloor$$
- Memastikan efektivitas serangan dasar bertumbuh seiring ketajaman senjata dan kemahiran kultivator.

#### Kebijakan Slot Skill di Battle Arena
```
Slot 1 : [WAJIB] Basic Attack Adaptif (Tergantung senjata yang di-equip)
Slot 2+: HANYA jurus manual teknik yang telah dipelajari pemain (player.manuals)
```
- Seluruh jurus bawaan hardcoded (`qi_strike`, `iron_wall`, `qi_overload`) telah **DIHAPUS SECARA TOTAL**.
- Pemain yang belum mempelajari kitab manual teknik hanya memiliki **1 slot jurus** (Basic Attack Senjata / Tinju). Hal ini memberikan insentif gameplay yang kuat bagi pemain untuk berburu dan mempelajari kitab manual esoteris.
### 3.9. Sistem Statistik Karakter yang Diperluas (Extended RPG Stats & Five-Pillars Framework)
Sistem statistik kultivator diintegrasikan ke dalam schema `Player.js` dan model komputasi `statCalculator.js`, dibagi menjadi **5 Pilar Utama** bergaya *Tale of Immortal*:

1. **General Attributes (Dasar Kehidupan & Takdir)**:
   - `Lifespan`: Usia saat ini dan batas umur maksimal sesuai ranah kultivasi.
   - `Mood`: Suasana hati (0–100), mempengaruhi interaksi NPC dan efisiensi meditasi.
   - `Health` & `Stamina`: Daya tahan hidup dan stamina pergerakan mikro-grid.
   - `Vitality`: Energi fisik harian untuk bertarung dan menahan luka dalam.
   - `Energy`: Intisari Qi internal tubuh untuk merapalkan mantra esoteris.
   - `Focus`: Konsentrasi mental untuk membedah kitab dan formasi segel.
   - `Luck` & `Insight`: Faktor penentu perolehan item langka, peluang terobosan ranah, dan kecepatan memahami manual.

2. **Combat Attributes (Parameter Tempur Lengkap)**:
   - `ATK`, `DEF`, `Agility` (kecepatan aksi/evasion).
   - `CRIT`, `CRIT RES`, `CRIT DMG` (default 150%), `CRIT DR` (pengurangan damage critical).
   - `Travel Speed`: Kecepatan jelajah di peta dunia.
   - `Martial RES` & `Spiritual RES`: Resistensi terhadap serangan fisik vs sihir elemen.

3. **Martial Arts (6 Disiplin Beladiri Jianghu)**:
   - `Blade` (Golok/Saber), `Spear` (Tombak/Staff), `Sword` (Pedang), `Fist` (Tinju), `Palm` (Telapak), `Finger` (Totokan Meridian). Terhubung langsung dengan `player.kungfuSkills`.

4. **Spiritual Root (6 Akar Elemen Dao / 灵根)**:
   - `Fire` (Api), `Water` (Air), `Lightning` (Petir), `Wind` (Angin), `Earth` (Tanah), `Wood` (Kayu). Menentukan afinitas dan multiplikator jurus elemen bersangkutan.

5. **Artisanship (6 Keahlian Pengrajin / 技艺)**:
   - `Alchemy` (Alkimia Pil), `Forge` (Tempa Senjata/Zirah), `Feng Shui` (Geomansi & Formasi), `Talismans` (Penulisan Kertas Jimat), `Herbology` (Identifikasi & Panen Herba), `Mining` (Ekstraksi Bijih Roh).

### 3.9. Sistem Statistik Karakter Terpadu & Sanitasi Integer (Integer Sanitization & Mastery Formula)
Sistem statistik kultivator diintegrasikan ke dalam schema `Player.js`, `statCalculator.js`, dan komponen UI frontend `<StatGrid />` dengan aturan deterministik:

1. **Kebijakan Integer Mutlak (Zero Decimal Policy)**:
   - **SEMUA parameter numerik** (Stamina, HP, Max HP, Vitality, Energy, Focus, Luck, Insight, ATK, DEF, Agility, CRIT, CRIT RES, Martial/Spiritual RES, dll.) **WAJIB dibulatkan menjadi integer bulat murni (`Math.floor()`)**.
   - Dilarang keras menampilkan nilai pecahan/desimal seperti `97.46597333333318/100`; nilai wajib berformat `97/100`.

2. **Koreksi Kemahiran Kungfu (XP vs Level Mastery)**:
   - Koleksi database `player.kungfuSkills` menyimpan akumulasi pengalaman (**XP**), bukan level instan.
   - Level dihitung menggunakan formula kurva eksponensial jangka panjang:
     $$\text{XP}_{\text{req}}(L) = \lfloor 14 \times L^{2.25} + 35 \times L \rfloor$$
     - Level 1 membutuhkan minimal 49 XP.
     - Level 2 membutuhkan minimal 136 XP.
   - Nilai XP sebesar `94` XP secara sah menghasilkan **Level 1**. Seluruh modul UI dan ringkasan profil **WAJIB** menghitung level riil via `getKungfuLevelFromExp()` sehingga menampilkan integer level (misal `1` atau `Lv. 1`), bukan angka XP mentah (`94`).

3. **Penghapusan Fitur Badges & Destiny**:
   - Seluruh badge kepribadian (`Protective`, `Carefree`, `Middle Way`, `Traditional Carefree`) serta takdir bawaan (`Destiny (Nature) Dual Talents` dan `Destiny (Nurture) Taoist Mind Essence`) telah **DIHAPUS SECARA TOTAL** baik dari lembar status pemain maupun panel NPC.

4. **Sistem Gelar Pencapaian (Title Pencapaian untuk Fleksing)**:
   - Menggantikan fitur kepribadian dan takdir dengan **Gelar Kehormatan (Title)** terpadu:
     - Contoh: `[Pendekar Pedang Surgawi]`, `[Penakluk Sembilan Benua]`, `[Pewaris Inti Emas]`, `[Pakar Alkimia Ilahi]`, `[Pengembara Angin & Petir]`, `[Pendekar Besar Jianghu]`.
   - Menampilkan lencana emas berkilau dan dialog pemilihan gelar aktif untuk pamer/fleksing ke pemain lain.

5. **Karakter Full Body Standing Art & Kerangka Lemari Pakaian (Wardrobe)**:
   - Lembar status pemain menampilkan visual ilustrasi berdiri penuh (Full Body Standing Art) di sisi kiri identitas karakter.
   - Terintegrasi dengan `GLOBAL_ASSETS.character_standing` (`default_male`, `default_female`, dsb.) dengan fallback siluet Wuxia bercahaya halo spiritual.
   - Dilengkapi slot indikator pakaian/wardrobe (`outfit_mortal`, `outfit_daoist_blue`, dll.) sebagai fondasi sistem pergantian kostum/baju.

---

### 3.10. Arsitektur Antarmuka UI (Landing Menu, Character Sheet & Shrouded NPC Panel)
Mengikuti standar visual Wuxia premium Tale of Immortal dengan kebijakan **Zero-Overlap & Mutual Exclusion**:

1. **Landing Menu (`LandingMenu.tsx`)**:
   - Layar pembuka bertajuk **IMMORTAL X** dengan lukisan pemandangan tinta perahu naga air 60fps.
   - 4 Tombol Menu: `[🐉 Masuk Dunia]`, `[📜 Pencapaian]`, `[⚙️ Pengaturan]`, `[🚪 Keluar Game]`.
   - **KEBIJAKAN MUTLAK**: Tombol `Mod` telah **DIHAPUS SECARA TOTAL**.

2. **Lembar Status Pendekar (`PlayerStatsModal.tsx`)**:
   - Modal gulungan perkamen kaisar kuno dengan 6 tab: `Stats`, `Skills`, `Artisan`, `Item`, `Experience`, `Relations`.
   - Tab `Stats`: Menampilkan visual Karakter Full-Body (dengan indikator wardrobe), Lencana Gelar Pencapaian (Title) interaktif, identitas karakter, saldo tael (emas/perak/tembaga/batu roh), progres Qi kultivasi, serta grid atribut 5 pilar dalam format integer murni.

3. **Panel Interaksi Tokoh / NPC (`NpcInteractionModal.tsx` & `SettlementPanoramaView.tsx`)**:
   - **Pemicu Ribbon Kota**: Klik pada kartu tokoh di pita atas pemukiman ("KULTIVATOR DI KOTA") langsung membuka modal interaksi megah Tale of Immortal (menggantikan dialog kecil lama).
   - **Full-Body Standing Art NPC**: Menampilkan ilustrasi berdiri penuh tokoh terintegrasi dengan `GLOBAL_ASSETS.npcs` (`Shuang Ke`, `Wu Binglin`, `Yin Ci`, `Li Keke`, `Xi Hua`, dll.).
   - **Status Hubungan & Karma**: Menampilkan relasi (*Stranger*, *Sahabat*, *Kenalan*, *Pasangan*, *Musuh*), bar kemajuan poin keakraban (*Affinity Progress*), dan bar moralitas *Righteous* vs *Demonic*.
   - **Aksi Sosial & Bermusuhan Terbatas (Hanya 4 Aksi Sah)**:
     - **DIHAPUS**: `ajak jelajah`, `debat dao`, `sparing`, `akrab`, `semedi berdua`, dan `bantuan` telah **DIHAPUS SECARA TOTAL**.
     - **HANYA 4 AKSI AKTIF**: `Sapa (Talk)`, `Hadiah (Gift)`, `Curi (Theft)`, dan `Serang! (Attack)`.
   - **Pemberantasan Stat & Penyamaran Kekuatan (Zero Stat Clutter Policy)**:
     - Seluruh stat `General`, `Spiritual Root`, `Artisanship`, dan `Combat` **DIHAPUS DARI MODAL NPC**.
     - NPC hanya menampilkan data identitas ringkas (Nama, Sekte, Jabatan, Ras, Kelamin, Ranah, Karisma, Reputasi, Minat/Hobi), kesan tutur kata/dialog, serta status hubungan dan moralitas.
   - **Gelar Kehormatan NPC (Admin Only Title Policy)**:
     - NPC biasa **TIDAK MEMILIKI GELAR OTOMATIS/ACAK**.
     - Kolom Gelar Kehormatan pada NPC bernilai default `Tidak Memiliki Gelar (Hanya Admin)` kecuali ditentukan secara manual dan otoritatif oleh Admin (`npcData.adminTitle`).
   - **Tab yang Dipertahankan**: Hanya 3 tab yang aktif: `stats` (identitas, gelar admin, tutur kata, relasi), `family` (silsilah keluarga/sekte), dan `social` (ikatan sosial). Tab `skills`, `artifact`, `backstory`, dan `taoist mind` telah **DIHAPUS**.

4. **Navigasi Atas yang Dapat Menciut (Collapsible Top Navigation Bar - `Navbar.tsx`)**:
   - Bar navigasi atas (Beranda, Karakter, Dunia, Aset & Tas, Pasar & Sekte, Almanack & Lore) dapat **menciut hilang ke atas** (`-translate-y-full max-h-0 opacity-0`) melalui tombol `[▲ Ciutkan]` di pojok kanan atas atau tab pegangan di tengah bawah bar.
   - Saat menciut, layar menjadi lega dan bebas distraksi; menyisakan **tombol panah ke bawah mengambang (`ChevronDown`)** di bagian tengah paling atas layar (`fixed top-0 left-1/2 -translate-x-1/2 z-[60]`) untuk memanggil kembali bar navigasi secara instan dan halus.

5. **Halaman Profil Karakter 5 Pilar (`profile/page.tsx`)**:
   - Menyelaraskan seluruh data profil kultivator dengan **Panca Pilar Fondasi Kultivasi (Five Pillars RPG Framework)** via komponen `<StatGrid />`:
     1. General (Lifespan, Mood, Health, Stamina, Vitality, Energy, Focus, Luck, Insight).
     2. Combat (ATK, DEF, CRIT, CRIT RES, Agility, CRIT DMG, CRIT DR, Travel Speed, Martial/Spiritual RES).
     3. Martial Arts (Blade, Spear, Sword, Fist, Palm, Finger - level riil dihitung dari kurva XP).
     4. Spiritual Root (6 Elemen: Api, Air, Petir, Angin, Tanah, Kayu).
     5. Artisanship (6 Profesi: Alkimia, Tempa, Feng Shui, Jimat, Herba, Tambang).
   - Menampilkan Lencana Gelar Pencapaian (`🎖️ [${activeTitle}]`), Bar Sirkulasi Inti Qi, Saldo Tael (Emas, Perak, Tembaga, Batu Roh, Giok), serta tombol pembuka lembar status lengkap (`PlayerStatsModal`).
   - Seluruh nilai numerik disanitasi mutlak menjadi integer bulat murni (`Math.floor`).

6. **Zero-Overlap & Mutual Exclusion Rules**:
   - Modal penuh (`PlayerStatsModal`, `NpcInteractionModal`, `BattleArena`, `DashboardModal`) saling menutup satu sama lain saat dibuka.
   - Di viewport mobile landscape (tinggi 360–420px) maupun portrait, setiap modal menggunakan `max-h-[96vh]` dengan `overflow-y-auto custom-scrollbar` mandiri tanpa ada elemen yang saling menimpa atau terpotong.

---

## 4. Standar `globalAssets.ts`

Setiap entitas visual baru (Item, Monster, NPC, Fasilitas, Dungeon Tile, Mount) **WAJIB** memiliki slot di `web-dashboard/src/config/globalAssets.ts`:
1. **Key yang Konsisten**: Menggunakan nama persis di database MongoDB (misal `"Kuda Ferghana"`) atau kunci slug semantik (misal `horse_ferghana`).
2. **Nilai Default**: Nilai string kosong `""` agar pemain/developer cukup menempelkan URL gambar PNG transparan di masa depan.
3. **Fallback Visual**: Jika URL kosong, sistem UI merender ikon emoji atau ilustrasi prosedural SVG tanpa menyebabkan crash ataupun broken image icon.

---

## 5. Prosedur Wajib Pengujian (Zero-Error Policy)

Sebelum menyelesaikan pekerjaan apa pun, Anda **WAJIB** memverifikasi:
1. **Integritas Logika Blueprint**:
   ```bash
   node test_phase_blueprint_integrity.js
   ```
   (Wajib lolos 100% SUCCESS).
2. **Kompilasi TypeScript Frontend**:
   ```bash
   powershell -ExecutionPolicy Bypass -Command "npx tsc --noEmit"
   ```
   (Di direktori `web-dashboard`, wajib exit code 0 tanpa kompromi).
3. **Validasi Sintaks Node.js Backend**:
   ```bash
   node -c <nama-file.js>
   ```
