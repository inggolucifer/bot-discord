# Jianghu World Discord Bot

Jianghu World adalah bot Discord untuk permainan Roleplay Xianxia/Wuxia dengan sistem ekonomi, item, pet, asset, dan turnamen.

## Instalasi
1. Pastikan memiliki Node.js v16+
2. Jalankan `npm install`
3. Konfigurasi `DISCORD_TOKEN` dan `CLIENT_ID` di file `.env`
4. Jalankan `node deploy-commands.js`
5. Jalankan `node index.js` atau gunakan `pm2 start index.js --name jianghu-bot`

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
- `/barter-offer`
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
