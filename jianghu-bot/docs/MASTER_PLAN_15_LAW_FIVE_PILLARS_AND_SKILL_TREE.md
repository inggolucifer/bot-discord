# MASTER ARCHITECTURE PLAN: 15 HUKUM SEMESTA TERPADU 5 PILAR, SISTEM CABANG SKILL TREE & FITUR VISUAL MAHA KARYA

**Dokumen**: Master Architecture & Implementation Plan  
**Target Versi**: Jianghu Bot (Immortal-X) v2.5  
**Penulis**: Antigravity DeepMind Pair Programming  
**Status**: APPROVED & READY FOR IMPLEMENTATION  

---

## 1. Visi & Filosofi Desain

Sistem Hukum Semesta (Law Cultivation) dirancang bukan sekadar sebagai penambah stat angka biasa, melainkan sebagai **Wadah Pondasi Eksistensial (Existential Archetype)** yang membentuk takdir, kelebihan, kelemahan fatal, serta gaya hidup seorang kultivator di seluruh semesta Jianghu.

Setiap Hukum Semesta dari ke-15 Law harus memiliki **koneksi 1-to-1 dengan Ke-5 Pilar Atribut Karakter**:
1. **Pilar 1: General Attributes** (Lifespan, Mood, Health, Stamina, Vitality, Energy, Focus, Luck, Insight).
2. **Pilar 2: Combat Attributes** (ATK, DEF, Agility/SPD, CRIT, CRIT RES, CRIT DMG, CRIT DR, Travel Speed, Martial RES, Spiritual RES).
3. **Pilar 3: Martial Arts Disciplines** (Blade, Spear, Sword, Fist, Palm, Finger).
4. **Pilar 4: Spiritual Root Dao** (Fire, Water, Lightning, Wind, Earth, Wood).
5. **Pilar 5: Artisanship & Profesi** (Alchemy, Forge, Herbology, Mining, Fishing, Cooking, Talismans).

Pemain **tidak dapat memilih semua skill** (*Skill Point Limitation & Mutually Exclusive Paths*). Pohon skill memiliki cabang spesialisasi di mana setiap pilihan membentuk build unik (misal: *Glass Cannon Burst*, *Immortal Sustain Tank*, atau *Crowd Control Domain Master*).

---

## 2. Matriks Asimetris: 15 Hukum Semesta vs 5 Pilar Karakter

Berikut adalah perancangan mendalam untuk ke-15 Hukum Semesta, mencakup keunggulan, kelemahan, serta integrasi 5 pilar saat naik stage/rank:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        KATEGORI 1: 6 HUKUM UNSUR SEMESTA (ELEMENTAL)                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1. Hukum Api Nirwana Phoenix (`element_phoenix_fire`)
- **Lore**: Intisari burung purba pembakar kotoran fana. Semakin terluka, nyala apinya semakin berkobar.
- **Kelebihan (Strengths)**: Burst damage tertinggi, self-revive, crit damage ekstrim, kebal beku.
- **Kelemahan (Flaws)**: Konsumsi Vitalitas tinggi saat membakar darah; sangat rentan terhadap serangan elemen Air (*Water Vulnerability: +25% damage diterima dari jurus air*); boros Mood.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage +1 Max Energy, -0.5 Mood Decay Resistance; +1 Insight per 3 stage.
  - **Pilar 2 (Combat)**: +3% ATK per Rank Law; +0.8% Fire DMG per stage; +2% Crit DMG per 2 stage.
  - **Pilar 3 (Martial Arts Affinity)**: **Sword (Pedang)** & **Palm (Telapak)** (+15% XP gain saat bertarung).
  - **Pilar 4 (Spiritual Root)**: Setiap kenaikan stage memberikan **+25 XP Spiritual Root Fire**; mengunci/memperlambat Root Water (-20% XP).
  - **Pilar 5 (Artisanship)**: **Alchemy (Alkimia)** & **Forge (Tempa)** (+10% efisiensi ekstraksi panas api pemurni).

