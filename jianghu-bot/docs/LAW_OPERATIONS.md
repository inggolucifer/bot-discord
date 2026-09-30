# PANDUAN OPERASIONAL SISTEM 20 HUKUM SEMESTA (IMMORTAL-X)
> Dokumen Resmi Prosedur Pemeliharaan, Seeding, Pembangunan Fasilitas, Tagging Item, dan Siklus Kultivasi

---

## 1. PROTOKOL SEEDING DATABASE

Sistem 20 Hukum Semesta membutuhkan katalog item (manual, katalis pengikat, dan bahan pengisi esensi) yang tersinkronisasi di MongoDB. Jalankan skrip seeder berikut secara berurutan saat deployment baru atau reset staging:

### 1.1. Perintah Eksekusi Seeder

```bash
# 1. Seeding 15 Law Dasar (Elemen, Body Tempering, Gu Master, Natal, Demonic)
node jianghu-bot/scripts/seedLawMasterEcosystem.js

# 2. Seeding 5 Law Righteous Baru (Merit, Pure Yang, Sword Heart, Formation, Karmic Mirror)
node jianghu-bot/scripts/seedRighteousLawEcosystem.js

# 3. Verifikasi Keberadaan Item & Konsistensi Schema
node jianghu-bot/scripts/testRighteousLawsComprehensive.js
```

### 1.2. Validasi Hasil Seeding

- Pastikan koleksi `items` memuat 20 Kitab Manual (`category: 'law'`).
- Pastikan item Slot 2 (katalis) berbobot tag yang sesuai tabel §3.
- Pastikan bahan pengisi esensi memiliki `tier` 1–5 dengan tags yang selaras dengan `LAW_ESSENCE_PROFILE`.

---

## 2. CARA MEMBANGUN & MENGGUNAKAN HUB FORMASI (FORMATION HUB)

Praktisi **Hukum Formasi Bendera** (`righteous_formation_array`) membutuhkan **Hub Formasi** fisik di dunia spasial untuk menyerap intisari formasi dan mengaktifkan bonus pertahanan teritorial.

### 2.1. Prasyarat Pembangunan

1. **Afiliasi Law**: Karakter memiliki `activeLawType: 'righteous_formation_array'`.
2. **Kavling Tanah Aktif**: Karakter telah mengklaim kavling tanah di dunia spasial (`player.landAssets` / kepemilikan tile `ZoneTile`).
3. **Bahan Konstruksi**:
   - 50 Tael Perak (5000 Copper).
   - 1x Pelat Formasi Dasar (`array_plate` / `flag`).

### 2.2. Prosedur Pembangunan Melalui API

Panggil endpoint pembangunan fasilitas:

```http
POST /api/law/facility/build-or-upgrade
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "facilityType": "formation_hub"
}
```

**Respon Sukses (HTTP 200)**:
```json
{
  "success": true,
  "message": "🏗️ Berhasil mendirikan Hub Formasi Tingkat 1 di kavling tanahmu!",
  "data": {
    "facility": "formation_hub",
    "tier": 1,
    "placement": {
      "zoneId": "central_plains",
      "tileX": 15,
      "tileY": 25
    }
  }
}
```

### 2.3. Efek Gameplay & Spatial Hooks

1. **Gerbang Penyerapan Esensi (`isOnOwnFormationHub`)**:
   - Saat menyerap bahan esensi formasi (`POST /law/essence/absorb`), server memvalidasi koordinat karakter.
   - Karakter **wajib berdiri tepat di atas petak Hub Formasi** (`player.gridPosition.tileX === placement.tileX` dan `tileY === placement.tileY`). Di luar petak ini, penyerapan ditolak demi menjaga lore jangkar spasial formasi.
2. **Buff Pertahanan Markas (Home Bonus)**:
   - Saat bertarung di petak Hub Formasi miliknya, pemain menerima bonus:
     $$\text{DEF}_{\text{combat}} \times 1.08 \quad \text{dan} \quad \text{HP}_{\text{combat}} \times 1.08$$
   - Ditandai dengan flag `onFormationHome: true` pada `totals`.

---

## 3. KATALOG TAG ITEM 20 HUKUM SEMESTA

Setiap Law memiliki aturan penyerapan deterministik yang terdaftar di `LAW_BINDING_REQUIREMENTS` dan `LAW_ESSENCE_PROFILE`:

