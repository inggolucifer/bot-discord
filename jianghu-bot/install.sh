#!/bin/bash
echo "=== Memulai instalasi fitur baru Jianghu World Bot ==="

cd /root/jianghu-bot || echo "Folder /root/jianghu-bot tidak ditemukan! Pastikan kamu menjalankan script ini dari lokasi yang benar."

echo "--> Menyiapkan struktur direktori (jika belum ada)..."
mkdir -p commands/admin commands/player events models utils services handlers

echo "--> Install/update dependency npm..."
npm install

echo "--> Menjalankan migrasi totalWealth (backfill data lama untuk leaderboard)..."
node migrate-wealth.js || echo "Migrate wealth gagal, tapi melanjutkan instalasi..."

echo "--> Mendaftarkan ulang slash command ke Discord (ada struktur command baru)..."
node deploy-commands.js

echo "--> Restart bot via PM2..."
pm2 restart jianghu-bot || echo "PM2 tidak ditemukan atau bot belum dijalankan via PM2. Silakan jalankan 'node index.js'."

echo ""
echo "=== SELESAI! Semua fitur baru sudah aktif. Cek log dengan: pm2 logs jianghu-bot ==="
