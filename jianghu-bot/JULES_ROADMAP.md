# Jianghu World Web Dashboard — Roadmap Perbaikan

STATUS: ROADMAP UTAMA SELESAI — mode maintenance ringan

## FASE 1 — Perbaiki Login Discord (PRIORITAS TERTINGGI, akar masalah "gagal login terus")
- [x] Di `web-dashboard/src/components/Navbar.tsx`, fungsi `handleLogin` fallback ke `client_id=YOUR_CLIENT_ID` kalau `NEXT_PUBLIC_DISCORD_CLIENT_ID` kosong, yang bikin redirect ke Discord pasti gagal. Jangan biarkan fallback diam-diam ini terpakai di production — kalau env var tidak terset, tampilkan pesan error yang jelas di UI ("Konfigurasi login belum lengkap, hubungi admin") daripada redirect dengan ID palsu.
- [x] Proyek ini punya 3 nama env var berbeda untuk Discord Client ID: `CLIENT_ID` (dipakai di deploy-commands.js), `DISCORD_CLIENT_ID` (dipakai backend web-api/routes/auth.js), `NEXT_PUBLIC_DISCORD_CLIENT_ID` (dipakai frontend Navbar.tsx). Audit apakah ketiganya memang harus terpisah; kalau iya, dokumentasikan dengan jelas di .env.example bahwa nilainya harus SAMA PERSIS (Application/Client ID dari Discord Developer Portal).
- [x] `web-api/server.js` default listen di port 3000 lewat `process.env.API_PORT`. Next.js (`web-dashboard`) juga default ke port 3000. Kalau dijalankan bersamaan di server yang sama tanpa `API_PORT` custom, keduanya bentrok. Tetapkan default port yang berbeda secara eksplisit dan jelaskan di .env.example serta README (mis. API tetap 3000, dashboard 3001).
- [x] `jianghu-bot/ecosystem.config.js` (PM2) cuma mendaftarkan proses `jianghu-bot` (index.js). Proses `web-dashboard` (Next.js) tidak terdaftar di PM2 — tambahkan app kedua di ecosystem.config.js untuk build & start web-dashboard supaya prosesnya persisten dan auto-restart juga.
- [x] Pastikan `redirect_uri` yang dikirim ke Discord (dibangun di Navbar.tsx saat redirect, dan lagi di auth/callback/page.tsx saat tukar code) sama persis dengan salah satu Redirect URL yang terdaftar di Discord Developer Portal. Tambahkan pesan error yang lebih spesifik di UI kalau Discord menolak karena redirect_uri mismatch (bukan cuma pesan generik "Gagal login melalui Discord").
- [x] Di `web-api/routes/auth.js`, `discordUser.avatar` bisa `null` untuk user tanpa avatar custom, menghasilkan URL avatar rusak (`.../avatars/<id>/null.png`). Tambahkan fallback ke avatar default Discord.
- [x] `JWT_SECRET` fallback hardcoded (`'fallback-secret-for-development-only'`) duplikat di dua file (web-api/routes/auth.js dan web-api/middlewares/auth.js). Satukan ke satu sumber, dan log warning jelas saat startup kalau env var asli belum diset di production.
- [x] Setelah OAuth Discord sukses, backend belum mengecek apakah user sudah punya karakter (Player) terdaftar. Di `/api/auth/login`, tambahkan pengecekan `Player.findOne({discordId: userId})` dan sertakan flag `hasCharacter` di response, supaya frontend bisa kasih pesan jelas ("Kamu belum daftar karakter, ketik /daftar di Discord") daripada error "Karakter tidak ditemukan" yang membingungkan di banyak halaman.
- [x] Buat `jianghu-bot/.env.example` lengkap (DISCORD_TOKEN, CLIENT_ID, DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, GUILD_ID, JWT_SECRET, MONGODB_URI, API_PORT, OWNER_IDS, TZ_NAME) dan `jianghu-bot/web-dashboard/.env.example` (NEXT_PUBLIC_API_URL, NEXT_PUBLIC_URL, NEXT_PUBLIC_DISCORD_CLIENT_ID), masing-masing dikomentari singkat cara mendapatkan nilainya.

**Selesai kalau:** login Discord dari dashboard berhasil end-to-end tanpa fallback ID palsu, dan kedua .env.example lengkap.

