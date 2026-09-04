# 🌍 JIANGHU ECOSYSTEM & ECONOMY MASTER RULES
*(Panduan Resmi Jangka Panjang - Desain Ekonomi, Waktu, dan Rantai Ekosistem)*

Dokumen ini adalah **Absolute Master Rulebook** untuk pembuatan dan penyesuaian semua Entitas Ekonomi (Asset, Item, Pet, dan Shop) di dunia Jianghu. Sistem ini dirancang untuk **"Long-Play"**, mendorong pemain untuk login setiap hari, membangun ekosistem mandiri, berkolaborasi, namun tetap membatasi inflasi secara ketat agar menimbulkan efek "addictive" melalui progression yang perlahan tapi pasti.

---

## 1. MATA UANG & NERACA KEKAYAAN (CURRENCY SYSTEM)
Sistem ekonomi berbasis hierarki kelipatan 100.
* **100 Copper (🟤) = 1 Silver (⚪)**
* **100 Silver (⚪) = 1 Gold (🟡)**
* **100 Gold (🟡) = 1 Jade (🟢)**
* **100 Jade (🟢) = 1 Spirit (🔵)**

> **Golden Rule Pendapatan:** Desain semua harga mengacu pada F2P Baseline Income (`/daily`), yang rata-rata menghasilkan **1 Silver per hari** (di luar event). Jika sebuah item berharga 10 Silver, artinya pemain butuh perjuangan login 10 hari tanpa pengeluaran.
> **Sistem Barter:** Sangat didorong bagi pemain untuk menggunakan sistem Trade/Barter (tukar item dengan item) untuk mengurangi kebergantungan murni pada sistem uang bot, terutama dalam membangun Asset yang membutuhkan banyak bahan alam (kayu, batu).

---

## 2. ZAMAN & PROGRES PERADABAN (ERA PROGRESSION)
Untuk menjaga alur ekosistem tetap masuk akal, desain material dan alat terbagi berdasarkan "Zaman" (Era Progression):
1. **Zaman Primitif (Tier 0-1):** Mengandalkan tangan kosong, tulang, dan kayu patah. Alat mudah hancur.
2. **Zaman Batu (Tier 1-2):** Alat dari batu kasar (Kapak Batu, Palu Batu). Pengumpulan material dasar (Kayu Mentah, Batu Kasar).
3. **Zaman Besi (Tier 3-4):** Menggunakan Forge/Tungku untuk melebur Besi/Tembaga. Alat jauh lebih awet dan kuat. Memulai era sekte kecil.
4. **Zaman Modern/Maju (Tier 5):** Alat mekanik, Pabrik pengolahan cepat. Produksi massal.
5. **Zaman Murim (Tier 6+):** Menggunakan Qi, Energi Spiritual, Relik Kuno, dan Array Formasi sihir. Konstruksi butuh Spirit Stone dan elemen alam (Api Surgawi, dll).

---

## 3. ATURAN ASSET & BATASAN PROFIT HARIAN (ROI SYSTEM)
Asset adalah jantung dari long-play. Untuk mencegah inflasi brutal, Asset penghasil mata uang ("Income") dibatasi keras dengan sistem **ROI (Return on Investment)**.

### A. Asset Tipe 1: Passive Income (Penghasil Currency)
**Batas Maksimal Mutlak:** Profit per hari untuk Asset level Tertinggi/Dewa (Max Tier) **DIKUNCI PADA 2 GOLD per hari**. Waktu pembangunannya sangat lama (hingga berminggu-minggu). Asset awal dirancang agar pemain **tidak merugi terus**, namun profitnya kecil.

| Tier Asset (Zaman) | Target Profit Max/Hari | Waktu Balik Modal (ROI) | Formula Harga Beli | Waktu Konstruksi | Estimasi Biaya Guard / Hari |
|---|---|---|---|---|---|
| **Tier 1 (Primitif/Gubuk)** | 20 - 50 Copper | **20 Hari** | `Profit Harian x 20` | 4 Jam | 5 Copper |
| **Tier 2 (Batu/Toko Dasar)** | 1 - 5 Silver | **30 Hari** | `Profit Harian x 30` | 24 Jam | 20 Copper |
| **Tier 3 (Besi/Pabrik)** | 10 - 20 Silver | **45 Hari** | `Profit Harian x 45` | 3 Hari | 2 Silver |
| **Tier 4 (Modern/Sekte Luar)**| 50 - 100 Silver| **60 Hari** | `Profit Harian x 60` | 7 Hari | 10 Silver |
| **Tier 5 (Murim/Sekte Inti)** | 1 Gold | **90 Hari** | `Profit Harian x 90` | 14 Hari | 20 Silver |
| **Tier 6+ (Dewa/Max Tier)** | **Maks 2 Gold** | **120 Hari** | `Profit Harian x 120` | 30 Hari | 50 Silver |

### B. Sistem Risiko & Guard (Bandit & Bencana Alam)
*(Fitur Mendatang)* Asset yang dibangun di Jianghu tidak 100% aman selamanya.
1. **Risiko Kerusakan:** Ada chance harian Asset diserang Bandit atau terkena Bencana Alam.
2. **Kondisi Rusak:** Jika diserang/terkena bencana, Asset menjadi *Rusak (Halted)* dan tidak menghasilkan profit/material sampai diperbaiki.
3. **Biaya Perbaikan:** Butuh Material konstruksi (Kayu, Batu) atau Currency.
4. **Sewa Guard (Pencegahan):** Pemain bisa menyewa NPC "Guard" (Penjaga) yang dibayar per hari menggunakan Currency (lihat tabel di atas) untuk mereduksi drastis peluang diserang Bandit. Pemain elit dengan banyak asset wajib mengelola biaya Guard agar profit bersih tidak tergerus.

