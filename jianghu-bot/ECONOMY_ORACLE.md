# ⚖️ JIANHU BOT - ECONOMY ORACLE ⚖️

> **Perhatian Untuk AI & Admin:**
> File ini adalah **Economy Oracle Mutlak** untuk Bot Discord Jianghu RPG Multiplayer.
> Semua nilai di sini dikalibrasi ketat terhadap **Penghasilan Harian Dasar Pemain (Daily Claim = 2 Silver)** untuk menciptakan progresi Xianxia yang seimbang: lambat di tahap fana (Mortal), stabil di pertengahan (Gold), dan megah di puncak langit (Jade & Spirit).
> Dilarang merusak ekonomi dengan membagikan resource gratis di luar formula ini.

---

## 1. 🪙 KONVERSI MATA UANG (Roleplay AI -> Bot Discord)

Di dalam Roleplay, harga menggunakan `Tael` dan `Giok`. Bot Discord menyimpannya sebagai `copper`, `silver`, `gold`, `jade`, dan `spirit`.

| Mata Uang Roleplay (Narasi) | Bot Discord Currency | Nilai Tukar Multiplier (Ke Atas) |
|---|---|---|
| 1 Tael Tembaga (Tael Tembaga) | 1 Copper | 100 Copper = 1 Silver |
| 1 Tael Perak (Tael Perak) | 1 Silver | 100 Silver = 1 Gold |
| 1 Tael Emas (Tael Emas) | 1 Gold | 1.000 Gold = 1 Jade |
| 1 Giok Kecil (Giok Kecil) | 1 Jade | 100 Jade = 1 Spirit |
| 1 Giok Menengah/Purba | 1 Spirit | End-game currency mutlak |

**Analisis Fundamental (Baseline F2P):**
Pemain fana yang hanya menekan `/daily` mendapat **2 Silver per hari**.
Artinya:
- Untuk mendapat 1 Gold, butuh **50 Hari** menabung F2P. (Pemain dipaksa berbisnis, barter, ikut event, atau membuat Asset untuk cepat kaya).
- `Spirit` hanya bisa disentuh oleh pemimpin sekte elit atau event tingkat dewa.

---

## 2. 💰 ORACLE PENENTUAN HARGA REQUEST (PRICING)

Gunakan formula di bawah ini untuk semua *request* pembuatan (approval admin) dari pemain.

### A. HARGA ITEM (Weapon, Armor, Pill, Herb, Material, Artifact)

**Formula:** `Harga Akhir = Base Tier Price × Multiplier Rank × Kategori`

**1. Base Tier Price (Harga Dasar):**
Selaras dengan `10_ECONOMY_SYSTEM.md`:
* **Tier 1 (Fana Biasa):** 5 Copper
* **Tier 2 (Dasar Kultivasi):** 50 Copper
* **Tier 3 (Menengah):** 5 Silver *(Butuh 2.5 hari menabung /daily)*
* **Tier 4 (Sekte Luar):** 50 Silver *(Butuh 25 hari menabung /daily)*
* **Tier 5 (Sekte Inti):** 5 Gold
* **Tier 6 (Tetua Sekte):** 50 Gold
* **Tier 7 (Raja / Kaisar):** 0.5 Jade (500 Gold)
* **Tier 8 (Legenda kuno):** 5 Jade
* **Tier 9 (Mitos / Dewa):** 50 Jade / 0.5 Spirit

**2. Multiplier Rank (Grade di Bot):**
* **Common (Fan):** x 1.0
* **Uncommon (Huang):** x 2.5
* **Rare (Xuan):** x 5.0
* **Epic (Di):** x 15.0
* **Legendary (Tian):** x 40.0
* **Mythical (Sheng):** x 100.0

**3. Multiplier Kategori Item:**
* Material / Herb: x 0.5 (Murah karena masih mentah)
* Consumable (Pill / Ramuan): x 1.0 (Standar)
* Equipment (Weapon / Cloth / Accessories): x 2.0 (Bisa dipakai permanen)
* Artifact (Meningkatkan status besar): x 3.0

*(Contoh: Pemain ingin Weapon [x2] Tier 3 [5 Silver] rank Rare [x5.0]. Harga = 5 Silver x 5.0 x 2 = 50 Silver).*

### B. HARGA ASSET (Properti Penghasil Resource / Bot `/asset`)

Asset adalah mesin pencetak uang. Karena /daily pemain hanya 2 Silver, memiliki Asset sangat krusial. Sistem harus memaksa pemain **Balik Modal (Return on Investment - ROI)** dalam waktu 30 hingga 60 hari.

**Formula:** `Harga Beli Asset = (Output per Hari) x Target Hari ROI x Multiplier Bangunan`

**Target ROI (Return on Investment):**
* **Asset Tier Rendah (Output Silver):** ROI 30 Hari
* **Asset Tier Menengah (Output Gold):** ROI 45 Hari
* **Asset Tier Dewa (Output Jade/Spirit):** ROI 90 Hari (Sangat mahal)

**Multiplier Jenis Bangunan:**
* **Produksi Mentah (Tambang, Kebun):** x 1.0
* **Komersial (Kedai, Toko):** x 1.5
* **Militer / Sekte Khusus (Paviliun Array):** x 2.5