## FASE 2 — Sambungkan Lelang & Pasar (Market) ke data asli
- [x] Buat `web-api/routes/market.js`: `GET /api/market/shop` (list dari model Shop yang isActive, populate refId sesuai refModel — reuse logic dari services/player/shopService.js), `GET /api/market/auctions` (list Auction status 'active', populate itemId & sellerId), `POST /api/market/auctions/:id/bid` (reuse logic dari services/player/lelangBidService.js, WAJIB pakai lock/mutex seperti pola LockManager di web-api/routes/inventory.js untuk cegah race condition).
- [x] Daftarkan route baru ini di `web-api/server.js` (pola sama seperti authRoutes/playerRoutes/inventoryRoutes).
- [x] Di `web-dashboard/src/app/market/page.tsx`: HAPUS `mockShopItems` dan `mockAuctions`, ganti dengan fetch asli ke endpoint di atas (ikuti pola loading/error/empty state seperti di inventory/page.tsx). Tombol "Beli" dan "Tawar (Bid)" harus benar-benar memanggil endpoint, bukan tombol visual kosong.

**Selesai kalau:** halaman /market menampilkan data asli dari database (termasuk kosong kalau memang belum ada data), dan aksi beli/tawar benar-benar mengubah currency & data lelang di database.

## FASE 3 — Sambungkan Asset ke data asli
- [x] Buat endpoint (mis. `GET /api/player/assets`) yang mem-populate `Player.assets` (saat ini sengaja di-exclude di /api/player/profile), tampilkan status (pending/building/active), progress produksi, worker yang ditugaskan. Reuse logic dari services/player/asset/listAsset.js & cekAsset.js.
- [x] Buat halaman baru `web-dashboard/src/app/assets/page.tsx` (ikuti pola visual inventory/page.tsx) yang menampilkan data dari endpoint di atas.
- [x] Ubah link "Manajemen Aset" di `web-dashboard/src/app/page.tsx` dari `href="#"` menjadi `href="/assets"`.

**Selesai kalau:** kartu "Manajemen Aset" di beranda mengarah ke halaman nyata berisi aset milik karakter yang login, bukan dead-link.

## FASE 4 — Perbaiki Tampilan Karakter/Profil
- [x] Di `web-dashboard/src/app/page.tsx`: hapus kartu currency "Copper" yang hardcoded `0` (field ini tidak ada di schema Player — currency asli cuma silver/gold/jade/spirit), tambahkan kartu "Spirit" yang datanya sudah ada (`profile.currency.spirit`) tapi belum ditampilkan.
- [x] Progress bar "Energi Kultivasi" masih hardcoded lebar 45% berlabel "(Dalam Pengembangan)". Kalau ada data exp/level kultivasi yang relevan di model Player, sambungkan ke data asli; kalau fitur ini memang belum dirancang di backend, ganti jadi label yang jujur (mis. "Segera Hadir") daripada progress bar palsu. (Note: Diubah ke ranah & stage)
- [x] Kartu "Balai Sekte" masih `href="#"`. Buat halaman dasar `web-dashboard/src/app/sect/page.tsx` yang menampilkan `profile.sect` & data terkait (cek models/Sect.js), lalu perbaiki link-nya.

**Selesai kalau:** semua angka/label di kartu profil beranda berasal dari data asli sesuai schema Player, dan tidak ada lagi link mati (href="#") di halaman beranda.

## FASE 5 — Polish Item/Inventory (prioritas lebih rendah, sudah paling tersambung)
- [x] Label "Kapasitas: 6 / 50 Slot" di inventory/page.tsx hardcoded — sambungkan ke data slot asli.
- [x] Kolom pencarian & tombol filter di halaman inventory belum berfungsi (tidak ada handler) — tambahkan logic filter/search di sisi client.
- [x] Di web-api/routes/inventory.js, emoji item selalu fallback '📦' — cek apakah model Item punya field emoji/icon, pakai itu kalau ada. (Note: diselesaikan via helper type/category)

**Selesai kalau:** search, filter, dan kapasitas di halaman inventory benar-benar fungsional dan konsisten dengan data asli.

