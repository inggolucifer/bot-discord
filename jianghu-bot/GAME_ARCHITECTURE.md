# 🧭 JIANGHU RPG MULTIPLAYER - GAME ARCHITECTURE & ECOSYSTEM

> **INFORMASI MUTLAK UNTUK AI & DEVELOPER:**
> File ini adalah peta biru (blueprint) arsitektur game Jianghu. Jika kamu (AI) ditugaskan untuk mengembangkan fitur baru, membuat perintah Discord baru, atau menganalisis game ini, **BACA FILE INI TERLEBIH DAHULU**. Jangan berasumsi ini adalah bot RPG standar. Ini adalah ekosistem hybrid 3 pilar.

---

## 🏗️ 3 PILAR UTAMA EKOSISTEM

Permainan ini tidak berjalan di satu platform saja, melainkan menggabungkan tiga platform berbeda yang saling mendukung.

### 1. CORE JIANGHU (GitHub Repository)
* **Wujud:** Repositori Markdown publik (`https://raw.githubusercontent.com/inggo-alvn/jianghu-world/refs/heads/main/INDEX.md`).
* **Fungsi:** Menjadi "Otak Besar", Ensiklopedia, dan *Source of Truth* (Sumber Kebenaran Mutlak) dunia.
* **Isi:** Lore dunia, hukum kultivasi, sekte resmi, data pemain awal, batas kekuatan (Qi Cap), dan ekonomi narasi.
* **Peran Admin:** Hanya Admin yang bisa mengedit dan me-merge data pemain/sekte baru ke dalam GitHub ini.

### 2. ROLEPLAY AI (Platform LLM / Qwen Studio)
* **Wujud:** Obrolan teks (Text-based RPG) yang dimainkan pemain masing-masing di aplikasi AI (misal: Qwen Studio).
* **Fungsi:** "Dunia Virtual" tempat narasi dan petualangan terjadi.
* **Cara Kerja:**
  - Pemain memasukkan prompt khusus (System Prompt Game Master).
  - Prompt tersebut memaksa AI untuk *membaca/fetching* **Core Jianghu (GitHub)** di setiap gilirannya.
  - Hasilnya: AI akan merespons petualangan pemain secara ketat sesuai hukum dunia, mencegah AI berhalusinasi atau ngawur. Pemain bertarung, mencari item, dan berlatih murni lewat narasi teks di sini.

### 3. DISCORD BOT (Sistem Meta-Currency & Database Kepemilikan)
* **Wujud:** Server Discord dan Bot `jianghu-bot` berbasis Node.js/Mongoose.
* **Fungsi:** "Bank, Sertifikat Hak Milik, dan Fitur Sosial/Mekanik."
* **Cara Kerja Ekonomi:**
  - Ekonomi bot (**Copper, Silver, Gold, Jade, Spirit**) SEPENUHNYA TERPISAH dari mata uang Roleplay AI (Tael, Giok).
  - Uang di Discord Bot disebut **Meta-Currency**.
  - Pemain mendapatkan Meta-Currency dari mekanisme bot: `/daily`, `/asset claim-profit`, membunuh/me-loot pemain lain, atau event admin.
  - **Fungsi Uang Bot:** Dipakai untuk MEMBAYAR ADMIN (Request).

---

## 🔄 SIKLUS PERMAINAN (GAMEPLAY LOOP)

Bagaimana 3 pilar ini bekerja sama? Inilah siklus (loop) kehidupan pemain di Jianghu:

1. **Bermain di AI:** Pemain berpetualang di Qwen Studio. Dalam narasinya, ia menemukan Pedang Naga atau menciptakan *Hukum Kultivasi Custom*.
2. **Farming di Discord:** Pemain mengumpulkan "Meta-Currency" (misal: 10 Gold) di Discord lewat `/daily` atau profit aset.
3. **Membeli "Hak Paten" (Request):** Pemain pergi ke Channel Request di Discord. Ia mengajukan: *"Min, aku mau mematenkan Hukum Kultivasiku dan Pedang Nagaku agar resmi diakui dunia."*
4. **Verifikasi & Eksekusi Admin:**
   - Admin mengecek log obrolan AI pemain untuk memvalidasi (Anti-Cheat).
   - Admin mengecek **`ECONOMY_ORACLE.md`** untuk menentukan biaya Bot Currency.
   - Bot memotong uang Discord pemain.
5. **Update Dunia:**
   - Admin mencatat Hukum Kultivasi pemain ke dalam **Core Jianghu (GitHub)**. (Kini, semua AI pemain lain di dunia akan "tahu" tentang keberadaan hukum tersebut).
   - Admin mencatatkan (memberikan) wujud mekanik Pedang Naga tersebut ke inventory `/item` pemain di **Discord Bot**.

---

## 💡 KESIMPULAN UNTUK PENGEMBANGAN BOT

Jika kamu mengembangkan bot discord ini:
- **Jangan pernah** mencampuradukkan ekonomi naratif (Tael/Harga Pasar Roleplay) ke dalam fitur mekanik Bot Discord. Keduanya adalah dimensi terpisah.
- **Bot Discord** dirancang sebagai *sistem perizinan, hak milik aset mekanik (passive income), dan papan peringkat*.
- Fitur bot yang bagus adalah fitur yang men-stimulasi pemain untuk aktif di Discord (mengumpulkan meta-currency) agar mereka memiliki "dana" untuk merealisasikan petualangan narasi epik mereka ke dalam *Core Jianghu*.
- Selalu patuhi batas keseimbangan (Balance) yang ada di `ECONOMY_ORACLE.md`.