| # | `lawType` | Nama Lore | Tag Slot 1 (Manual) | Tag Slot 2 (Katalis) | Fill Tags Esensi (Absorb) | Sumber Perolehan Bahan |
|---|---|---|---|---|---|---|
| 1 | `element_phoenix_fire` | Api Abadi Phoenix | `manual_phoenix_fire` | `fire_catalyst` | `essence_flame`, `fire_crystal` | Tambang Gunung Berapi, Monster Api |
| 2 | `element_azure_water` | Air Surgawi Azure | `manual_azure_water` | `water_catalyst` | `essence_water`, `ice_jade` | Memancing Danau Roh, Lembah Es |
| 3 | `element_xuanwu_earth` | Tanah Xuanwu | `manual_xuanwu_earth` | `earth_catalyst` | `essence_earth`, `leyline_stone` | Penambangan Gua Karang, Leyline |
| 4 | `element_qingdi_wood` | Kayu Kaisar Qingdi | `manual_qingdi_wood` | `wood_catalyst` | `essence_wood`, `vitality_seed` | Panen Tanaman Obat, Hutan Purba |
| 5 | `element_roc_wind` | Badai Sayap Roc | `manual_roc_wind` | `wind_catalyst` | `essence_wind`, `tempest_feather` | Puncak Tebing Berangin, Burung Buas |
| 6 | `element_godthunder_light` | Petir Ilahi Godthunder | `manual_godthunder_light` | `thunder_catalyst` | `essence_thunder`, `lightning_obsidian` | Dataran Petir, Sisa Tribulasi |
| 7 | `body_tempering` | Penempaan Raga Suci | `manual_body_tempering` | *(Slot 2 Tersembunyi)* | 22 Esensi Alam Spasial | Langkah Grid Spasial, Inhalasi Cuaca |
| 8 | `gu_master` | Cacing Cawan Gu | `manual_gu_master` | `gu_larva` | `gu_food`, `raw_meat`, `beast_blood` | Rawa Berkabut, Berburu Satwa |
| 9 | `natal_artifact` | Ikatan Jiwa Pusaka | `manual_natal_artifact` | `common_artifact` | `artifact_fragment`, `metal_essence` | Menempa Senjata, Sisa Pertempuran |
| 10 | `natal_beast` | Satwa Jiwa Roh | `manual_natal_beast` | `common_beast` | `beast_pill`, `spirit_herb` | Menjinakkan Satwa Fana, Hutan Roh |
| 11 | `demonic_turbid_core` | Inti Siluman Keruh | `manual_turbid_core` | `beast_core` | `beast_core`, `turbid_core` | Berburu Monster Rimba, Dungeon |
| 12 | `demonic_blood_soul` | Jiwa Darah Asura | `manual_blood_soul` | `blood_vial` | `blood_vial`, `blood`, `essence` | Panen Darah Duel/PVP, Monster Buas |
| 13 | `demonic_myriad_venom` | Seribu Racun Maut | `manual_myriad_venom` | `venom_sac` | `venom_sac`, `poison`, `essence` | Peracikan Alkimia Racun, Rawa Hitam |
| 14 | `demonic_abyssal_pact` | Perjanjian Jurang Abyss | `manual_abyssal_pact` | `abyssal_scroll` | `abyssal`, `blood_vial`, `obsidian` | Ritual Altar Kurban Abyss |
| 15 | `demonic_nether_darkness` | Kegelapan Nether | `manual_nether_darkness` | `yin_stone` | `yin_stone`, `nether`, `dark` | Kuburan Tua, Wilayah Domain Nether |
| 16 | `righteous_heavenly_merit` | Jasa Kebajikan Langit | `manual_heavenly_merit` | `merit_seal` | `merit_seal`, `commendation_token`, `relief_receipt` | Hadiah Quest Resmi, Jasa Balai Kota |
| 17 | `righteous_pure_yang` | Kitab Yang Murni | `manual_pure_yang` | `yang_crystal` | `yang_crystal`, `sun_essence_pill`, `white_jade_fragment` | Meditasi Terik Siang, Alkimia Murni |
| 18 | `righteous_sword_heart` | Niat Hati Pedang | `manual_sword_heart` | `oath_sword` | `whetstone_spirit`, `sword_essence`, `broken_blade_shard` | Tempa Pandai Besi, Sisa Bilah Pedang |
| 19 | `righteous_formation_array` | Formasi Bendera Array | `manual_formation_array` | `array_flag` | `formation_spirit_stone`, `spirit_banner`, `geomantic_sand` | Hub Formasi Tanah Pribadi, Pasir Fengshui |
| 20 | `righteous_karmic_mirror` | Cermin Refleksi Karma | `manual_karmic_mirror` | `karma_mirror_shard` | `karmic_dew`, `mirror_fragment`, `purified_crystal` | Jimat Vonis Karma, Kuil Suci, Doa |

---

## 4. SIKLUS KULTIVASI: MORTAL TAHAP 1–10 $\to$ BIND $\to$ CHANNELING LOOP

### Fase 1: Fondasi Fana (Mortal Foundation Stage 1–9)
- Karakter memulai perjalanan di dunia persilatan pada ranah **Fondasi Fana Tahap 1**.
- Melatih tubuh dan pernapasan fana melalui `POST /cultivation/meditate` (jalur `systemCultivation`).
- Karakter pada tahap ini **belum memiliki Bar Esensi Law**.
- Jika mencoba mematri Law (`POST /law/bind`), sistem menolak:
  > *"Gerbang Hukum Semesta baru terbuka pada Fondasi Fana Tahap 10. Sempurnakan dulu tubuh fana-mu."*