---

### 2. Hukum Samudra Naga Azure (`element_azure_water`)
- **Lore**: Esensi samudra tanpa dasar yang tenang mengalir namun mampu menenggelamkan benua.
- **Kelebihan (Strengths)**: Kapasitas HP raksasa, lifesteal, perisai es pembeku, kekebalan debuff api.
- **Kelemahan (Flaws)**: Serangan burst fisik lambat; rentan terhadap serangan Petir (*Lightning Vulnerability: petir terhantar ganda +25% DMG*); konsumsi Qi mantap tapi tidak meledak.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+20 Max HP**, **+1 Vitality**, Mood stabil (+5% Mood Recovery).
  - **Pilar 2 (Combat)**: +3% Max HP per Rank Law; +0.8% Water DMG per stage; +1.5% Martial RES per 3 stage.
  - **Pilar 3 (Martial Arts Affinity)**: **Sword (Pedang Lentur / Soft Sword)** & **Melody (Musik Roh)** (+15% XP gain).
  - **Pilar 4 (Spiritual Root)**: Setiap stage memberikan **+25 XP Spiritual Root Water**; memperlambat Root Fire (-20% XP).
  - **Pilar 5 (Artisanship)**: **Fishing (Memancing)** & **Cooking (Kuliner Pemulih)** (+15% perolehan ikan roh & nutrisi).

---

### 3. Hukum Inti Bumi Xuanwu (`element_xuanwu_earth`)
- **Lore**: Kekuatan purba kura-kura raksasa penopang benua semesta yang tak tergoyahkan.
- **Kelebihan (Strengths)**: Pertahanan fisik dan perisai batu tak tertembus; kebal knockback/stun; paling tahan menghadapi Tribulasi Petir (PathMod 0.98x).
- **Kelemahan (Flaws)**: Kecepatan aksi (Agility) dan Travel Speed paling rendah di antara semua Law (-10% Base Agility); rentan terhadap akar Kayu (*Wood Vulnerability*).
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+1.5 DEF**, **+2 Max Vitality**, Lifespan mengembang +2 tahun.
  - **Pilar 2 (Combat)**: +4% DEF per Rank Law; +2% Stance Break Resistance; -1% Agility per 5 stage (pertukaran bobot).
  - **Pilar 3 (Martial Arts Affinity)**: **Spear / Staff (Tombak/Tongkat)** & **Fist (Tinju Berat)** (+15% XP gain).
  - **Pilar 4 (Spiritual Root)**: Setiap stage memberikan **+25 XP Spiritual Root Earth**; memperlambat Root Wind (-20% XP).
  - **Pilar 5 (Artisanship)**: **Mining (Menambang)** & **Forge (Tempa Zirah)** (+20% bijih langka saat menambang).

---

### 4. Hukum Pohon Hayat Kaisar Hijau (`element_qingdi_wood`)
- **Lore**: Esensi pohon purba semesta yang berakar menembus surga dan neraka. Sumber kehidupan tanpa akhir.
- **Kelebihan (Strengths)**: Batas usia (*Lifespan*) tertinggi seumur hidup; regenerasi pasif HP setiap ronde; penawar segala racun dan kutukan.
- **Kelemahan (Flaws)**: Pertahanan terhadap serangan berelemen Api sangat rapuh (*Fire Vulnerability: terbakar 2× lipat durasi*); daya serang burst rendah.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+3 Lifespan (Batas Usia Maksimal)**, **+15 Max HP**, **+1 Focus**.
  - **Pilar 2 (Combat)**: +2% HP dan +60 Flat HP per Rank Law; +0.8% Wood DMG per stage; regenerasi 2% Max HP di akhir ronde.
  - **Pilar 3 (Martial Arts Affinity)**: **Staff (Tongkat Bambu)** & **Healing (Pengobatan Batin)** (+20% XP gain).
  - **Pilar 4 (Spiritual Root)**: Setiap stage memberikan **+25 XP Spiritual Root Wood**; memperlambat Root Metal/Gold (-20% XP).
  - **Pilar 5 (Artisanship)**: **Herbology (Pertanian/Herba Spiritual)** (+25% panen tanaman obat langka).