*(Contoh: Pemain ingin membuat Tambang Perak yang menghasilkan **1 Silver/Hari**. Karena ini tier rendah, ROI 30 hari, jenis Produksi. Harga pembuatannya = 1 Silver x 30 Hari x 1.0 = 30 Silver).*

### C. HARGA PET (Binatang Spiritual / Bot `/pet`)

Pet memberikan keunggulan di `/pet battle`. Harganya melambung sangat tinggi pada Rank Legendary dan Mythical.

* **Common:** 20 Silver
* **Uncommon:** 1 Gold
* **Rare:** 10 Gold
* **Epic:** 150 Gold
* **Legendary:** 15 Jade
* **Mythical:** 2 Spirit *(Sangat mustahil didapat sembarangan)*

**Tambahan Kemampuan (Trait):**
Jika Pet request memiliki Pasif Pertarungan khusus (elemen api, racun, heal), kenakan markup **+30%** dari harga dasarnya.

---

## 3. ⏳ ORACLE LAMA WAKTU PEMBUATAN (CRAFTING / BUILD TIME)

Cooldown proses pembangunan di *real-life* (Dunia Nyata). Admin tidak boleh bypass aturan ini untuk menjaga prestise barang tingkat tinggi.

### A. Waktu Crafting Item
* **Tier 1 - 2 (Common/Uncommon):** 10 Menit.
* **Tier 3 - 4 (Rare):** 4 Jam.
* **Tier 5 - 6 (Epic):** 24 Jam (1 Hari penuh).
* **Tier 7 - 8 (Legendary):** 4 Hari.
* **Tier 9 (Mythical / Spirit):** 14 Hari (Harus diikuti event besar server).

### B. Waktu Pembangunan Aset
* **Tier Rendah (Kedai kecil, Gubuk):** 1 Hari.
* **Tier Menengah (Dojo, Toko Besar):** 4 Hari.
* **Tier Tinggi (Paviliun Sekte, Kastil):** 10 Hari.

### C. Waktu Penjinakan Pet (Taming)
* **Common / Uncommon:** 2 Jam.
* **Rare / Epic:** 2 Hari.
* **Legendary / Mythical:** 7 Hari (Pemain harus aktif narasi merawat pet tersebut di channel Roleplay).

---

## 4. ⚒️ ORACLE RESEP & BAHAN MATERIAL (CRAFTING REQUIREMENTS)

Sistem *sink-hole* item. Untuk menjaga uang dan barang beredar tetap sehat (mencegah inflasi server), setiap pembuatan Item/Asset tingkat menengah-atas HARUS membakar Material.

**Formula Resep Baku (Berdasarkan Target Item):**
Untuk men-craft **[Target Item] Tier X, Rank Y**, Admin harus menuntut pemain membakar barang di bot (`/item cek`):
1. **1x Material Utama (Core)**: Tier X (sesuai target) & Rank setara Y.
2. **2x Material Pendukung**: Tier X-1 atau X-2.
3. **Biaya Jasa Tempa Bot**: Dihitung dari Formula Harga Item (Bab 2A).

**Contoh Kasus Penggunaan AI:**
> **Player Request:** "Aku ingin pedang legendaris Tier 7 (Rank: Legendary)."
> **AI Oracle Menjawab:**
> "Berdasarkan pedoman Multiplayer RPG:
> 1. Biaya Jasa: 0.5 Jade x 40.0 x 2 (Weapon) = 40 Jade (Bisa pakai 40.000 Gold).
> 2. Material: Anda wajib memiliki dan mengorbankan 1x Core Material Tier 7 (Misal: Tanduk Naga Kuno) dan 2x Material Support Tier 6.
> 3. Waktu Tempa: 4 Hari dunia nyata.
> Silakan pastikan mata uang bot dan item bot Anda mencukupi sebelum Admin mengeksekusi."

---

## 5. 🛡️ SISTEM MULTIPLAYER & ANTI-EKSPLOITASI (ANTI-CHEAT)

Sebagai game RPG Multiplayer, ekonomi harus diatur ketat:
1. **Pemeriksaan Otoritas Sekte:** Jika pemain fana (tanpa sekte) request item Tier 5+ (Level Sekte), harganya langsung di-*markup* **3x Lipat** (Region Scarcity/Monopoli Sekte).
2. **Batas Pasif Maksimum:** Tidak ada satu pun Asset milik satu pemain (bukan Sekte) yang boleh menghasilkan lebih dari **1 Jade per hari**. Jika request melebihi itu, tolak.
3. **Spirit Currency:** Currency `spirit` tidak boleh dijadikan hadiah harian/quest biasa. Hanya didapat dari Event Global Bulanan, Raid Boss, atau Lelang Server (`/lelang`).
4. **Verifikasi Saldo:** AI harus selalu menambahkan catatan kepada Admin: *"Peringatan Admin: Gunakan perintah `/profil [nama]` atau `/item cek` untuk memverifikasi apakah pemain ini benar-benar memiliki saldo dan bahan sebelum kamu memberikan barangnya!"*

---
> **End of Oracle.** File ini menjadi jembatan mutlak keadilan antar pemain Jianghu. AI, aplikasikan data ini tanpa kompromi.