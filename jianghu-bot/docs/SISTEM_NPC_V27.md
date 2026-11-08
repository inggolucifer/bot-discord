# PANDUAN ARSITEKTUR EKOSISTEM NPC HIDUP (V27)
# JIANGHU BOT & IMMORTAL-X LIVING NPCS SPECIFICATION

---

## 1. Visi & Filosofi Sistem

Sistem NPC Hidup (Living NPCs V27) menghadirkan dunia persilatan Jianghu yang otonom, dinamis, dan memiliki kedalaman sosial setara *Tale of Immortal*. Karakter non-pemain (NPC) bukan sekadar dispenser teks statis, melainkan entitas fana maupun kultivator yang memiliki:
- **Biografi & Garis Keturunan Nyata**: Nama keluarga autentik, pohon silsilah keluarga (DAG asiklik), klan kultivasi, dan relasi antar-karakter.
- **Siklus Kehidupan Terikat Waktu**: Menggunakan kalender 60 Jiazi, peredaran 4 musim, 12 Shichen per hari, batas usia biologis (*lifespan*), dan penuaan alami.
- **Psikologi & Moralitas Kompleks**: 8 tipe kepribadian, 16 sifat Dao (*Dao Traits*), dan takdir bawaan (*Innate/Acquired Destinies*).
- **Rutinitas Spasial**: Jadwal aktivitas 24 jam (meditasi, bertani, berjaga, berpatroli, beristirahat) yang disimulasikan secara adaptif (dekat vs jauh).
- **Pintu Kematian Tunggal (Single Death Door)**: Hanya satu fungsi otoritatif (`services/npcLifecycle.js: killNpc()`) yang berhak mematikan NPC, mengeksekusi wasiat, memicu dendam kerabat, dan menjadwalkan regenerasi peran inti.
- **Sistem Dendam & Ambush**: Membunuh atau merugikan NPC menciptakan entitas `NpcVendetta` yang dapat memicu `NpcAmbush` di alam liar secara server-authoritative.

---

## 2. Struktur Data & Model Database

### 2.1. Model Pokok
- `models/Npc.js`: Schema utama karakter NPC dengan dukungan mundur 100% (*backward compatible*).
  - Subdokumen V27: `personality`, `dao`, `destiny`, `lifespan`, `attributes` (5 pilar integer), `cultivation`, `schedule`, `vitalStatus`, `social`.
- `models/Player.js`: Ditambahkan field `wantedLevel` (skala 0–5) untuk mencatat status buronan atas kejahatan di Jianghu.
- `models/NpcPlayerRelation.js`: Relasi antara pemain dan NPC (afinitas -100 s/d +100, batas interaksi harian, status khusus seperti `disciple`, `companion`, `nemesis`).
- `models/NpcRelation.js`: Relasi sosial antar-NPC (afinitas, status ikatan, riwayat interaksi).
- `models/NpcFamily.js`: Pohon silsilah keluarga klan (nama marga, leluhur, kepala klan, daftar anggota).
- `models/NpcVendetta.js`: Catatan dendam aktif terhadap pemain atas pembunuhan kerabat atau tindak kejahatan.
- `models/NpcAmbush.js`: Sesi penyergapan aktif di alam liar saat dendam terpenuhi.
- `models/NpcEvent.js`: Kronik sejarah riwayat hidup NPC (peristiwa penting, terobosan ranah, pernikahan, kematian).

---

## 3. Komputasi Authoritative & Determinisme

### 3.1. PRNG Murni Tanpa Math.random (`utils/npcRng.js`)
- Menggunakan algoritma **Mulberry32 PRNG** berbasis integer seed 32-bit:
  ```js
  const rng = createNpcRng(seed);
  const val = rng.next(); // [0, 1) deterministik
  ```
- Menjamin bahwa pembangkitan ekosistem, sifat kepribadian, dan nama bersifat 100% reproducible dari benih yang sama.

### 3.2. Kalender Wuxia & Siklus Waktu (`utils/npcTime.js`)
- **60 Jiazi**: Batang Langit (*Heavenly Stems*) dan Cabang Bumi (*Earthly Branches*).
- **12 Shichen**: Satuan waktu 2 jam per shichen (Zi, Chou, Yin, Mao, Chen, Si, Wu, Wei, Shen, You, Xu, Hai).
- **4 Musim**: Musim Semi (Spring), Panas (Summer), Gugur (Autumn), Dingin (Winter).

### 3.3. Integritas Atribut 5-Pilar (`utils/npcStats.js`)
- **Pilar 1**: General Attributes (HP, Max HP, Stamina, Vitality, Energy, Focus, Luck, Insight).
- **Pilar 2**: Combat Attributes (ATK, DEF, Agility, CRIT, CRIT RES, Martial RES, Spiritual RES).
- **Pilar 3**: Martial Arts (Blade, Spear, Sword, Fist, Palm, Finger).
- **Pilar 4**: Spiritual Roots (Fire, Water, Lightning, Wind, Earth, Wood).
- **Pilar 5**: Artisanship (Alchemy, Forge, Herbology, Mining, Fishing, Cooking, Talismans).
- **Aturan Integer Mutlak**: Seluruh nilai atribut dibulatkan ke bawah murni menggunakan `Math.floor()`. Desimal dilarang keras.