---

### 5. Hukum Badai Sayap Roc Sembilan Langit (`element_roc_wind`)
- **Lore**: Sayap burung raksasa mitologi yang melesat 90.000 li membelah atmosfer langit.
- **Kelebihan (Strengths)**: Kecepatan aksi tertinggi; evasion tak tersentuh; garansi serangan pertama dalam pertempuran; efisiensi stamina langkah di peta dunia.
- **Kelemahan (Flaws)**: Pertahanan fisik tipis (rentan one-hit jika tertangkap stun/leylines); kapasitas HP dasar rendah.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+2 Max Stamina**, Travel Speed peta +2%, konsumsi stamina langkah berkurang.
  - **Pilar 2 (Combat)**: +4% SPD / Agility per Rank Law; +0.8% Wind DMG per stage; +1% Evasion per 2 stage.
  - **Pilar 3 (Martial Arts Affinity)**: **Sword (Pedang Angin Cepat)** & **Hidden Weapon (Senjata Rahasia)** (+15% XP gain).
  - **Pilar 4 (Spiritual Root)**: Setiap stage memberikan **+25 XP Spiritual Root Wind**; memperlambat Root Earth (-20% XP).
  - **Pilar 5 (Artisanship)**: **Cooking (Ransum Perjalanan)** & **Farming (Benih Terbang)**.

---

### 6. Hukum Guntur Halilintar Dewa Petir (`element_godthunder_light`)
- **Lore**: Percikan murka para dewa penghukum langit yang meremukkan kejahatan dengan True Damage.
- **Kelebihan (Strengths)**: Crit Rate & Crit DMG tertinggi; damage menembus zirah (*True Damage*); efek lumpuh (*Paralyze Stun*).
- **Kelemahan (Flaws)**: PathMod Tribulasi Petir tertinggi (1.15x) sehingga tribulasi ranah sangat mematikan; konsumsi Energy (MP) sangat boros.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+2 Max Inner Energy**, -1 Max Lifespan (tegangan listrik mengikis raga fana).
  - **Pilar 2 (Combat)**: +2.5% ATK dan +2% SPD per Rank Law; +1.5% Crit Rate per 2 stage; +3% Crit DMG per 3 stage.
  - **Pilar 3 (Martial Arts Affinity)**: **Sword (Pedang Halilintar)** & **Finger (Totokan Jari Petir)** (+15% XP gain).
  - **Pilar 4 (Spiritual Root)**: Setiap stage memberikan **+25 XP Spiritual Root Lightning**; memperlambat Root Earth (-20% XP).
  - **Pilar 5 (Artisanship)**: **Forge (Tempa Senjata Petir)** & **Talismans (Jimat Segel Halilintar)**.

---

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   KATEGORI 2: 4 HUKUM RAGA, GU & IKATAN NYAWA (SPECIAL/BOND)           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 7. Hukum Penempaan Raga Suci (`body_tempering`)
- **Lore**: Menolak mengandalkan sihir luar dan memilih mematri Qi Sejati (*True Qi*) ke 9 organ dan tulang batin.
- **Kelebihan (Strengths)**: **Max Stamina & Vitalitas Tertinggi se-semesta**; HP dan DEF melipatgandakan diri; mandiri tanpa butuh katalis Slot 2; kebal debuff sihir ringan.
- **Kelemahan (Flaws)**: Tidak memiliki serangan jarak jauh sihir elemen; kemajuan kultivasi membutuhkan pemukulan fisik dan pil penempa daging yang mahal.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+3 Max Stamina**, **+3 Max Vitality**, **+25 Max HP**, -1 Focus (otot di atas meditasi halus).
  - **Pilar 2 (Combat)**: +6% HP, +6% DEF, dan +100 Flat HP per Rank Law; +1.5% Martial RES per stage; +2% True Qi Stance DMG.
  - **Pilar 3 (Martial Arts Affinity)**: **Fist (Tinju Tangan Kosong)**, **Palm (Telapak Baja)**, & **Finger (Totokan)** (+25% XP gain).
  - **Pilar 4 (Spiritual Root)**: Netral murni (tidak menyerap spiritual root elemen, namun menaikkan Martial Resistance ke seluruh elemen sebesar +5 per Rank).
  - **Pilar 5 (Artisanship)**: **Mining (Ekstraksi Beban Berat)** & **Smithing (Tempa Palu Raksasa)**.

