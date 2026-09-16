# Master Plan: Transformasi Jianghu Bot Menjadi Web RPG Tier A+

Dokumen ini adalah cetak biru (blueprint) strategis untuk Antigravity dalam rangka mentransformasi arsitektur Jianghu secara radikal dari basis bot Discord tradisional menjadi ekosistem game Web RPG skala penuh (yang siap untuk dirilis ke mobile di masa depan). Perencanaan ini memakan waktu kalkulasi dan desain arsitektur yang intensif.

## 1. Visi Utama & Desain Antarmuka Seamless
### 1.1 The "Always-On" Grid Map
Saat ini, pemain harus berpindah-pindah "tab/halaman" di website (misal dari `/world` ke `/inventory`). Ini merusak imersi Roleplay.
**Target Solusi:**
- Komponen `ZoneGridView` dan `WorldMapView` akan ditarik menjadi latar belakang absolut (Full-screen Canvas) di `app/page.tsx`.
- Saat pemain berhasil login, mereka langsung "terjun" ke titik koordinat terakhir mereka di peta.
- **Sistem Modals & Overlay:** Semua fitur seperti Inventory, Sekte, Kultivasi, dan Profil akan menggunakan state management lokal (misalnya `Zustand`) untuk muncul sebagai panel melayang (floating windows) atau laci geser (side-drawers) transparan ber-tema Wuxia di atas peta, persis seperti antarmuka MMORPG.

### 1.2 Intro / Start Game Prologue
Sebelum layar utama peta terbuka untuk pemain *baru* (akun level 1 / baru registrasi), kita akan mengimplementasikan komponen `<StartGameSequence />`.
- Menampilkan visual novel ringan (dialog pendek dengan tetua/sistem) untuk memilih jalur/nama, sebelum akhirnya layar melakukan efek transisi (fade/zoom) menempatkan karakter di *Desa Awal* pada grid map.

---

## 2. Resolusi Bug Sistem Grid dan Sinkronisasi Bangunan
**Analisis Masalah Saat Ini:** Terkadang saat masuk desa/kota/sekte, bug terjadi karena `Location` schema terpisah secara harafiah dari `ZoneTile` schema. Koordinatnya sering tumpang tindih atau hit-box nya tidak terbaca akurat oleh API pergerakan lokal.
**Target Solusi Arsitektur:**
1. **Unifikasi Schema:** Mengonversi entitas fisik bangunan (`Location` ber-tipe `plaza`, `dojo`, dll) menjadi terdaftar eksklusif di dalam `ZoneTile` (dengan flag unik `isBuildingEntrance: true` dan `locationRef: ID`).
2. **Instanced Interior Screen:** Ketika avatar menginjak koordinat pintu bangunan dan memicu action "Masuk", map *tidak* hilang. Sebaliknya, screen akan menggelap (blur) dan memunculkan pop-up interior bangunan (Dojo/Shop) dengan NPC list di dalamnya.
3. **Optimisasi Lazy-Evaluation Move:** Mengurangi beban API interval per detik (polling). Cukup andalkan timestamp `moveArrivesAt`. Frontend menggunakan animasi CSS/JS murni untuk menggerakkan sprite dari Tile A ke Tile B selama durasi tersebut, memanggil API hanya saat *tiba*.

---

## 3. Eksekusi Sunsetting Bot Discord
Visi: Melepaskan ketergantungan pada Discord sebagai antarmuka permainan, tetapi tetap menjaga komunitas.
1. **Login Otentikasi Ganda:**
   - Pertahankan OAuth Discord (untuk kompatibilitas pemain veteran).
   - Tambahkan sistem Registrasi Standalone (Email + Password). Model `Player` harus di-update agar `discordId` menjadi opsional, digantikan oleh entitas login custom (menggunakan *Bcrypt*).
