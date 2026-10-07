# MASTER ENGINEERING PLAN: TIANYUAN WORLD MAP 5000×5000
## Spasial Grid, Gerbang Terrain, Sistem Gambar Seni Tinta per Grid (Guofeng Shan Shui Tile-Art), Pemilihan Titik Awal (Spawn), Penyelarasan 20 Hukum Semesta, dan Perbaikan Bug Fondasi

> **Dokumen Status**: Proposal Arsitektur & Rencana Eksekusi Teknis Lengkap (Versi 2.0 — Diperkaya Gambar Seni Tinta per Grid)  
> **Target Repositori**: `inggolucifer/bot-discord`  
> **Cabang Git**: `main`  
> **Tanggal Pembaruan**: Oktober 2026  
> **Otoritas Desain**: Arsitek AI Jianghu Bot (Immortal-X)  
> **Prinsip Utama**: Zero Handwaving • Visual Standar Tale of Immortal 1-to-1 • Server Authoritative • Anti-Desimal • Performa Skala Tinggi

---

## DAFTAR ISI

1. [Ringkasan Eksekutif (Executive Summary)](#1-ringkasan-eksekutif-executive-summary)
2. [Audit Kode & Daftar Masalah Terverifikasi (Current State Audit)](#2-audit-kode--daftar-masalah-terverifikasi-current-state-audit)
   - [2.1 Status Implementasi Komponen Utama](#21-status-implementasi-komponen-utama)
   - [2.2 Registri Bug P0 Terverifikasi (B1 – B6)](#22-registri-bug-p0-terverifikasi-b1--b6)
3. [Pilar Desain Dunia & Standar Estetika Visual (Design & Visual Pillars)](#3-pilar-desain-dunia--standar-estetika-visual-design--visual-pillars)
4. [Geografi Kanonikal Benua Tianyuan (Canonical Geography)](#4-geografi-kanonikal-benua-tianyuan-canonical-geography)
   - [4.1 Registri Wilayah Tunggal Otoritatif (Canonical Region Registry)](#41-registri-wilayah-tunggal-otoritatif-canonical-region-registry)
   - [4.2 Mesin Aturan Pergerakan & Hambatan Medan (Traversal Rules Engine)](#42-mesin-aturan-pergerakan--hambatan-medan-traversal-rules-engine)
   - [4.3 Celah Gunung & Titik Hambat Strategis (Passes & Choke Points)](#43-celah-gunung--titik-hambat-strategis-passes--choke-points)
   - [4.4 Katalog Bangunan, Pelabuhan & Fasilitas Dunia (POI Catalog)](#44-katalog-bangunan-pelabuhan--fasilitas-dunia-poi-catalog)
   - [4.5 Aturan Ambush Otoritatif: Wilayah Aman (Zero-Ambush) vs Wilayah Danger](#45-aturan-ambush-otoritatif-wilayah-aman-zero-ambush-vs-wilayah-danger)
   - [4.6 Matriks Keunikan 22 Wilayah (Unique Identity of Every Region)](#46-matriks-keunikan-22-wilayah-unique-identity-of-every-region)
5. [Arsitektur Data Skala 5000×5000 (Data Architecture)](#5-arsitektur-data-skala-50005000-data-architecture)
   - [5.1 Strategi Lapisan Prosedural O(1) vs Sparse MongoDB](#51-strategi-lapisan-prosedural-o1-vs-sparse-mongodb)
   - [5.2 Streaming Viewport & Optimasi Jaringan Frontend](#52-streaming-viewport--optimasi-jaringan-frontend)
   - [5.3 Sistem Manajemen & Caching Aset Gambar Sprite Atlas](#53-sistem-manajemen--caching-aset-gambar-sprite-atlas)
6. [Sinkronisasi Posisi Pemain (Single Source of Truth)](#6-sinkronisasi-posisi-pemain-single-source-of-truth)
   - [6.1 Penyatuan Status gridPosition & currentLocation](#61-penyatuan-status-gridposition--currentlocation)
   - [6.2 Penanganan Kondisi Balapan (Race Conditions & Concurrency)](#62-penanganan-kondisi-balapan-race-conditions--concurrency)
   - [6.3 Skrip Migrasi Anomali Posisi Karakter](#63-skrip-migrasi-anomali-posisi-karakter)
7. [Sistem Pemilihan Spawn Karakter Baru (Spawn Selector)](#7-sistem-pemilihan-spawn-karakter-baru-spawn-selector)
   - [7.1 Tujuh Titik Awal Kelahiran (Curated Origins)](#71-tujuh-titik-awal-kelahiran-curated-origins)
   - [7.2 Alur Antarmuka UI (CharacterCreationStudio.tsx)](#72-alur-antarmuka-ui-charactercreationstudiotsx)
   - [7.3 Validasi Server & Paket Perlengkapan Awal](#73-validasi-server--paket-perlengkapan-awal)
8. [Rencana Kerja Perbaikan Bug Fondasi (P0 Bug Fix Workstream)](#8-rencana-kerja-perbaikan-bug-fondasi-p0-bug-fix-workstream)
9. [Peta Jalan Integrasi 20 Hukum Semesta (Law × World Integration)](#9-peta-jalan-integrasi-20-hukum-semesta-law--world-integration)
10. [Rencana Antarmuka & Sistem Gambar per Grid (Guofeng Shan Shui Tile-Art System)](#10-rencana-antarmuka--sistem-gambar-per-grid-guofeng-shan-shui-tile-art-system)
    - [10.1 Filosofi Visual: Dari Icon Abstrak Menuju Lukisan Tinta Dinasti Song](#101-filosofi-visual-dari-icon-abstrak-menuju-lukisan-tinta-dinasti-song)
    - [10.2 Katalog Sprite Gambar Seni Tinta per Grid (Tile-Art Atlas)](#102-katalog-sprite-gambar-seni-tinta-per-grid-tile-art-atlas)
    - [10.3 Sistem Penanda Interaksi Badge Angka Minimalis (`❶`, `❷`)](#103-sistem-penanda-interaksi-badge-angka-minimalis--)
    - [10.4 Token Karakter Pendekar & Bingkai Emas Menyala](#104-token-karakter-pendekar--bingkai-emas-menyala)
    - [10.5 Jalur Trajektori Pergerakan Emas (Golden Dao Movement Ribbon)](#105-jalur-trajektori-pergerakan-emas-golden-dao-movement-ribbon)
    - [10.6 Kabut Perang Bertangga Petak (Stepped Discrete Fog of War)](#106-kabut-perang-bertangga-petak-stepped-discrete-fog-of-war)
    - [10.7 Arsitektur Pipeline 8-Layer Canvas Engine](#107-arsitektur-pipeline-8-layer-canvas-engine)
11. [Penyampaian Bertahap (Phased Delivery: Fase 0 – Fase 5)](#11-penyampaian-bertahap-phased-delivery-fase-0--fase-5)
12. [Strategi Pengujian & Metrik Keberhasilan (QA & Metrics)](#12-strategi-pengujian--metrik-keberhasilan-qa--metrics)
13. [Batasan di Luar Cakupan (Out of Scope / Non-Goals)](#13-batasan-di-luar-cakupan-out-of-scope--non-goals)
14. [Pertanyaan Terbuka & Rekomendasi Standar (Open Questions)](#14-pertanyaan-terbuka--rekomendasi-standar-open-questions)
15. [Ide Konkret Penambah Keseruan Eksplorasi (Fun Enhancements)](#15-ide-konkret-penambah-keseruan-eksplorasi-fun-enhancements)
16. [Urutan Eksekusi Rangkuman 1 Halaman (Implementation Order)](#16-urutan-eksekusi-rangkuman-1-halaman-implementation-order)

---

## 1. RINGKASAN EKSEKUTIF (EXECUTIVE SUMMARY)

Dunia Jianghu pada sistem **Immortal-X** direncanakan berskala makro **5000×5000 petak (25.000.000 tile)** yang mencakup seluruh Benua Tianyuan. Saat ini, sistem peta dunia telah memiliki fondasi mesin prosedural dasar (`proceduralWorldEngine.js`), penampil peta kanvas (`TaleOfImmortalCanvas.tsx`), dan penampil grid mikro interaktif (`ZoneGridView.tsx`).

Namun, terdapat **ketimpangan arsitektur, inkonsistensi data, dan keterbatasan visual**:
1. **Peta Masih Mengandalkan Simbol Abstrak & Bentuk Primitif**: Saat ini, peta kanvas mengandalkan segitiga kanvas sederhana atau fallback emoji tanpa adanya **tekstur gambar lukisan tinta bergaya *Tale of Immortal* (鬼谷八荒 / Guofeng Shan Shui)** yang kaya, konsisten, dan memukau per grid petak.
2. **Peta Masih Bersifat 'Padang Datar Terbuka'**: Pemain dapat berjalan lurus menembus gunung dan jurang tanpa rintangan karena batasan fisik medan hanya berupa angka acak fraktal tanpa rantai pegunungan solid yang kokoh ataupun celah gunung (*mountain pass*) yang bermakna.
3. **Karakter Baru Terkunci di Satu Titik**: Seluruh pemain baru terlahir secara kaku di satu koordinat statis (Desa Xingcun `[2455, 2485]`) tanpa opsi memilih latar belakang faksi, iklim, atau bioma asal.
4. **Penyimpangan Status Ganda (Dual Position Drift)**: Data `player.gridPosition` (koordinat tile) dan `player.currentLocation` (nama desa & region) dikelola terpisah tanpa sinkronisasi atomik.
5. **Disparitas Penamaan Wilayah (*Region Slug*)**: Terdapat 3 konvensi berbeda antar modul (`azure_mountain` vs `azure_mountain_range`, `eastern_sea` vs `eastern_sea_region`).
6. **Ekosistem 20 Law Belum Terintegrasi ke Medan**: Hasil pengumpulan sumber daya alam (*gathering*) masih menghasilkan kayu/besi tanpa tag esensi elemen, dan pembangunan fasilitas Law (`/facility/build-or-upgrade`) terpisah dari sistem kavling peta `/zone/build`.

**Tujuan Rencana Ini**: Menghadirkan cetak biru komprehensif untuk mereformasi geografi Benua Tianyuan menjadi **peta petualangan wuxia hidup yang diilustrasikan per grid dengan seni lukis tinta Guofeng Shan Shui autentik (persis seperti visual Tale of Immortal), memiliki gerbang medan (*terrain gate*), celah strategis (*choke points*), dermaga penyeberangan air, opsi titik awal kelahiran berkarakter, serta integrasi penuh dengan 20 Hukum Semesta (Law Cultivation)** tanpa membuat beban 25 juta dokumen di MongoDB.

---

## 2. AUDIT KODE & DAFTAR MASALAH TERVERIFIKASI (CURRENT STATE AUDIT)

### 2.1 Status Implementasi Komponen Utama

| Komponen | Lokasi File | Status Saat Ini | Masalah yang Ditemukan |
|---|---|---|---|
| **Definisi Wilayah Makro** | `jianghu-bot/utils/worldRegionEngine.js` | Aktif (Hanya 6 Region) | Batas kotak sederhana, slug tidak konsisten dengan modul lain, belum mencakup 22 wilayah detail. |
| **Mesin Prosedural** | `jianghu-bot/utils/proceduralWorldEngine.js` | Aktif O(1) Simplex Noise | Hambatan gunung berupa noise acak (`elevation > 0.75`). Tidak ada struktur rantai gunung solid, jalan raya, atau celah celah bernama. |
| **Model Data Tile** | `jianghu-bot/models/ZoneTile.js` | Aktif (Sparse DB) | Memiliki properti `isSolid`, `terrainType`, `resourceType`. Namun belum memiliki skema `traversalRule` yang terstandarisasi. |
| **Posisi Karakter** | `jianghu-bot/models/Player.js` | Aktif | Memiliki 2 field terpisah: `currentLocation` (regionSlug, settlementName) dan `gridPosition` (zoneId, tileX, tileY). Nilai default skema berbeda dengan auth. |
| **Rute Pergerakan Grid** | `jianghu-bot/web-api/routes/world.js` | Aktif (`/zone/step-move`) | Hanya memvalidasi `tileInfo.isSolid` untuk `ocean` dan `mountain`. Tidak memperbarui `currentLocation` saat berpindah ribuan langkah. |
| **Perjalanan Jarak Jauh** | `jianghu-bot/web-api/routes/world.js` | Aktif (`/travel/start`, `/travel/status`) | Saat pemain tiba di pemukiman baru, hanya `currentLocation` yang diperbarui; `gridPosition` **tidak disentuh**. |
| **Kelahiran Karakter** | `jianghu-bot/web-api/routes/auth.js` | Aktif | Posisi hardcoded ke Desa Xingcun (2455, 2485) di 5 lokasi endpoint berbeda. Tidak ada parameter pemilihan bioma asal. |
| **Fasilitas Hukum Alam** | `jianghu-bot/web-api/routes/lawCultivation.js` | Aktif (`/facility/build-or-upgrade`) | Memodifikasi `ZoneTile` secara ad-hoc tanpa validasi aturan kavling standar di `world.js`. |
| **Pengumpulan Sumber Daya** | `jianghu-bot/services/forageTrainingService.js` | Aktif | Mengeluarkan item generik (`Kayu Mentah`, `Serat Tumbuhan`, `Bijih Besi`) tanpa membaca bioma atau membubuhkan tag Law. |
| **Kanvas Peta Shan Shui** | `web-dashboard/src/components/map/TaleOfImmortalCanvas.tsx` | Aktif (Fallback Bentuk Sederhana) | Menggambar segitiga gunung dan kotak warna datar jika URL di `GLOBAL_ASSETS` kosong. Belum menggunakan aset sprite lukisan tinta per grid yang terpadu. |
| **Antarmuka Buat Karakter** | `web-dashboard/src/components/auth/CharacterCreationStudio.tsx` | Aktif | Hanya memilih wajah, rambut, dan baju. Belum ada kartu seleksi bioma asal kelahiran. |

---

### 2.2 Registri Bug P0 Terverifikasi (B1 – B6)

#### [BUG B1] Dual Position Sync Drift
- **Bukti Kode**:
  - `world.js` baris 2095–2126 (`/zone/step-move`): Hanya menyimpan `player.gridPosition.tileX` dan `player.gridPosition.tileY`. Field `player.currentLocation` dibiarkan utuh.
  - `world.js` baris 403–412 (`/travel/status`): Hanya menyimpan `player.currentLocation.settlementName` dan `regionSlug`. Field `player.gridPosition` tidak diselaraskan ke koordinat pemukiman terkait.
  - `world.js` baris 109–145 (`/location`): Mengembalikan `currentLocation` dan `gridPosition` yang bertolak belakang.
- **Dampak Gameplay**: Pemain yang berjalan kaki dari Dataran Tengah ke Domain Iblis masih dianggap berada di penginapan Desa Xingcun oleh sistem NPC kota, kedai, dan perjamuan.

#### [BUG B2] Region Slug Fragmentation
- **Bukti Kode**:
  - `worldRegionEngine.js`: Menggunakan `azure_mountain`, `eastern_sea`, `southern_demon`, `western_desert`, `northern_desolate`.
  - `config/travelDistances.js` & `regionClimate.js`: Menggunakan `azure_mountain_range`, `eastern_sea_region`, `southern_demon_domain`, `western_sacred_deserts`, `northern_desolate_territory`.
  - `config/explorationLocations.js`: Menggunakan campuran kedua format.
- **Dampak Gameplay**: Kondisi cuaca, iklim, dan kalkulasi jarak gagal sinkron karena pencocokan string `regionSlug` menghasilkan `undefined`.

#### [BUG B3] Law Facility vs Zone/Build Dual Path Mutation
- **Bukti Kode**:
  - `routes/world.js` baris 2833 (`/zone/build`): Menggunakan alur izin kavling tanah, pemotongan material inventori, dan pembuatan dokumen `Asset`.
  - `routes/lawCultivation.js` baris 1942 (`/facility/build-or-upgrade`): Mengambil petak kepemilikan pemain pertama yang ditemukan, langsung mengubah string `targetPlot.buildingName = facilityName` dan `buildingType = 'crafting_station'`, menyelaraskan ke `player.cultivationLaw.facilities`, namun **tidak sinkron** dengan validasi kavling di `world.js`.
- **Dampak Gameplay**: Terjadi duplikasi atau penimpaan bangunan secara liar jika pemain membangun fasilitas biasa lalu menimpanya dengan Altar Darah tanpa verifikasi tata ruang.

#### [BUG B4] Resource Harvest Returns Generic Items Without Law Tags
- **Bukti Kode**:
  - `forageTrainingService.js` baris 53–69: Hardcoded membuat/memberikan `'Kayu Mentah'`, `'Serat Tumbuhan'`, `'Bijih Besi'` tanpa properti `tags` di dokumen `Item`.
  - Sementara itu, sistem 20 Hukum Semesta di `lawCultivationEngine.js` mewajibkan bahan dengan tag spesifik seperti `gu_food`, `blood_vial`, `turbid_core`, `abyssal`, `fire_essence`, `water_essence`, `yang_essence`, `thunder_stone`.
- **Dampak Gameplay**: Eksplorasi alam liar tidak memberikan kontribusi nyata bagi penembusan tahap kultivasi Law.

#### [BUG B5] Step-Move Mengabaikan Traversal Rules Spesifik (Lava, Racun, Puncak Terjal)
- **Bukti Kode**:
  - `world.js` baris 2020–2030: Validasi fisik pergerakan hanya mengecek `tileInfo.isSolid` dasar untuk gunung dan laut.
- **Dampak Gameplay**: Gunung obsidian berapi di Lava Spine dapat dilompati dengan mudah asalkan nilai noise tidak menghasilkan solid, dan rawa racun mematikan dapat dilintasi tanpa penalti stamina/racun bergradasi.

#### [BUG B6] Disparitas Slug Lokasi Eksplorasi (Exploration Locations Mismatch)
- **Bukti Kode**:
  - `config/explorationLocations.js` mendefinisikan lokasi ekspedisi dengan nama provinsi statis (`provinsi_qingzhou`, `provinsi_yanzhou`) yang tidak memiliki jangkar koordinat `tileX, tileY` pada peta makro 5000×5000.
- **Dampak Gameplay**: Fitur ekspedisi afk berjalan di dunia paralel yang terputus dari posisi fisik karakter di peta interaktif.

---

## 3. PILAR DESAIN DUNIA & STANDAR ESTETIKA VISUAL (DESIGN & VISUAL PILLARS)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   6 PILAR UTAMA TIANYUAN MASTER PLAN                   │
├─────────────────┬─────────────────┬──────────────────┬─────────────────┤
│ 1. PETUALANGAN  │ 2. GEOGRAFI     │ 3. ASAL          │ 4. SINERGI      │
│    BERKELOK     │    SOLID        │    KELAHIRAN     │    20 HUKUM     │
│  (Choke Points, │  (Obsidian,     │  (Pilihan Bioma  │  (Bioma Sesuai  │
│   Passes, Docks)│   Lava, Rawa)   │   & Latar Faksi) │   Esensi Elemen)│
├─────────────────┴─────────────────┴──────────────────┴─────────────────┤
│ 5. STANDAR ESTETIKA VISUAL GUOFENG SHAN SHUI (GAMBAR PER GRID)         │
│    • Bebas Icon Abstrak / Emoji Murahan • Lukisan Tinta Dinasti Song   │
│    • Puncak Cyan, Rumpun Pinus, Gua Berakar Hitam, Garis Dao Emas     │
│    • Indikator Interaksi Badge Bulat Berangka Minimalis (❶, ❷)        │
├────────────────────────────────────────────────────────────────────────┤
│ 6. ARSITEKTUR SKALA TINGGI (O(1) Prosedural + Sparse MongoDB)          │
│    • Zero 25M Documents • Viewport Streaming 33x33 • Anti-Lag 60 FPS   │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Petualangan Berliku, Bukan Padang Datar Kosong**:
   - Peta dipenuhi rantai pegunungan terjal alami, jurang pemisah, dan perairan yang memaksa pemain mengambil rute memutar, melewati pos penjagaan gerbang celah (*mountain passes*), menaiki rakit penyeberangan, atau mengambil jalur setapak berbahaya (*danger trails*).
2. **Hambatan Medan Nyata & Server Authoritative**:
   - Kaki biasa hanya dapat melangkah di tanah datar, jalan setapak, padang rumput, dan hutan terbuka.
   - Dinding gunung obsidian murni **100% BLOCKED** bagi pejalan kaki biasa tanpa artefak terbang tingkat tinggi.
   - Perairan dalam dan samudra luas mewajibkan perahu, kapal feri, atau mount air.
3. **Pilihan Asal Kelahiran Karakter yang Bermakna**:
   - Pemain baru diberikan kebebasan memilih titik awal petualangan dari **7 Wilayah Asal** yang dikurasi dengan cermat.
4. **Keselarasan Organik dengan 20 Hukum Semesta (Law Cultivation)**:
   - Sumber daya alam di setiap bioma menghasilkan material bertag yang dibutuhkan untuk kultivasi Law terkait.
5. **Standar Estetika Visual Gambar per Grid (Guofeng Shan Shui)**:
   - Setiap petak grid menampilkan gambar seni lukis tinta berkualitas tinggi yang menyatu mulus (*seamless blending*).
   - Menghilangkan sepenuhnya segitiga kanvas kasar, icon flat modern, dan emoji.
   - Mengadopsi visual autentik *Tale of Immortal* (鬼谷八荒): puncak gunung giok-cyan berselimut kabut putih, rumpun pinus tua meliuk, mulut gua purba gelap berakar hitam, garis trajektori kuning emas berpendar, token karakter dengan bingkai emas berpedang, dan kabut perang bertangga petak (*stepped discrete fog of war*).
6. **Skalabilitas 5000×5000 Tanpa Beban Basis Data**:
   - Pendekatan hybrid: perhitungan medan prosedural deterministik O(1) di memori backend, dipadukan dengan dokumen MongoDB sparse hanya untuk petak yang memiliki kepemilikan, bangunan, monster aktif, atau modifikasi pemain.

---

### 3.1 Manifesto Anti-UI Palsu & Anti-AI Slop (Production Quality Guarantee)

Untuk menjamin kualitas game setara game profesional komersial dan memberantas praktik murahan:

#### A. Protokol Anti-UI Palsu (Real Authoritative State Machine)
- **Nol Mocking / Tombol Palsu**: Dilarang membuat tombol atau interaksi di peta yang hanya menampilkan alert/toast pura-pura tanpa mutasi nyata di server backend.
- **Setiap Interaksi Terhubung ke Database**: Klik pada badge `❶` (panen herba) memicu pemotongan stamina nyata, pemberian item bertag ke inventori MongoDB, dan setting cooldown petak `nodeRespawnAt`.
- **Zero Decimal Policy**: Seluruh parameter numerik di lembar status, stamina langkah, temperatur petak, dan harga tanah wajib dibulatkan menjadi integer murni (`Math.floor`), meniadakan angka desimal cacat seperti `14.2837492`.
- **Konsistensi Dua Sisi**: Posisi karakter di antarmuka (koordinat pin emas) dan posisi di database (`gridPosition` & `currentLocation`) harus selalu sinkron 100% dalam setiap request HTTP.

#### B. Protokol Anti-AI Slop (Authentic Ink-Wash Artistry)
- **Nol Gambar Acak Terdistorsi**: Dilarang menggunakan gambar AI yang memiliki artefak aneh, visual buram, gaya kartun anime modern campur aduk, atau tulisan acak tak bermakna di dalam aset gambar.
- **Harmoni Palet Warna Dinasti Song**: Seluruh sprite lukisan tinta wajib mengikuti palet warna kanonikal Guofeng:
  - *Cyan-Giok Puncak*: `#689a8c` & `#4a685f`
  - *Air Celadon Tenang*: `#a8cdda` & `#84af9b`
  - *Kertas Xuan Perkamen*: `#faf8f4` & `#f5eedc`
  - *Tinta Bambu Hitam*: `#1c2d22` & `#2b382d`
  - *Pita Emas Trajektori*: `#f59e0b` & `#d97706`
- **Presisi Unit Grid 128px**: Setiap sprite dipotong presisi berdimensi kelipatan unit grid ($128\times128$ untuk 1 petak, $256\times256$ untuk 2x2 petak, $384\times256$ untuk 3x2 petak), dengan transparansi tepi lembut agar membaur alami (*seamless edge fade*) tanpa garis kotak tajam yang kaku.
- **Graceful Procedural Fallback**: Jika koneksi jaringan lambat dan sprite WebP sedang diunduh, Canvas Engine merender lukisan tinta prosedural berkualitas tinggi (sapuan kuas kanvas) dan bertransisi mulus ke sprite WebP begitu aset siap, menolak layar putih kosong atau kotak silang patah.

---

## 4. GEOGRAFI KANONIKAL BENUA TIANYUAN (CANONICAL GEOGRAPHY)

Sesuai peta skematik resmi **Tianyuan Continent Schematic Map (5000×5000)**:
- **Sumbu Y**: `0` adalah batas paling **Selatan** (panas, lahar, rawa iblis); `5000` adalah batas paling **Utara** (tundra es, salju abadi).
- **Sumbu X**: `0` adalah batas paling **Barat** (gurun pasir suci, ngarai terjal); `5000` adalah batas paling **Timur** (samudra luas, gugusan pulau terbang).
- **Pusat Benua**: Koordinat `[2000..3200, 2000..3200]` adalah **Dataran Tengah (Central Plains)** yang subur dan aman.
- **Tembok Pemisah**: **Pegunungan Azure (Azure Mountain Range)** membentang melintang memisahkan Dataran Tengah dari Benua Utara, hanya dapat ditembus melalui 3 celah utama: **North Pass**, **Mist Pass**, dan **Sword Gorge Pass**.

```
Y: 5000 ┌────────────────────────────────────────────────────────────────────────┐
        │ [NORTHERN DESOLATE]      [GREAT NORTH WALL]       [GODTHUNDER PEAKS]   │
        │ Northern Fortress          Thundersteppe              Mirror Lake      │
        │      ▲                           ▲                         ▲           │
Y: 3400 ├──────┼───────────────────────────┼─────────────────────────┼───────────┤
        │ [AZURE MOUNTAIN RANGE] ═══ (North Pass) ═══ (Mist Pass) ═══ (Sword     │
        │ (Impassable Solid Ridge)                                   Gorge Pass) │
Y: 3000 ├────────────────────────────────────────────────────────────────────────┤
        │ [WESTERN DESERT]      [CENTRAL PLAINS]           [FORMATION BARRENS]   │
        │ Shadi Oasis           Xingcun • Tianyuan Capital      Ore Teeth Range  │
        │ Caravan Gate          Luohe City • Merit Temple       Donghai Port     │
Y: 1800 ├────────────────────────────────────────────────────────────────────────┤
        │ [LAVA SPINE]          [SOUTHERN DEMON DOMAIN]    [SPIRIT WOOD SEA]     │
        │ Volcanic Peaks        Nanye Dark City • Blood     Mist Insect Valley   │
        │ [VENOM MIRE]          Camp • Crimson Battlefield • Pirate Reef         │
Y: 0000 └────────────────────────────────────────────────────────────────────────┘
        X: 0000                 X: 2500                    X: 5000
```

---

### 4.1 Registri Wilayah Tunggal Otoritatif (Canonical Region Registry)

| regionId | displayName | Bounds (minX, maxX, minY, maxY) | Biome Primer | Temp (°C) | Qi Base / Mod | Danger Tier | Walk Default | Afinitas Law | Pemukiman Utama | Visual Tile-Art Utama | Profil Material Drop (Tags) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `central_plains` | Central Plains | 1800, 3200, 2000, 3100 | Dataran Rumput & Bambu | 18 s/d 26 | 12 (1.0x) | 1 | `open` | `righteous_heavenly_merit`, `righteous_pure_yang` | Tianyuan Capital, Desa Xingcun, Luohe City | Padang Rumput Kertas Xuan, Rumpun Bambu Hijau | `basic_wood`, `plain_herb`, `iron_ore`, `merit_crystal` |
| `azure_mountain_range` | Azure Mountain Range | 1500, 3600, 3100, 3600 | Tebing Batu Pualam & Bambu Kabut | 2 s/d 14 | 24 (1.5x) | 3 | `restricted` | `righteous_sword_heart`, `element_roc_wind` | Pos Celah Azure, Kuil Puncak Pedang | Puncak Gunung Cyan-Giok Megah (2x2/3x2), Kabut Putih | `spirit_bamboo`, `azure_iron`, `sword_shard`, `frost_herb` |
| `northern_desolate` | Northern Desolate | 1000, 3200, 3600, 5000 | Tundra Beku & Padang Salju | -25 s/d -5 | 18 (0.9x) | 4 | `restricted` | `element_azure_water`, `body_tempering` | Benteng Utara, Desa Salju Xueyu | Puncak Es Glasial Putih-Biru, Pohon Kering Beku | `glacial_ice`, `frost_lotus`, `beast_fur`, `pure_water_essence` |
| `thundersteppe` | Thundersteppe | 1800, 2800, 3800, 4600 | Sabana Halilintar Terbuka | -5 s/d 12 | 26 (1.4x) | 4 | `open` | `element_godthunder_light` | Kemah Pemburu Petir | Padang Rumput Hangus, Tiang Batu Konduktif | `thunder_stone`, `storm_grass`, `lightning_core` |
| `godthunder_peaks` | Godthunder Peaks | 3200, 4200, 4000, 5000 | Puncak Gunung Petir Abadi | -15 s/d 5 | 35 (1.8x) | 5 | `restricted` | `element_godthunder_light` | Paviliun Guntur Surgawi | Tebing Granit Runcing dengan Sinar Kilat | `divine_thunder_crystal`, `celestial_essence` |
| `mirror_lake` | Mirror Lake | 3000, 3800, 3400, 4200 | Danau Tenang Spiritual | 8 s/d 16 | 28 (1.6x) | 2 | `restricted` | `righteous_karmic_mirror`, `element_azure_water` | Biara Cermin Tenang, Dermaga Cermin | Danau Air Tenang Celadon, Pulau Bukit Kecil | `mirror_water`, `lotus_seed`, `karma_sand` |
| `beast_prairies` | Beast Prairies | 1000, 1800, 3400, 4200 | Padang Penggembalaan Satwa | 5 s/d 18 | 20 (1.1x) | 3 | `open` | `natal_beast` | Desa Pawang Satwa | Savana Kuning Hijau, Bukit Rendah Batu | `beast_bone`, `wild_tendon`, `beast_essence_herb` |
| `western_sacred_desert` | Western Sacred Desert | 0, 1600, 2000, 4000 | Gurun Pasir Emas & Bukit Pasir | 35 s/d 48 | 15 (0.9x) | 3 | `open` | `righteous_pure_yang`, `element_phoenix_fire` | Oasis Shadi, Gerbang Karavan | Bukit Pasir Emas Berombak, Kaktus Tinta | `solar_sand`, `fire_cactus`, `sun_crystal`, `camel_bone` |
| `western_canyon_labyrinth` | Western Canyon Labyrinth | 0, 1200, 1200, 2200 | Ngarai Jurang Labirin Merah | 30 s/d 42 | 22 (1.2x) | 4 | `restricted` | `body_tempering`, `element_xuanwu_earth` | Pos Pengintai Ngarai | Tebing Batu Cadas Terakota Terjal | `earth_marrow`, `granite_core`, `sand_essence` |
| `lava_spine` | Lava Spine | 800, 1800, 600, 1800 | Rantai Gunung Berapi Magma | 45 s/d 70 | 32 (1.7x) | 5 | `restricted` | `element_phoenix_fire`, `body_tempering` | Pos Tempa Kawah Berapi | Cadas Obsidian Hitam Retak dengan Sungai Magma | `phoenix_ember`, `molten_slag`, `sulfur_crystal`, `fire_essence` |
| `venom_mire` | Venom Mire | 0, 1000, 400, 1600 | Rawa Gas Beracun Kelabu | 28 s/d 38 | 20 (1.1x) | 4 | `restricted` | `demonic_myriad_venom`, `gu_master` | Kampung Racun Kelabu | Rawa Lumpur Ungu Kelabu, Jamur Raksasa Beracun | `venom_sac`, `toxic_spore`, `mire_mud`, `poison_herb` |
| `southern_demon_domain` | Southern Demon Domain | 1600, 3200, 600, 1800 | Hutan Hitam Muram & Tanah Gersang | 26 s/d 36 | 25 (1.3x) | 4 | `open` | `demonic_turbid_core`, `demonic_nether_darkness` | Kota Kegelapan Nanye, Kemah Darah | Hutan Pohon Hitam Tanpa Daun, Tanah Gelap | `turbid_core`, `dark_stone`, `demonic_tendon`, `shadow_grass` |
| `crimson_battlefield` | Crimson Battlefield | 2400, 3400, 400, 1200 | Tanah Bekas Perang Arwah Merah | 24 s/d 34 | 28 (1.5x) | 5 | `open` | `demonic_blood_soul` | Pos Arwah Merah | Tanah Merah Tua, Gundukan Pedang Patah Kuno | `blood_vial`, `soul_dust`, `rusted_weapon_shard` |
| `abyssal_scar` | Abyssal Scar | 1600, 2200, 200, 1000 | Jurang Retakan Dimensi Jurang | 15 s/d 25 | 38 (2.0x) | 5 | `restricted` | `demonic_abyssal_pact` | Altar Kurban Terlarang | Jurang Retakan Hitam Tanpa Dasar, Kabut Violet | `abyssal_scroll`, `nether_shard`, `fiend_blood` |
| `spirit_wood_sea` | Spirit Wood Sea | 3200, 4200, 800, 1800 | Hutan Belantara Purba Lebat | 20 s/d 28 | 26 (1.4x) | 3 | `restricted` | `element_qingdi_wood`, `natal_beast` | Kampung Penjaga Hutan Roh | Rimba Pohon Raksasa Berkanopi Lebat | `thousand_year_wood`, `qingdi_sprout`, `vitality_sap` |
| `mist_insect_valley` | Mist Insect Valley | 4000, 4800, 600, 1600 | Lembah Kabut Serangga Rimba | 25 s/d 35 | 22 (1.2x) | 4 | `restricted` | `gu_master`, `demonic_myriad_venom` | Lembah Rahasia Gu Wudu | Mulut Gua Karst Lembab Berakar Belukar Liar | `gu_larva`, `insect_shell`, `gu_food_herb`, `myriad_toxin` |
| `southern_plague_woods` | Southern Plague Woods | 3000, 3800, 200, 900 | Hutan Jamur Hawa Busuk | 24 s/d 34 | 18 (1.0x) | 4 | `restricted` | `gu_master`, `demonic_myriad_venom` | Pos Tabib Pengasingan | Hutan Jamur Busuk Kelabu, Spora Mengambang | `plague_spore`, `festering_root`, `black_fungus` |
| `formation_barrens` | Formation Barrens | 3200, 4000, 2200, 3000 | Dataran Berbatu Formasi Kuno | 16 s/d 26 | 30 (1.6x) | 3 | `open` | `righteous_formation_array`, `element_xuanwu_earth` | Paviliun Formasi Langit | Tiang Monolit Batu Segel Rune Bersinar | `formation_flag_pole`, `array_jade`, `spirit_magnet` |
| `sword_gorge` | Sword Gorge | 3200, 3600, 2800, 3400 | Jurang Sempit Hawa Pedang | 6 s/d 16 | 34 (1.8x) | 4 | `restricted` | `righteous_sword_heart`, `natal_artifact` | Paviliun Bilah Sejati | Tebing Runcing Mirip Bilah Pedang Terhunus | `sword_intent_stone`, `tempered_steel`, `blade_ore` |
| `ore_teeth_range` | Ore Teeth Range | 3600, 4400, 1800, 2600 | Pegunungan Gerigi Tambang Bijih | 14 s/d 24 | 20 (1.2x) | 3 | `restricted` | `natal_artifact`, `element_xuanwu_earth` | Desa Pandai Besi Tiedao | Puncak Runcing Batu Abu Gelap dengan Urat Logam | `heavy_iron_ore`, `black_gold_grain`, `spirit_copper` |
| `eastern_sea` | Eastern Sea | 3800, 5000, 1200, 4000 | Samudra Lepas Ombak Pasang | 18 s/d 28 | 22 (1.2x) | 3 | `restricted` | `element_azure_water` | Pelabuhan Donghai, Turtle Island | Samudra Ombak Tinta Biru Tua, Gugusan Terumbu Karang | `ocean_pearl`, `deep_sea_coral`, `azure_essence`, `spirit_fish` |
| `floating_wind_isles` | Floating Wind Isles | 4200, 5000, 2200, 3200 | Kepulauan Karang Melayang Angin | 10 s/d 20 | 36 (1.9x) | 5 | `restricted` | `element_roc_wind` | Paviliun Angin Surgawi | Karang Melayang di Atas Awan Putih | `wind_feather`, `sky_jade`, `cyclone_core`, `flying_stone` |

---

### 4.2 Mesin Aturan Pergerakan & Hambatan Medan (Traversal Rules Engine)

```typescript
export enum TraversalRule {
  WALK = 'walk',                     // Kaki biasa dapat melintas tanpa syarat
  BLOCKED = 'blocked',               // Tebing granit obsidian, dinding tanpa pintu (TIDAK BISA DITEMBUS)
  SWIM_OR_BOAT = 'swim_or_boat',     // Perairan dalam/laut (Wajib kapal, rakit, atau mount perairan)
  CLIMB_OR_FLY = 'climb_or_fly',     // Jurang melayang/tebing tinggi (Wajib mount pedang terbang)
  HEAT_IMMUNE = 'heat_immune',       // Aliran lahar/kawah aktif (Wajib mount tahan api, Law Phoenix, atau Pil Redam Api)
  POISON_RESIST = 'poison_resist',   // Rawa beracun tebal (Wajib penawar racun, Law Gu/Venom, atau masker)
  COLD_RESIST = 'cold_resist',       // Puncak es glasial ekstrem (Wajib jubah bulu atau Law Es/Air)
  ROAD_ONLY = 'road_only'            // Jalur rimba tertutup (Melangkah di luar jalan setapak menghabiskan 3x stamina)
}
```

---

### 4.3 Celah Gunung & Titik Hambat Strategis (Passes & Choke Points)

Rantai Pegunungan Azure dan bukit-bukit batu lainnya dirancang sebagai dinding tebal solid (lebar 4–8 petak). Pemain tidak dapat menembus dinding ini selain melalui **Celah Gerbang Resmi (Passes)**:
1. **North Pass (Celah Utara)** — `[X: 2200, Y: 3250]`: Menghubungkan Dataran Tengah dengan Thundersteppe dan Northern Fortress.
2. **Mist Pass (Celah Kabut)** — `[X: 2800, Y: 3250]`: Menghubungkan Dataran Tengah dengan Danau Cermin (Mirror Lake).
3. **Sword Gorge Pass (Celah Jurang Pedang)** — `[X: 3350, Y: 3180]`: Menghubungkan Dataran Tengah dengan Sword Gorge dan Formation Barrens.
4. **Caravan Gate (Gerbang Karavan Barat)** — `[X: 1600, Y: 2500]`: Gerbang masuk ke Gurun Pasir Suci.
5. **Great North Wall Gate (Gerbang Tembok Utara)** — `[X: 2500, Y: 4400]`: Gerbang benteng pembatas menuju Tundra Salju Liar.

---

### 4.4 Katalog Bangunan, Pelabuhan & Fasilitas Dunia (POI Catalog)

Setiap wilayah memiliki titik labuh peradaban (*Points of Interest*) yang menampung fasilitas vital:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      KATALOG FASILITAS & POI UTAMA                          │
├──────────────────────┬──────────────────────┬───────────────────────────────┤
│ PEMUKIMAN PERADABAN  │ SEKTOR SEPARATIS &   │ FASILITAS HUKUM ALAM          │
│ (Civil Infrastructure)│ SEKTE SILAT (Sects) │ (Law Landmarks & Shrines)     │
├──────────────────────┼──────────────────────┼───────────────────────────────┤
│ • Penginapan Istirahat│ • Balai Tetua Sekte │ • Forbidden Altar (Abyss Pact)│
│ • Bengkel Tempa      │ • Arena Sparring     │ • Formation Hub (Array Array) │
│ • Kedai Teh & Info   │ • Menara Kitab       │ • Sword Monument (Sword Heart)│
│ • Pasar Komoditas    │ • Gerbang Ujian Murid│ • Nether Gate (Darkness Cult) │
│ • Dermaga Feri Donghai│ • Paviliun Meditasi │ • Spirit Well (Phoenix/Qingdi)│
└──────────────────────┴──────────────────────┴───────────────────────────────┘
```

- **Dermaga Feri Donghai (Donghai Sea Port)** — `[X: 3900, Y: 2400]`:
  - Menyediakan penyeberangan reguler ke Pulau Kura-Kura (Turtle Island, `[4600, 3800]`) seharga 30 Tembaga (durasi 45 detik) atau perjalanan kilat pedang terbang seharga 150 Perak.
- **Dermaga Rakit Bambu Rawa (Mire Ferry)** — `[X: 1400, Y: 1500]`:
  - Menghubungkan Dataran Tengah bagian selatan melintasi rawa dangkal menuju Kota Kegelapan Nanye.
- **Pasar Dagang & Balai Lelang Tianyuan Capital** — `[X: 2600, Y: 2550]`:
  - Pusat perdagangan komoditas lintas 9 benua dengan tarif pajak transaksi terendah.

---

### 4.5 Aturan Ambush Otoritatif: Wilayah Aman (Zero-Ambush) vs Wilayah Danger

Sistem sergapan musuh (*Ambush Encounter*) ditegakkan dengan **Aturan Zero-Ambush di Wilayah Biasa / Aman**:

```
┌────────────────────────────────────────────────────────────────────────┐
│               ATURAN RESMI SISTEM AMBUSH BENUA TIANYUAN                │
├────────────────────────────┬─────────────┬─────────────────────────────┤
│ KATEGORI WILAYAH           │ PELUANG     │ KETENTUAN KHUSUS            │
│                            │ AMBUSH      │                             │
├────────────────────────────┼─────────────┼─────────────────────────────┤
│ 1. WILAYAH AMAN / BIASA    │    0%       │ NOL AMBUSH MUTLAK. Bebas    │
│    (Central Plains Tier 1, │ (MUTLAK)    │ sergapan! Kecuali ada       │
│     Desa Xingcun, Kota)    │             │ WORLD EVENT (Invasi Monster)│
├────────────────────────────┼─────────────┼─────────────────────────────┤
│ 2. WILAYAH TENANG (Tier 2) │    0%       │ Aman di jalan raya/air.     │
│    (Mirror Lake)           │  (0 - 3%)   │ Hanya 3% di sarang khusus.  │
├────────────────────────────┼─────────────┼─────────────────────────────┤
│ 3. WILAYAH BAHAYA SEDANG   │   2% Jalan  │ Ambush aktif di alam liar   │
│    (Tier 3: Azure Mountain,│  15% Liar   │ (Serigala Tebing, Macan).   │
│     Western Desert, Laut)  │             │                             │
├────────────────────────────┼─────────────┼─────────────────────────────┤
│ 4. WILAYAH BAHAYA TINGGI   │   5% Jalan  │ Ambush agresif              │
│    (Tier 4: Northern Tundra│  28% Liar   │ (Beruang Salju, Siluman Gu, │
│     Venom Mire, Demon Dom) │             │ Kultivator Iblis Buronan).  │
├────────────────────────────┼─────────────┼─────────────────────────────┤
│ 5. WILAYAH MAUT EKSTREM    │  12% Jalan  │ Zona kematian tanpa hukum   │
│    (Tier 5: Lava Spine,    │  45% Liar   │ (Kadal Magma, Iblis Abyss,  │
│     Abyssal Scar, Crimson) │             │ Prajurit Roh Berdarah).     │
└────────────────────────────┴─────────────┴─────────────────────────────┘
```

#### Rumus Authoritative Server untuk Peluang Ambush:
$$\text{P}(\text{Ambush}) = \begin{cases} 
0, & \text{jika } \text{DangerTier} = 1 \text{ dan TIDAK ADA World Event aktif} \\
0, & \text{jika } \text{isSettlement} = \text{true} \\
\min\left(0.50, \text{BaseRate}_{\text{danger}} - \text{QinggongBonus}_{\text{player}} - \text{RoadBonus}\right), & \text{jika } \text{DangerTier} \ge 3
\end{cases}$$

- **Wilayah Biasa / Aman (Central Plains & Seluruh Pemukiman)**:
  - Pemain fana dan pemula dijamin **100% aman melangkah tanpa sergapan acak (0% Ambush)**. Pemain dapat menjelajah padang rumput, memancing di kolam desa, meramu herba pemula, dan berdagang tanpa rasa was-was.
  - **Pengecualian Event Khusus**: Sergapan di wilayah aman HANYA dapat terpicu jika ada event global berkala dari server, seperti:
    * *Serbuan Gelombang Siluman (Monster Tide Event)*: Terjadi 1x seminggu selama 2 jam di gerbang kota.
    * *Status Buronan Aliansi (Infamy $\ge$ 100)*: Pemain dengan reputasi kriminal diburu oleh Regu Penegak Hukum Ortodoks.
- **Wilayah Bahaya (Danger Zones / Tier 3, 4, 5)**:
  - Sergapan aktif secara organik. Pemain yang memasuki Pegunungan Azure, Tundra Beku, atau Lembah Iblis harus mempersiapkan HP, ramuan, dan jurus beladiri karena resiko bertarung sangat nyata.
  - Berjalan di jalan setapak utama (*Imperial Road*) memberikan diskon sergapan $\ge 70\%$ dibandingkan menyusup ke semak belukar liar (*Danger Trail*).

---

### 4.6 Matriks Keunikan 22 Wilayah (Unique Identity of Every Region)

Setiap wilayah di Benua Tianyuan dirancang dengan identitas yang **100% unik dan tidak ada yang identik**:

1. **Keunikan Suhu & Iklim Ekstrem**: Dari dingin membeku $-25^\circ\text{C}$ di Northern Desolate hingga panas mendidih $+70^\circ\text{C}$ di Lava Spine.
2. **Keunikan Sistem Ambush**: Dataran Tengah dan Danau Cermin bebas ambush (0%), sedangkan Abyssal Scar dan Crimson Battlefield merupakan neraka pertempuran (hingga 45%).
3. **Keunikan Afinitas 20 Hukum Semesta**: Setiap wilayah mengalirkan jenis Qi elemen yang berbeda, menjadi habitat eksklusif untuk bahan penerobos Law masing-masing.
4. **Keunikan Material Drop (Law Tags)**: Kayu Qingdi hanya tumbuh di Hutan Roh, Pasir Yang Murni hanya ada di Gurun Suci, dan Larva Gu hanya berkembang biak di Lembah Kabut Serangga.
5. **Keunikan Lanskap Visual per Grid (Guofeng Shan Shui)**: Dirender dengan palet warna dan sprite khas lukisan tinta (Cyan Giok, Hitam Pekat, Putih Salju, Emas Gurun, Merah Magma).

---

## 5. ARSITEKTUR DATA SKALA 5000×5000 (DATA ARCHITECTURE)

### 5.1 Strategi Lapisan Prosedural O(1) vs Sparse MongoDB

```
                       PERMINTAAN TILE (X, Y)
                                 │
                                 ▼
           ┌───────────────────────────────────────────┐
           │   CEK DOKUMEN OVERLAY MONGODB (SPARSE)    │
           │  Koleksi: ZoneTile.findOne({ tileX, tileY})│
           └─────────────────────┬─────────────────────┘
                                 │
                 ┌───────────────┴───────────────┐
                 │ ADA DATA                      │ TIDAK ADA
                 ▼                               ▼
       ┌────────────────────┐         ┌────────────────────────────┐
       │ GUNAKAN DATA DB:   │         │ GENERATE DETERMINISTIK O(1)│
       │ • Kavling Pemain   │         │ (proceduralWorldEngine.js):│
       │ • Bangunan / Altar │         │ • Biome & Rantai Gunung    │
       │ • Monster Aktif    │         │ • Suhu Dasar & Vegetasi    │
       │ • Node Cooldown    │         │ • Jalan & Celah Gunung     │
       └────────────────────┘         └────────────────────────────┘
```

### 5.2 Streaming Viewport & Optimasi Jaringan Frontend
- Endpoint `/api/world/zone/:zoneId?centerX=X&centerY=Y&radius=16` hanya mengembalikan $33 \times 33 = 1.089$ petak.
- Payload terkompresi < 22 KB.

### 5.3 Sistem Manajemen & Caching Aset Gambar Sprite Atlas
- **Format File**: WebP dengan kompresi lossless/high quality (ukuran rata-rata hanya 8–18 KB per sprite petak).
- **Struktur Direktori**: `web-dashboard/public/assets/tiles/`
  - `/mountains/` (gunung cyan 1x1, 2x1, 2x2, 3x2)
  - `/vegetation/` (pohon pinus meliuk, rumpun bambu, hutan lebat)
  - `/caves/` (mulut gua purba gelap berakar)
  - `/water/` (tepian danau celadon, ombak laut)
  - `/special_biomes/` (magma, glasial, rawa racun, bukit pasir)
- **Pre-loading Hook (`useGlobalAssetLoader`)**: Mengunduh dan menahan instance `HTMLImageElement` di memori browser. Jika aset belum selesai terunduh, kanvas menampilkan lukisan tinta prosedural secara instan tanpa layar putih atau kotak kosong.

---

## 6. SINKRONISASI POSISI PEMAIN (SINGLE SOURCE OF TRUTH)

### 6.1 Penyatuan Status gridPosition & currentLocation
Utilitas inti: `setPlayerAuthoritativePosition(player, { zoneId, tileX, tileY }, options)`
- Menghitung `regionSlug` via `worldRegionEngine.getRegionAt(tileX, tileY)`.
- Mengisi `player.currentLocation` dan `player.gridPosition` secara serentak sebelum `player.save()`.

### 6.2 Penanganan Kondisi Balapan (Race Conditions & Concurrency)
- Pengecekan aktif `gridMove.moveArrivesAt`.
- Kunci `LockManager.acquire(player.discordId)` selama eksekusi rute step-move berlangsung.

### 6.3 Skrip Migrasi Anomali Posisi Karakter
Skrip `jianghu-bot/scripts/migratePlayerPositionDrift.js` memindai dan merapikan seluruh karakter lama ke titik valid kanonikal.

---

## 7. SISTEM PEMILIHAN SPAWN KARAKTER BARU (SPAWN SELECTOR)

### 7.1 Tujuh Titik Awal Kelahiran (Curated Origins)
1. **Central Plains (Desa Xingcun)** `[2455, 2485]` — Pemula (Sangat Aman).
2. **Azure Foothills (Kaki Gunung Azure)** `[2100, 2950]` — Sedang (Jalur Pedang).
3. **Northern Ice (Benteng Utara)** `[2150, 4350]` — Sulit (Dingin/Salju).
4. **Western Desert (Oasis Shadi)** `[950, 2800]` — Menengah (Gurun Pasir).
5. **Eastern Sea Port (Pelabuhan Donghai)** `[3880, 2420]` — Seimbang (Laut/Perahu).
6. **Southern Demon Border (Kemah Pasukan Darah)** `[2600, 1400]` — Ekstrem (Jalur Iblis).
7. **Mist Insect Valley (Lembah Rahasia Gu Wudu)** `[4300, 1100]` — Tinggi (Racun/Gu).

### 7.2 Alur Antarmuka UI (CharacterCreationStudio.tsx)
Tab ke-5 `[Origins]` menyajikan 7 kartu bioma lengkap dengan ilustrasi pemandangan Guofeng, tingkat kesulitan, suhu iklim, dan paket perlengkapan awal.

### 7.3 Validasi Server & Paket Perlengkapan Awal
Endpoint `POST /api/auth/set-appearance` memvalidasi `spawnOriginId`, menyetel posisi melalui `setPlayerAuthoritativePosition`, dan memasukkan starter kit secara transaksional.

---

## 8. RENCANA KERJA PERBAIKAN BUG FONDASI (P0 BUG FIX WORKSTREAM)

- **B1**: Perbaiki `/zone/step-move` dan `/travel/status` agar memakai `setPlayerAuthoritativePosition`.
- **B2**: Standarisasi 22 region slug kanonikal + kamus alias retroaktif di `worldRegionEngine.js`.
- **B3**: Konsolidasi `/facility/build-or-upgrade` dengan `landService.buildOnPlot()`.
- **B4**: Hubungkan `forageTrainingService.js` ke tabel drop bertag Law di `config/resourceProfiles.js`.
- **B5**: Terapkan evaluasi `traversalRule` di rute step-move.
- **B6**: Selaraskan slug dan koordinat jangkar di `config/explorationLocations.js`.

---

## 9. PETA JALAN INTEGRASI 20 HUKUM SEMESTA (LAW × WORLD INTEGRATION)

- **Level 1**: Tag Sumber Daya Alam Sesuai Bioma (Mining/Herbal drops tagged).
- **Level 2**: Bangunan Fasilitas Law Berbasis Kavling Regional (Altar Abyss di Demon, Hub di Formasi).
- **Level 3**: Multiplier Channeling Qi Berbasis Kerapatan Spiritual Petak (Spiritual Qi Density).
- **Level 4**: Gua Rahasia & Zona Khusus Terkunci Berdasarkan Ranah Law (Law Gated Sanctums).

---

## 10. RENCANA ANTARMUKA & SISTEM GAMBAR PER GRID (GUOFENG SHAN SHUI TILE-ART SYSTEM)

Bagian ini merupakan **transformasi visual paling fundamental** pada peta dunia Immortal-X, mengangkat standar visual agar sepadan 1-to-1 dengan *Tale of Immortal* (鬼谷八荒) sebagaimana ditunjukkan pada gambar referensi.

```
┌────────────────────────────────────────────────────────────────────────┐
│        VISUAL REF: TALE OF IMMORTAL GUOFENG SHAN SHUI GRID MAP         │
├────────────────────────────────────────────────────────────────────────┤
│ • KANVAS DASAR   : Kertas Xuan Perkamen Krem Halus (#faf8f4)           │
│ • PEGUNUNGAN     : Puncak Cyan/Giok (#689a8c, #4a685f) Berkabut Putih  │
│ • VEGETASI       : Pinus Meliuk Kuno & Hutan Rapat Abu-Biru Tinta      │
│ • GUA / DUNGEON  : Mulut Gua Karst Gelap Berakar Hitam Berkelok        │
│ • BADGE NODES    : Indikator Bulat Hitam Minimalis Berangka (❶, ❷)    │
│ • AVATAR TOKEN   : Karakter Berdiri + Bingkai Emas Kotak Menyala       │
│ • TRAJEKTORI     : Garis Emas Kuning Tebal (#f59e0b) Rute Melangkah     │
│ • KABUT FOG      : Masker Petak Gelap Bertangga (Stepped Discrete)     │
└────────────────────────────────────────────────────────────────────────┘
```

### 10.1 Filosofi Visual: Dari Icon Abstrak Menuju Lukisan Tinta Dinasti Song

Peta tidak lagi menampilkan icon generik web, simbol emoji `▲`, `👹`, `🏯`, atau segitiga kanvas sederhana. Seluruh petak diubah menjadi **susunan karya seni lukis tinta oriental (Guofeng Shan Shui)** yang terintegrasi secara alami:
- **Seamless Blending**: Tekstur petak menyatu lembut dengan petak sebelahnya menggunakan tepian kabut putih tipis khas lukisan Dinasti Song (*Mi Fu style ink-mist wash*).
- **Multi-Tile Seamless Landscapes**: Fitur megah seperti rantai pegunungan atau danau besar tidak terkungkung kaku dalam 1 kotak 64px, melainkan membentang alami melintasi 2x1, 2x2, atau 3x2 petak grid dengan garis grid halus transparan (opacity 15–20%).

---

### 10.2 Katalog Sprite Gambar Seni Tinta per Grid (Tile-Art Atlas)

Setiap entri terdaftar di `globalAssets.ts` dan disimpan di direktori aset publik:

```
web-dashboard/public/assets/tiles/
├── base/
│   └── xuan_paper_parchment.webp      # Tekstur kertas perkamen kanvas dasar
├── mountains/
│   ├── mountain_cyan_single_1x1.webp  # Bukit hijau tinta tunggal
│   ├── mountain_cyan_ridge_2x1.webp   # Punggung bukit menyambung 2 petak
│   ├── mountain_cyan_grand_2x2.webp   # Puncak giok megah berselimut kabut 2x2
│   ├── mountain_cyan_massive_3x2.webp # Rantai pegunungan raksasa 3x2
│   └── mountain_crag_steep_1x1.webp   # Tebing cadas terjal hitam abu
├── vegetation/
│   ├── tree_gnarled_pine_1x1.webp     # Pohon pinus tua meliuk tunggal di bukit kecil
│   ├── forest_misty_pine_dense.webp   # Hutan pinus lebat berkabut abu-kebiruan
│   ├── bamboo_grove_ink_1x1.webp      # Rumpun bambu hijau tinta wuxia
│   └── forest_autumn_ginkgo.webp      # Pepohonan ginkgo kuning keemasan
├── caves_and_pois/
│   ├── cavern_grotto_dark_mouth.webp  # Mulut gua purba hitam pekat berakar belukar
│   ├── sect_hall_oriental_2x2.webp    # Kompleks balai sekte atap genteng tembikar
│   └── settlement_city_gate_2x2.webp  # Gerbang kota benteng granit kuno
├── water/
│   ├── water_celadon_shore_1x1.webp   # Tepian air tenang toska muda berpasir
│   ├── water_lake_island_2x1.webp     # Danau air tenang dengan bukit pulau kecil
│   └── water_deep_ocean_1x1.webp      # Ombak samudra dalam beriak tinta
└── special_biomes/
    ├── volcanic_magma_crags_1x1.webp  # Cadas obsidian retak berlahar merah
    ├── glacial_snow_peak_1x1.webp     # Puncak es kristal salju putih-biru
    ├── poison_mire_swamp_1x1.webp     # Rawa lumpur ungu gelap berasap racun
    └── desert_golden_dunes_1x1.webp   # Bukit pasir emas bergelombang angin
```

---

### 10.3 Sistem Penanda Interaksi Badge Angka Minimalis (`❶`, `❷`)

Sebagaimana terlihat pada gambar referensi, petak yang memiliki objek interaktif atau node sumber daya tidak dirusak dengan icon emoji besar yang menutupi lukisan pemandangan. Sistem menggunakan **Badge Interaksi Minimalis Elegan**:
- **Bentuk**: Lingkaran hitam pekat berdiameter 16–20px dengan garis tepi putih tipis (1px) berbayang halus (*drop shadow*).
- **Tipografi**: Angka bulat putih bersih (`❶`, `❷`, `❸`) di tengah badge.
- **Hierarki Interaksi**:
  - `❶`: Sumber daya alam primer di petak tersebut (misal: pohon pinus herbal atau batu bijih besi).
  - `❷`: Fitur sekunder atau pintu masuk gua kuno / dungeon instance.
  - Hover / klik pada petak memunculkan tooltip popover bertuliskan nama node (contoh: *"❶ Rumpun Pinus Seratus Tahun"*).

---

### 10.4 Token Karakter Pendekar & Bingkai Emas Menyala

- **Token Karakter**: Di petak tempat pemain berdiri, dirender ilustrasi berdiri pendekar (*standing miniature sprite*) menghadap diagonal, mencerminkan jubah yang dipakai pemain.
- **Bingkai Emas (Golden Box Border)**:
  - Petak karakter diberi bingkai kotak berwarna kuning emas menyala (`#f59e0b` / `#fbbf24`) dengan ketebalan 2.5px.
  - Bagian dalam petak memiliki pendaran cahaya spiritual emas lembut (`rgba(245, 158, 11, 0.15)`), menegaskan posisi fokus karakter di atas kanvas dunia.

---

### 10.5 Jalur Trajektori Pergerakan Emas (Golden Dao Movement Ribbon)

Saat pemain mengklik petak tujuan untuk berjalan melangkah:
- Garis jalur rute (*A\* Waypoint Path*) digambar sebagai **Garis Pita Emas Menyala (Golden Ribbon)** setebal 4–6px (`#f59e0b` dengan efek glow `rgba(251, 191, 36, 0.6)`).
- Garis melintas persis di titik tengah setiap petak yang dilewati dan membelok membentuk sudut siku halus di petak tikungan.
- Garis berujung tepat di petak sasaran tujuan dengan titik tumpu lingkaran emas kecil.

---

### 10.6 Kabut Perang Bertangga Petak (Stepped Discrete Fog of War)

Kabut perang (*Fog of War*) diimplementasikan persis seperti referensi lukisan:
- Di luar radius pandang pemain (default radius: 4 petak), petak tertutup oleh **Masker Abu-Abu Gelap Bertangga (Stepped Discrete Tiles)**.
- Setiap petak yang belum terungkap diberi layer transparan gelap (`rgba(20, 24, 30, 0.88)`), menciptakan pola tepian kotak-kotak bertangga yang rapi mengitari lingkaran pandang karakter.
- Petak yang sudah dijelajahi tetapi berada di luar radius pandang langsung diberi filter kabut redup (*ambient shroud*, opacity 40%).

---

### 10.7 Arsitektur Pipeline 8-Layer Canvas Engine

Di dalam `TaleOfImmortalCanvas.tsx`, siklus render setiap frame dijalankan secara berurutan:

```
┌────────────────────────────────────────────────────────────────────────┐
│            PIPELINE RENDERING 8 LAPISAN (TaleOfImmortalCanvas)         │
├─────────┬──────────────────────────────────────────────────────────────┤
│ Layer 0 │ KERTAS PERKAMEN DASAR (Tekstur Kertas Xuan Halus)            │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Layer 1 │ MEDAN DASAR & AIR (Padang Rumput, Pasir, Air Celadon)        │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Layer 2 │ SPRITE SHAN SHUI UTAMA (Gunung Cyan, Hutan Pinus, Goa Gelap) │
│         │ Diurutkan berdasarkan Y-coordinate (Depth Sorting Natural)   │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Layer 3 │ OVERLAY KAVLING & STATUS MILIK (Batas Wilayah / Tanah Sewa) │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Layer 4 │ BADGE ANGKA MINIMALIS (❶, ❷ pada Node Sumber Daya & Gua)     │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Layer 5 │ GARIS TRAJEKTORI EMAS (Garis Rute Gerak Kuning Menyala)      │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Layer 6 │ TOKEN KARAKTER & BINGKAI EMAS MENYALA (Posisi Pemain)        │
├─────────┼──────────────────────────────────────────────────────────────┤
│ Layer 7 │ KABUT PERANG BERTANGGA & PARTIKEL CUACA (Stepped Fog Mask)   │
└─────────┴──────────────────────────────────────────────────────────────┘
```

---

## 11. PENYAMPAIAN BERTAHAP (PHASED DELIVERY: FASE 0 – FASE 5)

```
┌────────────────────────────────────────────────────────────────────────┐
│                   JADWAL PENYAMPAIAN BERTAHAP                          │
├─────────┬──────────────────────────────────────────────────────────────┤
│ FASE 0  │ Audit Kode, Registri Wilayah & Dokumen Arsitektur (Selesai)  │
├─────────┼──────────────────────────────────────────────────────────────┤
│ FASE 1  │ Hotfix P0: Aturan Lintasan, Step-Move & Sinkronisasi Posisi │
├─────────┼──────────────────────────────────────────────────────────────┤
│ FASE 2  │ Antarmuka & Backend Pemilihan Titik Awal Lahir (Spawn Choice)│
├─────────┼──────────────────────────────────────────────────────────────┤
│ FASE 3  │ Penempatan Geografi Solid, Celah Gunung & Dermaga Feri       │
├─────────┼──────────────────────────────────────────────────────────────┤
│ FASE 4  │ Profil Sumber Daya Alam & Penyelarasan Tag 20 Hukum Semesta  │
├─────────┼──────────────────────────────────────────────────────────────┤
│ FASE 5  │ Integrasi Gambar Seni Tinta per Grid & Canvas Shan Shui      │
└─────────┴──────────────────────────────────────────────────────────────┘
```

### FASE 0: Audit Kode, Registri Wilayah & Dokumen Perencanaan (SELESAI)
- **Cakupan**: 
  - Audit kode menyeluruh pada 12 file inti repositori (`world.js`, `ZoneTile.js`, `Player.js`, `auth.js`, `lawCultivation.js`, `TaleOfImmortalCanvas.tsx`, dll.).
  - Penyusunan dokumen kanonikal `docs/WORLD_MAP_MASTER_PLAN.md` versi 2.0.
  - Perumusan registri 22 wilayah tunggal otoritatif dan standarisasi 8 aturan `traversalRule`.
- **Kriteria Selesai (DoD)**: Seluruh bug B1–B6 teridentifikasi, registri 22 wilayah terpetakan, dan rencana integrasi visual Tale of Immortal disepakati.

---

### FASE 1: Traversal Rules, Step-Move Enforcement & Position Sync (Prioritas P0)
- **Tujuan Utama**: Menghilangkan Bug B1 (Dual Position Sync Drift), Bug B2 (Region Slug Mismatch), dan Bug B5 (Step-Move Menembus Tebing/Laut).
- **Berkas yang Disentuh**:
  1. `jianghu-bot/utils/worldRegionEngine.js`
  2. `jianghu-bot/services/movementService.js` (berkas baru / utilitas perpindahan)
  3. `jianghu-bot/web-api/routes/world.js` (endpoint `/zone/step-move`, `/location`, `/travel/status`)
  4. `jianghu-bot/config/travelDistances.js` & `jianghu-bot/config/regionClimate.js`
  5. `jianghu-bot/scripts/migratePlayerPositionDrift.js` (skrip migrasi)
- **Spesifikasi Teknis & Logika Kode**:
  - Di `worldRegionEngine.js`:
    ```javascript
    // Registri 22 Region Kanonikal & Kamus Alias Retroaktif
    const REGIONS = [ /* 22 Region sesuai Seksi 4.1 */ ];
    const REGION_ALIASES = {
      azure_mountain: 'azure_mountain_range',
      eastern_sea_region: 'eastern_sea',
      southern_demon: 'southern_demon_domain',
      western_desert: 'western_sacred_desert',
      northern_desolate_territory: 'northern_desolate'
    };
    function normalizeRegionSlug(slug) {
      return REGION_ALIASES[slug] || slug;
    }
    ```
  - Di `services/movementService.js`:
    ```javascript
    async function setPlayerAuthoritativePosition(player, { zoneId, tileX, tileY }, options = {}) {
      const region = getRegionAt(tileX, tileY);
      const settlement = proceduralWorldEngine.getSettlementAt(tileX, tileY);
      
      player.gridPosition.zoneId = zoneId || 'tianyuan_world_map';
      player.gridPosition.tileX = tileX;
      player.gridPosition.tileY = tileY;
      
      player.currentLocation = {
        regionSlug: region.id,
        settlementName: settlement ? settlement.name : null,
        buildingName: options.buildingName || null
      };
      
      sparseFogManager.revealFogAtPosition(player, tileX, tileY, 4);
      return player;
    }
    ```
  - Di `routes/world.js` (`/zone/step-move`):
    - Evaluasi setiap waypoint dengan `traversalRule`:
      * Jika `tileInfo.isSolid === true` dan `terrainType === 'mountain'` $\to$ tolak jika bukan `flying_sword`.
      * Jika `tileInfo.terrainType === 'ocean'` $\to$ tolak jika bukan kapal/perahu/`flying_sword`.
      * Jika `tileInfo.terrainType === 'lava_spine'` $\to$ tolak jika tidak memiliki kekebalan api/mount tahan api.
    - Gantikan mutasi manual `player.gridPosition` dengan `setPlayerAuthoritativePosition`.
- **Perubahan API**:
  - `POST /api/world/zone/step-move`: Mengembalikan HTTP 400 `{ error: 'Jalur terhalang oleh Dinding Tebing Batu Vertikal!' }` saat rute menabrak tebing.
  - `GET /api/world/location`: Mengembalikan `currentLocation` dan `gridPosition` yang 100% konsisten.
- **Resiko & Mitigasi**: Pemain lama yang berada di koordinat tidak valid (misal tebing atau void) otomatis diselamatkan oleh skrip `migratePlayerPositionDrift.js` ke jalan terdekat di Desa Xingcun `[2455, 2485]`.
- **Kriteria Selesai (DoD)**:
  - Unit test `testStepMoveTraversal.js` lulus 100%: pejalan kaki ditolak melompati tebing/laut.
  - Tidak ada drift antara `gridPosition` dan `currentLocation` di MongoDB.

---

### FASE 2: Character Creation Spawn Selector (FE + BE)
- **Tujuan Utama**: Menghilangkan hardcoded spawn Xingcun, mengizinkan pemain memilih 7 asal bioma/faksi kelahiran.
- **Berkas yang Disentuh**:
  1. `jianghu-bot/config/starterKits.js` (berkas baru)
  2. `jianghu-bot/web-api/routes/auth.js` (`/set-appearance`, register)
  3. `web-dashboard/src/components/auth/CharacterCreationStudio.tsx`
- **Spesifikasi Teknis & Skema Data**:
  - `config/starterKits.js`:
    ```javascript
    module.exports = {
      central_plains: {
        spawnPoint: { tileX: 2455, tileY: 2485 },
        settlementName: 'Desa Xingcun',
        regionSlug: 'central_plains',
        starterItems: [{ name: 'Pedang Kayu Latihan', qty: 1 }, { name: 'Ransum Nasi', qty: 10 }]
      },
      azure_foothills: {
        spawnPoint: { tileX: 2100, tileY: 2950 },
        settlementName: 'Pos Celah Azure',
        regionSlug: 'azure_mountain_range',
        starterItems: [{ name: 'Pedang Besi Tempa Dingin', qty: 1 }, { name: 'Jubah Tahan Angin', qty: 1 }]
      },
      northern_ice: {
        spawnPoint: { tileX: 2150, tileY: 4350 },
        settlementName: 'Benteng Utara',
        regionSlug: 'northern_desolate',
        starterItems: [{ name: 'Mantel Bulu Beruang', qty: 1 }, { name: 'Arak Penghangat', qty: 5 }]
      },
      western_desert: {
        spawnPoint: { tileX: 950, tileY: 2800 },
        settlementName: 'Oasis Shadi',
        regionSlug: 'western_sacred_desert',
        starterItems: [{ name: 'Sorban Pelindung Pasir', qty: 1 }, { name: 'Kantong Air Kulit Unta', qty: 3 }]
      },
      eastern_sea_port: {
        spawnPoint: { tileX: 3880, tileY: 2420 },
        settlementName: 'Pelabuhan Donghai',
        regionSlug: 'eastern_sea',
        starterItems: [{ name: 'Tombak Penusuk Ikan', qty: 1 }, { name: 'Izin Perahu Nelayan', qty: 1 }]
      },
      southern_demon_border: {
        spawnPoint: { tileX: 2600, tileY: 1400 },
        settlementName: 'Kemah Pasukan Darah',
        regionSlug: 'southern_demon_domain',
        starterItems: [{ name: 'Belati Arwah Darah', qty: 1 }, { name: 'Pil Penenang Hawa Kotor', qty: 3 }]
      },
      mist_insect_valley: {
        spawnPoint: { tileX: 4300, tileY: 1100 },
        settlementName: 'Lembah Rahasia Gu Wudu',
        regionSlug: 'mist_insect_valley',
        starterItems: [{ name: 'Topeng Tabib Miasma', qty: 1 }, { name: 'Kendi Tanah Liat Gu', qty: 1 }]
      }
    };
    ```
  - Di `auth.js` (`POST /api/auth/set-appearance`):
    ```javascript
    const { face, frontHair, backHair, outfit, spawnOriginId } = req.body;
    const originConfig = starterKits[spawnOriginId] || starterKits.central_plains;
    await setPlayerAuthoritativePosition(player, {
      zoneId: 'tianyuan_world_map',
      tileX: originConfig.spawnPoint.tileX,
      tileY: originConfig.spawnPoint.tileY
    }, { settlementName: originConfig.settlementName });
    // Masukkan starterItems ke player.inventory secara transaksional
    ```
  - Di `CharacterCreationStudio.tsx`:
    - Tambahkan Tab `[Origins]` dengan 7 kartu bioma berilustrasi pemandangan Guofeng, lencana tingkat kesulitan, dan teks pengantar lore.
- **Kriteria Selesai (DoD)**: Pemain baru dapat memilih 1 dari 7 bioma, terlahir presisi di koordinat bioma terkait, dan menerima perlengkapan awal tanpa mock data.

---

### FASE 3: Solid Geometry, Passes & Choke Points Seed
- **Tujuan Utama**: Membangun rintangan fisik nyata pada Benua Tianyuan agar perjalanan memiliki tantangan dan navigasi berliku.
- **Berkas yang Disentuh**:
  1. `jianghu-bot/utils/proceduralWorldEngine.js`
  2. `jianghu-bot/web-api/routes/ferry.js`
  3. `web-dashboard/src/components/ferry/FerryCrossingModal.tsx`
- **Spesifikasi Teknis**:
  - Di `proceduralWorldEngine.js`:
    - Definisikan kurva punggung Pegunungan Azure `[Y: 3100..3300, X: 1500..3600]`. Seluruh petak di garis punggung ini otomatis `isSolid = true`, `traversalRule = 'blocked'`.
    - Buat pengecualian lubang tembus (*carved passes*) untuk 3 celah resmi:
      * **North Pass**: `X: [2199..2201], Y: [3100..3300]` $\to$ `isSolid = false`, `terrainType = 'road'`.
      * **Mist Pass**: `X: [2799..2801], Y: [3100..3300]` $\to$ `isSolid = false`, `terrainType = 'road'`.
      * **Sword Gorge Pass**: `X: [3349..3351], Y: [3100..3300]` $\to$ `isSolid = false`, `terrainType = 'road'`.
    - Di Samudra Timur `[X > 3800]`: Petak air otomatis `terrainType = 'ocean'`, `isSolid = true` kecuali bagi mount kapal atau tiket Feri.
- **Kriteria Selesai (DoD)**: Pemain dari Dataran Tengah tidak dapat menembus Benua Utara tanpa melewati salah satu dari 3 celah gunung atau menaiki kapal feri.

---

### FASE 4: Resource Profiles & Law-Tagged Gathering Drops
- **Tujuan Utama**: Menghubungkan eksplorasi alam bebas dengan sistem 20 Hukum Semesta (menyelesaikan Bug B4).
- **Berkas yang Disentuh**:
  1. `jianghu-bot/config/resourceProfiles.js` (berkas baru)
  2. `jianghu-bot/services/forageTrainingService.js`
  3. `jianghu-bot/models/Item.js` (seeder item bertag baru)
- **Spesifikasi Teknis**:
  - `config/resourceProfiles.js` memetakan setiap `regionId` ke tabel loot bertag:
    * `lava_spine` $\to$ tag `phoenix_fire`, `magma_essence`, `sulfur`
    * `mist_insect_valley` $\to$ tag `gu_food`, `gu_larva`, `myriad_toxin`
    * `northern_desolate` $\to$ tag `glacial_ice`, `pure_water_essence`
    * `southern_demon_domain` $\to$ tag `turbid_core`, `demonic_tendon`
    * `crimson_battlefield` $\to$ tag `blood_vial`, `soul_dust`
    * `formation_barrens` $\to$ tag `formation_flag_pole`, `array_jade`
  - Di `forageTrainingService.js`:
    - Mengambil region via `getRegionAt(px, py)`.
    - Memilih item dari `resourceProfiles[region.id]` yang sesuai dengan tipe node (`herb`, `ore`, `wood`).
    - Memasukkan item ber-tag ke inventori pemain, memberikan bahan sah untuk pengisian esensi Law (`/law/essence/absorb`) atau pakan Gu (`/law/gu/feed`).
- **Kriteria Selesai (DoD)**: Meramu di Lembah Serangga menghasilkan pakan Gu ber-tag, menambang di Lava Spine menghasilkan esensi api, seluruh item memiliki tag yang dikenali oleh `lawCultivationEngine.js`.

---

### FASE 5: Sistem Gambar Seni Tinta per Grid & Canvas Shan Shui Engine
- **Tujuan Utama**: Transformasi visual total menjadi lukisan tinta Dinasti Song setara *Tale of Immortal* (anti-AI slop, anti-icon abstrak).
- **Berkas yang Disentuh**:
  1. `web-dashboard/public/assets/tiles/` (katalog sprite WebP berkualitas tinggi)
  2. `web-dashboard/src/config/globalAssets.ts`
  3. `web-dashboard/src/hooks/useGlobalAssetLoader.ts`
  4. `web-dashboard/src/components/map/TaleOfImmortalCanvas.tsx`
  5. `jianghu-bot/services/landService.js` & `jianghu-bot/web-api/routes/lawCultivation.js` (konsolidasi fasilitas)
- **Spesifikasi Teknis**:
  - Pasang koleksi sprite WebP per grid (128x128px per unit petak):
    * Gunung cyan-giok berkabut (1x1, 2x1, 2x2, 3x2)
    * Rumpun pinus tua meliuk dan hutan pinus berkabut abu-kebiruan
    * Mulut gua purba karst hitam pekat berakar belukar melilit
    * Danau tenang celadon berpulau bukit kecil
    * Bioma khusus (lahar magma retak, puncak es kristal, rawa racun ungu)
  - Refaktor `TaleOfImmortalCanvas.tsx` dengan Pipeline 8-Lapisan:
    * Layer 0: Tekstur Kertas Xuan Halus
    * Layer 1: Medan Dasar & Air
    * Layer 2: Sprite Shan Shui Utama (Sorting Y-Depth Natural)
    * Layer 3: Overlay Kavling & Kepemilikan
    * Layer 4: **Badge Lingkaran Hitam Angka Minimalis (`❶`, `❷`)**
    * Layer 5: **Pita Emas Trajektori Langkah Menyala (`#f59e0b`)**
    * Layer 6: **Token Karakter Pendekar + Bingkai Emas Menyala**
    * Layer 7: **Kabut Perang Bertangga Petak (*Stepped Discrete Fog of War*)**
  - Konsolidasi rute `/facility/build-or-upgrade` dengan kavling tanah standar di `landService.js`.
- **Kriteria Selesai (DoD)**:
  - Tampilan visual di browser identik dengan standar referensi Tale of Immortal (lukisan tinta, badge bulat angka, trajektori emas, bingkai emas token).
  - Tidak ada icon emoji atau segitiga kanvas kasar.
  - Performa rendering 60 FPS stabil pada viewport 33×33 petak.

---

## 12. STRATEGI PENGUJIAN & METRIK KEBERHASILAN (QA & METRICS)

1. **Uji Anti-Tembus Tebing**: Upaya melangkah menembus Pegunungan Azure di luar Pass wajib ditolak server dengan pesan rintangan deskriptif.
2. **Uji Validasi Trajektori**: Garis pita emas trajektori melengkung presisi menghindari tebing batu dan menghubungkan karakter ke target.
3. **Uji Render Gambar per Grid**: Kanvas memuat tekstur WebP gunung cyan dan mulut gua karst tanpa distorsi atau pergeseran rasio 1:1.
4. **Uji Badge Interaksi**: Node sumber daya menampilkan badge lingkaran hitam angka `❶` `❷` yang dapat di-hover dan diklik untuk berinteraksi.
5. **Uji Stepped Fog of War**: Petak di luar radius pandang tertutup masker petak hitam bertangga tanpa tembus pandang ilegal.
6. **Uji Beban FPS**: Rendering kanvas pada resolusi 1920×1080 mempertahankan kecepatan 60 FPS stabil tanpa lag memori.

---

## 13. BATASAN DI LUAR CAKUPAN (OUT OF SCOPE / NON-GOALS)

1. **Penyimpanan 25 Juta Dokumen di MongoDB**: Tetap mempertahankan pendekatan hybrid prosedural O(1) + sparse collection.
2. **Klien Tiga Dimensi (3D Engine)**: Tampilan tetap mempertahankan format 2D Guofeng Shan Shui Canvas sesuai standar *Tale of Immortal*.
3. **Teleportasi Bebas**: Tidak mengizinkan teleportasi tanpa biaya atau pos resmi.
4. **Perombakan Sistem Tempur**: Tidak mengubah formula combat turn-based V2.

---

## 14. PERTANYAAN TERBUKA & REKOMENDASI STANDAR (OPEN QUESTIONS)

1. **T: Apakah sprite gunung besar yang membentang 2x2 atau 3x2 petak memerlukan dokumen DB terpisah?**  
   *R: Tidak. Posisi jangkar (anchor tile) dihitung secara deterministik oleh `proceduralWorldEngine.js` sehingga sprite multi-petak otomatis ter-render pada petak utama tanpa membebani database.*
2. **T: Bagaimana jika pemain mengakses web dashboard dengan koneksi lambat sehingga sprite gambar petak belum terunduh?**  
   *R: Canvas Engine langsung merender fallback lukisan tinta prosedural secara instan, lalu melakukan transisi fade-in mulus begitu gambar sprite WebP selesai di-cache.*

---

## 15. IDE KONKRET PENAMBAH KESERUAN EKSPLORASI (FUN ENHANCEMENTS)

1. **Animasi Halus Melayang (Micro-Animations)**:
   - Partikel daun bambu dan kabut putih tipis melayang perlahan di atas petak gunung cyan.
   - Pendaran cahaya emas lembut pada garis trajektori langkah karakter.
2. **Mulut Gua Kuno Misterius & Event Tersembunyi**:
   - Mulut gua gelap berakar meliuk (seperti di screenshot) memiliki peluang memicu dungeon labirin instan atau sarang binatang buas kuno bertaraf tinggi saat dimasuki.
3. **Pos Penjaga Celah Gunung**:
   - Pemeriksaan surat jalan resmi di North Pass bagi pelancong antar wilayah.
4. **Peluang Harta di Jalur Buntu**:
   - Celah tebing buntu menyembunyikan herba berumur ribuan tahun dengan penanda badge `❶`.

---

## 16. URUTAN EKSEKUSI RANGKUMAN 1 HALAMAN (IMPLEMENTATION ORDER)

```markdown
### LANGKAH 1: FONDASI BACKEND & REGISTRI (P0)
- [x] 1.1 Perbarui `jianghu-bot/utils/worldRegionEngine.js`: Registri 22 wilayah kanonikal + alias.
- [x] 1.2 Buat helper `setPlayerAuthoritativePosition` di `services/movementService.js`.
- [x] 1.3 Perbarui rute `POST /api/world/zone/step-move`: Terapkan `traversalRule` & sinkronisasi atomik.
- [x] 1.4 Perbarui `GET /api/world/location` dan `POST /api/world/travel/status`.
- [x] 1.5 Jalankan `migratePlayerPositionDrift.js` untuk membersihkan anomali posisi karakter lama.

### LANGKAH 2: SISTEM SPAWN KARAKTER BARU (P1)
- [x] 2.1 Buat konfigurasi 7 titik spawn dan starter kit di `config/starterKits.js`.
- [x] 2.2 Perbarui `POST /api/auth/set-appearance` di `routes/auth.js` dengan validasi `spawnOriginId`.
- [x] 2.3 Perbarui UI `CharacterCreationStudio.tsx` dengan tab visual `[Origins]` dan kartu pratinjau bioma.

### LANGKAH 3: KONTEN GEOGRAFI SOLID & PASSES (P1)
- [x] 3.1 Perbarui `proceduralWorldEngine.js`: Dinding Pegunungan Azure dan 3 celah resmi (North, Mist, Sword Gorge).
- [x] 3.2 Terapkan pemblokiran laut dalam dan aliran lahar berapi.
- [x] 3.3 Tambahkan rute Feri Donghai ke Pulau Kura-Kura di `routes/ferry.js`.

### LANGKAH 4: PROFIL SUMBER DAYA & TAG 20 HUKUM SEMESTA (P2)
- [x] 4.1 Buat `config/resourceProfiles.js`: Pemetaan 22 bioma ke drop bertag Law.
- [x] 4.2 Perbarui `forageTrainingService.js` untuk memberikan item drop sesuai bioma dan tag.
- [x] 4.3 Integrasikan multiplier `spiritualQiDensity` pada channeling Law di `routes/lawCultivation.js`.

### LANGKAH 5: SISTEM GAMBAR PER GRID & REFAKTOR CANVAS SHAN SHUI (P2)
- [x] 5.1 Siapkan katalog aset WebP per grid di `web-dashboard/public/assets/tiles/` (gunung cyan, pohon pinus, mulut goa berakar gelap, perkamen kertas, air celadon).
- [x] 5.2 Daftarkan aset ke `config/globalAssets.ts` dan optimalkan hook `useGlobalAssetLoader`.
- [x] 5.3 Refaktor `TaleOfImmortalCanvas.tsx` dengan Pipeline 8-Lapisan:
  - Render tekstur gambar per grid (gunung cyan, hutan pinus, goa karst berakar).
  - Render badge interaksi bulat hitam angka minimalis (`❶`, `❷`).
  - Render trajektori garis kuning emas menyala (`#f59e0b`).
  - Render token karakter dengan bingkai kotak emas menyala.
  - Render masker kabut petak bertangga (*stepped discrete fog of war*).
- [x] 5.4 Konsolidasi rute `/facility/build-or-upgrade` dengan kavling tanah standar di `services/landService.js`.
```

---
*Dokumen Master Plan v2.0 ini selesai disempurnakan dengan spesifikasi gambar per grid dan siap dieksekusi secara bertahap.*
