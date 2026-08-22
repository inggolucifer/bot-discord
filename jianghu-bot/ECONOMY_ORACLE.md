# ⚖️ JIANHU BOT - ECONOMY ORACLE ⚖️

> **Perhatian Untuk AI & Admin:**
> File ini adalah **Economy Oracle Mutlak** untuk sistem mekanik Bot Discord Jianghu.
>
> **PRINSIP UTAMA:** Mata uang di Roleplay AI (Tael/Giok narasi) **TIDAK TERHUBUNG** dengan mata uang Bot Discord (Copper, Silver, Gold, Jade, Spirit).
> Mata uang Bot Discord adalah "Meta-Currency" murni yang didapat dari fitur bot (`/daily` 2 Silver, `/asset claim-profit`, `/loot`, turnamen). Uang bot ini digunakan sebagai "Biaya Sistem" untuk mematenkan pencapaian narasi (Save, Request Item, Pembuatan Sekte) ke dalam Core Jianghu dan Database Bot.

---

## 1. 📜 BIAYA HAK PATEN & LAYANAN SISTEM CORE

Pemain harus membayar menggunakan mata uang Bot Discord untuk mencatatkan pencapaian Roleplay AI mereka ke dalam sistem resmi.

**Daftar Layanan Mutlak:**
| Layanan (Request) | Biaya Bot Currency | Keterangan |
|---|---|---|
| **Save Progres Karakter (Ekstra)** | 1 Gold | Save mingguan gratis di hari Sabtu. Save di hari lain via admin bayar 1 Gold. |
| **Pendaftaran Sekte Resmi** | 1 Jade | Dilakukan di `#1538240076709105715`. Sekte harus terdaftar dulu di RP. |
| **Hak Paten Custom Law** | 5 Gold s/d 1 Jade | Tergantung tingkat kekuatan law yang dipatenkan. |
| **Hak Paten Custom Technique** | 2 Gold s/d 50 Gold | Tergantung Tier (1-5) dan tingkat destruktif teknik. |

---

## 2. 💰 ORACLE HARGA REQUEST (REALISASI KE DATABASE BOT)

Saat pemain mendapatkan item, pet, atau aset di Roleplay AI, mereka bisa "mewujudkannya" ke dalam profil Bot Discord mereka lewat channel request. **Tentu saja, realisasi mekanik ini butuh uang Bot.**

*(Asumsi Dasar: `/daily` F2P adalah 2 Silver. Harga harus menyeimbangkan laju peredaran uang).*

### A. HARGA REALISASI ITEM (Weapon, Pill, Herb, Material)
Biaya untuk memasukkan item Roleplay ke inventory Bot.

**Formula Harga = Base Tier Price × Multiplier Rank**

**1. Base Tier Price (Harga Dasar Bot):**
* **Tier 1 (Fana Biasa):** 10 Copper
* **Tier 2 (Dasar Kultivasi):** 1 Silver
* **Tier 3 (Menengah):** 10 Silver *(5 hari /daily)*
* **Tier 4 (Sekte Luar):** 1 Gold *(50 hari /daily)*
* **Tier 5 (Sekte Inti):** 10 Gold
* **Tier 6 (Tetua Sekte):** 100 Gold
* **Tier 7 (Raja / Kaisar):** 1 Jade (1.000 Gold)
* **Tier 8 (Legenda kuno):** 10 Jade
* **Tier 9 (Mitos / Dewa):** 1 Spirit (100 Jade)

**2. Multiplier Kualitas (Grade Bot):**
* **Common:** x 1.0
* **Uncommon:** x 2.0
* **Rare:** x 4.0
* **Epic:** x 10.0
* **Legendary:** x 25.0
* **Mythical:** x 50.0

*(Contoh: Mewujudkan Pedang Tier 3 [10 Silver] dengan Rank Rare [x4.0]. Biaya potong di bot = 40 Silver).*

