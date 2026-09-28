# MASTER PLAN REVOLUSI SISTEM KULTIVASI 15 HUKUM SEMESTA (IMMORTAL-X)
## CETAK BIRU ARSITEKTUR KULTIVASI REALISTIS: SISTEM BAR ESENSI BERJENJANG, ATRIBUT SPESIALISASI, PEMISAHAN QI BERTARUNG VS KULTIVASI, & MEKANISME TANPA UI PALSU

> **Dokumen Perencanaan Arsitektur & Rekomendasi Otoritatif (Versi 2.0 - Diperkaya)**  
> **Target Implementasi:** Backend Express API, Model Database Mongoose, Engine Matematika Otoritatif, & Frontend Web Dashboard Next.js  
> **Status:** Siap Eksekusi (Ready for Production Roadmap)

---

## DAFTAR ISI

1. [PENDAHULUAN & FILOSOFI DESAIN UTAMA](#1-pendahuluan--filosofi-desain-utama)
   - 1.1. Tiga Pilar Filosofi Baru (Zero Fake UI & Tier Lock)
   - 1.2. DIKOTOMI MUTLAK: QI BERTARUNG (COMBAT QI) VS QI KULTIVASI (CULTIVATION QI)
   - 1.3. Jembatan Sinergi: Pengaruh Ranah terhadap Kapasitas Tempur
2. [ARSITEKTUR BINDING AWAL & REAL INVENTORY PICKER (SLOT 2)](#2-arsitektur-binding-awal--real-inventory-picker-slot-2)
   - 2.1. Natal Artifact: Common Object Soul Binding
   - 2.2. Natal Beast: Beast Egg Binding, Inkubasi & Penetasan Menembus Ranah
   - 2.3. Penempaan Raga: Slot 2 Tersembunyi (Raga sebagai Wadah Sejati)
3. [MEKANISME KHUSUS 15 HUKUM SEMESTA (DEEP-DIVE SPESIFIKASI)](#3-mekanisme-khusus-15-hukum-semesta-deep-dive-spesifikasi)
   - 3.1. 6 Elemen Kosmik Semesta (Bar Elemen & Root XP)
   - 3.2. Rongga Sepuluh Ribu Gu (Batas Equip, Penalti Un-equip & Modal Fusi)
   - 3.3. Penempaan Raga Suci (Pemanenan Alam Siang/Malam & Penempaan 9 Bagian Tubuh)
   - 3.4. Pelebur Inti Siluman (Bar Qi Kotor & Indeks Korupsi Batin)
   - 3.5. Penghisap Darah & Jiwa (Panen Jiwa/Darah Musuh Manusia & Infamy)
   - 3.6. Seribu Racun Pemusnah (Bar Racun, Debuff Non-Kematian & Imunitas)
   - 3.7. Kontrak Iblis Abyss (Satu-satunya Altar di Lahan Peta & Validasi Grid Koordinat)
   - 3.8. Bayangan Sembilan Yin (Wilayah Kegelapan & Nether Safe Timer)
4. [SISTEM TEROBOSAN DENGAN SLOT PIL PENEROBOSAN NYATA](#4-sistem-terobosan-dengan-slot-pil-penerobosan-nyata)
   - 4.1. Slot Pil Interaktif pada Modal Terobosan
   - 4.2. Katalog Pil Resmi per Ranah & Dampak Proteksi Deviasi Qi
5. [FORMULA MATEMATIKA OTORITATIF & BALANCING ENGINE](#5-formula-matematika-otoritatif--balancing-engine)
   - 5.1. Formula Tier Affinity & Decay
   - 5.2. Formula Peluang Fusi Gu Berbasis Tier
   - 5.3. Formula Pemanenan Esensi Alam Body Tempering
   - 5.4. Formula Kapasitas & Regenerasi Qi Bertarung per Ronde
6. [BLUEPRINT SKEMA DATABASE (MODELS/PLAYER.JS)](#6-blueprint-skema-database-modelsplayerjs)
7. [REKOMENDASI DAN IDE PENYEMPURNAAN AGENTIK](#7-rekomendasi-dan-ide-penyempurnaan-agentik)
8. [KESIMPULAN & TAHAPAN LANGKAH IMPLEMENTASI](#8-kesimpulan--tahapan-langkah-implementasi)

---

## 1. PENDAHULUAN & FILOSOFI DESAIN UTAMA

Berdasarkan visi game Wuxia/Xianxia MMORPG yang matang, sistem kultivasi di **Jianghu Bot (Immortal-X)** ditransformasikan menjadi **simulasi kehidupan kultivator yang mendalam, terintegrasi dengan siklus waktu siang/malam dunia nyata, bioma peta, dan kondisi biologis tubuh**.

### 1.1. Tiga Pilar Filosofi Baru
1. **Zero Fake UI (Sistem 100% Nyata & Terintegrasi):**
   Tidak ada tombol atau modal yang hanya menampilkan animasi palsu tanpa efek basis data. Setiap pilihan item, penetasan telur satwa, pengasahan pusaka, dan penempaan tubuh berinteraksi langsung dengan inventori riil dan status karakter di MongoDB.
2. **Siklus Universal Konsumsi $\to$ Bar Khusus $\to$ Pencernaan Waktu $\to$ Qi Terobosan:**
   Setiap Law memiliki wadah bar energi tematik yang wajib diisi dengan bahan bakar spiritual yang sesuai. Bar ini terus dicerna secara deterministik seiring waktu (online maupun offline) menjadi Qi kultivasi (atau *True Qi* untuk Raga).
3. **Aturan Universal Tier Item (Kunci Anti-Cheat & Anti-Jomplang):**
   Berlaku mutlak untuk **SEMUA LAW**:
   $$\text{Efisiensi} = \begin{cases} 
   0\% \text{ (Terkunci / Ditolak Dantian)}, & \text{jika } \text{Tier}_{\text{item}} > \text{Tier}_{\text{pemain}} \\
   100\% \text{ (Optimal / Sempurna)}, & \text{jika } \text{Tier}_{\text{item}} = \text{Tier}_{\text{pemain}} \\
   \max(0.15, 1 - (\text{Tier}_{\text{pemain}} - \text{Tier}_{\text{item}}) \times 0.40), & \text{jika } \text{Tier}_{\text{item}} < \text{Tier}_{\text{pemain}}
   \end{cases}$$
   - *Pemain tidak bisa menyerap item di atas ranahnya* (mencegah pemain pemula memakan item endgame untuk bypass progresi).
   - *Mengonsumsi item di bawah ranah mengalami penalti efisiensi tajam* (mendorong eksplorasi ke wilayah berbioma bahaya tinggi).

---

### 1.2. DIKOTOMI MUTLAK: QI BERTARUNG (COMBAT QI) VS QI KULTIVASI (CULTIVATION QI)

> [!CAUTION]
> **ATURAN ARSITEKTUR MUTLAK:**
> **Qi Bertarung (Combat Qi / MP)** dan **Qi Kultivasi (Cultivation Qi / Dantian Xiuwei)** adalah **DUA ENTITAS YANG BERBEDA TOTAL DAN TIDAK BOLEH DISAMAKAN ATAU DITUKAR**!

```mermaid
graph TD
    subgraph DantianKultivasi [1. QI KULTIVASI / XIUWEI (修为)]
        A1[Item Esensi / Meditasi / Misi] -->|Dicerna Waktu Nyata| A2[Bar Qi Dantian Jangka Panjang]
        A2 -->|Skala: Ratusan Ribu - Ratusan Juta| A3[Menerobos Stage 0 s/d 9 & Naik Rank 0 s/d 8]
        A3 -.->|Sifat: PERMANEN| A4[TIDAK PERNAH BERKURANG SAAT SKILL CASTING!]
    end

    subgraph MedanTempur [2. QI BERTARUNG / COMBAT QI (战斗气 / MP)]
        B1[Modal Awal Ronde Tempur] -->|Skala: 0 - 100/250 Nilai Taktis| B2[Bar Biru Energi di Battle Arena]
        B2 -->|Merapalkan Jurus: -25 / -40 Qi| B3[Cast Skill Tempur / Ultimate]
        B4[Basic Attack Tinju / Regen Per Ronde] -->|Pemulihan Taktis| B2
        B3 -.->|Sifat: SEMENTARA| B5[Hanya Berlaku Selama Sesi Duel Berlangsung!]
    end

    A3 ===>|Menaikkan Max Capacity & Regen Rate| B1
```

#### Tabel Kontras Perbandingan

| Dimensi Parameter | Qi Kultivasi (Cultivation Qi / 修为) | Qi Bertarung (Combat Qi / 战斗真气 / MP) |
|---|---|---|
| **Makna Lore** | Akumulasi kedalaman dantian seumur hidup (*Xiuwei*) | Aliran tenaga dalam dinamis yang bersirkulasi saat bertarung |
| **Lokasi Penyimpanan Data** | `player.cultivationLaw.qi` & `systemCultivation.qi` | Sesi duel aktif (`battleSession.player.currentQi`) |
| **Fungsi Utama** | Bahan bakar penerobosan ranah (*Breakthrough*) | Biaya konsumsi merapalkan jurus tempur aktif (*Skill Cost*) |
| **Skala Nilai** | **Ratusan Ribu hingga Ratusan Juta** ($1.260$ s/d $500.000.000$) | **Puluhan hingga Ratusan** ($0$ s/d $100$–$350$ Combat Qi) |
| **Siklus Pengisian** | Meditasi (*channeling*), cerna esensi, pencerahan harian | Basic attack (+5 Qi), pasif regen per turn, pil pemulih tempur |
| **Sifat Pengurangan** | Hanya berkurang jika mengalami **Gagal Terobosan / Deviasi** | Berkurang instan setiap kali melancarkan skill di ronde tempur |
| **Efek Habis ($=0$)** | Kultivasi mandek / butuh meditasi | Tidak bisa merapalkan jurus aktif (terpaksa basic attack) |
| **Representasi Visual** | Bar progres emas/cyan besar di **Tab Kultivasi** | Bar biru di bawah Bar HP karakter pada **Battle Arena** |

---

### 1.3. Jembatan Sinergi: Pengaruh Ranah terhadap Kapasitas Tempur
Meskipun keduanya terpisah, **kedalaman Qi Kultivasi secara logis memperkuat kapasitas Qi Bertarung**:

$$\text{MaxCombatQi} = 50 + (\text{RealmIndex} \times 25) + \lfloor\text{Stat}_{\text{Energy}} \times 0.5\rfloor + \lfloor\text{Stat}_{\text{Focus}} \times 0.3\rfloor$$
$$\text{CombatQiRegenPerRound} = 5 + (\text{RealmIndex} \times 2) + \lfloor\text{Stat}_{\text{Vitality}} \times 0.05\rfloor$$

* **Pendekar Fana (Realm 0):** Hanya memiliki **50 Max Combat Qi** dan regenerasi **+5 Qi/ronde**. Cukup untuk 1 jurus berat.
* **Pendekar Fondasi Kokoh (Realm 2):** Memiliki **100 Max Combat Qi** dan regenerasi **+9 Qi/ronde**. Mampu merangkai kombo 2 jurus.
* **Pendekar Inti Emas (Realm 3):** Memiliki **125+ Max Combat Qi** dan regenerasi **+11 Qi/ronde**. Mampu merapalkan Ultimate dan jurus elemen bertubi-tubi.

---

## 2. ARSITEKTUR BINDING AWAL & REAL INVENTORY PICKER (SLOT 2)

Ritual Pengikatan Hukum Semesta pada **Fondasi Fana Tahap 10 (Max Lv. 20)** menggunakan sistem modal inventori dinamis interaktif yang menyaring data tas riil:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   RITUAL DAO BINDING (MORTAL STAGE 10)                 │
├───────────────────────────────────┬────────────────────────────────────┤
│ SLOT 1: KITAB MANUAL HUKUM ALAM  │ SLOT 2: WADAH / KATALIS PERMANEN   │
│ [Pilih 1 dari 15 Kitab Manual]   │ [Modal Picker Inventori Nyata]     │
└───────────────────────────────────┴────────────────────────────────────┘
```

### 2.1. Natal Artifact (`natal_artifact`): Common Object Soul Binding
* **Alur Pemilihan Slot 2:** Saat mengklik Slot 2, muncul modal picker yang memfilter inventori tas pemain dan **HANYA menampilkan item berperingkat `Common`** (`Pedang Patah`, `Mangkuk Retak`, `Cincin Tembaga Berkarat`, `Cermin Perunggu Kusam`, `Jarum Jahit Besi`).
* **Inheritansi Stat & Karakteristik Riil:**
  - *Senjata Patah:* Memberikan spesialisasi **Serang** (`ATK +15`, `CRIT +5%`).
  - *Perisai / Mangkuk Retak:* Memberikan spesialisasi **Pertahanan** (`DEF +12`, `HP +80`).
  - *Cermin Perunggu Kusam:* Memberikan spesialisasi **Mistik** (`Spiritual RES +8`, `Focus +10`).
  - *Cincin / Wadah Tembaga:* Memberikan spesialisasi **Penyimpanan Qi** (`Max Combat Qi +20`, `Energy +15`).
* **Visual 1-to-1:** Nama item menjadi nama dasar pusaka (misal: *"Pedang Patah Jiwa Kelahiran"*), dan ikon/gambar item aslinya terpampang pada kartu kultivasi.
* **Siklus Kultivasi:** Melebur mineral dan batu asah untuk mengisi **Bar Resonansi Pusaka**. Pusaka jiwa menyerap bar ini seiring waktu dan mengubahnya menjadi Qi kultivasi.

### 2.2. Natal Beast (`natal_beast`): Beast Egg Binding, Inkubasi & Penetasan
* **Alur Pemilihan Slot 2:** Modal picker Slot 2 memfilter tas pemain dan **HANYA menampilkan item bertag `beast_egg` berperingkat `Common`**.
* **Contoh Data Riil:**
  - **`Telur Serigala Roh Azure (Common)`:**
    * *Deskripsi:* Telur berurat biru laut yang berdenyut hangat.
    * *Stat Dasar Pasif:* `ATK +12`, `Agility +6`, `HP +80`.
    * *Skill Bawaan:* `Azure Howl` (Buff +10% SPD pada pertempuran).
  - **`Telur Elang Badai Padang (Common)`:**
    * *Deskripsi:* Telur bercangkang keras dengan pola pusaran angin.
    * *Stat Dasar Pasif:* `Agility +15`, `Travel Speed +8`.
    * *Skill Bawaan:* `Wind Feather Slash` (Serangan proyektil bulu angin).
* **Fase Inkubasi & Penetasan Waktu Nyata:**
  - *Rank 0 (Fana):* Berwujud Telur bercahaya spiritual di sisi karakter.
  - *Rank 1 (Qi Refining):* Telur menetas menjadi Anak Satwa Roh (*Beast Cub*).
  - *Rank 3 (Golden Core):* Berevolusi menjadi Satwa Roh Dewasa (*Adult Spirit Beast*).
  - *Rank 5 (Soul Formation):* Bertransformasi menjadi Siluman Sejati bersayap/bertanduk.
  - *Rank 7 (Tribulation):* Mencapai Avatar Dewa Purba dan dapat bersatu dengan tubuh pendekar (*Soul Fusion Transformation*).

### 2.3. Penempaan Raga (`body_tempering`): Slot 2 Tersembunyi
* Tubuh fana manusia adalah satu-satunya wadah penempaan sejati. Slot 2 tidak dimunculkan karena pemain tidak memerlukan item luar saat awal ikatan.

---

## 3. MEKANISME KHUSUS 15 HUKUM SEMESTA (DEEP-DIVE SPESIFIKASI)

---

### 3.1. 6 Elemen Kosmik Semesta (Api, Air, Bumi, Kayu, Angin, Petir)
* **Bar Elemen Masing-Masing:**
  - Api: `Samadhi Flame Reservoir`
  - Air: `Azure Tide Reservoir`
  - Bumi: `Leyline Earth Reservoir`
  - Kayu: `Life Wood Reservoir`
  - Angin: `Astral Gale Reservoir`
  - Petir: `Heavenly Thunder Reservoir`
* **Mekanisme Konsumsi:**
  - Diisi dengan mengonsumsi item berkategori esensi elemen yang cocok.
  - Item Tier di atas pemain $\to$ **DITOLAK (Terkunci)**.
  - Item Tier di bawah pemain $\to$ Efisiensi dipotong drastis sesuai formula.
  - Bar elemen berkurang setiap menit channeling/offline dan dikonversi menjadi Qi Dantian serta menambah **Spiritual Root XP elemen terkait**.

---

### 3.2. Rongga Sepuluh Ribu Gu (`gu_master`)
* **Batas Maksimal Gu yang Bisa Di-equip per Ranah:**
  - Rank 0 (Mortal): **1 Slot Gu**
  - Rank 1 (Qi Refining): **2 Slot Gu**
  - Rank 2 (Foundation): **3 Slot Gu**
  - Rank 3 (Core): **4 Slot Gu**
  - Rank 4+ (Nascent Soul ke atas): **5 Slot Gu (Maksimal)**
* **Aturan Un-equip Ketat (Anti Lepas-Pasang Sembarangan):**
  - Cacing Gu yang telah ditanam telah mengaitkan capitnya ke dalam pembuluh darah meridian pemain.
  - Melepas cacing Gu membutuhkan **`Pil Penenang Gu` (Sedative Pill)**. Jika dipaksa un-equip tanpa pil, pemain menderita *Backlash Meridian* (-20% HP & Vitality selama 2 jam).
* **Sistem Modal Fusi Gu (Gu Fusion Tab):**
  - Pemain menekan tombol `[⚗️ Fusi Rongga Gu]` $\to$ Terbuka modal fusi interaktif.
  - Pemain menentukan 2 cacing Gu dari rongga:
    1. **Gu Prioritas (Target Upgrade):** Gu yang ingin dinaikkan ke Tier berikutnya.
    2. **Gu Pengorbanan (Sacrifice):** Gu yang **PASTI DIKORBANKAN & LENYAP**.
  - **Peluang Sukses Fusi Berbasis Tier:**
    $$\text{Rate}_{\text{fusi}} = \max\left(10\%, 85\% - (\text{Tier}_{\text{prioritas}} \times 18\%) + (\text{Tier}_{\text{kendi}} \times 6\%)\right)$$
  - **Hasil Fusi:**
    - **JIKA BERHASIL:** Gu Pengorbanan lenyap. Gu Prioritas berevolusi ke Tier berikutnya (stat ATK/DEF melonjak, memperoleh efek racun ganda), dan pemain mendapatkan +150 Qi kultivasi.
    - **JIKA GAGAL:** Gu Pengorbanan **TETAP LENYAP**, tetapi intisari dagingnya diserap oleh Gu Prioritas sebagai nutrisi makanan (Kekenyangan/Satiety Gu Prioritas menjadi 100% penuh + bonus XP Gu).

---

### 3.3. Penempaan Raga Suci (`body_tempering`): Ekologi 20 Esensi Alam Primordial
Sistem kultivasi raga adalah sistem paling unik dan dinamis karena **tidak menggunakan inventory tas fisik biasa**, melainkan memanfaatkan energi alam semesta langsung yang meresap ke dalam pori-pori kulit saat pemain berinteraksi dengan lingkungan, cuaca, bioma peta, dan siklus waktu nyata (real-time weather & day/night cycle).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   SISTEM PENEMPAAN RAGA SUCI (BODY TEMPERING ECOSYSTEM)                │
├───────────────────────────────────────────┬────────────────────────────────────────────┤
│ PENGUMPULAN 20 ESENSI ALAM PRIMORDIAL     │ PENEMPAAN 9 BAGIAN ANATOMI RAGA            │
│                                           │                                            │
│ [DOMAIN ANGIN, CUACA & BADAI]             │ 1. Kepala (Head)       6. Kaki Kanan       │
│ 🌪️ Angin Liar (Gale)   🌧️ Hujan (Rain)     │ 2. Dada (Torso)        7. Tulang Belakang  │
│ ⛈️ Topan (Typhoon)    🌫️ Halimun (Mist)   │ 3. Lengan Kiri         8. Dantian Raga     │
│ ⚡ Petir (Thunder)    ❄️ Salju (Frost)    │ 4. Lengan Kanan        9. Lapisan Kulit    │
│ 🌪️ Badai Pasir (Sandstorm)                 │ 5. Kaki Kiri                               │
│                                           │                                            │
│ [DOMAIN KOSMIK, LANGIT & WAKTU]           │ [ALUR SIKLUS PENEMPAAN RAGA]               │
│ ☀️ Surya (Solar)      🌅 Fajar (Dawn)     │ 1. Melangkah di Peta / Meditasi Terbuka   │
│ 🌙 Rembulan (Lunar)   🌇 Senja (Twilight) │ 2. Pori-pori Menyerap Esensi Lingkungan    │
│ ✨ Bintang (Astral)   🌑 Gerhana (Eclipse)│ 3. Disimpan di Penyimpanan Batin Raga      │
│ 🌠 Meteor (Meteor)                        │ 4. Pilih 1 dari 9 Bagian Tubuh             │
│                                           │ 5. Pilih Esensi $\to$ Tempa (Countdown)    │
│ [DOMAIN BENTANG ALAM & KEHIDUPAN]         │ 6. Bagian Tubuh Naik Level + True Qi Naik  │
│ 🌿 Tumbuhan (Grass)   🌊 Samudra (Ocean)  │ 7. Memperoleh Stat Permanen Esensi Pilihan │
│ 💧 Telaga (Pool)      🗿 Karang (Earth)   │                                            │
│                                           │                                            │
│ [DOMAIN EKSTREM & VULKANIK]               │                                            │
│ 🌋 Lahar (Magma)      ☠️ Rawa (Miasma)    │                                            │
│ 🌋 Asap Belerang      💎 Kristal Gua      │                                            │
└───────────────────────────────────────────┴────────────────────────────────────────────┘
```

* **Penyimpanan Internal Tubuh (`player.cultivationLaw.bodyEssenceStorage`):**
  - Terpisah dari tas ransel fisik dan kebal dari penjarahan/kematian. Menampung kuantitas 20 intisari alam batin:
    `{ solar: 0, lunar: 0, astral: 0, dawn: 0, twilight: 0, eclipse: 0, meteor: 0, gale: 0, typhoon: 0, thunder: 0, rain: 0, mist: 0, frost: 0, sandstorm: 0, grass: 0, pool: 0, ocean: 0, earth: 0, magma: 0, miasma: 0, sulfur: 0, crystal: 0 }`.

#### Matriks Lengkap 20 Esensi Alam & Kondisi Pemicu Spesifik

| No | Esensi Alam & Key | Kondisi Waktu & Cuaca | Bioma / Lokasi Peta | Stat Permanen yang Ditambahkan ke Raga |
|:---:|---|---|---|---|
| **1** | 🌪️ **Gale (Angin Liar)**<br>`gale` | Cuaca Berangin Kencang / Topan | Celah Ngarai Curam, Dataran Padang Luas | `+Agility`, `+Evasion (Dodge)`, `+Travel Speed` |
| **2** | ⛈️ **Typhoon (Topan Samudra)**<br>`typhoon` | Cuaca Badai Laut Mengamuk | Pesisir Laut Timur, Jalur Pelayaran Kapal | `+Attack Speed (Agility)`, `+Stance Disruption`, `+Multi-Strike Rate` |
| **3** | ⚡ **Thunder (Petir Dewa)**<br>`thunder` | Cuaca Hujan Badai Kilat / Mendung Guntur | Puncak Tebing Guntur, Area Sambaran Petir | `+CRIT DMG`, `+Stance Break`, `+Lightning RES` |
| **4** | 🌧️ **Rain (Titisan Hujan Deras)**<br>`rain` | Cuaca Hujan Deras / Gerimis Panjang | Dataran Rendah, Hutan Hujan, Lembah Basah | `+Max Stamina`, `+Fluid Qi Flow`, `+Stamina Regen Rate` |
| **5** | 🌫️ **Mist (Halimun Lembah)**<br>`mist` | Pagi Hari (05:00–08:00 WIB), Mendung/Kabut | Lembah Pegunungan Azure, Jurang Kabut | `+Evasion`, `+Sensory Reflex`, `+Illusion Stance (Kurangi Akurasi Musuh)` |
| **6** | ❄️ **Frost (Salju Abadi)**<br>`frost` | Cuaca Salju Lebat / Suhu < 0°C | Tundra Utara, Puncak Glasier Gunung Es | `+Physical DEF`, `+Cold RES`, `+Physical Damage Reduction` |
| **7** | 🌪️🏜️ **Sandstorm (Badai Pasir)**<br>`sandstorm` | Cuaca Berangin Kencang / Badai Pasir | Gurun Suci Barat, Lembah Bukit Pasir | `+Physical DEF`, `+Blind Resilience`, `+Grit (Damage Reduction saat Low HP)` |
| **8** | ☀️ **Solar (Surya Murni)**<br>`solar` | Siang Hari Terik (09:00–15:00 WIB), Cerah | Padang Terbuka, Gurun Pasir Terik | `+Physical ATK`, `+Armor Penetration` |
| **9** | 🌙 **Lunar (Embun Rembulan)**<br>`lunar` | Malam Hari Hening (19:00–05:00 WIB) | Puncak Gunung Hening, Tepi Telaga Cermin | `+Focus`, `+Spiritual RES`, `+Mental Fortitude` |
| **10**| ✨ **Astral (Rasi Bintang)**<br>`astral` | Tengah Malam (00:00–04:00 WIB), Cerah | Puncak Tertinggi Langit, Observatorium | `+Insight`, `+CRIT Rate`, `+Max Dantian Qi Capacity` |
| **11**| 🌅 **Dawn (Fajar Sinar Ungu)**<br>`dawn` | Fajar Singkat (05:00–06:30 WIB) | Puncak Timur, Pemandangan Matahari Terbit | `+All-Round Body Balance (+HP/+ATK/+DEF)`, `+Breakthrough Luck` |
| **12**| 🌇 **Twilight (Lembayung Senja)**<br>`twilight` | Waktu Senja (17:30–18:30 WIB) | Ufuk Barat, Perbatasan Gurun dan Hutan | `+Agility`, `+Shadow Camouflage (Hindaran Serangan Pertama)` |
| **13**| 🌑 **Eclipse (Gerhana Purba)**<br>`eclipse` | Event Langka (Gerhana Surya/Bulan) | Seluruh Penjuru Alam Semesta | `+True Damage (Penetrasi Mutlak DEF)`, `+Yin-Yang Equilibrium` |
| **14**| 🌠 **Meteor (Debu Bintang)**<br>`meteor` | Fenomena Langka Hujan Meteor | Area Terbuka Malam Hari | `+Extreme Penetration`, `+Explosive CRIT DMG` |
| **15**| 🌿 **Grass (Tumbuhan Hayat)**<br>`grass` | Kapan Saja (Siang/Malam) | Hutan Belantara Lebat, Lembah Herba Obat | `+Max HP`, `+Health Regen Rate`, `+Lifespan` |
| **16**| 💧 **Pool (Tirta Telaga)**<br>`pool` | Kapan Saja | Tepi Danau Pedalaman, Sungai Jernih | `+Max Stamina`, `+Vitality`, `+Stamina Recovery Rate` |
| **17**| 🌊 **Ocean (Gelombang Samudra)**<br>`ocean` | Berada di Pesisir / Di Atas Perahu | Pesisir Laut Timur, Dermaga, Laut Dalam | `+Vitality`, `+Impact Knockback Force`, `+Water RES` |
| **18**| 🗿 **Earth (Urat Bumi)**<br>`earth` | Kapan Saja | Tebing Batu Wadas, Gua Tambang Bijih | `+Physical DEF`, `+Martial RES`, `+Knockback RES` |
| **19**| 🌋 **Magma (Bara Lahar)**<br>`magma` | Cuaca Gelombang Panas / Suhu > 35°C | Kawah Gunung Berapi, Rekahan Lahar | `+Physical ATK`, `+Heat RES`, `+Burn Thorns (Refleksi Luka Bakar)` |
| **20**| ☠️ **Miasma (Racun Rawa)**<br>`miasma` | Cuaca Badai Beracun / Rawa Ungu | Rawa Lembap Miasma, Domain Iblis Selatan | `+Poison RES`, `+Toxic Thorns Pasif (Meracuni Penyerang)` |
| **21**| 🌋💨 **Sulfur (Uap Belerang)**<br>`sulfur` | Rekahan Geotermal Panas | Sumber Air Panas Belerang, Bukit Asap | `+Toxin Cleansing Speed`, `+Skin Toughness (Meredam CRIT DMG Musuh)` |
| **22**| 💎 **Crystal (Kristal Gua)**<br>`crystal` | Eksplorasi Bawah Tanah | Ruang Dungeon Labirin Gua ($8\times8$, $20\times20$, $40\times40$) | `+Focus`, `+Sensory Reflex (Deteksi Jebakan)`, `+Spiritual Shield` |

* **Peluang Random Alami Saat Melangkah (Random Step Environmental Inhalation):**
  - Setiap kali pendekar melangkah di peta mikro-grid spasial (di `movementService.js`), sistem mengecek kondisi cuaca global (`WeatherConfig.currentWeather`), jam server nyata, dan bioma petak koordinat.
  - Terdapat peluang random **15% - 25%** memicu *Inhalasi Pori-pori Raga (Environmental Inhalation)* dengan notifikasi narasi Wuxia:
    * *"Hembusan angin ngarai menderu kencang menerpa wajahmu, pori-pori kulitmu menyerap 1x Intisari Angin Liar (Gale Essence)!"*
    * *"Titisan gerimis dingin menyentuh pundakmu di Dataran Tengah, pori-pori ototmu menyerap 1x Intisari Hujan Deras (Raindrop Essence)!"*
    * *"Pijakan kakimu di pasir terik Gurun Suci Barat membakar urat nadi, menyerap 1x Intisari Badai Pasir (Sandstorm Essence)!"*
    * *"Di celah puncak Pegunungan Azure yang berkabut tebal di pagi hari, tubuhmu menghisap 1x Intisari Halimun Lembah (Mountain Mist Essence)!"*
    * *"Sambaran petir melintas di langit mendung, getaran statis menyengat ototmu memberi 1x Intisari Petir Dewa (Thunder Essence)!"*
    * *"Saat fajar merekah di ufuk timur, setitik sinar ungu menyusup ke pori-pori menghasilkan 1x Intisari Fajar Sinar Ungu (Dawn Aurora Essence)!"*
  - Esensi langsung masuk ke `player.cultivationLaw.bodyEssenceStorage[essenceKey] += 1` hingga batas kapasitas ranah.

* **Pemanenan Pasif Meditasi di Alam Terbuka (Environmental Breathing Stance):**
  - Saat pemain mengaktifkan status meditasi (`channeling`) di luar ruangan (bukan di dalam kota terlindung):
  - Setiap interval waktu teratur, karakter menyerap 1–2 esensi alam yang dominan di petak bioma tersebut:
    $$\text{IntervalMenit}(\text{rank}) = 15 \times 2^{\text{rank}}$$
    - Rank 0 (Mortal): 1 esensi per 15 menit.
    - Rank 1 (Qi Refining): 1 esensi per 30 menit.
    - Rank 2 (Foundation): 1 esensi per 60 menit.
    - Rank 3 (Golden Core): 1 esensi per 120 menit (2 jam).
  - Batas maksimal kapasitas penyimpanan bertumbuh sesuai ranah:
    $$\text{MaxStoragePerEssence}(\text{rank}) = 15 \times (\text{rank} + 1)$$
    - Rank 0: 15 per jenis esensi (total 330 kapasitas batin).
    - Rank 1: 30 per jenis esensi (total 660 kapasitas batin).
    - Rank 2: 45 per jenis esensi (total 990 kapasitas batin).

* **Alur Penempaan 9 Bagian Tubuh & Kustomisasi Spesialisasi Build (Archetypes):**
  1. Pemain membuka tab Body Tempering di Web Dashboard, melihat visual interaktif diagram 9 bagian anatomi raga.
  2. Klik salah satu bagian tubuh target (misal: *Lengan Kanan*, *Kaki Kiri*, atau *Lapisan Kulit*).
  3. Memilih esensi yang tersedia di penyimpanan batin raga.
  4. Tekan tombol `[🔥 Tempa Bagian Tubuh]`.
  5. Proses meditasi penempaan berjalan dengan timer hitung mundur nyata:
     - Rank 0: **30 detik**.
     - Rank 1: **60 detik (1 menit)**.
     - Rank 2+: **2 hingga 5 menit**.
  6. Jika selesai: Esensi berkurang, Bagian Tubuh naik level, menghasilkan **True Qi**, dan menambahkan **Stat Permanen Spesifik** sesuai esensi yang digunakan!
  7. **Contoh Build Raga Unik yang Dapat Diciptakan Pemain:**
     - **Build Raga Badai Petir (Speed & Crit Assassin):** Menempah kaki dan lengan dengan `gale`, `typhoon`, `thunder` $\to$ Agility tinggi, multi-strike, dan pukulan petir kritikal.
     - **Build Raga Vajra Batu Karang (Ultimate Tank & Thorns):** Menempah torso, tulang punggung, dan kulit dengan `earth`, `sandstorm`, `frost`, `magma` $\to$ Pertahanan fisik tak tertembus dan memantulkan luka bakar/duri.
     - **Build Raga Hayat Nirwana (Endless Regen & Survival):** Menempah dantian dan organ dengan `grass`, `pool`, `dawn`, `rain` $\to$ HP raksasa, regenerasi darah per ronde, dan stamina tak terbatas.

* **Syarat Terobosan Ranah Raga:**
  - Seluruh 9 bagian tubuh **wajib mencapai level batas ranah** (misal untuk menerobos Rank 1, ke-9 bagian tubuh harus minimal Level 2; untuk menerobos Rank 2, harus minimal Level 4).


---

### 3.4. Pelebur Inti Siluman (`demonic_turbid_core`)
* **Bar Qi Kotor (Turbid Qi Bar):**
  - Mengonsumsi core monster mengisi bar Qi kotor.
  - Core Tier atas $\to$ Terkunci. Core Tier bawah $\to$ Efisiensi dipotong drastis.
  - Bar Qi kotor dicerna waktu nyata menjadi Qi kultivasi.
  - Setiap konsumsi core menambah **Indeks Korupsi Batin (Corruption Index)** yang memicu aura merah darah di profil pemain.

---

### 3.5. Penghisap Darah & Jiwa (`demonic_blood_soul`)
* **Sistem Memanen Darah & Jiwa NPC Manusia:**
  - Saat pemain mengalahkan NPC manusia (di kota, arena, atau penyamun di jalan):
  - Muncul dialog pilihan: `[🩸 Hisap Darah & Jiwa Musuh]`.
  - Berhasil menghisap $\to$ Mengisi **Bar Darah (Blood Essence Reservoir)** berdasarkan realm & level musuh manusia yang dibunuh.
  - Bar darah dicerna secara bertahap menjadi Qi kultivasi.
  - **Konsekuensi:** Menambahkan poin **Status Buronan (Infamy)**. Jika Infamy tinggi, pendekar sekte lurus akan menyerang pemain di peta!

---

### 3.6. Seribu Racun Pemusnah (`demonic_myriad_venom`)
* **Bar Racun (Poison Saturation Bar):**
  - Diisi dengan meminum item racun ber-tier (dari profesi Alkimia, Toko Tabib Gelap, atau Barter).
  - Mengonsumsi racun Tier di atas $\to$ Terkunci.
* **Efek Debuff Racun Realistis (Tanpa Kematian):**
  - Saat racun aktif di tubuh, karakter menderita status debuff: HP berkurang setiap beberapa menit.
  - **Proteksi Kematian Mutlak:** Racun **TIDAK AKAN PERNAH MEMBUNUH PEMAIN**. Pengurangan HP akan **mentok di angka 1 HP**.
* **Imunitas Racun Bertahap (Poison Tolerance):**
  - Setiap racun yang berhasil dicerna habis menghasilkan poin toleransi racun permanen (`venomToxinLevel`), membuat karakter semakin kebal terhadap racun musuh di pertempuran turn-based!

---

### 3.7. Kontrak Iblis Abyss (`demonic_abyssal_pact`) — SATU-SATUNYA LAW DENGAN ALTAR DI LAHAN PETA!
* **Pembangunan Altar Fisik di Peta Dunia:**
  - Pemain wajib membeli tanah kavling di peta dunia (`/world`).
  - Resep `Altar Kurban Darah Abyss` dimunculkan di menu konstruksi petak tanah.
* **Aturan Posisi Fisik Mutlak (Grid Verification):**
  - Penyetoran persembahan **HANYA BISA DILAKUKAN JIKA KARAKTER BERDIRI TEPAT DI KOORDINAT PETAK ALTARNYA** (`player.gridPosition.tileX === tile.tileX && player.gridPosition.tileY === tile.tileY`)!
  - Jika karakter berada di luar petak altar, tombol persembahan terkunci dengan pesan: *"Kamu harus berdiri di atas Altar Kurban Abyss milikmu untuk menyembah!"*.
* **Menu Pilihan Persembahan Beragam:**
  - Modal inventori memfilter item kategori persembahan: `Botol Esensi Darah`, `Daging Siluman Segar`, `Inti Siluman Kotor`, `Batu Obsidian Hitam Abyss`.
  - Mengisi **Bar Persembahan Abyss (Abyssal Tribute Bar)** yang dicerna menjadi Qi terobosan.
* **Sanksi Keterlambatan Upeti (Tiered Debuff):**
  - Masa berlaku upeti (misal 7 hari pada Tier 1 Altar).
  - Jika lewat 7 hari tanpa persembahan $\to$ Terkena kutukan iblis **-30% Seluruh Stat**.
  - Jika dibiarkan lewat 7 hari lagi (total 14 hari) $\to$ Kutukan meningkat menjadi **-60% Seluruh Stat**!
  - Kutukan langsung sembuh seketika setelah pemain datang ke altar dan menyetor persembahan darah baru.

---

### 3.8. Bayangan Sembilan Yin (`demonic_nether_darkness`)
* **Wilayah Kegelapan di Peta Dunia (Nether Darkness Territory):**
  - Wilayah peta berkabut hitam permanen (lembah makam kuno / jurang kematian).
* **Bar Kegelapan (Darkness Reservoir):**
  - Diisi dengan mengonsumsi item bertema kegelapan/kematian (`Batu Yin Sembilan Lapis`, `Es Karang Netherworld`).
* **Batas Waktu Toleransi di Luar Wilayah Kegelapan (Nether Safe Timer):**
  - Praktisi Sembilan Yin tidak tahan terpapar cahaya matahari dunia luar terlalu lama.
  - *Realm 0 (Mortal):* Hanya tahan 12 jam di luar wilayah gelap.
  - *Realm 2 (Foundation):* Tahan 24 jam (1 hari).
  - *Realm 4 (Nascent Soul):* Tahan 3 hari.
  - *Realm 7+ (Tribulation):* Tahan hingga 7 hari.
* **Sanksi Pelanggaran Batas Waktu:**
  - Jika timer habis saat masih berada di luar wilayah gelap $\to$ Terkena debuff **-50% Total Power (Yang Light Burning)**!
  - Begitu pemain melangkah kembali masuk ke petak Wilayah Kegelapan di peta dunia $\to$ Debuff langsung terangkat dan status kembali normal 100%.

---

## 4. SISTEM TEROBOSAN DENGAN SLOT PIL PENEROBOSAN NYATA

Sistem Major Breakthrough dilengkapi dengan **Slot Pil Penerobosan Nyata (Breakthrough Pill Slot)**:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MODAL PENEROBOSAN BESAR (MAJOR BREAKTHROUGH)         │
├────────────────────────────────────────────────────────────────────────┤
│ Status Qi Kultivasi: [15,000 / 15,000] (Penuh)                         │
│ Syarat Karakter: Level 40 (Terpenuhi)                                  │
│                                                                        │
│ [ PIL PENEROBOSAN WAJIB ]                                              │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  💊 [Slot Kosong: Klik untuk Memilih Pil dari Tas Inventori]       │ │
│ │  Contoh: Pil Pembentukan Fondasi Sembilan Awan (Tier 2)            │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│ Efek Pil: Menghilangkan Deviasi Qi & Meningkatkan Sukses +25%          │
│                                                                        │
│ [⚡ HADAPI TRIBULASI LANGIT]              [💥 EKSEKUSI TEROBOSAN]     │
└────────────────────────────────────────────────────────────────────────┘
```

* **Daftar Pil Resmi per Ranah:**
  - *Mortal $\to$ Qi Refining:* `Pil Pembersih Sumsum Fana` (Tier 1)
  - *Qi Refining $\to$ Foundation:* `Pil Pembentukan Fondasi Sembilan Awan` (Tier 2)
  - *Foundation $\to$ Core:* `Pil Kondensasi Inti Emas Murni` (Tier 3)
  - *Core $\to$ Nascent Soul:* `Pil Kelahiran Jiwa Purba` (Tier 4)
  - *Nascent Soul $\to$ Soul Transformation:* `Pil Transformasi Roh Surga` (Tier 5)
  - *Soul $\to$ Void:* `Pil Pemutus Belenggu Kehampaan` (Tier 6)
  - *Void $\to$ Tribulation:* `Pil Penembus Sembilan Halilintar` (Tier 7)
  - *Tribulation $\to$ Immortal:* `Pil Kenaikan Abadi Nirwana` (Tier 8)
* **Fungsi Pil:**
  - Tanpa pil, peluang sukses terobosan sangat kecil (30-40%) dan kegagalan menyebabkan luka parah (Qi hilang 50%).
  - Memasukkan pil yang cocok menaikkan peluang sukses hingga **85-95%** dan melindungi dantian dari kehancuran jika gagal.

---

## 5. FORMULA MATEMATIKA OTORITATIF & BALANCING ENGINE

### 5.1. Formula Tier Affinity & Decay
$$\text{Efisiensi} = \begin{cases} 
0\% \text{ (Terkunci)}, & \text{jika } \text{Tier}_{\text{item}} > \text{Tier}_{\text{pemain}} \\
100\%, & \text{jika } \text{Tier}_{\text{item}} = \text{Tier}_{\text{pemain}} \\
\max(0.15, 1 - (\text{Tier}_{\text{pemain}} - \text{Tier}_{\text{item}}) \times 0.40), & \text{jika } \text{Tier}_{\text{item}} < \text{Tier}_{\text{pemain}}
\end{cases}$$

### 5.2. Formula Peluang Fusi Gu
$$\text{Rate}_{\text{fusi}} = \max\left(10\%, 85\% - (\text{Tier}_{\text{prioritas}} \times 18\%) + (\text{Tier}_{\text{kendi}} \times 6\%)\right)$$

### 5.3. Formula Pemanenan Esensi Alam Body Tempering
$$\text{IntervalMenit}(\text{rank}) = 15 \times 2^{\text{rank}}$$
$$\text{MaxStorage}(\text{rank}) = 10 \times (\text{rank} + 1)$$

### 5.4. Formula Kapasitas & Regenerasi Qi Bertarung per Ronde
$$\text{MaxCombatQi} = 50 + (\text{RealmIndex} \times 25) + \lfloor\text{Stat}_{\text{Energy}} \times 0.5\rfloor$$
$$\text{CombatQiRegenPerRound} = 5 + (\text{RealmIndex} \times 2) + \lfloor\text{Stat}_{\text{Vitality}} \times 0.05\rfloor$$

---

## 6. BLUEPRINT SKEMA DATABASE (MODELS/PLAYER.JS)

```javascript
cultivationLaw: {
  activeLawType: { type: String, enum: LAW_TYPE_ENUM, default: null },
  boundAt: { type: Date, default: null },
  rank: { type: Number, default: 0, min: 0, max: 8 },
  stage: { type: Number, default: 0, min: 0, max: 9 },
  qi: { type: Number, default: 0, min: 0 },                  // QI KULTIVASI DANTIAN (XIUWEI)
  maxQi: { type: Number, default: 1260 },
  isChanneling: { type: Boolean, default: false },
  lastChannelSyncAt: { type: Date, default: null },

  // 1. Universal Essence Bar (Untuk Semua Law Elemen & Khusus)
  currentEssence: { type: Number, default: 80, min: 0 },
  maxEssence: { type: Number, default: 100 },
  lastEssenceDigestAt: { type: Date, default: Date.now },

  // 2. Bound Entity (Natal Artifact & Natal Beast)
  boundEntity: {
    originalItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', default: null },
    customName: { type: String, default: null },
    originalName: { type: String, default: null },
    entityType: { type: String, enum: ['artifact', 'beast', null], default: null },
    rankLevel: { type: Number, default: 0 },
    essence: { type: Number, default: 0 },
    maxEssence: { type: Number, default: 100 },
    imageUrl: { type: String, default: null },
    // Khusus Satwa Roh
    isEgg: { type: Boolean, default: false },
    hatchedAt: { type: Date, default: null },
    beastAtk: { type: Number, default: 15 },
    beastDef: { type: Number, default: 10 },
    beastMaxHp: { type: Number, default: 100 },
    beastCurrentHp: { type: Number, default: 100 },
    evolutionStage: { type: String, default: 'Telur Purba' },
    // Khusus Pusaka Jiwa
    artifactAtk: { type: Number, default: 15 },
    artifactDef: { type: Number, default: 10 },
    artifactCrit: { type: Number, default: 5 },
    artifactRes: { type: Number, default: 5 }
  },

  // 3. Body Tempering Specific: Penyimpanan Internal & Anatomi (22 Esensi Alam)
  bodyEssenceStorage: {
    // Domain Angin, Cuaca & Badai
    gale: { type: Number, default: 0 },      // Angin Liar Padang & Ngarai
    typhoon: { type: Number, default: 0 },   // Topan Pusaran Laut Mengamuk
    thunder: { type: Number, default: 0 },   // Petir Halilintar Langit
    rain: { type: Number, default: 0 },      // Titisan Hujan Deras Sejati
    mist: { type: Number, default: 0 },      // Halimun Kabut Lembah Gunung
    frost: { type: Number, default: 0 },     // Salju Dingin Glasier Abadi
    sandstorm: { type: Number, default: 0 }, // Badai Pasir Mengamuk Gurun
    // Domain Kosmik, Langit & Waktu
    solar: { type: Number, default: 0 },     // Surya Murni (Siang Terik)
    lunar: { type: Number, default: 0 },     // Embun Rembulan (Malam Hening)
    astral: { type: Number, default: 0 },    // Rasi Bintang (Tengah Malam)
    dawn: { type: Number, default: 0 },      // Fajar Sinar Ungu (Subuh)
    twilight: { type: Number, default: 0 },  // Lembayung Senja (Petang)
    eclipse: { type: Number, default: 0 },   // Gerhana Purba (Event Langka)
    meteor: { type: Number, default: 0 },    // Debu Bintang Jatuh (Meteor)
    // Domain Bentang Alam & Kehidupan
    grass: { type: Number, default: 0 },     // Tumbuhan & Herba Hutan
    pool: { type: Number, default: 0 },      // Tirta Danau & Telaga Bening
    ocean: { type: Number, default: 0 },     // Gelombang Samudra Raya
    earth: { type: Number, default: 0 },     // Urat Bumi Karang Wadas
    // Domain Ekstrem & Vulkanik
    magma: { type: Number, default: 0 },     // Bara Lahar Kawah Berapi
    miasma: { type: Number, default: 0 },    // Racun Rawa Purba Miasma
    sulfur: { type: Number, default: 0 },    // Uap Panas Belerang Geotermal
    crystal: { type: Number, default: 0 }    // Kristal Gua Bawah Tanah
  },
  bodyTemperingParts: {
    head: { type: Number, default: 1 },
    torso: { type: Number, default: 1 },
    leftArm: { type: Number, default: 1 },
    rightArm: { type: Number, default: 1 },
    leftLeg: { type: Number, default: 1 },
    rightLeg: { type: Number, default: 1 },
    spine: { type: Number, default: 1 },
    dantian: { type: Number, default: 1 },
    skin: { type: Number, default: 1 }
  },
  isTemperingPart: { type: Boolean, default: false },
  temperingPartTarget: { type: String, default: null },
  temperingCompleteAt: { type: Date, default: null },

  // 4. Gu Master Specific: Batas Equip & Satiety
  guMaxSlots: { type: Number, default: 1 },
  guSlots: [{
    guItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    guName: { type: String, required: true },
    guType: { type: String, default: 'attack' },
    tier: { type: Number, default: 1 },
    level: { type: Number, default: 1 },
    satiety: { type: Number, default: 80 },
    hunger: { type: Number, default: 80 },
    bonusAtk: { type: Number, default: 5 },
    bonusDef: { type: Number, default: 3 },
    specialEffect: { type: String, default: null },
    lastFedAt: { type: Date, default: Date.now }
  }],

  // 5. Demonic Trackers
  demonicData: {
    turbidCoresConsumed: { type: Number, default: 0 },
    corruptionIndex: { type: Number, default: 0 },
    bloodEssenceVials: { type: Number, default: 0 },
    soulBannerCaptures: { type: Number, default: 0 },
    infamy: { type: Number, default: 0 },
    venomToxinLevel: { type: Number, default: 0 },
    venomTolerancePct: { type: Number, default: 0 },
    abyssalTributeDueAt: { type: Date, default: null },
    abyssalTributeStreak: { type: Number, default: 0 },
    netherExileTimerSeconds: { type: Number, default: 86400 },
    leftNetherTerritoryAt: { type: Date, default: null },
    hasNetherDebuff: { type: Boolean, default: false }
  },

  // 6. Fasilitas (Altar Hanya untuk Abyssal di Lahan Peta)
  facilities: {
    abyssalAltarTier: { type: Number, default: 0 },
    bodyCauldronTier: { type: Number, default: 0 },
    guCrucibleTier: { type: Number, default: 1 }
  }
}
```

---

## 7. REKOMENDASI DAN IDE PENYEMPURNAAN AGENTIK

1. **Visual Efek Partikel Cuaca pada Body Tempering:**
   Tampilkan pendaran aura matahari emas saat memanen esensi di siang hari, dan pendaran bulan perak saat malam hari, sehingga pemain merasakan dampak langsung rotasi waktu dunia.
2. **Bisikan Batin Satwa Roh & Pusaka Jiwa (Flavor Text Imersif):**
   Kotak dialog kecil di kartu pusaka/satwa yang memperlihatkan interaksi emosional (misal: pedang patah berbisik terima kasih saat diasah, atau anak serigala melolong gembira saat diberi makan).
3. **Kompas Radar Wilayah Nether Darkness:**
   Indikator status di mini-map: `[🌑 Wilayah Kegelapan: AMAN]` vs `[⚠️ Di Luar Wilayah: Sisa Waktu 04:12:30 sebelum Debuff -50%]`, memberikan sensasi ketegangan survival bagi praktisi iblis bayangan.
4. **Resep Fusi Gu Rahasia (Easter Egg Mutations):**
   Kombinasi fusi tertentu berpeluang melahirkan spesies mutasi unik (misal: Gu Racun Kalajengking + Gu Ulat Es $\to$ *Gu Es Hitam Mematikan* dengan efek memperlambat musuh di battle).
5. **Aura Teritorial Altar Kurban Abyss:**
   Petak tanah tempat berdirinya Altar Abyss memancarkan kabut darah tipis di peta Tale of Immortal yang bisa dirasakan pemain lain.
6. **Pasar Gelap Pil Penerobosan (Black Market):**
   Pemain yang bukan ahli Alkimia dapat membeli pil penerobosan langka di pasar gelap pemukiman tertentu dengan harga tael perak lebih tinggi.
7. **Pembedaan Visual Bar Qi di Dashboard & Arena (Combat vs Cultivation):**
   - Di Arena Tempur: Berikan label tegas **`[⚡ COMBAT QI: 45/100]`** dengan partikel kilat biru.
   - Di Tab Kultivasi: Berikan label megah **`[☯️ INTISARI DANTIAN (XIUWEI): 12,450 / 15,000]`** dengan partikel emas berputar.
   Ini menjamin pemain 100% paham bahwa merapalkan jurus tidak akan pernah mengurangi progres kenaikan ranahnya.
8. **Item Pil Pemulih Qi Tempur Sesaat (Battle Qi Pills):**
   Sediakan pil pertempuran sekali pakai di tas (misal: `Pil Pemulih Tenaga Dalam Cepat`) yang bisa dikonsumsi di Battle Arena untuk mengisi +30 Combat Qi seketika saat ronde kritis.

---

## 8. KESIMPULAN & TAHAPAN LANGKAH IMPLEMENTASI

Rancangan di atas telah menyatukan seluruh instruksi Anda ke dalam satu kesatuan sistem yang kohesif, seimbang, realistis, dan bebas dari UI palsu, dengan penegasan pemisahan **Qi Bertarung** vs **Qi Kultivasi**.

Dokumen ini disimpan di:
- Repositori: **[`MASTER_PLAN_REVOLUSI_SISTEM_KULTIVASI_15_LAW.md`](file:///d:/gitub/bot-discord/jianghu-bot/MASTER_PLAN_REVOLUSI_SISTEM_KULTIVASI_15_LAW.md)**
- Artefak Ide: **[`master_plan_revolusi_sistem_kultivasi_15_law.md`](file:///C:/Users/User/.gemini/antigravity-ide/brain/8f59821f-9b2e-4f8f-b3bb-3db97d33cc4d/master_plan_revolusi_sistem_kultivasi_15_law.md)**

Silakan review rancangan master plan yang telah disempurnakan ini. Setelah Anda setuju, kita siap mengeksekusi tahapan implementasinya langkah demi langkah!
