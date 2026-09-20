# Jianghu World RPG System

Jianghu World adalah game RPG Web Xianxia/Wuxia mandiri dengan sistem kultivasi, ekonomi, profesi, item, pet, asset, eksplorasi, dan turnamen.

## Web-First Runtime (Required)
1. MongoDB up
2. `node web-api/server.js`
3. `web-dashboard` (dev or production build)
4. Login via Discord OAuth (identity only)

Discord bot process is NOT required for gameplay.
Slash commands are removed/deprecated.

## Instalasi
1. Pastikan memiliki Node.js v18+ dan MongoDB
2. Jalankan `npm install`
3. Konfigurasi file `.env` dengan `DISCORD_CLIENT_ID` dan `DISCORD_CLIENT_SECRET` untuk OAuth.
4. Jalankan `npm run web` (Untuk API standalone)
5. Jalankan `npm run web:dev` (Untuk Web Dashboard)

## Struktur Direktori Utama
- `commands/` - Mendaftarkan top-level slash commands
  - `admin/` - Command guild-only (`/admin`, `/admin-panel`, `/help-admin`)
  - `player/` - Command global (seperti `/pet`, `/shop`, `/sekte`, dsb.)
- `services/` - Logic atau eksekusi fungsi dari commands. Memisahkan controller dan logic
- `handlers/` - Menangani Interaksi komponen dari Dashboard dan Button Discord (seperti `buttonHandler`, `modalHandler`, dsb.)
- `models/` - Skema Database (Mongoose)

## Daftar Command Lengkap
### Player Commands (Global)
- `/daftar`
- `/profil`
- `/daily`
- `/transfer-currency`
- `/transfer-item`
- `/loot`
- `/help`
- `/pet` (subcommand: list, status, feed, heal, rename, release, battle)
- `/shop` (subcommand: lihat, beli, jual)
- `/market` (subcommand: jual-item, jual-pet, jual-asset, beli, batal)
- `/sekte` (subcommand: info, list, leaderboard, donasi, deposit-resource, bangun-asset, craft, kelola-anggota, kick-anggota)
- `/worker` (subcommand: daftar, batal, pindah, ubah, sewa-sistem, pekerja-saya)
- `/asset` (subcommand: bangun, cek)
- `/item` (subcommand: cek, cari, craft)
- `/tournament` (subcommand: bracket)
- `/restart-karakter`
- `/ubah-umur`

### Admin Commands (Guild only)
- `/admin-panel` (Dashboard interaktif utama)
- `/help-admin`
- `/admin` (Subcommand lengkap):
  - `item` (add, edit, delete, remove)
  - `pet` (add, edit, delete, remove, stats)
  - `asset` (add, edit, delete, remove, set-construction, finish-construction, set-build-requirement, remove-build-requirement, add-recipe, remove-recipe, set-worker, remove-worker)
  - `shop` (add, remove)
  - `player` (edit, give-currency, give-item, give-pet, give-asset, freeze, unfreeze, kill, force-unregister, set-status)
  - `channel` (add, remove, list)
  - `sekte` (create, delete, assign, remove-member, give-asset, give-resource, war)
  - `tournament` (create, start, cancel, list, add-player, remove-player, set-winner)
  - `realm-role-set`, `realm-role-remove`, `realm-role-list`
  - `leaderboard-role`
  - `set-log`, `set-log-retention`, `clear-logs`, `set-role`, `set-worker-channel`