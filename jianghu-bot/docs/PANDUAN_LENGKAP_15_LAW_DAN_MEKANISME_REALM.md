# PANDUAN MASTER LENGKAP: 15 HUKUM SEMESTA (LAW), POHON SKILL & MEKANISME KENAIKAN STAGE REALM 2

Dokumen ini adalah referensi otoritatif teknis dan gameplay untuk sistem **15 Hukum Semesta (Law Cultivation)**, **Daftar 210 Skill Lengkap**, dan **Analisis Deterministik Kenaikan 1 Stage di Realm 2 terhadap 5 Pilar Atribut Karakter** di Jianghu Bot (Immortal-X).

---

## 1. Arsitektur Dua Sistem Kultivasi (Dual-Track Cultivation)

Jianghu Bot mengadopsi sistem kultivasi berlapis ganda bergaya *Tale of Immortal* & *Xianxia Klasik*:

```
                        ┌──────────────────────────────────────────────────┐
                        │              KARAKTER KULTIVATOR                 │
                        └────────┬────────────────────────────────┬────────┘
                                 │                                │
        ┌────────────────────────▼────────┐     ┌─────────────────▼────────────────┐
        │  1. SISTEM RANAH UTAMA          │     │  2. SISTEM HUKUM SEMESTA (LAW)   │
        │  (systemCultivation)            │     │  (cultivationLaw)                │
        ├─────────────────────────────────┤     ├──────────────────────────────────┤
        │ • 9 Ranah Utama (Mortal s/d     │     │ • 15 Hukum Alam Abadi            │
        │   Immortal Ascension)           │     │ • Dipatri saat masih Mortal      │
        │ • Menentukan Kapasitas Dantian, │     │ • 9 Rank (Rank 0 s/d 8)          │
        │   Laju Qi Semesta, Level Cap    │     │ • 10 Stage per Rank (0 s/d 9)    │
        │   Ranah & Tribulasi Petir       │     │ • Membuka Pohon 14 Skill Unik    │
        │ • Multiplier Combat Base (+2%)  │     │ • Bonus Level Cap (+2) & SP (+1) │
        └─────────────────────────────────┘     └──────────────────────────────────┘
```

Kedua sistem ini saling mengunci (*mutual gating*):
- Seorang pemain **hanya dapat mematri 1 Hukum Semesta seumur hidup** saat berada di ranah **Fondasi Fana (Mortal Foundation, Realm Index 0)**.
- Kenaikan Rank Law dibatasi oleh Ranah Karakter (Contoh: Membuka Rank 2 Law membutuhkan karakter mencapai ranah *Pembentukan Fondasi*).
- Kenaikan Stage Law membuka batas maksimal level fisik karakter (`lawLevelCapBonus`), yang menjadi syarat mutlak terobosan ranah besar.

---

## 2. Katalog Lengkap 15 Hukum Semesta & 210 Skill Tree

Setiap Hukum Semesta memiliki **14 Skill Unik** yang terbagi dalam **5 Tingkatan (Tier)**:
- **Tier 1 (Rank 0–1)**: 4 Skill Dasar (Pasif Elemen, Ketahanan Stat, Serangan Dasar, Pertahanan Reaktif).
- **Tier 2 (Rank 2–3)**: 4 Skill Menengah (Buff Stat Khusus, Serangan AoE / Crowd Control, Pemulih Batin, Penembus Zirah).
- **Tier 3 (Rank 4–5)**: 3 Skill Tingkat Tinggi (Pasif Masteri Agung, Domain Pertempuran Luas, Serangan Multi-Proyektil).
- **Tier 4 (Rank 6–7)**: 1 Wujud Transformasi Suci (Wujud Purba selama 8 ronde dengan pengganda atribut masif).
- **Tier 5 (Rank 8 / Puncak)**: 2 Skill Pamungkas (1 Pasif Kebangkitan Abadi / Invulnerability dan 1 Serangan 1000% Catastrophic Burst).

---

### Kategori A: 6 Hukum Unsur Semesta (Divine Elemental Laws)

#### 1. Hukum Api Nirwana Phoenix (`element_phoenix_fire`)
- **Elemen**: Api (*Fire*) | **PathMod Tribulasi**: 1.08x
- **Persyaratan Slot 2**: Katalis Intisari Api Merah / Pil Api
- **Spesialisasi Pasif**: +3% ATK per Rank Law
- **Daftar 14 Skill**:
  1. *Percikan Nyala Batin* (T1 - Pasif): Meningkatkan Fire DMG +5% per level.
  2. *Selubung Bulu Phoenix* (T1 - Pasif): Spiritual RES Api +10 dan kebal efek Freeze.
  3. *Cakar Pembakar Phoenix* (T1 - Aktif): Serangan 130% Fire DMG dengan 40% peluang status Burn.
  4. *Perisai Api Balasan* (T1 - Pasif): 10% peluang membalas serangan lawan dengan 30% ledakan api.
  5. *Kobaran Api Nirwana* (T2 - Aktif): Mengorbankan 15% HP untuk meningkatkan ATK +40% selama 3 ronde.
  6. *Raungan Kawah Vulkanik* (T2 - Aktif): AoE Fear dengan 25% peluang membuat musuh melewatkan giliran.
  7. *Penyembuhan Samadhi* (T2 - Aktif): Memulihkan 15% Max HP dan menghapus efek Bleed.
  8. *Tusukan Meteor Cakar* (T2 - Aktif): Serangan 170% Fire DMG dan menghancurkan 50% Stance bar musuh.
  9. *Kemuliaan Kaisar Api* (T3 - Pasif): Fire DMG +15% dan Crit DMG +10% per level.
  10. *Domain Api Penyucian* (T3 - Aktif): Membakar seluruh musuh sebesar 8% Max HP per ronde selama 5 ronde.
  11. *Sembilan Bulu Membara* (T3 - Aktif): Meluncurkan 9 proyektil bulu api masing-masing 35% DMG.
  12. *Penjelmaan Phoenix Suci* (T4 - Wujud Avatar 8 Ronde): Fire DMG ×2, serangan dasar berantai splash AoE.
  13. *Kebangkitan Nirwana Abadi* (T5 - Pasif): Saat HP mencapai 0, bangkit seketika dengan 35% Max HP dan ledakan 300% AoE (1× per duel).
  14. *Kemurkaan Nirwana Pembakar Langit* (T5 - Ultimate): 1000% Fire DMG murni ke 1 musuh dan membakar arena secara permanen.

#### 2. Hukum Samudra Naga Azure (`element_azure_water`)
- **Elemen**: Air (*Water*) | **PathMod Tribulasi**: 1.02x
- **Persyaratan Slot 2**: Katalis Embun Es Abadi / Giok Air
- **Spesialisasi Pasif**: +3% Max HP per Rank Law
- **Daftar 14 Skill**:
  1. *Aliran Samudra Azure* (T1 - Pasif): Water DMG +5% dan SPD +3% per level.
  2. *Meditasi Palung Glasier* (T1 - Pasif): Perolehan Qi di zona perairan meningkat +12% per level.
  3. *Terkaman Arus Naga* (T1 - Aktif): Serangan 130% Water DMG dan menyerap 10% damage sebagai HP.
  4. *Cermin Kabut Air* (T1 - Pasif): 10% peluang menghindar dan mengurangi SPD musuh -20%.
  5. *Zirah Es Abadi* (T2 - Aktif): Memperoleh perisai es 20% Max HP; musuh penyerang diperlambat -20% SPD.
  6. *Gelombang Pasang Tsunami* (T2 - Aktif): AoE 120% Water DMG dengan 30% peluang memundurkan giliran musuh.
  7. *Mata Air Penyembuh Laut* (T2 - Aktif): Memulihkan 5% Max HP per ronde selama 4 ronde.
  8. *Tusukan Trisula Es* (T2 - Aktif): Serangan 160% Water DMG dengan 35% peluang membekukan musuh (Freeze Stun 1 ronde).
  9. *Kedaulatan Samudra Utara* (T3 - Pasif): Water DMG +15% dan efektivitas healing +12% per level.
  10. *Domain Laut Glasier Abyssal* (T3 - Aktif): Membekukan seluruh musuh 1 ronde; damage air naik +30% sisa duel.
  11. *Panggilan Tiga Naga Air* (T3 - Aktif): Tiga naga air purba menghantam musuh masing-masing 65% DMG.
  12. *Wujud Avatar Naga Azure Purba* (T4 - Wujud Avatar 8 Ronde): Seluruh stat ×1.8, basic attack splash 50% damage.
  13. *Jantung Naga Samudra Purba* (T5 - Pasif): Serangan fatal musuh dinegasikan dan diubah menjadi Perisai Air 50% Max HP (1× per battle).
  14. *Bencana Sembilan Samudra Naga Azure* (T5 - Ultimate): 1000% Water DMG ke target + 300% splash AoE + hapus seluruh buff musuh.