---

### 8. Hukum Rongga Sepuluh Ribu Gu (`gu_master`)
- **Lore**: Membuka aperture spiritual di dalam dantian untuk membudidayakan ribuan cacing Gu beracun dan memfusikannya.
- **Kelebihan (Strengths)**: Racun DoT bertumpuk (*Stacking Poison*); fusi Gu menghasilkan efek mutasi acak yang sangat fleksibel; serangga Gu menyerap damage.
- **Kelemahan (Flaws)**: Membutuhkan pakan serangga harian; jika cacing Gu kelaparan, cacing akan memakan dantian pemain sendiri; rentan terhadap api dan petir (*Fire & Lightning Vulnerability*).
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+1 Insight**, **+1 Focus**, Mood lebih fluktuatif (bau serangga).
  - **Pilar 2 (Combat)**: +3% Poison DMG per stage; +1.5% Debuff Resistance; serangan memicu 40% efek korosi racun.
  - **Pilar 3 (Martial Arts Affinity)**: **Hidden Weapon (Jarum Berbisa)** & **Special (Alat Khusus)** (+20% XP gain).
  - **Pilar 4 (Spiritual Root)**: +15 XP Wood & +15 XP Water per stage (habitat alami serangga rawa).
  - **Pilar 5 (Artisanship)**: **Alchemy (Pil Racun & Penawar)** & **Talismans (Jimat Pengendali Gu)**.

---

### 9. Hukum Pusaka Jiwa Kelahiran (`natal_artifact`)
- **Lore**: Mengikat benda fana biasa (bahkan pedang patah atau mangkuk retak) seumur hidup hingga bermutasi menjadi Pusaka Primordial Bernyawa.
- **Kelebihan (Strengths)**: Pusaka menyerang mandiri setiap putaran (*dual action economy*); atribut pusaka bertumbuh permanen seiring level pemilik.
- **Kelemahan (Flaws)**: Kematian atau kerusakan pusaka menyebabkan serangan balik batin (*Backlash: -30% seluruh stat selama 24 jam*); investasi material tempa sangat intensif.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+2 Focus**, **+1 Luck** (resonansi relik kuno), +1 Max Energy.
  - **Pilar 2 (Combat)**: +25 Flat ATK dan +15 Flat DEF per Rank Pusaka; serangan combo ganda pemain + pusaka.
  - **Pilar 3 (Martial Arts Affinity)**: Menyesuaikan jenis benda dasar yang diikat (Bilah $\to$ Sword/Blade; Tongkat $\to$ Spear; Guci $\to$ Special).
  - **Pilar 4 (Spiritual Root)**: Menyerap unsur elemen yang diinfuskan ke dalam benda pusaka (+20 XP elemen terkait saat infus).
  - **Pilar 5 (Artisanship)**: **Forge (Tempa Senjata & Kristal Infus)** (+25% EXP Smithing).

---