---

## 4. Ekosistem 52 Anchor & 290 NPC

- Master Seeder (`scripts/v27/seedNpcLivingEcosystem.js`) mendistribusikan 290 NPC ke seluruh 52 anchor pemukiman:
  - Kota Megah (Metropolis): Canghai, Leiyin, Taiqing, Wanhua (masing-masing 12 NPC, 1 klan keluarga besar).
  - Kota Menengah & Sekte: Masing-masing 6–8 NPC.
  - Desa & Pos Perbatasan: Masing-masing 4–5 NPC.
  - Dusun & Dermaga: Masing-masing 2–3 NPC.
- **Klausul Peran Pokok Terpenuhi**: Setiap pemukiman dijamin memiliki peran inti minimal (Pedagang/Shopkeeper, Tetua/Elder, Pandai Besi/Blacksmith, dsb.).
- **8 Klan Keluarga Besar**: Klan Jiang, Zhao, Lin, Ye, Xiao, Chen, Bai, Chu memiliki silsilah multi-generasi asiklik dengan selisih umur orang tua dan anak $\ge 18$ tahun.

---

## 5. Antarmuka Pemain (Frontend Web Dashboard)

### 5.1. Mode Percakapan Visual Novel (`NpcDialogueScene.tsx`)
- Tampilan dialog bergaya novel visual interaktif dengan efek ketik (*typewriter*).
- Potret berdiri (*standing art*) resolusi tinggi dengan aura ranah dan badge afinitas.
- 15 Aksi Interaksi terbagi dalam 5 kategori:
  1. **Sosial**: Bicara Santai (`chat`), Tanya Petunjuk (`inquire`), Minta Bantuan (`request_favor`).
  2. **Hadiah & Suap**: Beri Hadiah (`gift`), Suap Koin Tembaga (`bribe`).
  3. **Beladiri**: Latihan Sparring (`spar`), Tantang Duel Hidup-Mati (`duel`).
  4. **Hubungan Khusus**: Ajak Berkelana (`recruit`), Ungkapkan Perasaan (`confess`), Lamar Pasangan Dao (`propose`), Angkat Murid (`adopt`), Cerai (`divorce`), Putus Hubungan (`break_relations`).
  5. **Intrik & Kejahatan**: Copet Kantong (`steal`), Ancam & Peras (`threaten`).

### 5.2. Panel Profil Komprehensif 7-Tab Tale of Immortal (`NpcProfilePanel.tsx`)
- **Tab 1: Ikhtisar (Overview)**: Identitas lengkap, ranah, jabatan, kepribadian, sifat Dao, takdir, dan bar afinitas hubungan.
- **Tab 2: Atribut 5-Pilar (Attributes)**: Matriks lengkap atribut fisik, tempur, kungfu, akar elemen, dan profesi.
- **Tab 3: Hubungan & Klan (Relationships)**: Pohon silsilah keluarga klan dan daftar relasi rekan di Jianghu.
- **Tab 4: Riwayat Hidup (Chronicles)**: Catatan kronik pencapaian hidup dan peristiwa sejarah penting NPC.
- **Tab 5: Inventaris (Inventory)**: Perlengkapan yang dikenakan dan isi kantong qiankun dengan aturan *Fog of Inspection*.
- **Tab 6: Manual & Jurus (Manuals)**: Kitab manual kungfu dan jurus esoteris yang dikuasai NPC.
- **Tab 7: Catatan Pribadi (Interaction Log)**: Log interaksi pribadi antara pemain dan tokoh tersebut.

---

## 6. Protokol Kematian & Pintu Kematian Tunggal (Single Death Door)

Semua peristiwa kematian NPC **WAJIB** melalui:
```js
const { killNpc } = require('./services/npcLifecycle');
await killNpc(npcId, { killerId, killerType, reason, regionSlug, coords });
```
Tahapan eksekusi `killNpc`:
1. Memperbarui `npc.vitalStatus = { isAlive: false, causeOfDeath, dateOfDeath }`.
2. Mentransfer isi inventaris sebagai jarahan kepada pembunuh atau ahli waris keluarga.
3. Mencatat riwayat kematian di `NpcEvent`.
4. Mengevaluasi kerabat/sekte dan memicu `NpcVendetta` jika pembunuh adalah pemain.
5. Menghapus NPC dari jadwal spasial aktif.
6. Memeriksa kuota peran pokok anchor pemukiman via `npcPopulationManager.js` dan menjadwalkan kelahiran/kedatangan pengganti jika peran esensial kosong.

---

## 7. Keamanan Finansial & Otoritas Server

- Penarikan koin tembaga untuk suap atau interaksi menggunakan `payCurrency(player, amountInCopper)`.
- Hadiah koin dan perolehan jarahan dihitung secara deterministik di server.
- Sisi klien hanya mengirimkan ID tokoh dan jenis aksi; server memvalidasi jarak, batas interaksi harian, kecukupan stamina, dan kepemilikan koin.