#### 3. Hukum Inti Bumi Xuanwu (`element_xuanwu_earth`)
- **Elemen**: Tanah (*Earth*) | **PathMod Tribulasi**: 0.98x (Paling Tangguh Menahan Petir)
- **Persyaratan Slot 2**: Katalis Batu Inti Purba / Tanah Kuning
- **Spesialisasi Pasif**: +4% DEF per Rank Law
- **Daftar 14 Skill**:
  1. *Inti Pegunungan Karang* (T1 - Pasif): Earth DMG +5% dan DEF +6 per level.
  2. *Harmoni Urat Bumi Leylines* (T1 - Pasif): Perolehan Qi meditasi dan hasil menambang naik +10% per level.
  3. *Tinju Penghancur Granit* (T1 - Aktif): Serangan 140% Earth DMG dan +35% Stance DMG.
  4. *Cangkang Xuanwu Kebal* (T1 - Pasif): 12% peluang mereduksi serangan fisik musuh menjadi 0.
  5. *Benteng Karang Kokoh* (T2 - Aktif): Memperoleh perisai batu 30% Max HP; kebal knockback 4 ronde.
  6. *Hentakan Gempa Bumi* (T2 - Aktif): AoE 120% Earth DMG dengan 35% peluang Stun 1 ronde.
  7. *Regenerasi Sumsum Batu* (T2 - Aktif): Mengonversi 10% DEF menjadi pemulihan HP setiap ronde.
  8. *Tusukan Stalagmit Tajam* (T2 - Aktif): Serangan 165% Earth DMG mengabaikan 30% DEF lawan.
  9. *Keagungan Penguasa Gunung* (T3 - Pasif): Earth DMG +15% dan DEF +15% per level.
  10. *Benteng Xuanwu Tak Tergoyahkan* (T3 - Aktif): Mereduksi seluruh damage masuk sebesar 40% untuk sisa duel.
  11. *Empat Pilar Gempa Dahsyat* (T3 - Aktif): 4 pilar batu menghantam musuh 55% DMG dan mengakar musuh 2 ronde.
  12. *Penjelmaan Titan Xuanwu* (T4 - Wujud Avatar 8 Ronde): DEF ×2.2, memantulkan 80% DEF sebagai damage balasan.
  13. *Aegis Lempeng Benua Abadi* (T5 - Pasif): Damage maksimal dalam 1 hit dibatasi 25% Max HP; kebal serangan critical.
  14. *Bencana Gempa Bumi Pemusnah Primordial* (T5 - Ultimate): 1000% Earth DMG ke target + hancurkan Stance bar seketika + Stun 2 ronde.

#### 4. Hukum Pohon Hayat Kaisar Hijau (`element_qingdi_wood`)
- **Elemen**: Kayu (*Wood*) | **PathMod Tribulasi**: 1.00x
- **Persyaratan Slot 2**: Katalis Getah Pohon Roh / Benih Hayat
- **Spesialisasi Pasif**: +2% HP dan +60 Flat HP per Rank Law
- **Daftar 14 Skill**:
  1. *Daya Hidup Rimba Hijau* (T1 - Pasif): Wood DMG +5% dan Max HP +20 per level.
  2. *Siklus Pohon Tanpa Akhir* (T1 - Pasif): Perolehan Qi herba +12% per level; batas usia Lifespan bertambah ×1.5.
  3. *Cambuk Duri Pengikat* (T1 - Aktif): Serangan 125% Wood DMG dan menyerap 15% damage menjadi HP.
  4. *Kulit Kayu Penolak Racun* (T1 - Pasif): 10% peluang menyerap pukulan musuh dan memulihkan 5% HP.
  5. *Aura Bunga Penawar Racun* (T2 - Aktif): Menghapus seluruh debuff diri dan memulihkan 8% HP per ronde selama 3 ronde.
  6. *Penyebaran Spora Pembungkam* (T2 - Aktif): AoE 100% Wood DMG dengan 40% peluang Silence skill musuh selama 2 ronde.
  7. *Getah Pohon Keabadian* (T2 - Pasif): Bangkit dengan 25% HP saat menerima serangan fatal (cooldown 24 jam).
  8. *Lembing Semak Berduri* (T2 - Aktif): Serangan 155% Wood DMG dan menyerap 5% HP musuh setiap ronde.
  9. *Kemegahan Kaisar Hijau Qingdi* (T3 - Pasif): Wood DMG +15% dan regenerasi HP +20% per level.
  10. *Domain Rimba Purba Semesta* (T3 - Aktif): Semua skill kayu hemat -50% Qi; memulihkan 10% HP setiap ronde.
  11. *Seribu Sulur Kayu Pembelit* (T3 - Aktif): 5 cambukan sulur masing-masing 45% DMG dan melumpuhkan gerak musuh.
  12. *Mekarnya Pohon Hayat Semesta* (T4 - Wujud Avatar 8 Ronde): HP regens 25% per ronde, sekutu +50% ATK, wood DMG ×2.
  13. *Akar Tak Terputus Kaisar Hijau* (T5 - Pasif): Kerusakan fatal memotong Qi alih-alih HP; kebal racun dan kutukan penuaan.
  14. *Penciptaan & Pemusnahan Sepuluh Ribu Pohon* (T5 - Ultimate): 1000% Wood life-drain blast ke target + pulihkan seluruh HP tim ke 100%.

#### 5. Hukum Badai Sayap Roc Sembilan Langit (`element_roc_wind`)
- **Elemen**: Angin (*Wind*) | **PathMod Tribulasi**: 1.05x
- **Persyaratan Slot 2**: Katalis Bulu Burung Roc / Kristal Badai
- **Spesialisasi Pasif**: +4% SPD / Agility per Rank Law
- **Daftar 14 Skill**:
  1. *Luncuran Sayap Badai Roc* (T1 - Pasif): Wind DMG +5% dan Agility +5 per level.
  2. *Kepakan Sayap Sembilan Puluh Ribu Li* (T1 - Pasif): Kecepatan jelajah peta +15% dan konsumsi stamina langkah -10%.
  3. *Bilah Bulu Badai Tajam* (T1 - Aktif): Serangan 125% Wind DMG; garansi CRIT jika SPD pemain lebih tinggi dari musuh.
  4. *Selubung Angin Penghindar* (T1 - Pasif): 10% peluang menghindar penuh dan memperoleh +10% SPD tambahan.
  5. *Langkah Bayangan Halimun* (T2 - Aktif): Evasion +40% selama 3 ronde; basic attack memukul 2 kali beruntun.
  6. *Pusaran Angin Topan* (T2 - Aktif): AoE 130% Wind DMG dan menurunkan akurasi musuh -30% selama 2 ronde.
  7. *Hembusan Angin Pemulih Raga* (T2 - Aktif): Mengonversi 15% Agility menjadi pemulihan HP selama 3 ronde.
  8. *Bilah Pedang Sonik Taufan* (T2 - Aktif): Serangan 165% Wind DMG dengan 30% peluang Bleed selama 3 ronde.
  9. *Sayap Penguasa Sembilan Langit* (T3 - Pasif): Wind DMG +15% dan Evasion +10% per level.
  10. *Domain Mata Badai Abadi* (T3 - Aktif): Memperoleh 100% Evasion selama 2 ronde; seluruh jurus angin memukul dua kali.
  11. *Hujan Seribu Bulu Badai* (T3 - Aktif): 8 proyektil bulu angin menghujam musuh masing-masing 30% DMG.
  12. *Burung Roc Melintasi Sembilan Langit* (T4 - Wujud Avatar 8 Ronde): SPD ×2.5, serangan memukul 3 kali, tembus 50% DEF lawan.
  13. *Elang Kehampaan Tak Tersentuh* (T5 - Pasif): Otomatis menghindar dari 2 serangan pertama dalam duel; selalu mengambil inisiatif giliran pertama.
  14. *Selaman Pembelah Langit Burung Roc Purba* (T5 - Ultimate): Menghilang ke void 1 ronde lalu menukik dengan 1000% Wind DMG + 100% Stun 2 ronde.