### 10. Hukum Satwa Roh Kelahiran (`natal_beast`)
- **Lore**: Sumpah darah suci dengan satwa fana (anjing, ular, kucing, burung) yang berevolusi bersama menjadi Satwa Dewa Primordial.
- **Kelebihan (Strengths)**: Menghadirkan rekan tempur aktif di arena yang menerima pukulan musuh dan melancarkan skill kombinasi (*Joint Beast Strike*).
- **Kelemahan (Flaws)**: Pemain harus membagi ransum makanan dan obat pemulihan; jika satwa terluka parah, stat pemain berkurang 20%.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+1 Mood Stability** (satwa setia mendampingi), **+1 Vitality**, +1 Luck.
  - **Pilar 2 (Combat)**: +50 Flat HP dan +15 Flat ATK per Rank Satwa; satwa memiliki stat mandiri (HP, ATK, DEF, SPD).
  - **Pilar 3 (Martial Arts Affinity)**: **Spear / Staff** & **Fist / Cakar** (+15% XP gain).
  - **Pilar 4 (Spiritual Root)**: Menyesuaikan jenis satwa (Serigala $\to$ Angin/Petir, Ular $\to$ Air/Racun, Burung $\to$ Api/Angin).
  - **Pilar 5 (Artisanship)**: **Cooking (Pakan Nutrisi Satwa)** & **Herbology (Tanaman Penambah Insting)**.

---

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        KATEGORI 3: 5 HUKUM DEMONIC DAO MANDIRI                         │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 11. Hukum Pelebur Inti Siluman (`demonic_turbid_core`)
- **Lore**: Melahap inti monster dan hawa kotor miasma tanpa memurnikannya, mengubah limbah energi menjadi daya ledak liar.
- **Kelebihan (Strengths)**: Akselerasi kultivasi tercepat dari berburu monster; menguras Qi lawan; kebal terhadap serangan monster buas.
- **Kelemahan (Flaws)**: Penumpukan *Baleful Aura*; jika hawa kotor melebihi batas, terkena status *Psychosis (Penyimpangan Qi)*; reputasi sosial sekte ortodoks anjlok.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **-1 Max Lifespan** (hawa kotor memperpendek umur biologis), **+2 Max Inner Energy**.
  - **Pilar 2 (Combat)**: +3.5% ATK per Rank Law; +1% ATK per 10 Corruption Index; +2% Crit Rate per 2 stage.
  - **Pilar 3 (Martial Arts Affinity)**: **Blade (Golok Brutal / Saber)** & **Fist (Cakar Siluman)** (+20% XP gain).
  - **Pilar 4 (Spiritual Root)**: Mengikis kemurnian root (+10 XP Earth/Dark tapi -10 XP Wood suci).
  - **Pilar 5 (Artisanship)**: **Alchemy (Pil Iblis Beracun)** & **Mining (Batu Baleful Miasma)**.

---

### 12. Hukum Penghisap Darah & Jiwa (`demonic_blood_soul`)
- **Lore**: Membantai musuh untuk menghisap darah segar dan mematri arwah korban ke dalam Panji Sembilan Ruh (*Nine Soul Banner*).
- **Kelebihan (Strengths)**: Lifesteal tertinggi di dalam game; kebal fatal damage selama ada musuh berdarah; summon arwah korban.
- **Kelemahan (Flaws)**: **PathMod Tribulasi Petir Paling Maut (1.55x)** (Petir langit memburu praktisi darah); diburu oleh penegak hukum Jianghu (Infamy).
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **-1 Luck** (kutukan karma darah), **+25 Max HP**, Vitality regenerasi cepat saat membunuh.
  - **Pilar 2 (Combat)**: +5% Lifesteal per Tier; +3.5% ATK per Rank; serangan Bleed menembus pertahanan lawan.
  - **Pilar 3 (Martial Arts Affinity)**: **Blade (Golok Darah)** & **Sword (Pedang Tipis Pencabut Nyawa)** (+20% XP gain).
  - **Pilar 4 (Spiritual Root)**: Menyerap intisari elemen korban secara parsial.
  - **Pilar 5 (Artisanship)**: **Cooking (Ransum Darah Mendidih)** & **Talismans (Kertas Segel Darah Arwah)**.

