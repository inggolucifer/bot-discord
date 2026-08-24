
### Integrasi Discord ke Web Dashboard
- Menyesuaikan backend (Leaderboard, Tournament, Market, Worker) agar mencari `guildId` berdasarkan `userId` (yang ada di JWT), bukan langsung dari JWT. Hal ini membuat halaman-halaman tersebut memunculkan data pemain Discord.
- Menambahkan tab "Toko Player" di halaman Pasar Web Dashboard, mengkonsumsi endpoint baru `/api/market/player-shop` yang terintegrasi dengan database `PlayerListing`.
- Menambahkan fungsi "Kerja Mandiri" di UI web Aset, agar pemain dapat menugaskan diri sendiri ke asetnya langsung dari web.
- Fixed 500 Internal Server Error when starting independent work by removing invalid local require of calculateProgress from crafting utils.
- [x] Fix: Masalah "Terus Menyambungkan..." pada Socket.io di VPS. Mengubah state di `GlobalChat.tsx` agar berhenti me-retry dan menampilkan "Koneksi Gagal" jika terjadi `Authentication error`. Ditambahkan juga panduan lengkap mengenai konfigurasi Nginx dan Env pada `TUTORIAL_VPS_NGINX_SOCKET.md`.
- [x] Fix: Memperbaiki Hydration Error (React #418) pada  dan masalah URL parser (protokol ganda `wss://https/`) di Next.js client Socket.io.
- [x] Fix: Memperbaiki Hydration Error (React #418) pada FallbackImage dan masalah URL parser pada socket.io.