#### 6. Hukum Guntur Halilintar Dewa Petir (`element_godthunder_light`)
- **Elemen**: Petir (*Lightning*) | **PathMod Tribulasi**: 1.15x (Damage Petir Tertinggi)
- **Persyaratan Slot 2**: Katalis Pasir Petir Langit / Obsidian Kilat
- **Spesialisasi Pasif**: +2.5% ATK dan +2% SPD per Rank Law
- **Daftar 14 Skill**:
  1. *Lengkungan Petir Langit* (T1 - Pasif): Lightning DMG +5% dan Crit Rate +3% per level.
  2. *Tempaan Halilintar Tubuh* (T1 - Pasif): Spiritual RES Petir +15% per level; membangun muatan listrik statis saat diserang.
  3. *Kilatan Busur Petir Ungu* (T1 - Aktif): Serangan 135% Lightning DMG dengan percikan 25% ke musuh sekitar.
  4. *Perisai Muatan Statis* (T1 - Pasif): 10% peluang melumpuhkan penyerang jarak dekat selama 1 ronde.
  5. *Jubah Guntur Langit Biru* (T2 - Aktif): Crit Rate +35% dan Crit DMG +50% selama 3 ronde.
  6. *Sambaran Halilintar Sembilan Langit* (T2 - Aktif): AoE 140% Lightning DMG dengan 30% peluang Paralyze Stun 1 ronde.
  7. *Pelepasan Beban Meridian* (T2 - Aktif): Mengonversi muatan statis menjadi 20% Qi dan 15% HP pemulihan.
  8. *Tombak Hukuman Dewa Petir* (T2 - Aktif): Serangan 175% Lightning DMG mengabaikan 40% DEF dan Spiritual RES lawan.
  9. *Wibawa Penguasa Halilintar Dewa* (T3 - Pasif): Lightning DMG +15% dan Crit DMG +15% per level.
  10. *Domain Hukuman Tribulasi Langit* (T3 - Aktif): Setiap ronde sambaran petir menyambar musuh 80% DMG; petir pemain +40% DMG.
  11. *Pengadilan Sembilan Sambaran Petir* (T3 - Aktif): 9 kilat sambaran beruntun menghantam target masing-masing 40% DMG.
  12. *Wujud Penjelmaan Dewa Petir Langit* (T4 - Wujud Avatar 8 Ronde): Seluruh damage diubah menjadi True Damage tembus zirah, Crit Rate 100%.
  13. *Penguasa Tribulasi Langit Tertinggi* (T5 - Pasif): Menyerap 50% damage sihir elemen musuh menjadi HP; kebal Stun dan Paralyze.
  14. *Kemurkaan Sembilan Langit Tribulasi Primordial* (T5 - Ultimate): Sambaran guntur primordial 1000% True Damage ke target + 400% AoE flash ke semua musuh.

---

### Kategori B: 4 Hukum Fondasi Raga, Gu & Ikatan Nyawa

#### 7. Hukum Penempaan Raga Suci (`body_tempering`)
- **Tipe Qi Khusus**: *True Qi* (Bukan Qi Biasa) | **PathMod Tribulasi**: 1.00x
- **Persyaratan Slot 2**: **TIDAK BUTUH SLOT 2** (Fokus murni menempa 9 bagian tubuh internal: kepala, torso, lengan, kaki, tulang belakang, dantian, kulit)
- **Spesialisasi Pasif**: +6% HP, +6% DEF, dan +100 Flat HP per Rank Law
- **Daftar 14 Skill**:
  1. *Kulit Fana Sekuat Kayu Besi* (T1 - Pasif): Physical DEF +10 dan Max HP +30 per level.
  2. *Sirkulasi True Qi Meridian* (T1 - Pasif): Regenerasi True Qi +3 per ronde tempur; Vitality +5 per level.
  3. *Tinju Raga Bertenaga Lembu* (T1 - Aktif): Pukulan 140% True Qi Physical DMG; memulihkan +5 True Qi saat mendarat.
  4. *Otot Baja Penangkis Bilah* (T1 - Pasif): 12% peluang mengurangi damage fisik lawan sebesar 50%.
  5. *Pelepasan True Qi Berkobar* (T2 - Aktif): Membakar True Qi untuk meningkatkan ATK fisik +50% dan Stance DMG +50% selama 3 ronde.
  6. *Hentakan Kaki Pemecah Tanah* (T2 - Aktif): AoE 130% Physical DMG dan menghancurkan Stance bar semua musuh aktif.
  7. *Pemurnian Darah Panas* (T2 - Aktif): Memulihkan 20% Max HP dan menghapus semua efek debuff fisik.
  8. *Tinju Penghancur Tulang* (T2 - Aktif): Hantaman keras 170% Physical DMG dan melumpuhkan target 1 ronde.
  9. *Keagungan Raga Emas Vajra* (T3 - Pasif): HP +20% dan DEF +20% per level.
  10. *Domain Tinju Mengguncang Gunung* (T3 - Aktif): Kebal status Stun dan Knockback; Physical DMG +40% untuk sisa duel.
  11. *Seribu Bogem Mentah Beruntun* (T3 - Aktif): Hujanan 10 pukulan bertubi-tubi masing-masing 35% Physical DMG.
  12. *Wujud Tirani Tubuh Dewa Iblis* (T4 - Wujud Avatar 8 Ronde): HP dan DEF ×2.5, serangan tangan kosong memicu gelombang kejut AoE.
  13. *Raga Abadi Tak Terhancurkan Vajra* (T5 - Pasif): Pemain tidak dapat dibunuh dalam 3 ronde pertama duel; kebal debuff fisik.
  14. *Pukulan Tunggal Penghancur Jagat Raya* (T5 - Ultimate): 1000% True Qi Physical DMG murni yang membelah ruang hampa.

#### 8. Hukum Rongga Sepuluh Ribu Gu (`gu_master`)
- **Elemen**: Racun (*Poison*) & Fusi Serangga | **PathMod Tribulasi**: 1.20x
- **Persyaratan Slot 2**: Bibit Ulat Gu Fana (`gu_larva`)
- **Daftar 14 Skill**:
  1. *Keahlian Merawat Cacing Gu* (T1 - Pasif): Efisiensi pakan cacing Gu meningkat +10% per level.
  2. *Pelebaran Rongga Aperture* (T1 - Pasif): Kapasitas slot rongga Gu bertambah +10% per level.
  3. *Sengatan Bisa Serangga Gu* (T1 - Aktif): Serangan 130% Poison DMG gabungan praktisi dan Gu.
  4. *Cangkang Pelindung Koloni Gu* (T1 - Pasif): 10% peluang koloni Gu menyerap 40% damage untuk pemain.
  5. *Akselerasi Fusi Sepuluh Ribu Gu* (T2 - Pasif): Peluang keberhasilan fusi Gu meningkat +5% per level.
  6. *Keluaran Kawanan Gu Buas* (T2 - Aktif): AoE 120% Poison DMG; 25% peluang membuat musuh panik melewatkan giliran.
  7. *Sedotan Intisari Hayat Mangsa* (T2 - Aktif): Menghisap 15% damage musuh sebagai pemulihan HP pemain.
  8. *Semprotan Bisa Asam Hibrida* (T2 - Aktif): Serangan 160% Elemental Poison DMG dan melarutkan zirah musuh.
  9. *Dominasi Raja Gu Tertinggi* (T3 - Pasif): Pengganda stat Gu tertinggi meningkat +15% per level.
  10. *Simbiosis Koloni Gu Batin* (T3 - Aktif): Memadukan koloni Gu ke dalam raga: seluruh stat ×1.3 untuk sisa pertempuran.
  11. *Serbuan Gelombang Kawanan Gu* (T3 - Aktif): 3 gelombang kawanan Gu menyerbu musuh masing-masing 60% DMG.
  12. *Metamorfosis Gu Primordial Legendaris* (T4 - Wujud Avatar 8 Ronde): Fusi penuh Gu Raja 8 ronde: Seluruh stat ×2, racun menembus imunitas.
  13. *Leluhur Rongga Gu Primordial Abadi* (T5 - Pasif): Serangga Gu kebal mati dalam duel; peluang fusi Gu menjadi 100% sempurna.
  14. *Mulut Menelan Langit Laksa Cacing Gu* (T5 - Ultimate): 1000% Devouring Poison DMG gabungan pemain dan kawanan Gu.