---

### 13. Hukum Seribu Racun Pemusnah (`demonic_myriad_venom`)
- **Lore**: Menjadikan tubuh fana wadah seribu jenis racun maut mematikan hingga darah dan keringat menjadi asam korosif.
- **Kelebihan (Strengths)**: Mengubah seluruh racun menjadi True Damage; melelehkan zirah musuh; kebal terhadap segala racun di dunia Jianghu.
- **Kelemahan (Flaws)**: Interaksi sosial terganggu (Karisma & Mood rendah); jika tidak mengonsumsi racun berkala, tubuh menderita sakaw meridian.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **-0.5 Karisma**, **+2 Max Vitality**, kebal terhadap racun makanan/lingkungan.
  - **Pilar 2 (Combat)**: +3% Poison True DMG per stage; musuh penyerang menderita 15% racun balik; melelehkan 25% DEF musuh.
  - **Pilar 3 (Martial Arts Affinity)**: **Hidden Weapon (Jarum Racun)** & **Finger (Totokan Berbisa)** (+25% XP gain).
  - **Pilar 4 (Spiritual Root)**: +20 XP Wood (Tumbuhan Beracun) & +10 XP Water per stage.
  - **Pilar 5 (Artisanship)**: **Alchemy (Spesialis Racun Ekstrem Jianghu)** (+30% efisiensi racun).

---

### 14. Hukum Kontrak Iblis Abyss (`demonic_abyssal_pact`)
- **Lore**: Menandatangani pakta darah dengan entitas jurang kegelapan void untuk meminjam daya penghancur kosmik.
- **Kelebihan (Strengths)**: Mencuri ATK dan Qi musuh; wujud raksasa Iblis Abyss; kebal sihir kutukan dan kegelapan.
- **Kelemahan (Flaws)**: Wajib membayar upeti bulanan (*Abyssal Tribute*); jika lalai, entitas abyss akan menyita 50% HP dan memotong Rank.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+2 Focus**, **+2 Inner Energy**, **-2 Lifespan** (jiwa digadaikan ke abyss).
  - **Pilar 2 (Combat)**: +3.5% ATK per Rank; +1% All Stats per korban yang ditumbalkan; serangan memicu status Fear.
  - **Pilar 3 (Martial Arts Affinity)**: **Spear / Halberd (Tombak Iblis)** & **Palm (Telapak Kegelapan)** (+20% XP gain).
  - **Pilar 4 (Spiritual Root)**: +25 XP Dark/Void Dao; mereduksi seluruh elemen suci.
  - **Pilar 5 (Artisanship)**: **Talismans (Perkamen Darah Abyss)** & **Smithing (Zirah Besi Hitam)**.

---

### 15. Hukum Bayangan Sembilan Yin (`demonic_nether_darkness`)
- **Lore**: Menyatu dengan kabut dingin kuburan kuno dan alam baka, bergerak tanpa jejak di antara dunia nyata dan kehampaan.
- **Kelebihan (Strengths)**: Garansi 100% Crit Rate dari bayangan; kebal serangan fisik murni saat berwujud bayangan; Evasion tertinggi.
- **Kelemahan (Flaws)**: Sangat rapuh terhadap elemen Cahaya/Petir Surgawi (*Lightning Vulnerability: damage petir berlipat ganda*); stamina regenerasi lambat di bawah terik matahari.
- **Integrasi 5 Pilar**:
  - **Pilar 1 (General)**: Setiap stage **+1 Agility**, **+1 Focus**, regenerasi Qi meningkat 2× lipat di malam hari/gua.
  - **Pilar 2 (Combat)**: +3% Yin DMG per stage; +1.5% Evasion per 2 stage; serangan bayangan mengabaikan 40% DEF lawan.
  - **Pilar 3 (Martial Arts Affinity)**: **Sword (Pedang Bayangan Tipis)** & **Hidden Weapon (Bilah Kegelapan)** (+20% XP gain).
  - **Pilar 4 (Spiritual Root)**: +20 XP Water (Dingin Glasier) & +15 XP Wind per stage; menolak Fire (-25% XP).
  - **Pilar 5 (Artisanship)**: **Talismans (Jimat Ilusi Bayangan)** & **Herbology (Jamur Lembab Kuburan)**.

