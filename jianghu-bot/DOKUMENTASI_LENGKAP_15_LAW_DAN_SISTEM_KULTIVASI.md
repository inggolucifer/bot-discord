# DOKUMENTASI LENGKAP 15 HUKUM SEMESTA & SISTEM KULTIVASI (IMMORTAL-X)
## PANDUAN OTORITATIF ARSITEKTUR KULTIVASI: DARI FONDASI FANA HINGGA PUNCAK KENAIKAN ABADI

> **Dokumen Otoritatif Server & Game Design**  
> **Status:** Terverifikasi 100% dengan Basis Kode Live (`utils/cultivation.js`, `utils/lawCultivationEngine.js`, `web-api/routes/lawCultivation.js`)  
> **Target Audiens:** Arsitek Sistem, Pengembang Backend/Frontend, dan Peninjau Logika Game (Logic Audit)

---

## DAFTAR ISI

1. [FILOSOFI INTI & DUAL-SYSTEM KULTIVASI](#1-filosofi-inti--dual-system-kultivasi)
   - 1.1. Mengapa Pemilihan Law Hanya di Fondasi Fana Tahap 10?
   - 1.2. Jalur Alternatif: Kultivator Biasa (Normal Cultivator)
   - 1.3. Dual-Core Progression: Ranah Karakter vs Hukum Alam
2. [RINCIAN LENGKAP 15 HUKUM SEMESTA (SPESIFIKASI RIIL)](#2-rincian-lengkap-15-hukum-semesta-spesifikasi-riil)
   - 2.1. Kelompok A: 6 Elemen Kosmik Semesta
   - 2.2. Kelompok B: 2 Jalur Raga Jasmani & Biologis
   - 2.3. Kelompok C: 2 Jalur Ikatan Seumur Hidup (Bond)
   - 2.4. Kelompok D: 5 Jalur Iblis (Demonic Dao)
3. [SIKLUS PENCERNAAN ESENSI UNIVERSAL (UNIVERSAL ESSENCE SYSTEM)](#3-siklus-pencernaan-esensi-universal-universal-essence-system)
   - 3.1. Mekanisme Bar Esensi & Formula Kapasitas per Ranah
   - 3.2. Laju Pencernaan Real-Time & Pengaruhnya ke Progres Qi
   - 3.3. Penurunan Efisiensi Tingkat (Tier Affinity & Decay)
   - 3.4. Katalog Item Esensi Lengkap (Tier 1 s/d Tier 5+)
4. [ATURAN FASILITAS & PENEGASAN ALTAR DEMONIC](#4-aturan-fasilitas--penegasan-altar-demonic)
   - 4.1. Altar Kurban Darah Abyss (Khusus Demonic Abyssal Pact di Lahan Peta)
   - 4.2. Kuali Bak Mandi Raga (Personal Tool Body Tempering)
   - 4.3. Kendi Penyuling Gu Purba (Internal Aperture Tool Gu Master)
   - 4.4. Jalur Lain Tanpa Fasilitas / Altar
5. [PROGRESI KENAIKAN DARI MORTAL SAMPAI PUNCAK KENAIKAN ABADI](#5-progresi-kenaikan-dari-mortal-sampai-puncak-kenaikan-abadi)
   - 5.1. Hirarki 9 Ranah Karakter (System Realms)
   - 5.2. Struktur 10 Stage per Rank Law (Total 90 Stage)
   - 5.3. Mekanisme Penerobosan Kecil (Mini-Breakthrough)
   - 5.4. Mekanisme Penerobosan Besar (Major Breakthrough)
   - 5.5. Ujian Tribulasi Langit (Heavenly Tribulation)
6. [SISTEM LIMITASI & LOOP GAMEPLAY ADIKTIF](#6-sistem-limitasi--loop-gameplay-adiktif)
   - 6.1. Batas Meditasi Harian (Daily Channeling Cap) & Streak Bonus
   - 6.2. Pencerahan Harian (Daily Epiphany)
   - 6.3. Loop Kultivasi Aktif (Active Gathering Triggers)
7. [TIMELINE ESTIMASI WAKTU 1–3 TAHUN MENUJU PUNCAK](#7-timeline-estimasi-waktu-13-tahun-menuju-puncak)
   - 7.1. Perhitungan Matematis Total Hari & Bulan
   - 7.2. Roadmap Perjalanan Kultivator
8. [AUDIT LOGIKA & CHEATSHEET VERIFIKASI](#8-audit-logika--cheatsheet-verifikasi)

---

## 1. FILOSOFI INTI & DUAL-SYSTEM KULTIVASI

### 1.1. Mengapa Pemilihan Law Hanya di Fondasi Fana Tahap 10?
Di dunia Xianxia/Wuxia Jianghu, tubuh fana manusia yang belum ternodai oleh energi luar adalah satu-satunya wadah murni yang mampu mematri satu dari 15 Intisari Hukum Alam Dasar (*Heavenly Dao Laws*).

* **Kondisi Pemicu Terbuka:** Pemain harus berada di ranah **Fondasi Fana (Mortal Foundation / Realm Index 0)**, telah menyelesaikan **Tahap 10 (Stage 10)**, dan mencapai **Batas Level Karakter Lv. 20**.
* **Sifat Ikatan Seumur Hidup:** Setiap pendekar **HANYA DAPAT MEMILIH 1 HUKUM SEMESTA SEUMUR HIDUP**. Begitu menerobos ke Ranah Pemurnian Qi (*Qi Refining* / Realm Index 1), dantian telah mengkristal dan selamanya menolak hukum alam lain.

### 1.2. Jalur Alternatif: Kultivator Biasa (Normal Cultivator)
Bagi pemain yang tidak ingin terikat pada salah satu dari 15 Law spesifik, sistem menyediakan opsi **Kultivator Biasa (Ordinary / Normal Cultivator)**:
* Bebas dari batasan unsur tunggal.
* Dapat mempelajari kitab manual kungfu netral apa pun.
* Tidak memiliki sub-bar unik (seperti Gu, bagian raga, upeti iblis), namun juga bebas dari penalti korupsi atau kelaparan cacing Gu.

### 1.3. Dual-Core Progression: Ranah Karakter vs Hukum Alam
Karakter di Jianghu Bot memiliki dua mesin progresi yang saling bertaut (*mutual gating*):

```
┌────────────────────────────────────────────────────────┐
│             PROGRESI UTAMA KARAKTER                    │
│  systemCultivation: Ranah 0 (Mortal) s/d Ranah 8       │
│  (Mortal -> Qi Refining -> Foundation -> Core ...)     │
└──────────────────────────┬─────────────────────────────┘
                           │ Syarat Saling Mengunci (Mutual Gate)
                           ▼
┌────────────────────────────────────────────────────────┐
│             PROGRESI HUKUM ALAM (LAW)                  │
│  cultivationLaw: Rank 0 s/d Rank 8 (10 Stage per Rank) │
│  (Membuka Stat 5 Pilar, Skill Konstelasi, Level Cap)   │
└────────────────────────────────────────────────────────┘
```

* **Level Cap Karakter Diangkat oleh Law:** Setiap stage Law yang berhasil ditembus memberikan **+2 Max Level Cap** bagi karakter, dan setiap kenaikan Rank memberikan bonus besar **+5 Max Level Cap**.
* **Rank Law Dibatasi oleh Ranah Karakter:** Pemain tidak bisa menaikkan Rank Law jika Ranah Karakter (*systemCultivation*) dan Level Karakter belum mencukupi.

---

## 2. RINCIAN LENGKAP 15 HUKUM SEMESTA (SPESIFIKASI RIIL)

Setiap Law memiliki identitas matematis, kategori, jenis Qi yang diproduksi, penalti tribulasi (*PathMod*), dan bonus 5 Pilar Atribut yang unik.

---

### 2.1. Kelompok A: 6 Elemen Kosmik Semesta

#### 1. Api Phoenix Sejati (`element_phoenix_fire`)
* **Kategori / Elemen:** `element` / `Fire`
* **Jenis Energi:** `qi` (Samadhi Phoenix Qi)
* **PathMod Tribulasi:** `1.08` (Gelombang petir 8% lebih panas)
* **Bonus Setiap Stage:** `ATK +8`, `CRIT +2`, `Spiritual Root Fire XP +25`, `Lifespan +4 tahun`.
* **Bonus Kenaikan Rank Mayor:** `HP +100`, `ATK +20`, `DEF +15`, `Lifespan +20 tahun`, `Root Fire XP +100`.
* **Syarat Pengikatan di Mortal Stage 10:**
  - *Slot 1 (Manual):* `Kitab Hukum Api Phoenix` (Tier 1)
  - *Slot 2 (Katalis):* Item bertag `fire_catalyst` (misal: `Intisari Api Merah` / `Percikan Bara Vulkanik`)
* **9 Tingkatan Rank Unik:**
  1. *Percikan Api Kecil*
  2. *Pembakaran Awal*
  3. *Sayap Api Muda*
  4. *Nirwana Pertama*
  5. *Nyala Phoenix Bangkit*
  6. *Lahar Inti Batin*
  7. *Mahkota Api Surgawi*
  8. *Burung Api Abadi*
  9. *Phoenix Sempurna*
* **Aksi Gameplay Spesifik:** `POST /element/resonate` $\to$ Menghabiskan 10 Esensi / 15 Vitality untuk memicu resonansi api (+30 Root Fire XP, +50 Qi).

#### 2. Samudra Naga Azure (`element_azure_water`)
* **Kategori / Elemen:** `element` / `Water`
* **Jenis Energi:** `qi` (Azure Tide Qi)
* **PathMod Tribulasi:** `1.02`
* **Bonus Setiap Stage:** `HP +25`, `DEF +4`, `Spiritual Root Water XP +25`, `Lifespan +5 tahun`.
* **Syarat Pengikatan:** Manual Air Azure + Katalis Air (`Embun Es Abadi` / `Tetes Embun Pagi Dingin`).
* **9 Tingkatan Rank Unik:**
  *Tetesan Embun Pagi $\to$ Aliran Sungai Perak $\to$ Gelombang Laut Biru $\to$ Arus Deras Naga $\to$ Samudra Batin Jernih $\to$ Glasier Jiwa Beku $\to$ Pusaran Abyssal $\to$ Lautan Langit Tanpa Dasar $\to$ Naga Azure Sempurna*.
* **Aksi Gameplay Spesifik:** Resonansi Air Azure (+30 Root Water XP, +50 Qi). Menangkap ikan di danau/dermaga memberikan bonus langsung +40 Azure Qi.

#### 3. Inti Bumi Xuanwu (`element_xuanwu_earth`)
* **Kategori / Elemen:** `element` / `Earth`
* **Jenis Energi:** `qi` (Leyline Heavy Qi)
* **PathMod Tribulasi:** `0.98` (Pertahanan leylines meredam 2% damage petir)
* **Bonus Setiap Stage:** `DEF +7`, `HP +20`, `Martial RES +3`, `Spiritual Root Earth XP +25`, `Lifespan +4 tahun`.
* **Syarat Pengikatan:** Manual Xuanwu + Katalis Tanah (`Batu Inti Purba` / `Tanah Kuning Berenergi`).
* **9 Tingkatan Rank Unik:**
  *Kerikil Dasar $\to$ Tanah Liat Padat $\to$ Batu Karang Kokoh $\to$ Tebing Baja Bumi $\to$ Inti Gunung Berapi $\to$ Lempeng Benua Agung $\to$ Fondasi Leylines $\to$ Cangkang Xuanwu Purba $\to$ Xuanwu Sempurna*.
* **Aksi Gameplay Spesifik:** Resonansi Bumi (+30 Root Earth XP, +50 Qi). Menambang batu/bijih besi di grid peta memberikan bonus +35 Leyline Qi.

#### 4. Pohon Hayat Qingdi (`element_qingdi_wood`)
* **Kategori / Elemen:** `element` / `Wood`
* **Jenis Energi:** `qi` (Vitality Life Qi)
* **PathMod Tribulasi:** `1.00`
* **Bonus Setiap Stage:** `HP +35`, `Vitality +5`, `Spiritual Root Wood XP +25`, `Lifespan +8 tahun` (Umur terpanjang di antara seluruh law).
* **Syarat Pengikatan:** Manual Qingdi + Katalis Kayu (`Getah Pohon Roh Hijau` / `Benih Hayat Kaisar Qingdi`).
* **9 Tingkatan Rank Unik:**
  *Tunas Biji Pertama $\to$ Akar Rumput Liar $\to$ Batang Bambu Kokoh $\to$ Pohon Tua Berurat $\to$ Hutan Belantara Hidup $\to$ Akar Dunia Terhubung $\to$ Pohon Hayat Berbunga $\to$ Kanopi Langit Surgawi $\to$ Kaisar Hijau Sempurna*.
* **Aksi Gameplay Spesifik:** Resonansi Kayu (+30 Root Wood XP, +50 Qi). Memanen herba spiritual memberikan bonus +40 Life Qi.

#### 5. Sayap Badai Roc Kuno (`element_roc_wind`)
* **Kategori / Elemen:** `element` / `Wind`
* **Jenis Energi:** `qi` (Astral Gale Qi)
* **PathMod Tribulasi:** `1.05`
* **Bonus Setiap Stage:** `Agility +5`, `Travel Speed +3`, `Spiritual Root Wind XP +25`, `Lifespan +3 tahun`.
* **Syarat Pengikatan:** Manual Badai Roc + Katalis Angin (`Bulu Burung Roc Astral` / `Kristal Badai 90.000 Li`).
* **9 Tingkatan Rank Unik:**
  *Hembusan Lembut $\to$ Pusaran Debu Kecil $\to$ Angin Kencang Padang $\to$ Topan Bilah Tajam $\to$ Badai Petir Langit $\to$ Sayap Roc Terbentang $\to$ Tornado Sembilan Langit $\to$ Angin Astral Pembatas $\to$ Roc Kuno Sempurna*.
* **Aksi Gameplay Spesifik:** Resonansi Angin (+30 Root Wind XP, +50 Qi). Setiap langkah penjelajahan di peta dunia (*step endurance*) menghasilkan akumulasi +1.5 Gale Qi per petak langkah!

#### 6. Petir Hukuman Dewa (`element_godthunder_light`)
* **Kategori / Elemen:** `element` / `Lightning`
* **Jenis Energi:** `qi` (Heavenly Lightning Qi)
* **PathMod Tribulasi:** `1.15` (Paling liar menantang petir langit)
* **Bonus Setiap Stage:** `ATK +10`, `CRIT +3`, `Spiritual Root Lightning XP +25`, `Lifespan +3 tahun`.
* **Syarat Pengikatan:** Manual Petir Dewa + Katalis Petir (`Batu Kilat Ungu` / `Kristal Petir Azure`).
* **9 Tingkatan Rank Unik:**
  *Percikan Statis $\to$ Kilat Jemari Kecil $\to$ Sambaran Awan Hitam $\to$ Petir Langit Pertama $\to$ Rantai Petir Biru $\to$ Petir Ungu Murni $\to$ Hukuman Langit Ketujuh $\to$ Sembilan Petir Suci $\to$ Dewa Petir Sempurna*.
* **Aksi Gameplay Spesifik:** Resonansi Petir (+30 Root Lightning XP, +50 Qi). Setiap pukulan kritikal (*crit landed*) di pertempuran menyuntikkan +20 Lightning Qi langsung ke dantian.

---

### 2.2. Kelompok B: 2 Jalur Raga Jasmani & Biologis

#### 7. Penempaan Raga Suci (`body_tempering`)
* **Kategori / Elemen:** `physical` / `Physical`
* **Jenis Energi:** `true_qi` (**True Qi / 真气** — Tidak menghasilkan Qi spiritual biasa, melainkan intisari raga jasmani)
* **PathMod Tribulasi:** `1.00`
* **Bonus Setiap Stage:** `HP +35`, `DEF +6`, `Max Stamina +5`, `Vitality +4`, `Lifespan +3 tahun`.
* **Bonus Kenaikan Rank Mayor:** `HP +100`, `ATK +20`, `DEF +15`, `Max Stamina +15`, `Lifespan +20 tahun`.
* **Syarat Pengikatan:** **HANYA BUTUH SLOT 1 (Manual Raga Suci)**. *Slot 2 disembunyikan* karena raga fisik adalah satu-satunya katalis yang dibutuhkan!
* **9 Tingkatan Rank Unik:**
  *Kulit Fana Biasa $\to$ Pengerasan Daging $\to$ Tulang Besi Tempa $\to$ Otot Kawat Baja $\to$ Meridian Terbuka $\to$ Organ Emas Murni $\to$ Darah Naga Mengalir $\to$ Raga Vajra Tak Tertembus $\to$ Raga Sempurna*.
* **Sub-Bar Parameter Khusus:**
  - **Penyimpanan Internal Raga (`bodyEssenceStorage`):** Wadah batin khusus di dalam pori-pori dan jaringan fisik (terpisah dari tas ransel fisik) yang menampung **22 Esensi Alam Primordial**:
    1. *Domain Cuaca & Badai:* `gale` (Angin Liar), `typhoon` (Topan Samudra), `thunder` (Petir Langit), `rain` (Hujan Deras), `mist` (Halimun Lembah), `frost` (Salju Abadi), `sandstorm` (Badai Pasir Gurun).
    2. *Domain Langit & Waktu:* `solar` (Surya Siang), `lunar` (Rembulan Malam), `astral` (Bintang Tengah Malam), `dawn` (Fajar Sinar Ungu), `twilight` (Lembayung Senja), `eclipse` (Gerhana Purba), `meteor` (Debu Bintang).
    3. *Domain Bentang Alam & Kehidupan:* `grass` (Tumbuhan & Herba), `pool` (Tirta Telaga), `ocean` (Gelombang Samudra), `earth` (Urat Bumi Wadas).
    4. *Domain Ekstrem & Vulkanik:* `magma` (Bara Lahar), `miasma` (Racun Rawa), `sulfur` (Uap Belerang), `crystal` (Kristal Gua Bawah Tanah).
  - **9 Bagian Tubuh Anatomi Fisik (`bodyTemperingParts`):** `head`, `torso`, `leftArm`, `rightArm`, `leftLeg`, `rightLeg`, `spine`, `dantian`, `skin`.
* **Fasilitas Pendukung (Personal Tool):**
  - **`Kuali Bak Mandi Raga` (Tier 0–4):** Perkakas pribadi (tanpa butuh lahan di peta). Wajib dibuat minimal Tier 1 (15x Kayu Bambu Keras, 10x Batu Kasar Gunung, 30 Silver) untuk membuka mandi rempah.
* **Aksi Gameplay Spesifik & Pemanenan Alam Nyata:**
  - **Inhalasi Melangkah di Peta (Random Step Encounter):** Berpeluang 15–25% di setiap langkah grid untuk menghisap esensi alam sekitar sesuai cuaca dunia aktif (`WeatherConfig`), jam lokal server, dan bioma peta.
  - **Meditasi Terbuka (Environmental Breathing Stance):** Menyerap pasif 1–2 esensi alam dominan setiap 15–60 menit (tergantung ranah) saat bermeditasi di luar kota.
  - `POST /body/temper`: Menempa salah satu dari 9 bagian tubuh menggunakan esensi alam yang tersimpan di batin dengan timer countdown nyata (30s s/d 5 menit) $\to$ Bagian tubuh naik level, menghasilkan True Qi, dan menambahkan **Stat Permanen Unik** (misal `gale` $\to$ Agility & Dodge, `thunder` $\to$ Crit DMG & Stance Break, `frost` $\to$ DEF & Cold RES).
  - `POST /body/gather-essence`: Memeras daging fana (-15 Vitality) menghasilkan +75 True Qi instan.
  - Mengonsumsi daging monster (*meat eaten*) menghasilkan +80 True Qi.
  - Setiap menerima pukulan di pertempuran (*battle hit*) memicu pengerasan otot (+12 True Qi).

#### 8. Rongga Sepuluh Ribu Gu (`gu_master`)
* **Kategori / Elemen:** `special` / `Poison`
* **Jenis Energi:** `qi` (Myriad Gu Venom Qi)
* **PathMod Tribulasi:** `1.20`
* **Bonus Setiap Stage:** `ATK +6`, `Spiritual RES +3`, `Lifespan +3 tahun`.
* **Syarat Pengikatan:** Manual Rongga Gu + `Bibit Ulat Gu Fana` (tag `gu_larva`).
* **9 Tingkatan Rank Unik:**
  *Penanam Ulat Kecil $\to$ Penjaga Sarang Awal $\to$ Peternak Gu Muda $\to$ Pengendali Koloni $\to$ Master Fusi Gu $\to$ Raja Aperture $\to$ Penguasa Sepuluh Ribu $\to$ Rongga Chaos Purba $\to$ Gu Sempurna*.
* **Sub-Bar Parameter Khusus:**
  - **Daftar Cacing Gu di Rongga (`guSlots`):** Menampung hingga beberapa cacing Gu aktif. Setiap cacing memiliki `guName`, `guType` (*attack/defense/healing/speed*), `tier` (1–5), `level`, `satiety/hunger` (0–100%), dan bonus stat.
* **Fasilitas Pendukung (Internal Tool):**
  - **`Kendi Penyuling Gu Purba` (Tier 1–4):** Wadah peleburan kimiawi internal untuk fusi cacing Gu (tanpa butuh lahan di peta).
* **Aksi Gameplay Spesifik:**
  - `POST /gu/feed`: Memberi makan cacing Gu dengan item pakan (`Intisari Serangga Gu`, `Madu Ratu Kalajengking`) $\to$ Kekenyangan Gu +60%, +50 Qi. Opsi darurat: Tetes Darah Sendiri (-15 Vitality) $\to$ Kekenyangan Gu +35%, +35 Qi.
  - `POST /gu/fuse`: Menggabungkan 2 cacing Gu di Kendi Penyuling Gu $\to$ Jika sukses, melahirkan cacing mutasi tier lebih tinggi dengan stat ganda (+150 Qi). Jika gagal, residu terserap dantian (+40 Qi).
  - *Pencernaan Waktu Nyata:* Setiap menit channeling, cacing Gu mencerna makanan di rongga aperture, menurunkan satiety dan mengubahnya menjadi Qi.

---

### 2.3. Kelompok C: 2 Jalur Ikatan Seumur Hidup (Bond)

#### 9. Pusaka Jiwa Kelahiran (`natal_artifact`)
* **Kategori / Elemen:** `bond` / `Neutral`
* **Jenis Energi:** `qi` (Soul Resonance Qi)
* **PathMod Tribulasi:** `1.05`
* **Bonus Setiap Stage:** `ATK +7`, `DEF +3`, `Lifespan +3 tahun`.
* **Syarat Pengikatan:** Manual Pusaka Jiwa + Benda Biasa / Common (`Pedang Patah`, `Mangkuk Retak`, `Cincin Tembaga`, dll.). Benda fana biasa ini akan diikat dengan jiwa dan bertumbuh seumur hidup menjadi pusaka legendaris!
* **9 Tingkatan Rank Unik:**
  *Benda Fana Biasa $\to$ Pusaka Berpendar $\to$ Senjata Roh Muda $\to$ Artefak Inti Batin $\to$ Pusaka Batin Hidup $\to$ Relik Bernapas $\to$ Senjata Jiwa Terikat $\to$ Pusaka Surgawi $\to$ Pusaka Sempurna*.
* **Sub-Bar Parameter Khusus (`boundEntity`):**
  - `customName`, `rankLevel`, `essence` (0/100), `evolutionStage` (*Fana $\to$ Rohani $\to$ Bumi $\to$ Langit $\to$ Primordial Chaos*).
* **Fasilitas / Altar:** **TIDAK BUTUH ALTAR**. Penempaan jiwa dilakukan langsung dari dantian dan palu batin.
* **Aksi Gameplay Spesifik:**
  - `POST /artifact/infuse`: Mengasah pusaka jiwa menggunakan item mineral (`Bijih Besi Tempa`, `Batu Asah Roh Purba`) $\to$ Intisari pusaka bertambah +35, menghasilkan +45 Qi. Saat intisari mencapai 100%, pusaka berevolusi ke tingkat berikutnya!
  - Menempa senjata di bengkel tempa Jianghu (*equipment forged*) memicu resonansi jiwa (+50 Soul Qi).

#### 10. Satwa Roh Kelahiran (`natal_beast`)
* **Kategori / Elemen:** `bond` / `Neutral`
* **Jenis Energi:** `qi` (Blood Oath Symbiotic Qi)
* **PathMod Tribulasi:** `1.10`
* **Bonus Setiap Stage:** `HP +20`, `ATK +5`, `Lifespan +3 tahun`.
* **Syarat Pengikatan:** Manual Satwa Roh + Satwa Biasa / Common (`Anak Anjing Fana`, `Ular Rumput`, `Burung Pipit`, dll.). Hewan biasa ini menjalin sumpah darah sehidup semati bersama kultivator.
* **9 Tingkatan Rank Unik:**
  *Hewan Fana Biasa $\to$ Satwa Roh Kecil $\to$ Satwa Berbakat Muda $\to$ Macan Roh Tumbuh $\to$ Satwa Metamorfosis $\to$ Roh Purba Bangkit $\to$ Satwa Langit Terbang $\to$ Naga Roh Sejati $\to$ Satwa Sempurna*.
* **Sub-Bar Parameter Khusus (`boundEntity`):**
  - `customName`, `beastAtk`, `beastDef`, `beastMaxHp`, `beastCurrentHp`, `essence` (0/100), `evolutionStage` (*Feral Liar $\to$ Satwa Berbakat $\to$ Satwa Rohani $\to$ Siluman Sejati $\to$ Avatar Dewa Purba*).
* **Fasilitas / Altar:** **TIDAK BUTUH KANDANG / ALTAR**. Satwa roh berjalan berdampingan di samping pemain.
* **Aksi Gameplay Spesifik:**
  - `POST /beast/feed`: Memberi makan satwa dengan daging binatang buas (`Daging Siluman Berenergi`, `Jantung Monster Rawa`) $\to$ HP satwa pulih penuh, intisari satwa +40, menghasilkan +40 Qi simbiotik.
  - Bertarung berdampingan di medan tempur: Menang battle memulihkan 15 HP satwa dan memberi +35 Symbiotic Qi.

---

### 2.4. Kelompok D: 5 Jalur Iblis (Demonic Dao)

Semua jalur iblis menawarkan perolehan Qi yang sangat cepat (*high risk, high return*), namun memiliki penalti tribulasi langit yang sangat dahsyat (*PathMod tinggi*) dan resiko korupsi/buronan sekte.

#### 11. Pelebur Inti Siluman (`demonic_turbid_core`)
* **Kategori / Elemen:** `demonic` / `Dark`
* **Jenis Energi:** `qi` (Baleful Beast Qi)
* **PathMod Tribulasi:** `1.40`
* **Bonus Setiap Stage:** `ATK +8`, `DEF +3`, `Lifespan +2 tahun`.
* **Syarat Pengikatan:** Manual Inti Siluman + `Inti Siluman Kotor Tingkat 1` (tag `beast_core`).
* **9 Tingkatan Rank Unik:**
  *Penghisap Hawa Lemah $\to$ Penyerap Inti Kotor $\to$ Pembersih Core Muda $\to$ Pelebur Aura Siluman $\to$ Penguasa Miasma $\to$ Pemakan Hawa Hitam $\to$ Tiran Core Gelap $\to$ Raja Siluman Pelebur $\to$ Iblis Core Sempurna*.
* **Sub-Bar Parameter Khusus (`demonicData`):**
  - `turbidCoresConsumed` (jumlah inti yang telah dilahap)
  - `corruptionIndex` (0–100% Korupsi Hawa Siluman)
* **Aksi Gameplay Spesifik:** `POST /demonic/turbid-absorb` $\to$ Melahap inti siluman kotor dari tas (+80 Qi, +3 Korupsi Batin).

#### 12. Penghisap Darah & Jiwa (`demonic_blood_soul`)
* **Kategori / Elemen:** `demonic` / `Dark`
* **Jenis Energi:** `qi` (Blood Essence Qi)
* **PathMod Tribulasi:** `1.55` (Petir langit memburu praktisi darah)
* **Bonus Setiap Stage:** `ATK +9`, `HP +15`, `Lifespan +2 tahun`.
* **Syarat Pengikatan:** Manual Darah Jiwa + `Botol Darah Monster Segar` (tag `blood_vial`).
* **9 Tingkatan Rank Unik:**
  *Penghisap Setetes Darah $\to$ Peminum Darah Fana $\to$ Pengikat Ruh Lemah $\to$ Panji Ruh Pertama $\to$ Pencabut Nyawa Diam $\to$ Lautan Darah Beriak $\to$ Penguasa Sembilan Ruh $\to$ Raja Neraka Darah $\to$ Iblis Darah Sempurna*.
* **Sub-Bar Parameter Khusus (`demonicData`):**
  - `bloodEssenceVials` (koleksi botol darah tersimpan)
  - `soulBannerCaptures` (jumlah arwah yang terbelenggu di Panji Sembilan Ruh)
  - `infamy` (tingkat buronan sekte lurus)
* **Aksi Gameplay Spesifik:**
  - `POST /demonic/blood-harvest`: Memanen esensi darah (+1 Botol Darah, +65 Qi, +5 Status Buronan).
  - `POST /demonic/soul-banner`: Mengikat arwah gentayangan ke dalam panji (+70 Qi).
  - Menang bertarung memanen darah musuh secara otomatis (+50 Blood Qi).

#### 13. Seribu Racun Pemusnah (`demonic_myriad_venom`)
* **Kategori / Elemen:** `demonic` / `Poison`
* **Jenis Energi:** `qi` (Corrosive Toxic Qi)
* **PathMod Tribulasi:** `1.35`
* **Bonus Setiap Stage:** `DEF +4`, `Spiritual RES +5`, `Lifespan +2 tahun`.
* **Syarat Pengikatan:** Manual Seribu Racun + `Kantung Racun Ular Rawa` (tag `venom_sac`).
* **9 Tingkatan Rank Unik:**
  *Penjilat Bisa Ringan $\to$ Peminum Racun Encer $\to$ Tubuh Toleran Racun $\to$ Kantung Bisa Terbentuk $\to$ Racun Seribu Jenis $\to$ Tubuh Kebal Maut $\to$ Naga Racun Korosi $\to$ Lautan Racun Pemusnah $\to$ Iblis Racun Sempurna*.
* **Sub-Bar Parameter Khusus (`demonicData`):**
  - `venomToxinLevel` (tingkat imunitas dan daya korosi racun tubuh)
* **Aksi Gameplay Spesifik:** `POST /demonic/venom-ingest` $\to$ Meminum racun mematikan (`Empedu Racun Kalajengking`) untuk mematangkan daya korosi (+1 Toleransi Racun, +75 Qi).

#### 14. Kontrak Iblis Abyss (`demonic_abyssal_pact`) — SATU-SATUNYA LAW DENGAN ALTAR DI LAHAN PETA!
* **Kategori / Elemen:** `demonic` / `Dark`
* **Jenis Energi:** `qi` (Abyssal Void Qi)
* **PathMod Tribulasi:** `1.50`
* **Bonus Setiap Stage:** `ATK +9`, `Lifespan +2 tahun`.
* **Syarat Pengikatan:** Manual Kontrak Abyss + `Perkamen Darah Gelap` (tag `abyssal_scroll`).
* **9 Tingkatan Rank Unik:**
  *Bisikan Iblis Samar $\to$ Kontrak Pertama $\to$ Perjanjian Darah $\to$ Wadah Iblis Muda $\to$ Segel Keempat Terbuka $\to$ Tangan Kanan Iblis $\to$ Perwujudan Abyss $\to$ Pewaris Tahta Iblis $\to$ Iblis Pact Sempurna*.
* **Sub-Bar Parameter Khusus (`demonicData`):**
  - `abyssalTributeDueAt` (tenggat waktu jatuh tempo upeti kurban)
* **FASILITAS WAJIB: `Altar Kurban Darah Abyss` (Khusus di Lahan Peta):**
  - **Satu-satunya Law yang mewajibkan pembelian kavling tanah di Peta Dunia (`ZoneTile`) via `/world`!**
  - *Tier 1:* Dibangun dengan 3x Batu Obsidian Hitam Abyss, 2x Botol Esensi Darah Segar, 50 Silver (Tenggat upeti 7 hari).
  - *Tier 2:* Upgrade dengan 5x Batu Obsidian, 3x Inti Siluman Kotor, 200 Silver (Tenggat upeti 15 hari).
  - *Tier 3:* Gerbang Neraka Sembilan Tingkat, 500 Silver (Tenggat upeti 30 hari).
* **Aksi Gameplay Spesifik:**
  - `POST /demonic/pact-tribute`: Menyetor darah di Altar Abyss $\to$ Memperpanjang tenggat kontrak iblis dan menghasilkan +90 Qi.
  - *Sanksi Kadaluarsa:* Jika upeti melewati tenggat tanpa disetor di altar, kutukan iblis menjatuhkan stat tempur sebesar -30%!

#### 15. Bayangan Sembilan Yin (`demonic_nether_darkness`)
* **Kategori / Elemen:** `demonic` / `Dark`
* **Jenis Energi:** `qi` (Nether Yin Qi)
* **PathMod Tribulasi:** `1.25`
* **Bonus Setiap Stage:** `Agility +4`, `ATK +6`, `Lifespan +3 tahun`.
* **Syarat Pengikatan:** Manual Sembilan Yin + `Batu Yin Kuburan Tua` (tag `yin_stone`).
* **9 Tingkatan Rank Unik:**
  *Bayangan Pudar $\to$ Kabut Yin Tipis $\to$ Kegelapan Merayap $\to$ Jubah Malam Abadi $\to$ Domain Bayangan $\to$ Penguasa Nether Yin $\to$ Kekosongan Sembilan Lapis $\to$ Raja Kegelapan Kuno $\to$ Iblis Nether Sempurna*.
* **Aksi Gameplay Spesifik:** `POST /demonic/nether-channel` $\to$ Menyerap hawa dingin dari batu kuburan kuno (`Batu Yin Sembilan Lapis`) menghasilkan +70 Nether Qi.

---

## 3. SIKLUS PENCERNAAN ESENSI UNIVERSAL (UNIVERSAL ESSENCE SYSTEM)

Kultivasi tidak terjadi dalam ruang hampa. Semua pendekar membutuhkan **bahan bakar spiritual** yang disimpan di dalam **Bar Esensi Universal (`currentEssence` / `maxEssence`)**.

### 3.1. Mekanisme Bar Esensi & Formula Kapasitas per Ranah
Kapasitas Bar Esensi bertumbuh secara eksponensial seiring naiknya Ranah Law (Rank 0 s/d 8):

$$\text{MaxEssence}(\text{rank}) = \lfloor 100 \times 2.5^{\text{rank}} \rfloor$$

| Rank Law | Setara Ranah Karakter | Kapasitas Bar Esensi | Tingkat Item Ideal | Laju Cerna per Menit |
|:---:|---|:---:|:---:|:---:|
| **Rank 0** | Fondasi Fana (*Mortal Foundation*) | **100** | Tier 1 (Common) | 2 Esensi / menit |
| **Rank 1** | Pemurnian Qi (*Qi Refining*) | **250** | Tier 2 (Uncommon) | 3 Esensi / menit |
| **Rank 2** | Pembentukan Fondasi (*Foundation*) | **625** | Tier 3 (Rare) | 4 Esensi / menit |
| **Rank 3** | Pembentukan Inti (*Core Formation*) | **1.562** | Tier 4 (Epic) | 6 Esensi / menit |
| **Rank 4** | Roh Bayi (*Nascent Soul*) | **3.906** | Tier 5 (Legendary) | 10 Esensi / menit |
| **Rank 5** | Transformasi Roh (*Soul Transformation*) | **9.765** | Tier 6 (Mythical) | 15 Esensi / menit |
| **Rank 6** | Pemutus Kehampaan (*Void Severing*) | **24.414** | Tier 7 (Ascendant) | 22 Esensi / menit |
| **Rank 7** | Penerobosan Tribulasi (*Tribulation Crossing*) | **61.035** | Tier 8 (Immortal) | 34 Esensi / menit |
| **Rank 8** | Kenaikan Abadi (*Immortal Ascension*) | **152.587** | Tier 9 (Primordial) | 51 Esensi / menit |

### 3.2. Laju Pencernaan Real-Time & Pengaruhnya ke Progres Qi
Saat pemain melakukan meditasi (*channeling*) atau saat delta waktu offline dihitung:
1. **Esensi Dicerna:** Esensi berkurang sesuai laju pencernaan per menit:
   $$\text{DigestRate}(\text{rank}) = \max\left(1, \lfloor 2 \times 1.5^{\text{rank}} \rfloor\right)$$
2. **Kondisi Optimal (Esensi Cukup):** Pemain mendapatkan **110% perolehan Qi** (+10% bonus nutrisi spiritual optimal).
3. **Kondisi Mandek / Kelaparan (Esensi = 0):** Jika Bar Esensi kosong, pemain mengalami **Starving Penalty**. Perolehan Qi **merosot menjadi 15% dari normal**! Hal ini memaksa pemain untuk aktif berburu atau membeli bahan esensi.

### 3.3. Penurunan Efisiensi Tingkat (Tier Affinity & Decay)
Pendekar ranah tinggi menuntut nutrisi tingkat tinggi:
$$\text{Decay} = \max\left(0.2, 1 - \max(0, \text{Rank}_{\text{pemain}} - \text{Tier}_{\text{item}}) \times 0.35\right)$$
$$\text{EssenceGain} = \max\left(15, \lfloor 30 \times 2.2^{(\text{Tier}-1)} \times \text{Decay} \rfloor\right)$$

*Jika seorang pendekar Inti Emas (Rank 3) mengonsumsi item esensi fana Tier 1, perolehannya terkena penalti penurunan drastis hingga tersisa 30%.*

### 3.4. Katalog Item Esensi Lengkap (Tier 1 s/d Tier 5+)
Daftar item esensi resmi di basis data:

| Law | Tier 1 (Common) | Tier 2 (Uncommon) | Tier 3 (Rare) | Tier 4 (Epic) | Tier 5+ (Legendary) |
|---|---|---|---|---|---|
| **Petir Dewa** | Pasir Petir Halus | Batu Kilat Ungu | Kristal Petir Azure | Inti Halilintar Emas Langit | Sari Guntur Primordial |
| **Api Phoenix** | Percikan Bara Vulkanik | Intisari Api Merah | Batu Nyala Phoenix Kuno | Lahar Inti Samadhi | Api Abadi Nirwana Purba |
| **Air Azure** | Tetes Embun Pagi Dingin | Embun Es Abadi | Giok Samudra Naga Azure | Kristal Glasier Sembilan Palung | Mutiara Air Tianhe |
| **Bumi Xuanwu** | Tanah Kuning Berenergi | Batu Inti Purba | Lempeng Karang Xuanwu | Bijih Emas Leyline Bumi | Fosil Tempurung Surgawi |
| **Kayu Qingdi** | Serat Bambu Rohani | Getah Pohon Roh Hijau | Benih Hayat Kaisar Qingdi | Akar Pohon Dunia Primordial | Embun Hayat Semesta |
| **Angin Roc** | Bulu Angin Halus | Bulu Burung Roc Astral | Kristal Badai 90.000 Li | Tornado Jiwa Angin Langit | Bulu Sayap Roc Primordial |
| **Gu Master** | Serangga Tanah | Intisari Serangga Gu | Madu Ratu Kalajengking Roh | Empedu Raja Serangga Purba | Sari Ulat Purba Chaos |
| **Body Tempering** | Herba Akar Liar | Herba Tulang Besi | Darah Siluman Berenergi | Cairan Inti Tulang Vajra | Darah Naga Ilahi Purba |
| **Natal Artifact** | Bijih Besi Tempa | Batu Asah Roh Purba | Batu Roh Murni | Obsidian Hitam Langit | Kristal Jiwa Primordial |
| **Natal Beast** | Daging Mentah Segar | Daging Siluman Berenergi | Jantung Monster Rawa | Jantung Siluman Langka | Daging Monster Raja Purba |
| **Turbid Core** | Inti Binatang Fana | Inti Siluman Kotor | Inti Monster Rawa Beracun | Inti Iblis Gunung Darah | Inti Siluman Raja Gelap |
| **Blood Soul** | Botol Darah Fana | Botol Esensi Darah Segar | Botol Darah Kultivator | Esensi Darah Inti Emas | Sari Darah Iblis Purba |
| **Myriad Venom** | Jamur Beracun | Empedu Racun Kalajengking | Bisa Kalajengking Hitam | Racun Mayat Sembilan Lapis | Kantung Racun Naga Maut |
| **Abyssal Pact** | Perkamen Darah Gelap | Batu Obsidian Hitam Abyss | Tengkorak Siluman Bertanduk | Kristal Jiwa Gelap Nether | Segel Perjanjian Abyss |
| **Nether Darkness** | Batu Yin Kuburan Tua | Batu Yin Sembilan Lapis | Es Karang Netherworld | Obsidian Jiwa Gentayangan | Kristal Kematian Abadi |

---

## 4. ATURAN FASILITAS & PENEGASAN ALTAR DEMONIC

Aturan emas yang telah distabilkan pada sistem:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        KEBIJAKAN FASILITAS & ALTAR                      │
│                                                                        │
│  1. DEMONIC ABYSSAL PACT:                                              │
│     🏛️ Altar Kurban Darah Abyss adalah SATU-SATUNYA bangunan yang       │
│     wajib didirikan di atas KAVLING TANAH PETA DUNIA (ZoneTile)        │
│     dan terdaftar resmi di player.assets.                              │
│                                                                        │
│  2. BODY TEMPERING:                                                    │
│     🛁 Kuali Bak Mandi Raga adalah PERKAKAS PRIBADI PORTABLE.          │
│     TIDAK memerlukan tanah atau altar di peta!                         │
│                                                                        │
│  3. GU MASTER:                                                         │
│     🏺 Kendi Penyuling Gu Purba adalah ALAT APERTURE INTERNAL.         │
│     TIDAK memerlukan tanah atau altar di peta!                         │
│                                                                        │
│  4. 12 LAW LAINNYA:                                                    │
│     TIDAK MEMERLUKAN FASILITAS / ALTAR APAPUN.                         │
└────────────────────────────────────────────────────────────────────────┘
```

* **Altar Kurban Darah Abyss (`abyssal_altar`):**
  - Memerlukan pemain membeli kavling tanah di `/world` (`ZoneTile.ownerId === player.discordId`).
  - Merender ikon `🩸` / `👹` di kanvas Tale of Immortal.
  - Memperpanjang tenggat upeti darah agar tidak terkena debuff -30% stat.
* **Kuali Bak Mandi Raga (`body_cauldron`):**
  - Hanya membutuhkan perak & material di tas (Bambu + Batu). Tidak menyentuh database lahan peta.
* **Kendi Penyuling Gu Purba (`gu_crucible`):**
  - Mengontrol peluang keberhasilan fusi cacing Gu tingkat tinggi.

---

## 5. PROGRESI KENAIKAN DARI MORTAL SAMPAI PUNCAK KENAIKAN ABADI

### 5.1. Hirarki 9 Ranah Karakter (System Realms)
Data resmi dari `utils/cultivation.js`:

| Index | Nama Ranah (Character Realm) | Max Stage | Base Qi Capacity | Qi Rate/Menit | Base Success | Cooldown Gagal | Tribulasi Damage |
|:---:|---|:---:|:---:|:---:|:---:|:---:|:---:|
| **0** | **Fondasi Fana (Mortal Foundation)** | 10 | 1.000 s/d 15.000 | 2 - 12 | 100% | 0 Jam | 0 (Tanpa Damage) |
| **1** | **Pemurnian Qi (Qi Refining)** | 9 | 5.000 | 2 | 90% | 4 Jam | 100 DMG |
| **2** | **Pembentukan Fondasi (Foundation)** | 9 | 25.000 | 5 | 80% | 6 Jam | 250 DMG |
| **3** | **Pembentukan Inti (Core Formation)** | 9 | 125.000 | 15 | 70% | 12 Jam | ⚡ 500 DMG |
| **4** | **Roh Bayi (Nascent Soul)** | 9 | 625.000 | 40 | 60% | 16 Jam | ⚡ 1.000 DMG |
| **5** | **Transformasi Roh (Soul Transformation)** | 9 | 3.125.000 | 120 | 50% | 24 Jam | ⚡ 2.000 DMG |
| **6** | **Pemutus Kehampaan (Void Severing)** | 9 | 15.625.000 | 350 | 40% | 36 Jam | ⚡ 4.000 DMG |
| **7** | **Penerobosan Tribulasi (Tribulation)** | 9 | 78.125.000 | 1.000 | 30% | 48 Jam | ⚡⚡ 8.000 DMG |
| **8** | **Kenaikan Abadi (Immortal Ascension)** | 9 | 500.000.000 | 3.000 | 20% | 72 Jam | ⚡⚡⚡ 16.000 DMG |

### 5.2. Struktur 10 Stage per Rank Law (Total 90 Stage)
Setiap Rank Law (Rank 0 s/d 8) memiliki **10 Stage (Stage 0 s/d 9)**:
* **Total Progresi:** 9 Rank $\times$ 10 Stage = **90 Tahap Penerobosan Sepanjang Hayat**.
* Formula Kebutuhan Qi per Stage:
  $$\text{BaseQiRequired}(\text{rank}) = \lfloor 1.260 \times 2.4^{\text{rank}} \rfloor$$
  $$\text{StageMult}(\text{stage}) = 0.6 + (\text{stage} \times 0.1)$$
  $$\text{QiRequired}(\text{rank}, \text{stage}) = \lfloor \text{BaseQiRequired}(\text{rank}) \times \text{StageMult}(\text{stage}) \rfloor$$

### 5.3. Mekanisme Penerobosan Kecil (Mini-Breakthrough)
Untuk naik dari Stage 0 $\to$ 1, 1 $\to$ 2, ..., hingga 8 $\to$ 9:
* **Syarat:** Qi Dantian terisi penuh ($Qi \ge MaxQi$).
* **Peluang Sukses:** $\text{SuccessRate} = \max(50\%, 90\% - (\text{stage} \times 1\%))$.
* **Hadiah Sukses:**
  - `Stage bertambah +1`
  - `+2 Max Level Cap Karakter`
  - `+1 Law Skill Point`
  - `Bonus Atribut 5 Pilar bertambah permanen`
  - Cooldown recovery: 30 menit.
* **Penalti Gagal:**
  - Kehilangan 15% Qi dantian.
  - Cooldown pemulihan luka dalam: $2\text{ jam} + (\text{stage} \times 30\text{ menit})$.

### 5.4. Mekanisme Penerobosan Besar (Major Breakthrough)
Untuk naik dari Stage 9 $\to$ Rank Berikutnya Stage 0:
* **Syarat Mutlak:**
  1. Telah mencapai **Stage 9** pada Rank saat ini.
  2. Qi Dantian terisi penuh ($Qi \ge MaxQi$).
  3. **Syarat Level Karakter Terpenuhi** (`meetsLawRankRequirements`):
     - Rank 0 $\to$ 1: Min Realm 0, Min Level 20
     - Rank 1 $\to$ 2: Min Realm 1, Min Level 40
     - Rank 2 $\to$ 3: Min Realm 2, Min Level 60
     - Rank 3 $\to$ 4: Min Realm 2, Min Level 80
     - Rank 4 $\to$ 5: Min Realm 3, Min Level 100
     - Rank 5 $\to$ 6: Min Realm 4, Min Level 120
     - Rank 6 $\to$ 7: Min Realm 5, Min Level 150
     - Rank 7 $\to$ 8: Min Realm 6, Min Level 180
  4. Lolos Ujian Tribulasi Langit (untuk Rank 3, 5, 7, 8).
* **Peluang Sukses:** $\text{SuccessRate} = \max(30\%, 85\% - (\text{rank} \times 5\%))$.
* **Hadiah Sukses:**
  - `Rank bertambah +1`, Stage kembali ke 0.
  - Nama Gelar Rank berganti ke tingkat yang lebih mulia.
  - `+5 Max Level Cap Karakter`
  - `+3 Law Skill Points`
  - Lonjakan atribut: `HP +100`, `ATK +20`, `DEF +15`, `Lifespan +20 tahun`.

### 5.5. Ujian Tribulasi Langit (Heavenly Tribulation)
Pada penerobosan Rank **3 (Golden Core)**, **5 (Soul Formation)**, **7 (Tribulation)**, dan **8 (Immortal)**, langit menolak kenaikan derajat manusia dan menurunkan 3 gelombang petir halilintar:
* **Formula Damage Gelombang ke-$w$ ($w \in \{0, 1, 2\}$):**
  $$\text{WaveDamage}(w, \text{rank}, \text{pathMod}) = \lfloor 50 \times (1 + 0.3 \times w) \times 1.6^{(\text{rank}/2)} \times \text{pathMod} \rfloor$$
* **Formula Survival HP Pemain:**
  $$\text{SurvivalHP} = \text{BaseHP} + (\text{DEF} \times 3) + (\text{Vitality} \times 2) + (\text{Focus} \times 1.5)$$
* **Jika $\text{SurvivalHP} < \text{WaveDamage}$:** Pertahanan runtuh! Tribulasi GAGAL total, kehilangan 50% Qi dantian, dan menderita masa pemulihan dantian retak selama **24–72 jam**!

---

## 6. SISTEM LIMITASI & LOOP GAMEPLAY ADIKTIF

Agar game stabil dan tidak bisa dieksploitasi oleh bot auto-clicker:

### 6.1. Batas Meditasi Harian (Daily Channeling Cap) & Streak Bonus
* **Batas Dasar:** 90 menit meditasi per hari.
* **Bonus Login Beruntun (Streak):** +5 menit per hari berturut-turut (maksimal 7 hari = +35 menit).
* **Total Maksimal Harian:** **125 menit channeling per hari**.
* Setelah 125 menit habis, meditasi otomatis berhenti. Pemain harus menunggu reset pukul 00:00 WIB atau beralih ke kultivasi aktif di dunia Jianghu.

### 6.2. Pencerahan Harian (Daily Epiphany)
* Dapat diklaim 1x per hari (reset 00:00 WIB).
* Memberikan **+10% Qi Dantian instan** berdasarkan batas stage saat ini.
* Memberikan bonus rezeki **+25 s/d 40 Tembaga (Copper)**.

### 6.3. Loop Kultivasi Aktif (Active Gathering Triggers)
Pemain tidak hanya diam bermeditasi, tetapi juga mendapatkan Qi melalui aksi gameplay nyata:

```
┌─────────────────────────────────┬──────────────────────────────────────────┐
│ Pemicu Gameplay Nyata           │ Efek Kultivasi Aktif                     │
├─────────────────────────────────┼──────────────────────────────────────────┤
│ Memukul Musuh (Battle Hit)      │ +12 True Qi (Body Tempering) / +4 Qi     │
│ Menang Duel (Battle Victory)    │ +35-50 Qi / +50 Blood Qi / +Satwa HP     │
│ Makan Daging Liar (Meat Eaten)  │ +80 True Qi (Body Tempering)             │
│ Langkah Mikro-Grid (Per Petak)  │ +1.5 Gale Qi (Roc Wind) / +1.2 True Qi   │
│ Memancing Ikan Roh              │ +40 Azure Qi (Water Law) + 20 System Qi  │
│ Menambang Batu Mineral          │ +35 Leyline Qi (Earth Law) + 20 System Qi│
│ Memanen Herba Obat              │ +40 Life Qi (Wood Law) + 20 System Qi    │
│ Menempa Senjata di Bengkel      │ +50 Soul Qi (Natal Artifact)             │
│ Menghasilkan Pukulan Kritikal   │ +20 Lightning Qi (Thunder Law)           │
└─────────────────────────────────┴──────────────────────────────────────────┘
```

---

## 7. TIMELINE ESTIMASI WAKTU 1–3 TAHUN MENUJU PUNCAK

### 7.1. Perhitungan Matematis Total Hari & Bulan
Dengan batas harian 125 menit channeling + loop aktif + kebutuhan Qi eksponensial:

```
Rank 0: Fondasi Fana        -> 3 s/d 7 Hari       (Fase Pengenalan & Binding Law)
Rank 1: Pemurnian Qi        -> 2 s/d 3 Minggu     (Mulai Membutuhkan Esensi Tier 2)
Rank 2: Fondasi Kokoh       -> 1 s/d 1.5 Bulan    (Membangun Fasilitas / Perkakas)
Rank 3: Inti Emas           -> 3 s/d 4 Bulan      (Tribulasi Langit Pertama)
Rank 4: Roh Bayi            -> 5 s/d 6 Bulan      (Evolusi Satwa/Pusaka ke Bumi)
Rank 5: Transformasi Roh    -> 7 s/d 8 Bulan      (Tribulasi Petir Ungu)
Rank 6: Pemutus Kehampaan   -> 9 s/d 10 Bulan     (Evolusi Langit & Imunitas Racun)
Rank 7: Penyatuan Tribulasi -> 11 s/d 12 Bulan    (Tribulasi Petir Emas)
Rank 8: Kenaikan Abadi      -> 12 s/d 18 Bulan    (Status Dewa Sejati Jianghu)
---------------------------------------------------------------------------------
TOTAL ESTIMASI WAKTU:          1.5 HINGGA 3 TAHUN KOMITMEN BERMAIN NYATA
```

### 7.2. Alasan Filosofis Pacing Jangka Panjang
1. **Menghormati Lore Wuxia/Xianxia:** Kultivasi abadi membutuhkan ketekunan ribuan hari, bukan hitungan jam.
2. **Kestabilan Ekonomi Jianghu:** Mencegah hiperinflasi item, perak, dan ranah karakter.
3. **Nilai Prestise Tinggi:** Pendekar yang mencapai Inti Emas atau Roh Bayi akan sangat dihormati oleh seluruh pemain di server Discord dan Web Dashboard.

---

## 8. AUDIT LOGIKA & CHEATSHEET VERIFIKASI

Gunakan daftar periksa (*checklist*) ini untuk memverifikasi apakah ada logika yang janggal di masa mendatang:

- [x] **Altar Map Gated:** Apakah hanya `demonic_abyssal_pact` yang meminta lahan di `/world`? $\to$ **YA (Terisolasi 100%)**.
- [x] **Body Tempering:** Apakah Bak Mandi Raga berstatus perkakas pribadi tanpa butuh tanah? $\to$ **YA (`body_cauldronTier`).**
- [x] **Gu Master:** Apakah Kendi Gu berstatus alat aperture internal tanpa butuh tanah? $\to$ **YA (`guCrucibleTier`).**
- [x] **Binding Gate:** Apakah binding hanya dapat dilakukan saat `realmIndex === 0`, `stage === 10`, dan `level >= 20`? $\to$ **YA.**
- [x] **Essence Starving:** Apakah channeling memberikan penalti 15% Qi saat Bar Esensi habis? $\to$ **YA.**
- [x] **Integer Sanitization:** Apakah seluruh perhitungan Qi, HP, ATK, DEF, dan Esensi dibulatkan dengan `Math.floor()` tanpa desimal? $\to$ **YA.**
- [x] **Level Cap Integration:** Apakah setiap stage mini-breakthrough memberikan +2 level cap dan major +5 level cap? $\to$ **YA.**

---

*Dokumen ini diterbitkan secara resmi sebagai acuan absolut pembangunan game Jianghu Bot & Immortal-X.*