2. **Pembersihan Repo:**
   - Seluruh folder `commands/` (kecuali `/profil` sebagai hook notifikasi/bantuan komunitas di Discord server) akan dihapus.
   - Folder `events/` dan `handlers/` untuk interaksi bot akan dinonaktifkan secara bertahap.
   - **PENTING:** Logika fundamental untuk Stat Kungfu, Sistem Pertarungan (`utils/simulateBattle.js`), dan Kalkulasi Drop akan dipertahankan 100% dan sepenuhnya dipindahkan ke eksekusi REST API backend web (`web-api/routes/`).

---

## 4. Perombakan Sistem Ambush dan Turn-Based Combat
Sebagai Web RPG Tier A+, sistem pertarungan text-based tidak lagi memadai.
1. **The "Battle Screen" Instance:**
   - Terinspirasi dari Pokemon atau Final Fantasy. Saat player terkena status `ambushed` dalam Travel, atau memulai eksplorasi monster, API akan mengembalikan state `combat: true`.
   - Frontend bereaksi dengan menyembunyikan map dan memunculkan **Battle Arena Overlay**.
   - Sisi Kiri: Avatar Karakter Pemain. Sisi Kanan: Avatar Monster/Bandit (menggunakan emoji 2D besar atau image sprite jika tersedia).
2. **Visualisasi ATB (Active Time Battle):**
   - Backend `simulateBattle.js` akan mensimulasikan hasil dan mengembalikan "Battle Log Array" terstruktur (turn 1, turn 2... sampai mati).
   - Frontend akan *me-render log ini secara berurutan dengan delay animasi JS* (memunculkan damage text melayang berwarna merah/hijau, animasi getar saat kritis/serangan kungfu khusus).
   - Ini mempertahankan beban server tetap rendah (kalkulasi instan) namun visualnya sangat kaya.

---

## 5. Menuju Super App Mobile-Responsive (PWA & Native Prep)
Untuk mencapai goal jangka panjang menjadi App Mobile:
1. **Next.js PWA Setup:** Mengonfigurasi `next-pwa` di `next.config.ts`. Ini membuat website bisa di "Install ke Home Screen" layaknya aplikasi native tanpa masuk AppStore/PlayStore di awal peluncuran.
2. **Mobile First UI/UX:**
   - Navigasi menu atas akan diubah menjadi Hamburger Menu atau **Bottom Navigation Bar** saat dideteksi dibuka via smartphone.
   - Pergerakan Grid Map di HP tidak lagi bergantung pada klik koordinat yang sempit, melainkan menambahkan **Virtual D-Pad (Joystick Layar)** atau gesture deteksi sapuan (Swipe) untuk berpindah antar tile.
   - Penggunaan `min-h-screen`, `touch-action: none` (pada map area untuk mencegah scrolling berantakan), dan penyesuaian font agar terbaca jelas.

---

## Urutan Eksekusi / Roadmap (Tim Antigravity)

1. **Sprint 1 (Fondasi):** Menyatukan semua page menjadi satu Master Canvas di `page.tsx` menggunakan komponen Grid/World, membuat modul pop-up untuk menu utama, dan menambahkan Start Game Prologue.
2. **Sprint 2 (Perbaikan Dunia):** Refactoring integrasi `Location` & `ZoneTile` di Backend, dan membuat *Instanced Interior* pop-up di frontend saat menginjak gedung.
3. **Sprint 3 (Kemandirian):** Implementasi Email Login, refactoring model Player, dan menghapus perlahan dependensi command bot Discord.
4. **Sprint 4 (Sistem Pertarungan):** Pembuatan komponen Visual `<BattleScreen />` dan interpreter Combat Log dari `simulateBattle.js`.
5. **Sprint 5 (Mobile QoL):** Styling responsif akhir, pengujian Virtual D-Pad, dan kompilasi PWA manifest.

*Dokumen Master Plan ini harus direferensikan pada setiap PR / iterasi pengerjaan.*