---

## 3. Sistem Pembatasan Skill Tree & Pilihan Eksklusif (Skill Point Economy)

Untuk mencegah pemain menjadi *serba bisa tanpa batas* (*anti-omnipotent policy*), diterapkan formula ketat:

### 3.1. Alokasi Skill Point (SP)
- **Sumber Poin**:
  - Mini-Breakthrough Stage (Stage 1 s/d 9): **+1 Poin Skill per stage** (Total 9 SP per Rank).
  - Major Breakthrough Rank: **+3 Poin Skill bonus**.
  - Total Maksimal Poin pada Rank 8 Puncak: **$9 \times 9 + (8 \times 3) = 105$ SP**.
- **Biaya Investasi Skill (Level 1–5)**:
  - **Tier 1 (4 Skill)**: 1 SP per level (Maks 5 SP per skill $\to$ 20 SP total tier).
  - **Tier 2 (4 Skill)**: 2 SP per level (Maks 10 SP per skill $\to$ 40 SP total tier).
  - **Tier 3 (3 Skill)**: 3 SP per level (Maks 15 SP per skill $\to$ 45 SP total tier).
  - **Tier 4 (1 Avatar Skill)**: 5 SP per level (Maks 25 SP total tier).
  - **Tier 5 (2 Ultimate Skills)**: 7 SP per level (Maks 35 SP per skill $\to$ 70 SP total tier).
- **Total Biaya untuk Mem-max Semua Skill**: **200 SP**.
- **Kesimpulan Desain**: Karena pemain hanya memiliki **105 SP maksimal** di akhir hayat (dan hanya 20–35 SP pada ranah awal hingga menengah), **PEMAIN HANYA DAPAT MEMAKSIMALKAN SEKITAR 50% DARI TOTAL SKILL POHON**.

### 3.2. Percabangan Eksklusif 3 Jalur (3-Branch Build System)
Di dalam setiap Law, skill Tier 2 dan Tier 3 dibagi menjadi 3 cabang:
1. **Jalur Penghancur (Offensive Path)**: Fokus pada multiplier damage, crit rate, penembus zirah, dan DoT agresif.
2. **Jalur Pelindung / Ketahanan (Sustain / Tank Path)**: Fokus pada perisai pelindung, lifesteal, pengalihan damage, dan immune status.
3. **Jalur Domain & Pengendalian (Control / Utility Path)**: Fokus pada AoE crowd control (Stun, Freeze, Fear), debuff akurasi musuh, dan manipulasi giliran turn-order.

---

## 4. Rincian Eksekusi 4 Fitur Maha Karya yang Diminta

### Fitur 1: Visualisasi Konstelasi Pohon Skill (Constellation Graph SVG)
- **Komponen**: `web-dashboard/src/components/cultivation/LawConstellationTree.tsx`
- **Mekanisme**:
  - Merender kanvas SVG interaktif berlatar belakang galaksi langit bertabur bintang wuxia.
  - Setiap node skill memiliki koordinat spasial $(x, y)$ yang terikat pada parent node.
  - Garis penghubung (*curved SVG bezier paths*) memiliki 3 status visual:
    - *Locked*: Garis abu-abu redup putus-putus.
    - *Available*: Garis amber berpendar lembut dengan animasi denyut (*pulse*).
    - *Mastered*: Garis emas sutra menyala solid dengan partikel cahaya bergerak (*flowing energy particles*).
  - Zoom & Pan fleksibel untuk melihat detail 14 bintang konstelasi.