## FASE 6 — QA & Pengerasan (dikerjakan terakhir, dan diulang terus kalau semua fase di atas sudah selesai)
- [x] Ganti `cors({ origin: '*' })` di web-api/server.js jadi whitelist origin dari env var (mis. FRONTEND_URL) sebelum dipakai di production.
- [x] Audit ulang alur end-to-end (login → profil → inventory → asset → market → logout) tiap ada perubahan besar; catat bug baru yang ditemukan sebagai item checklist baru di file ini.
- [x] Jalankan `npm run lint` & `npm run build` di web-dashboard sebelum tiap PR.
- [x] Kalau SEMUA checklist di atas sudah tercentang: ubah STATUS di paling atas file ini jadi "STATUS: ROADMAP UTAMA SELESAI — mode maintenance ringan", dan sesi berikutnya cukup cari bug kecil/dependency usang, JANGAN menambah fitur besar baru tanpa instruksi eksplisit dari pemilik repo.

## PERBAIKAN CHAT GLOBAL & PEMERATAAN FITUR (Sesi Tambahan)
- [x] Perbaikan Socket.io (exclude `/api/socket.io` dari `apiLimiter`), autentikasi socket pakai JWT, simpan chat history di Mongoose (`ChatMessage`), dan UI status "Menyambung".
- [x] Tambah halaman & navigasi Navbar untuk fitur yang sudah ada di Bot: Leaderboard (`/leaderboard`), Tournament Bracket (`/tournament`), dan Meja Barter (`/barter`), beserta integrasi Mongoose-nya ke `/api/...`.
- [x] Hapus referensi command usang `/convert` dari `README.md`.
- [x] Hapus file sampah `backend_output.log` dari tracking repo.

## PERBAIKAN FATAL CRASH & REGRESI (Sesi 24/08)
- [x] Fix web API crash caused by `barter.js` tidak dapat menemukan `lockManager` (capitalization error) dan file `barterService` yang fiktif. Ekstraksi logic ke `services/player/barterService.js` dilakukan dengan sukses.
- [x] Perbaikan error `Guild ID tidak ditemukan` di rute API baru (leaderboard, tournament, barter) dengan menggunakan fallback `req.user.guildId || req.user.userId`.
- [x] Perbaikan Socket Token di `GlobalChat.tsx` untuk bergantung pada store `useAuthStore` dan melakukan re-connect jika token (login state) berubah di client-side.
- [x] Verifikasi modul API di backend dengan mengujinya secara logis (require syntax/module-resolution tanpa memicu error fatal).

## CARA KERJA LINTAS-SESI (wajib diikuti setiap sesi kerja, termasuk sesi terjadwal berikutnya)
1. Baca file ini dari awal.
2. Pilih SATU item checklist yang belum tercentang (☐), urut sesuai fase (jangan loncat ke fase belakangan kalau fase sebelumnya belum selesai, kecuali itemnya independen).
3. Kerjakan HANYA item itu. Test/build dulu sebelum PR.
4. Update file ini: centang item itu (☑) + tambahkan satu baris catatan file apa saja yang berubah.
5. Commit & buka Pull Request dengan judul singkat berbahasa Indonesia.
6. Berhenti setelah satu PR — jangan lanjut ke item berikutnya di sesi/PR yang sama.

### Sesi Perombakan Tampilan, Pemerataan Fitur & Audit Keamanan
- **Keamanan (Bagian 3):** Memperbaiki penggunaan `LockManager` di rute yang memodifikasi state (seperti barter, market, worker) dengan meng-`await` janji dan menjalankan `release()` closure. Memastikan rate limiter transaksi diterapkan ke rute mutasi yang sesuai. Melakukan cleanup file sementara.
- **UI/UX (Bagian 1):** Mengonfigurasi `clsx` & `tailwind-merge` untuk membuat *Shared UI Kit* komponen Wuxia (`Button`, `Card`, `Badge`, `Modal`, `PageHeader`, dll.). Memperbaiki masalah navigasi pada mobile dengan *Drawer menu* dan navigasi desktop dengan grup Dropdown. Semua halaman di `web-dashboard` direfactor memakai UI kit ini dengan tetap mempertahankan tema warna Wuxia yang sudah ada.
- **Pemerataan Fitur Bot ke Web (Bagian 2 & 2.6):** Menambahkan *endpoints* API serta fungsionalitas UI untuk **Daily Claim** (dengan pemeriksaan *cooldown* waktu), **Loot** (menghormati cooldown DB dan limit inventarisasi hewan), **Transfer Currency** (dengan konfirmasi UI dan mutasi atomik), **Crafting** (integrasi *lock* `inventory_craft` dan perbanyak resep dengan jumlah material), serta merombak fitur **Pet** dengan opsi Rename, Heal, Feed, dan tantangan Battle. Halaman beranda diperbarui untuk dapat melihat **Riwayat Transaksi**.
