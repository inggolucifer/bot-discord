# Master Plan V2: Discord Bot to Web RPG Tier A+ Transition

Dokumen ini adalah cetak biru teknis dan strategis untuk mentransisikan proyek Jianghu secara total dari sekadar Bot Discord menjadi Web RPG Tier A+ yang mandiri, immersive, dan siap dioptimasi menjadi aplikasi mobile (PWA/Capacitor).

---

## 1. Zero Logic Loss & Penghapusan Discord Bot
**Objektif:** Melepaskan keterikatan pada platform Discord tanpa merusak game loop, balance ekonomi, dan mekanik RPG yang sudah matang.

### 1.1 Restrukturisasi Backend
Saat ini, logika bisnis tersebar di antara folder `commands/` (Discord Interface) dan `services/` (Core Logic).
- **Tindakan:** Seluruh folder `commands/player/` akan dihapus, **kecuali** file krusial seperti `/profil.js` atau `/help.js` untuk notifikasi/integrasi dasar di Discord Server.
- **Preservasi Logic:** Folder `utils/` (seperti `simulateBattle.js`, `stamina.js`, `kungfuMastery.js`, dll) dan folder `services/` **HARUS** dibiarkan utuh karena ini adalah jantung kalkulasi game.
- **Eksposur API:** Semua rute di `web-api/routes/` harus memastikan pembungkusan yang rapi terhadap fungsi di `services/`, mengembalikan respons JSON terstruktur, bukan lagi string/embeds Discord.

### 1.2 Sistem Otentikasi Hibrida
- Update Schema `models/Player.js` untuk menambahkan field opsional `email`, `passwordHash` (menggunakan `bcrypt`), dan `username`.
- **Hybrid Login:** Player lama tetap bisa login dengan Discord OAuth, sementara player baru bisa langsung mendaftar via Email di website. Keduanya akan terikat pada satu ID Pemain yang sama di database.

---

## 2. Arsitektur Frontend: The "Always-On" Grid Canvas
**Objektif:** Menghilangkan konsep "pindah halaman" tradisional (misalnya klik Inventory lalu layar memuat halaman baru) yang sangat merusak imersi Roleplay.

### 2.1 The Core (`app/page.tsx`)
- Komponen `ZoneGridView` (Peta Lokal) dan `WorldMapView` (Peta Makro) akan dipindahkan ke **root layout**.
- Peta ini akan menjadi background absolut (full-screen) yang terus menyala dan reaktif selama pemain online.

### 2.2 Sistem State Management & Overlay (Zustand)
- Menggantikan halaman terpisah dengan **Floating Modals / Side Panels**.
- Buat global state store (misal: `useUIStore`) untuk mengelola status: `isInventoryOpen`, `isCultivationOpen`, `isSectOpen`.
- Saat UI dibuka (misal: panel Inventory), panel akan "slide in" dari samping layar dengan efek transparan (Glassmorphism + Wuxia Theme) menutupi sebagian layar, sementara pemain masih bisa melihat avatar-nya di peta. Panel ini dapat di-*drag* atau di-minimize.

---

## 3. Resolusi Bug Grid & Sinkronisasi Bangunan (Instanced Interiors)
**Masalah Saat Ini:** Terjadi bug penumpukan koordinat dan kesulitan masuk ke bangunan karena data `Location` (bangunan/NPC) terpisah dari `ZoneTile`.
**Solusi Terstruktur:**

### 3.1 Integrasi Schema Database
- Tambahkan field `locationId` (Referensi ke `Location`) dan boolean `isBuildingEntrance` pada Schema `ZoneTile`.
- Saat seed dunia, sistem harus memetakan bangunan langsung ke tile tertentu.

### 3.2 Visualisasi "Instanced Interior"
- Alih-alih membuat grid baru yang sempit, saat player menginjak tile pintu dan memilih aksi "Masuk", UI akan memicu overlay **Instanced Interior Screen**.
- Layar utama peta akan menggelap/blur, digantikan oleh ilustrasi latar belakang ruangan (misal: visual Dojo atau Warung Teh) dan UI berisikan daftar NPC, tombol Shop, atau opsi Sekte di dalam bangunan tersebut.

