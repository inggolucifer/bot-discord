# ⚖️ JIANHU BOT - ECONOMY ORACLE ⚖️

> **Perhatian Untuk AI:**
> File ini adalah **Economy Oracle Mutlak** untuk Bot Discord Jianghu. Gunakan file ini HANYA untuk menghitung biaya, bahan, dan waktu pembuatan dari fitur Bot Discord (Item, Asset, Pet, Jasa).
> Nilai di sini mengonversi sistem ekonomi Roleplay AI (`10_ECONOMY_SYSTEM.md`) menjadi bentuk **Bot Currency & Database State**. Tidak boleh ada perubahan sepihak, semua harus tunduk pada rumusan di bawah ini.

---

## 1. 🪙 KONVERSI MATA UANG (Roleplay AI -> Bot Discord)

Di dalam Roleplay, harga mengikuti `Tael` dan `Giok`. Di dalam Bot Discord, harga menggunakan database currency (`copper`, `silver`, `gold`, `jade`, `spirit`).

**Tabel Nilai Tukar Mutlak:**
| Roleplay (Narasi) | Bot Discord Currency | Konversi (1 ke 1) |
|---|---|---|
| 1 Tael Tembaga (Tael Tembaga) | 1 Copper | 1 RP = 1 Bot |
| 1 Tael Perak (Tael Perak) | 1 Silver | 100 Copper |
| 1 Tael Emas (Tael Emas) | 1 Gold | 100 Silver |
| 1 Giok Kecil (Giok Kecil) | 1 Jade | 1.000 Gold |
| 1 Giok Menengah (Giok Menengah) | 1 Spirit | 100 Jade |
| 1 Giok Purba (Giok Purba) | 100 Spirit | 100 Spirit |

*Catatan: Semua pembayaran request ke Admin (potong saldo Bot) dihitung dari harga dasar Bot Discord Currency di atas.*

---

## 2. 💰 ORACLE PENENTUAN HARGA REQUEST (PRICING)

Saat pemain meminta pembuatan item, pet, atau asset di Bot Discord (Request Channel), gunakan formula ini untuk menentukan harganya.

### A. HARGA ITEM (Weapon, Armor, Pill, Herb, Material, Artifact)
Harga item didasarkan pada kombinasi **Tier (1-9)** dan **Rank Bot** (Common -> Mythical).

**Formula:** `Harga Item = Base Tier Price × Multiplier Rank`

**1. Base Tier Price (Harga Dasar):**
* Tier 1: 50 Copper
* Tier 2: 5 Silver
* Tier 3: 50 Silver
* Tier 4: 5 Gold
* Tier 5: 50 Gold
* Tier 6: 500 Gold
* Tier 7: 5 Jade
* Tier 8: 50 Jade
* Tier 9: 500 Jade

**2. Multiplier Rank (Kualitas/Grade dalam Bot):**
* **Common (Fan):** x 1.0
* **Uncommon (Huang):** x 2.5
* **Rare (Xuan):** x 5.0
* **Epic (Di):** x 15.0
* **Legendary (Tian):** x 40.0
* **Mythical (Sheng):** x 100.0

*(Contoh: Senjata Tier 4 Rare = 5 Gold x 5.0 = 25 Gold)*

### B. HARGA ASSET (Properti Penghasil Resource / Bot `/asset`)
Aset memberikan passive income (`/claim-profit`) setiap hari. Harganya jauh lebih mahal dari item biasa.

**Formula:** `Harga Asset = Base Output per Hari x 30 Hari x Multiplier Jenis`

**Multiplier Jenis Bangunan:**
* **Produksi Raw Material (Tambang, Kebun):** x 1.2
* **Komersial (Kedai, Toko):** x 1.5
* **Militer / Sekte (Dojo, Kamp Pertahanan):** x 2.0
* **Khusus / Magical (Paviliun Pil, Menara Array):** x 3.0

*(Contoh: Kedai (Komersial) yang output-nya 5 Silver/hari. Harga = 5 Silver x 30 x 1.5 = 225 Silver. Ini adalah biaya yang harus di potong dari uang bot pemain untuk membuat aset ini).*

### C. HARGA PET (Binatang Spiritual / Bot `/pet`)
Harga pet ditentukan oleh Rank kelangkaannya dan efek elemennya di battle.

**Harga Dasar Pet Baru:**
* **Common:** 10 Silver
* **Uncommon:** 50 Silver
* **Rare:** 5 Gold
* **Epic:** 50 Gold
* **Legendary:** 5 Jade
* **Mythical:** 50 Jade

