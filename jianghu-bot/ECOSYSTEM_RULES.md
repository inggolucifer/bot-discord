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

---

## 2. ATURAN ASSET & BATASAN PROFIT HARIAN (ROI SYSTEM)
Asset adalah jantung dari long-play. Untuk mencegah inflasi brutal, Asset penghasil mata uang ("Income") dibatasi keras dengan sistem **ROI (Return on Investment)**. Semakin besar profit, semakin lama waktu balik modal.

### A. Asset Tipe 1: Passive Income (Penghasil Currency)
Setiap pembuatan Asset Tipe Income wajib mengikuti formula Harga dan Waktu Konstruksi berikut:

| Tier Asset | Target Profit Max/Hari | Waktu Balik Modal (ROI) | Formula Harga Beli (`basePrice`) | Waktu Konstruksi |
|---|---|---|---|---|
| **Tier 1 (Fana/Gubuk)** | 20 - 50 Copper | **20 Hari** | `Profit Harian x 20` | 4 Jam |
| **Tier 2 (Menengah/Toko)** | 1 - 5 Silver | **30 Hari** | `Profit Harian x 30` | 12 Jam |
| **Tier 3 (Besar/Pabrik)** | 10 - 50 Silver | **45 Hari** | `Profit Harian x 45` | 24 Jam |
| **Tier 4 (Elit/Sekte Luar)** | 1 - 5 Gold | **60 Hari** | `Profit Harian x 60` | 3 Hari |
| **Tier 5 (Sekte Inti)** | 10 - 20 Gold | **90 Hari** | `Profit Harian x 90` | 7 Hari |
| **Tier 6+ (Dewa/Legenda)** | Maks 1 Jade | **120 Hari** | `Profit Harian x 120` | 14 Hari |

> *Contoh:* Pembuatan Asset "Toko Senjata Dasar" yang memberikan 2 Silver/hari.
> * Tier 2. Harga Beli = 2 Silver x 30 Hari = **60 Silver**.
> * Konstruksi membutuhkan waktu **12 Jam** real-time.

### B. Asset Tipe 3: Worker (Rantai Produksi Otomatis)
Pemain tidak boleh menghasilkan barang dari kehampaan. Asset Worker **WAJIB** memiliki Input yang masuk akal.

1. **Margin Keuntungan Produksi:** Nilai total jual (Base Price) dari Output per jam **TIDAK BOLEH** melebihi 150% dari total Nilai Jual Input per jam. (Margin Maksimal 50%).
2. **Rantai Konsumsi Bawah-ke-Atas:**
   * **Pengumpulan Dasar (Tier 1):** Input berupa Alat ber-durability (Kapak/Beliung) + Stamina/Makanan. Output berupa bahan mentah alam (Kayu, Batu, Air).
   * **Pemrosesan Menengah (Tier 2):** Input bahan alam. Output berupa bahan olahan (Papan Kayu, Batang Besi).
   * **Manufaktur & Kultivasi (Tier 3+):** Input bahan olahan + Core Monster. Output berupa Senjata/Pil.
3. **Durability Alat:** Alat yang menjadi input worker (misal: "Kapak Besi") wajib diatur memiliki masa pakai (contoh: `durabilityHours: 72`). Ini memaksa pemain terus membeli/membuat alat, menciptakan *Sink-Hole* ekonomi.

---

## 3. ATURAN ITEM, CRAFTING, & SHOP
Item adalah objek perputaran kekayaan. Semua entitas Item harus mematuhi aturan nilai ini:

### A. Panduan Harga Base Price (Tier Item)
Harga ini digunakan sebagai acuan Shop dan nilai jual-balik ke sistem (Sistem membeli dari pemain seharga 20% `basePrice`).

* **Tier 1 (Bahan Mentah Dasar):** 1 - 10 Copper
* **Tier 2 (Bahan Olahan):** 20 - 90 Copper
* **Tier 3 (Alat / Perlengkapan Dasar):** 1 - 10 Silver
* **Tier 4 (Pill / Material Langka):** 50 - 100 Silver
* **Tier 5 (Relik / Senjata Kuat):** 5 - 20 Gold
* **Tier 6+ (Mitos / Dewa):** 1+ Jade

### B. Regulasi Shop Sistem
* **Shop DILARANG menjual barang Tier 3 ke atas secara permanen.** Pemain HARUS memproduksi barang tingkat lanjut dari Asset Crafting atau transaksi dengan pemain lain (Pasar).
* **Fungsi Shop:** Hanya untuk menjual barang awal (Tier 1), Blueprint Asset Dasar, dan Alat Pemula agar rantai produksi tidak mati (Deadlock).
* Barang Rank *Epic* ke atas dilarang keras masuk Shop Sistem permanen.

---

## 4. ATURAN PET & COMBAT VALUE
Pet memberikan multiplier pertarungan (PvP/PvE). Progresi Pet dirancang untuk dikerjakan hingga berbulan-bulan sampai level maksimal (100).

### A. Harga & Nilai Pet
* **Common:** 50 - 100 Silver
* **Uncommon:** 2 - 5 Gold
* **Rare:** 20 - 50 Gold
* **Epic:** 1 - 5 Jade
* **Legendary / Mythical:** 10+ Jade (Atau hanya via Event/Loot Spesial).

### B. Skalabilitas Stat Growth
Pet stats meningkat per level. Semakin tinggi Rank, *Base Stat* sedikit lebih tinggi, namun perbedaannya sangat terasa di *Growth Rate*.
* `HP Aktual = BaseHP + (Level * GrowthRate * 2.5)`
* `ATK/DEF/SPD Aktual = Base + (Level * GrowthRate * 0.5)`
*(Selalu tes balancing pertumbuhan ini agar pertarungan di PvP turn 20 tidak menjadi endless-loop).*

---

## 5. SINK-HOLE SYSTEM (PENCEGAH INFLASI)
Sistem ekonomi harus memiliki metode "pembuangan" agar mata uang dan barang tidak menumpuk tanpa batas yang merusak motivasi long-play.

1. **Biaya Konstruksi Manual (`buildRequirements`):** Asset tingkat tinggi harus menuntut jumlah material yang masif (contoh: Butuh 5.000 Papan Kayu dan 10.000 Batu Bata). Pemain harus berkooperasi membentuk grup/sekte atau grinding berbulan-bulan.
2. **Pill Meditasi (Time-Skip):** Menyediakan Item penambah kecepatan (Time-Skip) dengan harga Premium (Gold/Jade). Ini adalah cara terbaik membakar surplus uang bagi pemain elit.
3. **Biaya Pajak Transfer/Market:** Selalu terapkan pajak tersembunyi/biaya lelang untuk perlahan menyedot uang keluar dari sirkulasi server.

---

## ✅ CHECKLIST REVIEW (Untuk Admin / Dev)
Sebelum menyimpan desain baru ke Database MongoDB, pastikan:
1. [ ] Apakah **Daily Profit** Asset sudah sesuai tabel pembatasan Tier?
2. [ ] Apakah Asset Worker memiliki **Input**? *(Dilarang output dari kehampaan)*
3. [ ] Apakah Item ini merusak sistem jika dimasukkan ke **Shop**? *(Haruskah ini jadi resep Crafting saja?)*
4. [ ] Apakah relasi `basePrice` dan Rank sudah logis untuk ekonomi jangka panjang?

> **Patuhi panduan ini untuk memastikan Jianghu tetap menjadi ekosistem yang sehat, menantang, dan adiktif untuk dimainkan bertahun-tahun.**