### 3.3 Prediksi Pergerakan (Client-Side Prediction)
- Kurangi beban *polling* server. Pergerakan grid harus sepenuhnya mengandalkan evaluasi timestamp (`moveStartedAt` & `moveArrivesAt`).
- Frontend menggunakan CSS/JS Tweening untuk menggerakkan sprite dari titik A ke titik B selama durasi tempuh tersebut secara visual, dan baru memanggil `/sync` ke API ketika animasi selesai, menghilangkan lag/kaku pada pergerakan.

---

## 4. Sistem Pertarungan Visual (Instanced Battle Screen)
**Objektif:** Membuat combat terasa seru layaknya JRPG klasik.

### 4.1 Logika ATB di Backend (Sudah Ada)
- Script `utils/simulateBattle.js` akan tetap digunakan untuk mensimulasikan seluruh pertarungan dalam fraksi detik dan menghasilkan array objek berisi *Combat Log* per turn (serangan, damage, critical, debuff).

### 4.2 Komponen `<BattleArena />`
- Saat Travel memicu *Ambush* atau Eksplorasi memicu *Battle*, *overlay* arena pertarungan akan muncul.
- **Layout:** Sprite/Avatar pemain di sebelah kiri, dan Monster/Bandit di kanan. Keduanya memiliki HP & MP bar.
- **Log Replay Engine:** Frontend (React) tidak lagi hanya menampilkan teks mentah, melainkan melakukan *looping* (dengan delay `setTimeout` sekitar 1 detik per turn) membaca array *Combat Log*.
- Efek Visual: Setiap log serangan memicu animasi getar pada sprite (CSS Shake), memunculkan angka *Damage* merah melayang (Floating Text), dan efek suara sabetan pedang/sihir untuk memberi kesan RPG yang kuat.

---

## 5. Prologue "Start Game" Sequence
- Pemain yang baru terdaftar tidak boleh langsung dilempar ke peta.
- Setelah berhasil buat karakter, munculkan layar **Visual Novel Style** (`<StartPrologue />`).
- Ceritakan sedikit *lore* (Latar Belakang Jianghu, Invasi, dll), berikan pilihan awal (Jalan Pedang/Tangan Kosong), yang kemudian akan men-set start inventory dan stat dasar pemain.
- Selesai Prologue, transisi perlahan *fade-in* ke Grid Map di desa pemula.

---

## 6. Optimalisasi Mobile Responsiveness & PWA
**Objektif:** Siap menjadi aplikasi Mobile native nantinya.
- **Mobile-First CSS (Tailwind):** Pastikan semua modal dan panel merespons sentuhan (Touch-Friendly), font tidak terlalu kecil, dan tidak ada overflow horizontal.
- **Navigasi Layar Bawah:** Pada mode mobile, Sidebar akan berubah menjadi Bottom Navigation Bar untuk akses cepat (Menu, Inventory, Map, Cultivation).
- **Virtual D-Pad (Joystick Layar):** Tambahkan kontrol arah sentuh pada layar mobile untuk pergerakan di grid map, sebagai alternatif dari metode tap-koordinat.
- **Konfigurasi `next-pwa`:** Jadikan website installable via browser ke Home Screen iOS/Android, lengkap dengan Service Worker untuk caching asset statis.

---

## 7. Roadmap Pelaksanaan Tim (Sprint Plan)

- **Sprint 1 (Fondasi UI & Peta):**
  - Memindahkan Grid & World Map menjadi Absolute Fullscreen Background.
  - Implementasi Zustand untuk UI Modals (Inventory, Cultivation, Pet).
- **Sprint 2 (Instanced Mechanics):**
  - Refactor `ZoneTile` untuk menyimpan `locationId`.
  - Buat komponen `InstancedInterior` untuk interaksi saat memasuki bangunan (Dojo/Shop/Sekte).
- **Sprint 3 (Start Game & Battle Screen):**
  - Pembuatan sequence `<StartPrologue />` visual novel.
  - Pengembangan `<BattleArena />` dan Replay Engine (visualisasi Damage/Animasi turn-based).
- **Sprint 4 (Kemandirian & Mobile Optimasi):**
  - Setup Email Auth Login API dan update schema Player.
  - Clean up commands Discord (`commands/`).
  - Integrasi Virtual D-Pad dan konversi ke arsitektur PWA.

*Dokumen ini merupakan sumber kebenaran (Source of Truth) bagi Tim Antigravity untuk dieksekusi langkah demi langkah dengan profesionalisme tinggi.*