### B. HARGA REALISASI ASSET (Bot `/asset`)
Asset memberikan passive income mekanik di Bot. Ini adalah cara pemain melipatgandakan harta Discord mereka. Harga harus dikunci dengan sistem ROI (Return on Investment).

**Formula:** `Harga Beli Asset = (Target Output per Hari) x Hari ROI x Multiplier`

* **Tier Rendah (Output Silver):** ROI 30 Hari
* **Tier Menengah (Output Gold):** ROI 45 Hari
* **Tier Dewa (Output Jade/Spirit):** ROI 90 Hari

*(Contoh: Pemain narasi bikin Kedai, lalu minta dibuatkan asset mekaniknya yang menghasilkan **2 Silver/Hari**. ROI-nya 30 Hari. Maka biaya pembuatannya adalah 2 x 30 = 60 Silver. Modal baru balik setelah sebulan).*

### C. HARGA REALISASI PET (Bot `/pet`)
Biaya untuk mendaftarkan binatang spiritual narasi menjadi Pet sistem yang bisa `/pet battle`.

* **Common:** 5 Silver
* **Uncommon:** 50 Silver
* **Rare:** 5 Gold
* **Epic:** 50 Gold
* **Legendary:** 5 Jade
* **Mythical:** 1 Spirit

*(Tambahan: Pet dengan elemen tempur mematikan (Api, Racun, dll) dikenai mark-up biaya +50%).*

---

## 3. ⚒️ RESEP CRAFTING MEKANIK (SINK-HOLE SYSTEM)

Untuk mewujudkan Item/Senjata kuat tingkat menengah-atas, sekadar uang tidak cukup. Pemain **WAJIB** membakar material dari inventory Bot (`/item cek`) untuk menekan inflasi.

Untuk meminta wujud **Target Item Tier X (Rank Y)**:
1. **Biaya Jasa Tempa Bot**: Sesuai rumus Bab 2A.
2. **Tumbal Material (Bot Inventory)**:
   - 1x Material Utama (Tier sama dengan target, rank setara).
   - 2x Material Pendukung (Tier -1 atau -2).

*(Catatan AI: Admin harus selalu mengecek profil/inventory pemain apakah mereka benar-benar punya uang dan material tumbal ini sebelum request disetujui).*

---

## 4. ⏳ ORACLE WAKTU PROSES (COOLDOWN REALISASI)

Proses memasukkan data (approval) oleh Admin tidak boleh instan demi menjaga hype dan prestise barang. AI harus menginformasikan lama waktu proses (real-life) kepada pemain.

**Waktu Proses Item / Pet:**
* **Tier 1 - 2 / Common:** Instan (10 Menit).
* **Tier 3 - 4 / Rare:** 6 Jam.
* **Tier 5 - 6 / Epic:** 1 Hari (24 Jam).
* **Tier 7 - 8 / Legendary:** 3 Hari.
* **Tier 9 / Mythical (Spirit):** 7 Hari (Biasanya diiringi pengumuman event server).

**Waktu Proses Aset:**
* **Asset Kecil (Gubuk, Kedai):** 1 Hari.
* **Asset Menengah (Dojo, Kapal):** 3 Hari.
* **Asset Besar (Sekte, Istana):** 7 Hari.

---

## 5. 🛡️ ATURAN ANTI-INFLASI & PVP LOOTING

1. **Pasif Maksimal:** Bot dilarang menyetujui Asset individu (bukan fasilitas Sekte) yang menghasilkan lebih dari **1 Jade per hari**.
2. **PVP Looting (`/loot`):** Sumber uang besar. Pemain yang menang di Roleplay PvP (Kematian Karakter Lawan) bisa me-loot uang bot lawan.
3. **Ekonomi Tertutup:** Sumber uang utama harus tetap dijaga ketat: dari `/daily`, Asset resmi, dan reward Tournament Admin. Jangan biarkan mata uang bot bocor dari claim naratif Roleplay yang tidak memiliki dasar mekanik.

> **End of Oracle.** AI, gunakan dokumen ini sebagai rujukan pasti untuk menghitung biaya pengorbanan di Bot Discord.