#### 9. Hukum Pusaka Jiwa Kelahiran (`natal_artifact`)
- **Elemen**: Netral (*Soul Bound Artifact*) | **PathMod Tribulasi**: 1.05x
- **Persyaratan Slot 2**: Benda Fana Common Apa Saja (Pedang Patah, Mangkuk Retak, Cermin Kuningan, Kerikil Kali)
- **Spesialisasi Pasif**: +25 Flat ATK dan +15 Flat DEF per Rank Pusaka
- **Daftar 14 Skill**:
  1. *Penguasaan Infus Qi Pusaka* (T1 - Pasif): Kecepatan pengisian bar infus pusaka naik +10% per level.
  2. *Resonansi Jiwa dengan Benda Fana* (T1 - Pasif): Bonus stat dari pusaka jiwa bertambah +5% per level.
  3. *Serangan Padu Bilah Pusaka* (T1 - Aktif): Pemain dan pusaka menyerang bersama menghasilkan 100% + 60% DMG.
  4. *Perisai Runa Penangkis Pusaka* (T1 - Pasif): 10% peluang pusaka menangkis serangan penuh untuk pemain.
  5. *Orbit Pusaka Melayang Otonom* (T2 - Aktif): Pusaka terbang menyerang mandiri setiap putaran selama 4 ronde.
  6. *Gelombang Getaran Runa Batin* (T2 - Aktif): AoE 120% Sonic DMG dan 25% peluang mengacaukan mantra musuh.
  7. *Penyerap Intisari Senjata Lawan* (T2 - Aktif): Mengubah 15% damage pukulan menjadi pengisian Qi Dantian.
  8. *Tebasan Pedang Melayang Beruntun* (T2 - Aktif): Pusaka melesat cepat menghasilkan 160% Slash DMG menembus blokir.
  9. *Keagungan Pusaka Rohani Sejati* (T3 - Pasif): Pengganda atribut pusaka meningkat +15% per level.
  10. *Penyatuan Raga dan Bilah Pusaka* (T3 - Aktif): Pemain menyatu dengan pusaka: seluruh stat ×1.3 untuk sisa pertempuran.
  11. *Panggilan Ribuan Bayangan Pusaka* (T3 - Aktif): 3 bayangan pusaka spektral menghujam musuh masing-masing 60% DMG.
  12. *Resonansi Jiwa Pusaka Legendaris* (T4 - Wujud Avatar 8 Ronde): Fusi murni 8 ronde: Parameter tempur ×2, pusaka melancarkan serangan pasif otomatis.
  13. *Pusaka Primordial Chaos Bernyawa* (T5 - Pasif): Pusaka tidak dapat hancur; membangkitkan pemain dengan 20% HP jika tumbang.
  14. *Tebasan Pembelah Langit dan Bumi Purba* (T5 - Ultimate): 1000% True Single Target Cleave DMG mengabaikan 100% DEF dan zirah pelindung lawan.

#### 10. Hukum Satwa Roh Kelahiran (`natal_beast`)
- **Elemen**: Netral (*Blood Bound Companion*) | **PathMod Tribulasi**: 1.10x
- **Persyaratan Slot 2**: Satwa Fana Common Apa Saja (Anak Anjing Kampung, Ular Rumput, Kucing Liar, Burung Pipit)
- **Spesialisasi Pasif**: +50 Flat HP dan +15 Flat ATK per Rank Satwa
- **Daftar 14 Skill**:
  1. *Ikatan Batin Satwa Roh* (T1 - Pasif): Multiplier stat satwa pendamping meningkat +5% per level.
  2. *Efisiensi Pemberian Pakan Roh* (T1 - Pasif): Nilai nutrisi pakan satwa meningkat +10% per level.
  3. *Serangan Serentak Satwa & Pendekar* (T1 - Aktif): Pemain dan satwa menyerang bersama menghasilkan 100% + 60% DMG.
  4. *Naluri Pelindung Satwa Setia* (T1 - Pasif): 10% peluang satwa memasang badan menahan damage untuk pemain.
  5. *Mutasi Wujud Fisik Siluman* (T2 - Aktif): Satwa bertransformasi menjadi wujud buas raksasa selama 4 ronde.
  6. *Raungan Buas Raja Hutan Purba* (T2 - Aktif): AoE Fear: 25% peluang membuat musuh melewatkan giliran.
  7. *Tautan Jiwa Simbiotik* (T2 - Aktif): Membagi 15% efek pemulihan HP antara satwa dan pemain.
  8. *Semburan Napas Elemen Satwa* (T2 - Aktif): Satwa menyemburkan 150% Elemental Breath DMG ke barisan musuh.
  9. *Kenaikan Pangkat Tetua Satwa Roh* (T3 - Pasif): Pengganda atribut satwa meningkat +15% per level.
  10. *Jiwa Manunggal Satwa dan Pendekar* (T3 - Aktif): Transformasi permanen hingga akhir duel: seluruh stat ×1.3.
  11. *Panggilan Kawanan Satwa Purba* (T3 - Aktif): 3 satwa spektral menerjang musuh masing-masing 60% DMG.
  12. *Fusi Sempurna Satwa Dewa Mitologi* (T4 - Wujud Avatar 8 Ronde): Fusi sejati pemain dan satwa 8 ronde: Seluruh stat ×2, serangan memiliki efek ganda.
  13. *Dewa Satwa Primordial Abadi* (T5 - Pasif): Satwa kebal mati dalam duel; bangkit dengan 20% HP setelah 2 ronde jika tumbang.
  14. *Raungan Langit dan Bumi Satwa Purba* (T5 - Ultimate): Serangan gabungan dahsyat 1000% DMG ke satu target.

---

### Kategori C: 5 Hukum Demonic Dao Mandiri

Karakteristik Demonic Dao: Memiliki nilai ofensif ekstrem (+3.5% ATK per Rank Law), scaling dari *Corruption Index* (+1% ATK per 10 Corruption), namun memiliki PathMod Tribulasi tinggi (1.25x s/d 1.55x).

#### 11. Hukum Pelebur Inti Siluman (`demonic_turbid_core`)
- **Elemen**: Kegelapan Siluman (*Dark/Beast Miasma*) | **PathMod Tribulasi**: 1.40x
- **Persyaratan Slot 2**: Inti Siluman Kotor Tingkat 1 (`beast_core`)
- **Daftar 14 Skill**:
  1. *Penyedot Hawa Siluman Keruh* (T1 - Pasif): Dark DMG +5% dan efisiensi serap inti monster +10% per level.
  2. *Ketahanan Racun Miasma* (T1 - Pasif): Resistensi terhadap hawa kotor +15% per level.
  3. *Pukulan Tinju Baleful Turbid* (T1 - Aktif): Serangan 130% Dark DMG dengan 30% peluang menurunkan ATK musuh.
  4. *Kabut Pelindung Hawa Kotor* (T1 - Pasif): 10% peluang membutakan musuh saat diserang.
  5. *Peleburan Inti Monster Spontan* (T2 - Aktif): Membakar inti kotor untuk meningkatkan Crit Rate +30% selama 3 ronde.
  6. *Ledakan Gelombang Baleful Miasma* (T2 - Aktif): AoE 130% Dark DMG dan mengurangi DEF semua musuh sebesar 20%.
  7. *Pemulihan Inti Siluman Batin* (T2 - Aktif): Mengubah hawa kotor terserap menjadi 15% HP pemulihan instan.
  8. *Cakar Penghancur Dantian Siluman* (T2 - Aktif): Serangan 165% Dark DMG dan menguras 20 Qi milik musuh.
  9. *Kekuasaan Raja Pelebur Inti* (T3 - Pasif): Dark DMG +15% dan penyerapan Qi monster +20% per level.
  10. *Domain Kawah Hawa Keruh Abadi* (T3 - Aktif): Semua musuh terkena korosi 6% HP per ronde; Dark DMG naik +35%.
  11. *Ledakan Tiga Inti Siluman Buas* (T3 - Aktif): 3 ledakan inti monster buas menghantam musuh masing-masing 60% DMG.
  12. *Penjelmaan Dewa Iblis Siluman Chaos* (T4 - Wujud Avatar 8 Ronde): ATK dan DEF ×2, serangan memicu korosi pertahanan lawan.
  13. *Leluhur Inti Siluman Primordial* (T5 - Pasif): Kebal serangan monster tipe Beast; menyerap 30% serangan beast menjadi HP.
  14. *Peleburan Jagat Raya Inti Siluman Purba* (T5 - Ultimate): 1000% Dark Devouring DMG dan menyerap 50% damage menjadi HP diri.

