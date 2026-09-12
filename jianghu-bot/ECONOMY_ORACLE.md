# ⚖️ JIANHU BOT - ECONOMY ORACLE ⚖️

> **Perhatian Untuk Dev & Admin:**
> File ini adalah **Economy Oracle Mutlak** untuk sistem mekanik Bot Discord Jianghu.
>
> **PRINSIP UTAMA:** Mata uang Bot Discord (Copper, Silver, Gold, Jade, Spirit) adalah "Meta-Currency" murni yang didapat dari fitur bot (`/daily` 2 Silver, profesi, `/asset claim-profit`, `/loot`, turnamen, market). Uang bot ini digunakan sebagai "Biaya Sistem" untuk crafting, upgrade, pembelian aset, penciptaan item tingkat tinggi, dan biaya layanan sistem core.

---

## 1. 💰 ORACLE HARGA SISTEM INTERNAL

Sistem harga internal ini digunakan sebagai acuan dasar (base price) untuk item, pet, atau aset di dalam database. Harga ini menjadi patokan ketika pemain melakukan crafting, membeli blueprint, atau bertransaksi dengan NPC dan sistem.

*(Asumsi Dasar: `/daily` F2P adalah 2 Silver. Harga harus menyeimbangkan laju peredaran uang dan mempertimbangkan waktu yang dihabiskan pemain).*

### A. HARGA DASAR ITEM (Weapon, Pill, Herb, Material, Blueprint)
Biaya acuan untuk nilai intrinsik sebuah item di dalam sistem bot.

**Formula Harga = Base Tier Price × Multiplier Rank**

**1. Base Tier Price (Harga Dasar Bot):**
* **Tier 1 (Fana Biasa):** 10 Copper
* **Tier 2 (Dasar Kultivasi):** 1 Silver
* **Tier 3 (Menengah):** 10 Silver *(5 hari /daily F2P)*
* **Tier 4 (Sekte Luar):** 1 Gold *(50 hari /daily F2P)*
* **Tier 5 (Sekte Inti):** 10 Gold
* **Tier 6 (Tetua Sekte):** 100 Gold
* **Tier 7 (Raja / Kaisar):** 1 Jade (1.000 Gold)
* **Tier 8 (Legenda kuno):** 10 Jade
* **Tier 9 (Mitos / Dewa):** 1 Spirit (100 Jade)

**2. Multiplier Kualitas (Grade/Rank):**
* **Common:** x 1.0
* **Uncommon:** x 2.0
* **Rare:** x 4.0
* **Epic:** x 10.0
* **Legendary:** x 25.0
* **Mythical:** x 50.0

*(Contoh: Sebuah Pedang Tier 3 [10 Silver] dengan Rank Rare [x4.0] memiliki Base Price = 40 Silver. Harga ini bisa digunakan sebagai patokan resep crafting atau harga beli blueprint).*

### B. HARGA DASAR ASSET (Bot `/asset`)
Asset memberikan passive income atau production station mekanik di Bot. Ini adalah cara pemain melipatgandakan sumber daya mereka. Harga harus dikunci dengan sistem ROI (Return on Investment).

**Formula:** `Harga Beli Asset = (Target Output per Hari dalam Silver equivalent) x Hari ROI x Multiplier`

* **Tier Rendah (Output Silver):** ROI 30 Hari
* **Tier Menengah (Output Gold):** ROI 45 Hari
* **Tier Dewa (Output Jade/Spirit):** ROI 90 Hari

*(Contoh: Jika ada aset yang menghasilkan setara **2 Silver/Hari**. ROI-nya 30 Hari. Maka biaya pembuatannya adalah 2 x 30 = 60 Silver. Modal baru balik setelah sebulan penuh produksi).*

### C. HARGA DASAR PET (Bot `/pet`)
Acuan harga nilai intrinsic binatang spiritual (Pet) untuk sistem shop, loot, atau telur.

* **Common:** 5 Silver
* **Uncommon:** 50 Silver
* **Rare:** 5 Gold
* **Epic:** 50 Gold
* **Legendary:** 5 Jade
* **Mythical:** 1 Spirit

*(Tambahan: Pet dengan elemen tempur/stats yang lebih tinggi dikenai mark-up harga acuan +50%).*

---

## 2. ⚒️ RESEP CRAFTING MEKANIK (SINK-HOLE SYSTEM)

Untuk membuat Item/Senjata kuat tingkat menengah-atas melalui profesi, sekadar mata uang tidak cukup. Pemain **WAJIB** membakar material (resources) dan tool durability untuk menjaga perputaran ekonomi dan menekan inflasi.

**Prinsip Desain Resep (Target Item Tier X, Rank Y):**
1. **Biaya Base Currency (Opsional/Pendukung)**: Sebagian resep dapat meminta sink berupa base currency.
2. **Kebutuhan Material Input**:
   - 1-3x Material Utama (Tier sama dengan target, rank setara).
   - 2-5x Material Pendukung (Tier -1 atau -2).
3. **Kebutuhan Blueprint**: Resep tingkat tinggi (Tier 3+) idealnya mensyaratkan blueprint khusus yang harus dibeli/didapatkan terlebih dahulu (sekali buka).

---

## 3. ⏳ WAKTU PROSES (COOLDOWN SISTEM)

Aksi sistem (seperti crafting, breakthrough, pembangunan aset, atau eksplorasi) harus menggunakan durasi yang beralasan untuk menjaga alur game tetap lambat dan berbobot.

**Waktu Proses (Contoh Estimasi):**
* **Tier 1 - 2 / Common:** 10 Menit hingga 1 Jam.
* **Tier 3 - 4 / Rare:** 4 hingga 8 Jam.
* **Tier 5 - 6 / Epic:** 12 hingga 24 Jam.
* **Tier 7 - 8 / Legendary:** 2 hingga 3 Hari.
* **Tier 9 / Mythical (Spirit):** 5 hingga 7 Hari (Biasanya diiringi pengumuman event server).

**Waktu Proses Konstruksi Aset:**
* **Asset Kecil (Gubuk, Kedai):** 1 Hari.
* **Asset Menengah (Dojo, Kapal):** 3 Hari.
* **Asset Besar (Sekte, Istana):** 7 Hari.

---

## 4. 🛡️ ATURAN ANTI-INFLASI & PVP LOOTING

1. **Pasif Maksimal:** Aset individu penghasil currency murni (passive income) tidak boleh dirancang menghasilkan lebih dari **1 Jade per hari** (24 jam) per aset.
2. **PVP Looting (`/loot`):** Pemain yang mengalahkan pemain lain di mekanik PvP bisa me-loot sebagian sumber daya lawan (terkena sistem cooldown dan protection).
3. **Ekonomi Tertutup:** Sumber masuk utama uang dari Faucet sistem (seperti `/daily` atau drop exploration dasar) harus dijaga konstan. Kebanyakan kekayaan besar harus didapat dari pertukaran antar pemain (Trade/Market) atau produksi tingkat lanjut dari profesi, BUKAN dari drop sistem instan yang nilainya over-inflated.

> **End of Oracle.** Gunakan dokumen ini sebagai rujukan pasti untuk mendesain ekonomi internal Bot Discord Jianghu.