**Tambahan Elemen / Pasif Khusus:**
Jika pet memiliki elemen khusus (Petir, Api Abadi, Racun Iblis), tambahkan biaya sebesar **+50%** dari harga dasar.

---

## 3. ⏳ ORACLE LAMA WAKTU PEMBUATAN (CRAFTING / BUILD TIME)

Admin tidak boleh membuatkan barang secara instan tanpa narasi. Waktu pembuatan (cooldown proses real-life) wajib diberlakukan sebelum barang dimasukkan ke dalam bot oleh admin.

### A. Waktu Pembuatan Item (Crafting)
* **Tier 1 - 2 (Common/Uncommon):** Instan - 15 Menit.
* **Tier 3 - 4 (Rare):** 2 Jam.
* **Tier 5 - 6 (Epic):** 12 Jam.
* **Tier 7 (Legendary):** 3 Hari (72 Jam).
* **Tier 8 - 9 (Mythical):** 7 Hari.

### B. Waktu Pembangunan Aset (Building)
* **Kecil (Rumah, Lahan Pertanian, Kedai Kecil):** 1 Hari.
* **Menengah (Toko Besar, Dojo, Kapal Dagang):** 3 Hari.
* **Besar (Paviliun Sekte, Tambang Skala Besar, Kapal Perang):** 7 Hari.
* **Megah (Istana Sekte, Formasi Array Pelindung Kota):** 14 Hari.

### C. Waktu Penjinakan Pet (Taming)
* **Common / Uncommon:** 1 Jam.
* **Rare / Epic:** 1 Hari.
* **Legendary / Mythical:** 5 Hari (Butuh Roleplay Penaklukan yang panjang).

*(Peraturan AI: Beritahu player berapa lama proses ini memakan waktu real-life. Player baru bisa menerima item/pet/aset di Bot Discord setelah waktu ini terlewati).*

---

## 4. ⚒️ ORACLE RESEP & BAHAN MATERIAL (CRAFTING REQUIREMENTS)

Saat player request Item (terutama senjata, zirah, atau pil) ke channel Discord, mereka **TIDAK HANYA** membayar biaya currency di atas, tetapi juga harus **MENGORBANKAN ITEM BAHAN** dari inventory mereka (`/item cek`).

**Formula Resep Baku (Berdasarkan Target Item):**

Untuk membuat **[Target Item] Tier X, Rank Y**:
Pemain HARUS memiliki di dalam inventory bot mereka:
1. **1x Material Utama (Core)** dengan Tier X atau (X-1) dan Rank yang setara/mendekati Y.
2. **2x Material Pendukung** dengan Tier (X-1) atau (X-2).
3. **Biaya Jasa / Tempa** (dihitung dari Oracle Penentuan Harga bagian 2.A).

**Contoh Kasus Penggunaan AI:**
> **Player Request:** "Aku ingin membuat Pedang Api Naga (Weapon, Tier 4, Epic)."
> **AI Oracle Menjawab:**
> "Untuk membuat Pedang Api Naga, Anda membutuhkan:
> 1. Biaya Jasa Bot: 75 Gold (Tier 4 Base 5 Gold x 15 Epic Multiplier)
> 2. Syarat Material Bot: 1x Core Material Tier 4 Epic (misal: Sisik Naga Api), dan 2x Material Support Tier 3 (misal: Baja Hitam).
> 3. Waktu Proses: 12 Jam.
> Jika Anda setuju dan memiliki uang serta bahan tersebut, admin akan memotong saldo dan item dari database, dan memasukkan pedang ini dalam 12 jam."

---

## 5. 🛡️ ATURAN ANTI-CHEAT DISCORD BOT

1. **AI TIDAK BOLEH** memberikan diskon pada harga Bot Currency kecuali ada Event Discord spesifik yang diumumkan Admin.
2. **AI HARUS** mengingatkan Admin untuk selalu mengecek saldo player (lewat `/profil` atau `/item cek`) sebelum menyetujui request.
3. Semua Asset yang menjanjikan "Pasif Item/Jade" sangat tinggi (lebih dari 1 Jade per hari) harus di flag untuk manual review (Tidak boleh disetujui otomatis oleh AI kalkulasi).

---
> **End of Oracle.** AI, gunakan data ini secara mutlak untuk seluruh kalkulasi ekonomi bot.