#### 12. Hukum Penghisap Darah & Jiwa (`demonic_blood_soul`)
- **Elemen**: Darah & Arwah (*Blood/Soul*) | **PathMod Tribulasi**: 1.55x (Paling Rawan Petir Langit)
- **Persyaratan Slot 2**: Botol Darah Monster Segar (`blood_vial`)
- **Daftar 14 Skill**:
  1. *Pencium Aroma Darah Segar* (T1 - Pasif): Lifesteal +5% dan Blood DMG +5% per level.
  2. *Panen Esensi Jiwa Terlantar* (T1 - Pasif): Memperoleh tambahan Qi setiap kali mengalahkan musuh.
  3. *Tusukan Belati Pencabut Nyawa* (T1 - Aktif): Serangan 130% Blood DMG dan memulihkan 20% damage sebagai HP.
  4. *Perisai Darah Pelindung Batin* (T1 - Pasif): 10% peluang mengubah luka yang diterima menjadi darah pemulih.
  5. *Pelepasan Panji Sembilan Ruh* (T2 - Aktif): Memanggil arwah penasaran meningkatkan ATK +45% selama 3 ronde.
  6. *Lautan Darah Mendidih Shura* (T2 - Aktif): AoE 130% Blood DMG dan menyebabkan status Bleed hebat selama 3 ronde.
  7. *Hisapan Darah Jantung Lawan* (T2 - Aktif): Menghisap darah musuh menghasilkan 160% DMG dan memulihkan 25% HP.
  8. *Jeratan Rantai Arwah Penasaran* (T2 - Aktif): Mengikat arwah target menghasilkan 140% DMG dan Stun 1 ronde.
  9. *Kaisar Asura Laut Darah* (T3 - Pasif): Lifesteal +15% dan Blood DMG +15% per level.
  10. *Domain Neraka Sembilan Panji Ruh* (T3 - Aktif): Menghidupkan bayangan arwah musuh yang gugur untuk menyerang lawan.
  11. *Badai Arwah Pencabut Sukma* (T3 - Aktif): Hentakan ribuan arwah panji menyerang musuh masing-masing 60% DMG.
  12. *Penjelmaan Raja Asura Haus Darah* (T4 - Wujud Avatar 8 Ronde): Lifesteal 100%, kecepatan serang berlipat ganda, kebal rasa sakit.
  13. *Leluhur Abadi Laut Darah Shura* (T5 - Pasif): Selama ada musuh yang berdarah di arena, pemain tidak dapat mati (kebal fatal damage).
  14. *Pemusnahan Sukma Sembilan Neraka Darah* (T5 - Ultimate): 1000% Pure Blood Devastation DMG ke satu target + cabut sukma musuh seketika.

#### 13. Hukum Seribu Racun Pemusnah (`demonic_myriad_venom`)
- **Elemen**: Racun Maut Ekstrem (*Corrosive Poison*) | **PathMod Tribulasi**: 1.35x
- **Persyaratan Slot 2**: Kantung Racun Ular Rawa (`venom_sac`)
- **Daftar 14 Skill**:
  1. *Pengecap Aneka Racun Maut* (T1 - Pasif): Poison DMG +5% dan toleransi racun meningkat +10% per level.
  2. *Kantung Bisa Kulit Hitam* (T1 - Pasif): Kebal racun biasa; memancarkan aura racun tipis di sekitarnya.
  3. *Semprotan Jarum Bisa Korosif* (T1 - Aktif): Serangan 125% Poison DMG dengan 50% peluang racun bertumpuk.
  4. *Sisik Ular Berbisa Pelindung* (T1 - Pasif): 12% peluang meracuni musuh yang menyerang jarak dekat.
  5. *Pelepasan Kabut Seribu Bisa* (T2 - Aktif): Membakar racun batin meningkatkan ATK +35% dan melipatgandakan DoT racun 3 ronde.
  6. *Hujan Racun Asam Korosi Zirah* (T2 - Aktif): AoE 120% Poison DMG dan menghancurkan 25% DEF semua musuh aktif.
  7. *Penawar Bisa Racun Menjadi Qi* (T2 - Aktif): Menetralisir racun di dalam tubuh menjadi 20% pemulihan HP dan Qi.
  8. *Tusukan Taring Ular Hitam Maut* (T2 - Aktif): Serangan 165% Poison DMG dan melumpuhkan saraf musuh 1 ronde.
  9. *Raja Penguasa Selaksa Racun* (T3 - Pasif): Poison DMG +15% dan durasi racun bertambah +2 ronde.
  10. *Domain Kawah Racun Kiamat Semesta* (T3 - Aktif): Seluruh musuh kehilangan 10% Max HP per ronde; musuh tidak dapat menerima heal.
  11. *Panggilan Tiga Naga Racun Purba* (T3 - Aktif): 3 naga racun asam menyembur musuh masing-masing 60% DMG.
  12. *Tubuh Tirani Sembilan Belas Racun Suci* (T4 - Wujud Avatar 8 Ronde): Kebal seluruh status efek, basic attack menginfeksi racun korosif mematikan.
  13. *Penguasa Racun Kiamat Primordial Abadi* (T5 - Pasif): Semua efek racun pemain menjadi True Damage yang tidak dapat dikurangi zirah/mantra.
  14. *Bencana Racun Pemusnah Kehidupan Jagat* (T5 - Ultimate): 1000% Catastrophic Poison DMG ke target tunggal + lelehkan zirah musuh seketika.

#### 14. Hukum Kontrak Iblis Abyss (`demonic_abyssal_pact`)
- **Elemen**: Kegelapan Void (*Abyssal Dark*) | **PathMod Tribulasi**: 1.50x
- **Persyaratan Slot 2**: Perkamen Darah Gelap (`abyssal_scroll`)
- **Daftar 14 Skill**:
  1. *Tanda Perjanjian Darah Iblis* (T1 - Pasif): Dark DMG +5% dan ATK +5 per level dengan bayaran upeti.
  2. *Bisikan Rahasia Jurang Abyss* (T1 - Pasif): Mengetahui titik lemah musuh; Crit Rate +3% per level.
  3. *Cakar Bayangan Iblis Neraka* (T1 - Aktif): Serangan 130% Dark DMG dan mencuri 5% ATK musuh selama 2 ronde.
  4. *Perisai Daging Tumbal Iblis* (T1 - Pasif): 10% peluang mengalihkan damage yang diterima ke jurang void.
  5. *Panggilan Kekuatan Iblis Kuno* (T2 - Aktif): Meminjam daya abyss untuk meningkatkan ATK +50% selama 3 ronde.
  6. *Raungan Jurang Kehampaan Neraka* (T2 - Aktif): AoE 130% Dark DMG dengan 30% peluang Fear membuat musuh gemetar.
  7. *Persembahan Jiwa Musuh ke Abyss* (T2 - Aktif): Mengorbankan musuh yang tumbang untuk memulihkan 25% HP dan Qi diri.
  8. *Sabetan Sabit Algojo Abyss* (T2 - Aktif): Serangan 170% Dark DMG dengan bonus damage berlipat jika HP musuh rendah.
  9. *Panglima Perang Dunia Bawah Abyss* (T3 - Pasif): Dark DMG +15% dan Crit DMG +15% per level.
  10. *Domain Pintu Gerbang Jurang Neraka* (T3 - Aktif): Membuka gerbang abyss yang menyeret dan menelan 8% HP semua musuh setiap ronde.
  11. *Panggilan Tiga Raksasa Iblis Neraka* (T3 - Aktif): 3 raksasa jurang menghantam musuh masing-masing 65% DMG.
  12. *Penjelmaan Tubuh Dewa Iblis Abyss* (T4 - Wujud Avatar 8 Ronde): Ukuran raga membesar, seluruh stat ×2, serangan memicu gempa void.
  13. *Kaisar Tahta Sembilan Iblis Neraka Abadi* (T5 - Pasif): Memperoleh kekebalan 100% dari sihir gelap; setiap pukulan menyedot jiwa.
  14. *Penghakiman Kehampaan Sembilan Iblis Neraka* (T5 - Ultimate): 1000% Abyssal Void DMG murni ke target tunggal dan menelan musuh ke dasar neraka.

