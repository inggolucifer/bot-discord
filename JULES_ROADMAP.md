
### Integrasi Discord ke Web Dashboard
- Menyesuaikan backend (Leaderboard, Tournament, Market, Worker) agar mencari `guildId` berdasarkan `userId` (yang ada di JWT), bukan langsung dari JWT. Hal ini membuat halaman-halaman tersebut memunculkan data pemain Discord.
- Menambahkan tab "Toko Player" di halaman Pasar Web Dashboard, mengkonsumsi endpoint baru `/api/market/player-shop` yang terintegrasi dengan database `PlayerListing`.
- Menambahkan fungsi "Kerja Mandiri" di UI web Aset, agar pemain dapat menugaskan diri sendiri ke asetnya langsung dari web.
- Fixed 500 Internal Server Error when starting independent work by removing invalid local require of calculateProgress from crafting utils.
- Menambahkan fitur  untuk mempermudah pemain melihat dan menyalin kode listing mereka sendiri.
- Menambahkan fitur /market lihat-jualan untuk mempermudah pemain melihat dan menyalin kode listing mereka sendiri.
