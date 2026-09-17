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

### 3.7. Monster Spasial Grid & Pemicu Pertarungan Turn-Based (Interactive Battle Arena)
- **Penempatan Spasial**: Monster ditempatkan secara eksplisit pada petak koordinat tertentu (`ZoneTile.spawnedMonster`), contoh petak uji coba **(2452, 2481)** untuk *Serigala Roh Darah* (`wolf_azure`).
- **Zero Clutter Policy**: Petak kosong tanpa monster **DILARANG** menampilkan icon monster `👹`. Hanya petak dengan monster aktif yang merender aura crimson merah dan icon siluman.
- **Mekanisme Turn-Based**: Klik tombol `[⚔️ Tantang]` pada kartu inspektur petak (`GridTileInspectorCard`) memicu endpoint `/api/battle/start` (targetType `'monster'`), membuka modal `BattleArena` fullscreen dengan sistem ATB dinamis, penggunaan Qi, cooldown jurus, dan drop hadiah (EXP & Perak).

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