#### 15. Hukum Bayangan Sembilan Yin (`demonic_nether_darkness`)
- **Elemen**: Hawa Yin & Bayangan (*Nether Yin*) | **PathMod Tribulasi**: 1.25x
- **Persyaratan Slot 2**: Batu Yin Kuburan Tua (`yin_stone`)
- **Daftar 14 Skill**:
  1. *Hawa Dingin Yin Sembilan Nether* (T1 - Pasif): Dark Yin DMG +5% dan SPD +3% per level.
  2. *Meditasi Liang Kubur Kuno* (T1 - Pasif): Perolehan Qi di zona makam dan gua gelap meningkat +15% per level.
  3. *Bilah Bayangan Senyap Nether* (T1 - Aktif): Serangan 130% Yin DMG menembus pertahanan fisik musuh.
  4. *Jubah Malam Abadi Pembias Bayang* (T1 - Pasif): 12% peluang musuh salah sasaran menyerang bayangan semu.
  5. *Penyatuan Bayangan Sunyi Malam* (T2 - Aktif): Evasion +45% selama 3 ronde; serangan dari bayangan memiliki 100% Crit Rate.
  6. *Kabut Yin Pembeku Jiwa Lawan* (T2 - Aktif): AoE 125% Yin DMG dan membekukan sirkulasi Qi musuh (-30% MP).
  7. *Sedotan Dingin Sukma Netherworld* (T2 - Aktif): Menghisap 15% Max HP musuh dan mengubahnya menjadi perisai bayangan.
  8. *Tusukan Duri Es Netherworld* (T2 - Aktif): Serangan 165% Yin DMG dengan 35% peluang Stun 1 ronde.
  9. *Penguasa Domain Sembilan Lapis Yin* (T3 - Pasif): Dark Yin DMG +15% dan Evasion +10% per level.
  10. *Domain Malam Abadi Tanpa Surya* (T3 - Aktif): Cahaya padam total: musuh kehilangan 40% akurasi dan menderita 7% damage per ronde.
  11. *Bayangan Seribu Hantu Netherworld* (T3 - Aktif): Kawanan hantu nether menyerbu musuh masing-masing 60% DMG.
  12. *Penjelmaan Mahadewa Kegelapan Yin Purba* (T4 - Wujud Avatar 8 Ronde): Tubuh menjadi bayangan transparan kebal serangan fisik murni.
  13. *Kaisar Kegelapan Primordial Void Abadi* (T5 - Pasif): Pemain tidak dapat ditarget oleh mantra sihir saat berada dalam kondisi bayangan.
  14. *Kiamat Malam Abadi Sembilan Jurang Yin* (T5 - Ultimate): 1000% Pure Nether Yin DMG yang memadamkan seluruh cahaya dan sukma lawan seketika.

---

## 3. Apa yang Terjadi Saat Naik 1 Stage di Realm 2?

**Realm 2** adalah **Pembentukan Fondasi (Foundation Establishment)**.
Contoh: Karakter naik dari **Pembentukan Fondasi Tahap 1 $\to$ Tahap 2**.