### C. Asset Tipe 3: Worker (Rantai Produksi Otomatis)
Pemain tidak boleh menghasilkan barang dari kehampaan.
1. **Margin Keuntungan:** Nilai total jual dari Output per jam **TIDAK BOLEH** melebihi 150% dari total Nilai Jual Input per jam.
2. **Durability Alat (Tool Durability):** Alat sebagai input (misal: "Kapak Batu") **WAJIB** memiliki masa pakai (contoh: `durabilityHours: 24`). Jika 24 siklus (jam) kerja terlewati, alat hancur. Pemain harus craft/beli alat baru agar Asset tidak Halt. Ini adalah pondasi rantai konsumsi.

---

## 4. ATURAN ITEM, DESKRIPSI, & CRAFTING
### A. Panduan Harga Base Price & Jual-Balik
Sistem membeli dari pemain seharga 20% `basePrice`.
* **Tier 1 (Bahan Mentah):** 1 - 10 Copper
* **Tier 2 (Bahan Olahan/Zaman Batu):** 20 - 90 Copper
* **Tier 3 (Alat Besi/Perlengkapan):** 1 - 10 Silver
* **Tier 4 (Pill/Material Modern):** 50 - 100 Silver
* **Tier 5 (Relik/Zaman Murim):** 5 - 20 Gold
* **Tier 6+ (Dewa):** 1+ Jade

### B. Waktu Crafting Item (Sistem Kesabaran)
Sama seperti Asset, pembuatan Item tingkat tinggi tidak boleh instan. Harus ada waktu tunggu (cooldown/proses tempa) yang memaksa pemain log off dan kembali keesokan harinya.

| Tier / Kualitas Item | Contoh Barang | Waktu Crafting (Real-Time) |
|---|---|---|
| **Tier 1 - 2 (Common)** | Papan Kayu, Kapak Batu | Instan - 10 Menit |
| **Tier 3 (Rare/Besi)** | Pedang Besi, Armor Kulit | 4 - 6 Jam |
| **Tier 4 (Epic/Modern)**| Pil Kultivasi, Senjata Baja | 12 - 24 Jam |
| **Tier 5 (Legendary)** | Relik Sekte, Pil Terobosan | 3 - 7 Hari |
| **Tier 6+ (Mitos/Dewa)**| Pedang Pemecah Langit | **14 - 20 Hari** |

### C. Regulasi Shop Sistem
* **Fungsi Utama:** Mencegah Deadlock bagi pemula. Shop hanya menjual bahan/alat Tier 1 (Primitif/Batu) dan Blueprint Dasar.
* Barang Tier 3+ (Besi ke atas) dan Rank *Epic+* **DILARANG** masuk Shop permanen. Pemain harus craft, barter, atau drop dari bos.

### D. Kualitas Deskripsi Item (Lore)
Setiap entitas (Item/Asset/Pet) wajib memiliki deskripsi yang mendalam, mencerminkan era/tier-nya, dan memiliki fungsi naratif.
* *Buruk:* "Kapak dari batu untuk potong pohon."
* *Standar Emas:* "[Durability: 24 Jam] Sebuah kapak kasar dari zaman batu, diikat dengan akar kuat. Meskipun tumpul dan berat, alat ini adalah fondasi awal peradaban fana untuk menaklukkan Hutan Liar."

---

## 5. ATURAN PET & COMBAT VALUE
Pet memberikan multiplier pertarungan (PvP/PvE). Progresi Pet dirancang untuk dikerjakan hingga berbulan-bulan sampai level maksimal (100).

### A. Harga & Nilai Pet
* **Common:** 50 - 100 Silver
* **Uncommon:** 2 - 5 Gold
* **Rare:** 20 - 50 Gold
* **Epic:** 1 - 5 Jade
* **Legendary / Mythical:** 10+ Jade (Via Event/Loot Spesial).

### B. Skalabilitas Stat Growth
* `HP Aktual = BaseHP + (Level * GrowthRate * 2.5)`
* `ATK/DEF/SPD Aktual = Base + (Level * GrowthRate * 0.5)`

---

## 6. SINK-HOLE SYSTEM (PENCEGAH INFLASI)
1. **Biaya Guard & Repair:** Pajak tersembunyi bagi pemilik Asset besar (lihat poin 3B).
2. **Tool Destruction:** Alat yang pecah (`durabilityHours` habis) memaksa uang dan material terus berputar di market antar pemain.
3. **Biaya Konstruksi Masif:** Asset tinggi butuh ribuan material mentah (menggerakkan pemain bawah untuk menjual ke pemain atas).
4. **Pill Meditasi (Time-Skip):** Item premium (Gold/Jade) untuk skip waktu konstruksi/kultivasi.

---

## ✅ CHECKLIST REVIEW (Untuk Admin / Dev)
Sebelum menyimpan desain baru ke Database MongoDB, pastikan:
1. [ ] Apakah profit Asset Max Tier di bawah batas **2 Gold/hari**?
2. [ ] Apakah Asset Pekerja membutuhkan alat ber-durability yang bisa hancur?
3. [ ] Apakah biaya Guard/Perbaikan masuk akal dibanding profit Asset?
4. [ ] Apakah Waktu Crafting Item sudah disesuaikan dengan Tier-nya (Misal Tier Dewa = 20 Hari)?
5. [ ] Apakah Item ini merusak ekosistem barter jika dijual di Shop sistem?
6. [ ] Apakah deskripsi (Lore) item sesuai standar emas dan mencerminkan "Zaman" nya?

> **Patuhi panduan ini untuk memastikan Jianghu tetap menjadi ekosistem yang sehat, menantang, dan adiktif untuk dimainkan bertahun-tahun.**
