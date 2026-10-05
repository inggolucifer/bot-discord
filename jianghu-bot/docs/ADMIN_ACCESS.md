# Panduan Akses Admin & OWNER_IDS (Immortal-X / Jianghu Bot)

Dokumen ini menjelaskan konfigurasi hak akses administratif untuk endpoint backend (`/api/admin/*`) dan command Discord admin.

---

## 1. Mekanisme Verifikasi `requireAdmin`

Backend web-api menggunakan middleware `requireAdmin` yang mengevaluasi hak akses secara deterministik:
1. **User ID Token**: Memastikan request memiliki token JWT valid (`req.user.userId`).
2. **Environment `OWNER_IDS`**: Jika `userId` terdaftar dalam daftar `OWNER_IDS`, akses langsung diberikan (`next()`).
3. **Database Flag `isAdmin`**: Jika `player.isAdmin === true` pada database MongoDB, akses diberikan (`next()`).
4. **Fallback**: Jika kedua syarat di atas tidak terpenuhi, request ditolak dengan status HTTP **403 Forbidden**.

---

## 2. Cara Mengonfigurasi `OWNER_IDS`

1. Buka file `.env` di direktori `jianghu-bot/` (atau konfigurasi environment server production).
2. Tambahkan atau ubah variabel `OWNER_IDS` dengan daftar Discord User ID dipisahkan koma tanpa spasi:
   ```env
   # Contoh format (pisahkan koma)
   OWNER_IDS="123456789012345678,987654321098765432"
   ```
3. Restart proses bot / web API.

> [!CAUTION]
> **JANGAN PERNAH** melakukan commit ID Discord riil atau token rahasia ke repositori Git publik. Gunakan placeholder palsu pada `.env.example`.

---

## 3. Cara Mengatur `isAdmin` di MongoDB untuk Pengguna Tepercaya

Jika ingin memberikan akses administratif kepada user tertentu tanpa mengubah environment variable `OWNER_IDS`:

1. Buka MongoDB Shell (`mongosh`) atau GUI (MongoDB Compass).
2. Hubungkan ke database `jianghu` atau database yang aktif:
   ```javascript
   use jianghu;
   ```
3. Update dokumen pemain berdasarkan `discordId`:
   ```javascript
   db.players.updateOne(
     { discordId: "123456789012345678" },
     { $set: { isAdmin: true } }
   );
   ```
4. Untuk mencabut akses:
   ```javascript
   db.players.updateOne(
     { discordId: "123456789012345678" },
     { $set: { isAdmin: false } }
   );
   ```

---

## 4. Boot Warning Keamanan

Jika server dijalankan dalam mode production (`NODE_ENV=production`) dan `OWNER_IDS` belum dikonfigurasi, sistem akan menampilkan peringatan di konsol:
```
[SECURITY] OWNER_IDS kosong: hanya player.isAdmin=true yang bisa akses /api/admin
```
Sistem tidak akan crash, namun akses admin web-api hanya dapat dicapai melalui akun dengan flag `isAdmin: true` di MongoDB.