Berikut adalah kalkulasi deterministik yang dieksekusi secara *authoritative* di backend ([cultivation.js](file:///d:/gitub/bot-discord/jianghu-bot/utils/cultivation.js#L113-L200) & [playerCombat.js](file:///d:/gitub/bot-discord/jianghu-bot/utils/playerCombat.js#L71-L88)):

### 3.1. Perubahan Parameter Internal Kultivasi
1. **Peningkatan Kapasitas Qi Dantian ($MaxQi$)**:
   $$\text{MaxQi}(\text{Realm } 2, \text{Stage}) = \text{baseQiCapacity}(25.000) \times 1.5^{\text{stage} - 1}$$
   - Stage 1: $25.000$ Qi
   - **Stage 2: $37.500$ Qi** (+12.500 Qi / +50% kapasitas)
   - **Stage 3: $56.250$ Qi** (+18.750 Qi)
   - **Stage 4: $84.375$ Qi**
   - **Stage 5: $126.562$ Qi**
   - **Stage 6: $189.843$ Qi**
   - **Stage 7: $284.765$ Qi**
   - **Stage 8: $427.148$ Qi**
   - **Stage 9: $640.722$ Qi** (Puncak Fondasi, siap Tribulasi Petir Inti Emas)
2. **Peningkatan Laju Qi Pasif ($QiRate$)**:
   $$\text{Rate}(\text{Realm } 2, \text{Stage}) = \text{baseRate}(5) \times \left(1 + (\text{stage} - 1) \times 0.1\right)$$
   - Stage 1: 5 Qi/menit
   - Stage 2: 5.5 (dibulatkan menjadi 5 Qi/menit)
   - Stage 3: 6 Qi/menit
   - Stage 4: 6.5 Qi/menit
   - Stage 9: 9 Qi/menit
3. **Reset Akumulasi Qi**:
   - `player.systemCultivation.qi = 0` (Dantian dikosongkan untuk mengisi lapisan fondasi baru).
4. **Peluang Sukses Terobosan Berikutnya**:
   - Berkurang sebesar 2% (`baseSuccessRate = 80 - (stage * 2)`).
   - Naik ke Stage 2 memiliki base rate 78%, ke Stage 3 memiliki base rate 76%, dst.

---

### 3.2. Pengaruh Kenaikan Stage Realm 2 terhadap 5 Pilar Atribut Karakter

Di bawah arsitektur **Five-Pillars Framework**, berikut status kenaikan masing-masing pilar:

| Pilar Atribut | Status Kenaikan | Parameter yang Ikut Naik | Mekanisme & Formula Backend |
|---|---|---|---|
| **Pilar 1: General Attributes** | **IKUT NAIK** | • **Insight**: +1 poin<br>• **Mood**: Terpotong -15 poin (biaya semadi)<br>• **Max Lifespan**: Kapasitas ranah mengembang | `player.extendedStats.insight += 1`<br>`applyMoodDelta(player, -15)` |
| **Pilar 2: Combat Attributes** | **IKUT NAIK MASIF** | • **Max HP**: +2% multiplier<br>• **ATK**: +2% multiplier<br>• **DEF**: +2% multiplier<br>• **SPD / Agility**: +2% multiplier | Di [`playerCombat.js`](file:///d:/gitub/bot-discord/jianghu-bot/utils/playerCombat.js#L81-L88):<br>`steps = (realmIdx * 10) + stage`<br>`cultBonus = steps * 0.02`<br>Setiap stage menambah **+0.02 (+2%)** ke pengali seluruh stat tempur dasar. |
| **Pilar 3: Martial Arts** | **TIDAK NAIK OTOMATIS** | *Blade, Spear, Sword, Fist, Palm, Finger* | Disiplin Kungfu menyimpan akumulasi XP beladiri yang hanya bertambah saat **bertarung fisik menggunakan senjata terkait** atau membedah kitab jurus. |
| **Pilar 4: Spiritual Root** | **TIDAK NAIK OTOMATIS** | *Fire, Water, Lightning, Wind, Earth, Wood* | Akar spiritual berakar pada *Zero-Baseline Policy* (mulai dari 0) dan bertambah melalui: (1) Cast jurus elemen (+8 XP per jurus, max 40 XP/duel), (2) Memahami kitab elemen, (3) Pil pemurni akar. |
| **Pilar 5: Artisanship** | **TIDAK NAIK OTOMATIS** | *Alchemy, Forge, Herbology, Mining, Fishing, Cooking, Talismans* | Kemahiran profesi terintegrasi 1-to-1 dengan sistem crafting dan bertambah secara mandiri lewat praktik profesi (menempa, meramu pil, memancing, dll.). |

---

### 3.3. Bagaimana Jika yang Naik Adalah 1 Stage di Sistem Law (Rank 2 Law)?
Jika yang dimaksud adalah naik 1 stage pada **Hukum Semesta di Rank 2** (Contoh: *Sayap Api Muda* Stage 1 $\to$ Stage 2):
1. **Level Cap Fisik**: Bertambah **+2 Max Level** (`law.lawLevelCapBonus += 2`).
2. **Skill Points**: Bertambah **+1 Poin Skill** (`law.lawSkillPoints += 1`) untuk dialokasikan di Pohon Skill Law.
3. **Pilar Combat Multiplier**:
   - Bertambah **+0.8%** ke HP, ATK, DEF (`totalStages * 0.008`).
   - Bertambah **+0.4%** ke SPD (`totalStages * 0.004`).
4. **Pilar General**:
   - Mood terpotong 5 poin (sukses) atau 10 poin (gagal).
   - Biaya Copper terpotong sesuai tabel ekonomi Rank 2 (150 s/d 600 Copper).

---

## 4. Hasil Audit Integritas Sistem & Kebijakan "Anti-UI Palsu" (Zero Mockup Policy)

Berdasarkan audit menyeluruh terhadap kode backend, database schema, dan antarmuka frontend:

1. **Altar Binding Law (Slot 1 & Slot 2)**:
   - **Authoritative & Riil**: Endpoint [`GET /api/cultivation/law/binding/inventory`](file:///d:/gitub/bot-discord/jianghu-bot/web-api/routes/lawCultivation.js#L108) melakukan query langsung ke koleksi MongoDB `Item` dan inventori pemain (`player.inventory`).
   - Slot 2 memvalidasi tag item katalis (`fire_catalyst`, `water_catalyst`, `beast_core`, dll.). Begitu tombol bind ditekan, item persyaratan **benar-benar dipotong dari inventori tas pemain**.
2. **Channeling Meditasi Qi Waktu Nyata**:
   - **Bukan Timer Palsu Frontend**: Waktu meditasi dihitung dari selisih waktu server (`Date.now() - player.cultivationLaw.lastChannelSyncAt`) pada [`calculateChannelingProgress`](file:///d:/gitub/bot-discord/jianghu-bot/utils/lawCultivationEngine.js#L140). Menutup tab browser atau mematikan PC tidak menghentikan perolehan Qi hingga mencapai batas harian (*daily cap*).
3. **Pohon Skill (Skill Tree Allocation)**:
   - Endpoint [`POST /api/cultivation/law/skill/allocate`](file:///d:/gitub/bot-discord/jianghu-bot/web-api/routes/lawCultivation.js#L723) memvalidasi `skillPointCost`, `requiredRank`, dan `requiredParentSkillId`. Poin skill tersimpan ke array `player.cultivationLaw.unlockedSkillIds`.
4. **Sinkronisasi Bar Stamina**:
   - Menggunakan Zustand `useUIStore` terpusat. Mengonsumsi stamina di tab kultivasi langsung memotong stamina di Map dan Lembar Karakter secara waktu nyata tanpa lag.

---

## 5. Saran & Rekomendasi Peningkatan untuk Developer

1. **Visualisasi Garis Cabang Pohon Skill (Constellation Graph)**:
   - *Kondisi Saat Ini*: Skill tree di UI dirender dalam bentuk grid kartu berbasis Tier.
   - *Saran*: Tambahkan garis SVG penghubung (*connection lines / glowing constellation nodes*) antar parent skill dan child skill seperti pada pohon skill *Path of Exile* atau *Tale of Immortal* agar jalur percabangan terlihat lebih megah dan intuitif.
2. **Sinergi Law ke Spiritual Root XP (Automatic Dao Resonance)**:
   - *Saran*: Saat pemain menaikkan level skill aktif di Pohon Law yang memiliki elemen tertentu (misal skill Api Phoenix), berikan bonus pengalaman spiritual root otomatis (misal +25 XP ke `player.extendedStats.spiritualRoot.fire`) agar pilar ke-4 ikut terakselerasi secara harmonis.
3. **Notifikasi Banner Batas Max Level**:
   - *Saran*: Ketika karakter mencapai batas Max Level ranah saat ini (misal Level 30 di Qi Refining), tampilkan banner emas halus: *"Wadah fisikmu telah mencapai puncak sempurna! Dantian siap menghadapi terobosan ke Pembentukan Fondasi."* Ini memandu pemain pemula agar tidak bingung mengapa EXP mereka tidak bertambah lagi sebelum menerobos.
4. **Animasi Efek Partikel Wujud Avatar Tier 4**:
   - *Saran*: Saat skill Tier 4 (Wujud Avatar) diaktifkan di Battle Arena, tambahkan overlay aura elemen melingkar di sekeliling sprite karakter agar pemain merasakan sensasi perubahan wujud purba secara visual.

---

## 6. Desain Matematis Penambahan Qi Dinamis & Loop Kultivasi Aktif 15 Law (Anti-Stagnansi & Adiktif)

### 6.1. Eliminasi Stagnansi: Skala Kebutuhan Qi Mortal Foundation (Stage 1 – 10)
Sebelumnya, kode lama mematok flat 1.000 Qi untuk seluruh tahapan Mortal. Pada arsitektur baru, setiap stage bertumbuh secara organik dan proporsional dengan peningkatan laju Qi:

| Tahap Fondasi Fana | Kapasitas Max Qi | Laju Intisari (Qi/Menit) | Estimasi Waktu Meditasi Pasif | Sensasi Progresi Gameplay |
|---|---|---|---|---|
| **Stage 1 (Mortal Awal)** | **1,000 Qi** | 2 Qi / menit | ~8.3 Jam | Pengenalan dantian fana |
| **Stage 2** | **1,500 Qi** | 3 Qi / menit | ~8.3 Jam | Pembukaan pori-pori meridian pertama |
| **Stage 3** | **2,200 Qi** | 4 Qi / menit | ~9.1 Jam | Pemadatan hawa hangat perut bawah |
| **Stage 4** | **3,100 Qi** | 5 Qi / menit | ~10.3 Jam | Meridian Ren & Du mulai berdenyut |
| **Stage 5** | **4,200 Qi** | 6 Qi / menit | ~11.6 Jam | Tahap pertengahan fana, raga menguat |
| **Stage 6** | **5,500 Qi** | 7 Qi / menit | ~13.0 Jam | Sirkulasi Qi kecil (Microcosmic Orbit) |
| **Stage 7** | **7,000 Qi** | 8 Qi / menit | ~14.5 Jam | Sirkulasi Qi besar (Macrocosmic Orbit) |
| **Stage 8** | **9,000 Qi** | 9 Qi / menit | ~16.6 Jam | Raga fana menolak racun biasa |
| **Stage 9** | **11,500 Qi** | 10 Qi / menit | ~19.1 Jam | Puncak manusia fana, dantian membara |
| **Stage 10 (Gerbang Ranah)** | **15,000 Qi** | 12 Qi / menit | ~20.8 Jam | Penyatuan 90 Meridian & Kunci Law |

**Total Akumulasi Qi Fondasi Fana**: **59,800 Qi**.
*Catatan: Waktu meditasi pasif di atas dapat dipersingkat hingga 60-80% lebih cepat melalui aktivitas bermain aktif (Loop Kultivasi Aktif di bawah).*

---

### 6.2. Formula Terobosan Mulus Ranah Tinggi (Realm 1 – 8)
Untuk mencegah lonjakan liar formula eksponensial lama ($1.5^{\text{stage}-1} = 38\times$), digunakan kurva terkalibrasi:
$$\text{MaxQi}(R, S) = \left\lfloor \text{BaseQi}(R) \times \left(1 + (S - 1) \times 0.40 + (S - 1)^{1.35} \times 0.12\right) \right\rfloor$$
$$\text{QiRate}(R, S) = \left\lfloor \text{BaseRate}(R) \times \left(1 + (S - 1) \times 0.20\right) \right\rfloor$$

Memberikan kurva terobosan yang seimbang:
- **Stage 1**: $1.00\times$ BaseQi $\mid$ $1.00\times$ Rate
- **Stage 3**: $2.11\times$ BaseQi $\mid$ $1.40\times$ Rate
- **Stage 5**: $3.47\times$ BaseQi $\mid$ $1.80\times$ Rate
- **Stage 7**: $5.04\times$ BaseQi $\mid$ $2.20\times$ Rate
- **Stage 9**: $6.81\times$ BaseQi $\mid$ $2.60\times$ Rate

---

### 6.3. Spesifikasi 15 Profil Energi & Loop Kultivasi Aktif (Active Gathering Triggers)
Agar tidak monoton hanya menunggu pasif, setiap Law memiliki identitas energi dan cara perolehan aktif yang adiktif:

#### 1. Penempaan Raga Suci (`body_tempering`)
- **Tipe Energi**: **True Qi (真气 - Qi Darah & Raga Jasmani)**.
- **Loop Kultivasi Aktif**:
  - *Pukulan Tempur*: Setiap serangan fisik / pukulan melee mendarat di battle memberi **+12 True Qi**. Kemenangan battle memberi bonus **+35 True Qi**.
  - *Lahap Daging Monster*: Memakan Monster Meat / Beast Flesh memberi **+80 True Qi** instan.
  - *Tempa Raga Jalur Langkah*: Setiap 10 langkah penjelajahan di mikro-grid mengonversi keletihan stamina menjadi **+15 True Qi**.
  - *Aksi Penempaan Raga*: Tempa 9 bagian organ tubuh menghasilkan **+50 True Qi** per sesi.

#### 2. Api Nirwana Phoenix (`element_phoenix_fire`)
- **Tipe Energi**: **Samadhi Phoenix Flame Qi**.
- **Loop Kultivasi Aktif**:
  - Mengalahkan musuh menggunakan jurus berelemen Api memberi bonus **+35 Phoenix Qi**.
  - Meditasi di zona panas / gurun / gunung berapi mempercepat laju sebesar **+50%**.

#### 3. Samudra Naga Azure (`element_azure_water`)
- **Tipe Energi**: **Azure Tide Qi**.
- **Loop Kultivasi Aktif**:
  - Setiap kali berhasil menangkap ikan dalam minigame Memancing (Fishing), menyerap esensi air: **+40 Azure Qi**.
  - Meditasi di atas rakit dermaga atau petak perairan/danau mempercepat laju sebesar **+40%**.

#### 4. Inti Bumi Xuanwu (`element_xuanwu_earth`)
- **Tipe Energi**: **Leyline Heavy Qi**.
- **Loop Kultivasi Aktif**:
  - Setiap kali menambang bijih mineral dalam minigame Penambangan (Mining), menyerap hawa bumi: **+35 Leyline Qi**.
  - Menahan serangan fatal di pertarungan (blokir DEF tinggi) mengonversi getaran benturan menjadi **+10 Qi**.

#### 5. Pohon Hayat Kaisar Hijau (`element_qingdi_wood`)
- **Tipe Energi**: **Vitality Life Qi**.
- **Loop Kultivasi Aktif**:
  - Setiap kali memanen tanaman obat / herba spiritual dalam minigame Pertanian (Farming), menyerap intisari hijau: **+40 Wood Qi**.
  - Regenerasi pasif 1% HP setiap 10 menit saat berada di alam liar.

#### 6. Sayap Badai Roc Kuno (`element_roc_wind`)
- **Tipe Energi**: **Astral Gale Qi**.
- **Loop Kultivasi Aktif**:
  - Menjelajah mikro-grid: setiap 20 langkah memicu gesekan angin batin yang menghasilkan **+25 Wind Qi**.
  - Memiliki diskon konsumsi stamina langkah alami sebesar 15%.

#### 7. Petir Hukuman Dewa (`element_godthunder_light`)
- **Tipe Energi**: **Heavenly Lightning Qi**.
- **Loop Kultivasi Aktif**:
  - Setiap kali mendaratkan Critical Hit pada musuh, menghasilkan lonjakan arus listrik: **+20 Lightning Qi**.
  - Meditasi saat cuaca Badai Petir (Thunderstorm) melipatgandakan perolehan Qi hingga **+200% (3× Lipat)**!

#### 8. Rongga Sepuluh Ribu Gu (`gu_master`)
- **Tipe Energi**: **Myriad Gu Venom Qi**.
- **Loop Kultivasi Aktif**:
  - Memberi pakan herba pada larva ulat Gu: **+40 Qi**.
  - Melakukan fusi dua larva Gu mutasi: **+120 Qi**.

#### 9. Pusaka Jiwa Kelahiran (`natal_artifact`)
- **Tipe Energi**: **Soul Resonance Qi**.
- **Loop Kultivasi Aktif**:
  - Mengasah pusaka jiwa menggunakan batu asah: **+45 Qi**.
  - Setiap kali menempa atau memperbaiki senjata di bengkel Tempa (Smithing), memperoleh resonansi logam batin: **+50 Qi**.

#### 10. Satwa Roh Kelahiran (`natal_beast`)
- **Tipe Energi**: **Blood Oath Symbiotic Qi**.
- **Loop Kultivasi Aktif**:
  - Memberi makan paha daging roh kepada satwa: **+40 Qi**.
  - Memenangkan pertempuran bersama satwa roh pendamping: **+35 Qi** dan satwa memperoleh +20 EXP.

#### 11. Pelebur Inti Siluman (`demonic_turbid_core`)
- **Tipe Energi**: **Baleful Beast Qi**.
- **Loop Kultivasi Aktif**:
  - Mengonsumsi Beast Core hasil buruan siluman memberi lonjakan **+80 s/d +300 Qi** seketika (+3 Korupsi Batin).

#### 12. Penghisap Darah & Jiwa (`demonic_blood_soul`)
- **Tipe Energi**: **Blood Essence Qi**.
- **Loop Kultivasi Aktif**:
  - Menghabisi musuh hidup di pertarungan langsung memanen darah korban: **+50 Blood Qi** otomatis.
  - Mengunci arwah musuh ke Panji Jiwa: **+70 Qi**.

#### 13. Seribu Racun Pemusnah (`demonic_myriad_venom`)
- **Tipe Energi**: **Corrosive Toxic Qi**.
- **Loop Kultivasi Aktif**:
  - Meminum racun maut: **+75 Qi** dan meningkatkan toleransi racun permanen.
  - Terkena efek DoT racun dari musuh di battle justru mengisi **+45 Qi** dantian (imunitas toksik).

#### 14. Kontrak Iblis Abyss (`demonic_abyssal_pact`)
- **Tipe Energi**: **Abyssal Void Qi**.
- **Loop Kultivasi Aktif**:
  - Menyetor upeti kurban ke jurang kegelapan: **+80 Qi** dan memperpanjang perlindungan iblis 7 hari.

#### 15. Bayangan Sembilan Yin (`demonic_nether_darkness`)
- **Tipe Energi**: **Nether Yin Qi**.
- **Loop Kultivasi Aktif**:
  - Meditasi pada malam hari (18:00 – 06:00 WIB) atau saat berada di dalam Labirin Gua Kuno (Dungeon) meningkatkan laju meditasi sebesar **+150%**.

---

### 6.4. Sinergi 5 Pilar Pada Kenaikan Stage & Batasan Alokasi Poin Skill (SP Budget)
1. **Dampak Naik 1 Stage pada 5 Pilar Karakter**:
   - **General**: Max Stamina meningkat bertahap (+3 s/d +5 untuk Body Tempering, +2 untuk Law lain), Lifespan bertambah, Vitality bertambah.
   - **Combat**: Multiplier ATK/DEF/HP naik +0.8%, SPD naik +0.4%.
   - **Spiritual Root**: Memberikan injeksi pengalaman akar elemen (+25 XP ke Spiritual Root terkait setiap kali naik mini-breakthrough).
   - **Artisanship**: Profesi yang selaras dengan Law (Water $\to$ Fishing, Earth $\to$ Mining, Wood $\to$ Farming, Artifact $\to$ Smithing) memperoleh akselerasi pemahaman.

2. **Ekonomi Poin Skill Terbatas (SP Budget Cap & Build Divergence)**:
   - Total Poin Skill (SP) yang dapat diperoleh pemain dari Rank 0 sampai Rank 8 adalah **105 SP** (9 SP per Rank dari mini-breakthrough + 3 SP bonus saat Major Breakthrough).
   - Total SP yang dibutuhkan untuk membuka dan memaksimalkan seluruh 14 skill adalah **~200 SP**.
   - **Hasil Strategis**: Pemain **HANYA DAPAT MEMAKSIMALKAN SEKITAR 50% DARI POHON SKILL**. Hal ini memaksa pemain untuk memilih spesialisasi build:
     - *Cabang A (Full Offensive / Annihilation)*: Fokus pada Burst ATK & Critical.
     - *Cabang B (Sustain / Rebirth / Iron Bastion)*: Fokus pada ketahanan HP, DEF, dan pemulihan stamina.
     - *Cabang C (Control / Crowd Control / Domain)*: Fokus pada Stun, Debuff, dan penguncian musuh.