### Fase 2: Gerbang Penentuan Takdir (Mortal Stage 10)
Saat mencapai Tahap 10, gerbang dantian terbuka penuh. Karakter disajikan dua pilihan hidup permanen:

1. **Jalur Hukum Semesta (Immortal Law Path)**:
   - Pilih 1 dari 20 Hukum Semesta di UI Kultivasi.
   - Panggil `POST /law/bind` dengan menyertakan:
     - `slot1ManualItemId`: ID item Kitab Manual terkait di tas.
     - `slot2CompanionItemId`: ID item Katalis Pengikat Common di tas.
   - **Efek Seketika**:
     - Kitab dan katalis dikonsumsi permanen dari tas.
     - Karakter menerima **Bootstrap 40 Esensi awal** (`BOOTSTRAP_ESSENCE: 40`) agar langsung dapat bermeditasi tanpa terblokir.
     - `activeLawType` terpateri permanen seumur hidup dan tidak dapat diubah/direset.
2. **Jalur Kultivator Biasa (Ordinary Cultivator Path)**:
   - Pemain yang enggan terikat hukum langit dapat memilih `POST /law/choose-ordinary`.
   - Mengunci karakter dari sistem Law, menerima kompensasi stat dasar seimbang, dan melanjutkan kultivasi biasa.

### Fase 3: Siklus Esensi & Channeling (Rank 0..8)

```
┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
│   Aktivitas Dunia      │      │    Bar Esensi Law      │      │    Xiuwei Dantian      │
│ (Quest, Craft, Tambang)│ ───> │   (Absorb Bertier)     │ ───> │     (Channeling)       │
└────────────────────────┘      └────────────────────────┘      └────────────────────────┘
                                 INSTANT_QI_ON_ABSORB = 0         Esensi Kosong = 0 Qi
```

1. **Mengisi Reservoir Esensi (Absorb Pipeline)**:
   - Kumpulkan bahan spiritual bertag sesuai profil Law.
   - Panggil `POST /law/essence/absorb`.
   - Mematuhi **Matrix Tier Affinity**:
     - Item Tier $=$ Ranah Pemain ($R+1$): Efisiensi $100\%$.
     - Item Tier $<$ Ranah Pemain: Efisiensi berkurang ($60\%, 20\%, \min 15\%$).
     - Item Tier $>$ Ranah Pemain: **Ditolak mutlak** (`allowed: false`).
   - Penyerapan **HANYA mengisi bar esensi**, memberikan $0$ Qi instan (`INSTANT_QI_ON_ABSORB: 0`).
2. **Mencerna Esensi Menjadi Xiuwei (Channeling Loop)**:
   - Panggil `POST /law/channel/start`.
   - Karakter duduk bermeditasi mencerna esensi dari reservoir menjadi Xiuwei Qi dantian.
   - **Aturan Mutlak Zero-Drip**:
     - Jika esensi habis (`currentEssence = 0`), meditasi menghasilkan **0 Qi**. Dantian tertidur sampai diisi kembali.
3. **Penerobosan Ranah (Breakthrough)**:
   - **Mini-Breakthrough (Antar-Tahap 1–9)**: Dilakukan saat Qi mencapai batas tahap (`POST /law/breakthrough/mini`).
   - **Major-Breakthrough (Antar-Rank 0 $\to$ 8)**: Memerlukan penuntasan Tahap 9, pemasangan Pil Terobos bertier presisi (`/breakthrough/set-pill`), dan menghadapi kesengsaraan langit (Tribulasi Guntur pada Rank 3, 5, 7, 8).

---

## 5. DOKUMENTASI API & STATUS CODE RINGKAS

| Endpoint | Method | Deskripsi | Status Code Penting |
|---|---|---|---|
| `/api/law/status` | `GET` | Mengambil status lengkap, timer channel, uniquePanel, dan skillTree | `200 OK` |
| `/api/law/bind` | `POST` | Mematri 1 dari 20 Law di Mortal Stage 10 secara permanen | `200 OK`, `400 Bad Request` |
| `/api/law/channel/start` | `POST` | Memulai meditasi pencernaan esensi | `200 OK`, `429 Cooldown (5s)` |
| `/api/law/channel/stop` | `POST` | Menghentikan meditasi & sinkronisasi perolehan Qi | `200 OK`, `429 Cooldown (5s)` |
| `/api/law/essence/absorb` | `POST` | Menyerap item bertag ke Bar Esensi dengan validasi Tier Affinity | `200 OK`, `400 Error Gate`, `429 Daily Cap` |
| `/api/law/skill/allocate` | `POST` | Mengalokasikan SP ke node skill tree (efek pasif tempur) | `200 OK`, `404 Wrong Tree`, `400 Prereq` |
| `/api/law/facility/build-or-upgrade` | `POST` | Membangun/meningkatkan Hub Formasi pada kavling tanah | `200 OK`, `400 Insufficient Gold/Mats` |