### Fitur 2: Sinergi Otomatis Law ke Spiritual Root XP (Dao Resonance)
- **Backend**: `web-api/routes/lawCultivation.js` & `utils/lawCultivationEngine.js`
- **Mekanisme**:
  - Saat pemain mengalokasikan Skill Point (`POST /law/skill/allocate`) atau menyelesaikan mini-breakthrough stage:
    $$\text{XP}_{\text{Root}} = 25 \times \text{Tier}_{\text{skill}} \times \text{Level}_{\text{skill}}$$
  - XP langsung disuntikkan secara aman ke `player.extendedStats.spiritualRoot[elemen]`.
  - Level akar dihitung otomatis via formula kurva eksponensial `getKungfuLevelFromExp()`.
  - Frontend menampilkan notifikasi toast mengambang: *"✨ Resonansi Dao! Akar Spiritual [Elemen] memperoleh +XX XP!"*

### Fitur 3: Notifikasi Banner Batas Max Level (Max Level Cap Banner)
- **Komponen**: `web-dashboard/src/components/cultivation/MaxLevelCapBanner.tsx`
- **Mekanisme**:
  - Membandingkan `player.level >= currentLevelCap`.
  - Begitu kondisi terpenuhi, muncul banner emas megah beranimasi di bagian atas layar dashboard dan tab kultivasi:
    > **🐉 WADAH FISIK TELAH MENCAPAI PUNCAK SEMPURNA (LV. XX)!**  
    > *Dantian dan tulangmu telah matang sepenuhnya. Kamu telah memenuhi syarat fisik untuk menghadapi Penerobosan Ranah Agung!*
  - Dilengkapi tombol shortcut langsung: `[⚡ Buka Altar Terobosan]`.

### Fitur 4: Animasi Efek Partikel Wujud Avatar Tier 4 di Battle Arena
- **Komponen**: `web-dashboard/src/components/battle/BattleArena.tsx`
- **Mekanisme**:
  - Saat pemain mengaktifkan jurus Tier 4 (contoh: *Penjelmaan Phoenix Suci* atau *Titan Xuanwu*):
  - Sistem battle mencatat `entity.activeAvatarState = { lawType, remainingTurns: 8 }`.
  - Di sekeliling sprite/kartu karakter pemain, dirender:
    1. **Celestial Halo Ring**: Cincin api/air/petir berputar 60fps dengan CSS gradient spin.
    2. **Rising Element Embers**: Partikel api merah / gelembung air / kilat ungu melayang ke atas.
    3. **Aura Border Pulse**: Bingkai emas menyala yang menandakan parameter tempur berlipat ganda.

---

## 5. Rencana Langkah Kerja (Implementation Phases)

1. **Fase 1: Update Schema & Engine Law 5 Pilar (`lawCultivationEngine.js` & `playerCombat.js`)**
   - Menambahkan kalkulasi bonus 5 pilar (Max Stamina, Vitality, Energy, Lifespan, Spiritual Root XP) saat mini-breakthrough dan major-breakthrough.
2. **Fase 2: Implementasi Pembatasan Skill Point & Mutually Exclusive Paths**
   - Mengunci alokasi skill agar memvalidasi sisa SP dan prerequisite cabang pohon.
3. **Fase 3: Pembangunan Komponen Constellation Graph SVG (`LawConstellationTree.tsx`)**
   - Menggantikan tampilan grid kartu statis dengan graf konstelasi bintang interaktif.
4. **Fase 4: Banner Max Level Cap & Sinergi Dao Resonance Toast**
   - Menambahkan event listener level cap dan toast resonansi spiritual root.
5. **Fase 5: Animasi Aura Avatar Tier 4 di Battle Arena**
   - Menambahkan renderer partikel dinamis pada status avatar aktif di arena duel.
6. **Fase 6: Validasi Kompilasi, Typecheck, dan Testing Seluruh Fitur**
   - Memastikan `npx tsc --noEmit` dan server tests berjalan 100% tanpa error.
