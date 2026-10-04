# Panduan Hardening Mata Uang, Autentikasi, dan Transaksi (Immortal-X)

Dokumentasi ini menjelaskan standar arsitektur sistem ekonomi multi-tier dan keamanan autentikasi yang berlaku di Jianghu Bot (Immortal-X).

---

## 1. Sistem Mata Uang Tunggal Berbasis Total Copper (5 Tier)

Semua transaksi dan pembayaran di dalam game (Web Dashboard & Discord Bot) disatukan pada **sumber kebenaran tunggal**:
1. Unit dasar perhitungan adalah **Copper Tael** (`copper`).
2. Kurs konversi 5 tingkatan bertingkat:
   - 1 Silver = 100 Copper
   - 1 Gold = 100 Silver = 10.000 Copper
   - 1 Jade = 100 Gold = 1.000.000 Copper
   - 1 Spirit Stone = 100 Jade = 100.000.000 Copper

### Helper Otoritatif (`utils/currencyNormalize.js` & `utils/currency.js`)
- `RATE_TO_COPPER`: Didefinisikan di `currencyNormalize.js` dan di-re-export oleh `currency.js` agar tidak terjadi drift.
- `hasEnoughCurrency(currency, amount, type)`: Menghitung kebutuhan copper dan membandingkannya dengan total copper wallet pemain.
- `payCurrency(currency, amount, type)`: Memotong dari total copper secara aman, lalu memecah kembali sisanya ke dalam 5 pecahan (`spirit`, `jade`, `gold`, `silver`, `copper`).
- `addCopper(currency, copperAmount)` & `addCurrencyAmount(currency, amount, type)`: Menambahkan nilai ke dalam wallet dan menormalisasi otomatis ke 5 pecahan.
- **DILARANG KERAS** memotong atau mengkredit hanya satu field tertentu (misal `currency.silver -= X` atau `{ $inc: { 'currency.silver': Y } }`), karena dapat merusak proporsi saldo multi-tier.

---

## 2. Market & Lelang (Auction)

- **Pembayaran Bid / Buy**: Menggunakan `payCurrency` dan memverifikasi ketersediaan saldo sebelum melakukan mutasi.
- **Refund Outbid Lelang**: Ketika pemain dikalahkan dalam lelang, uang dikembalikan melalui `addCurrencyAmount(prevBidder.currency, auction.highestBid, 'silver')` diikuti `prevBidder.markModified('currency')` dan `save()`.
- **Hasil Penjualan (Seller Proceeds)**: Dikreditkan menggunakan `addCurrencyAmount(seller.currency, totalPrice, currencyType)` dengan normalisasi otomatis.
- **Pencegahan Double-Spend / Race Condition**: Menggunakan `LockManager` mutex berbasis ID lelang/listing (`market_bid_${id}`, `market_playershop_${id}`) serta user lock (`pay_${userId}_bid`, `pay_${userId}_shopbuy`, `pay_${userId}_listingbuy`).

---

## 3. Autentikasi & Rate Limiting

Rate limiting ketat diterapkan pada rute autentikasi sensitif untuk mencegah brute-force dan spam registrasi:
- `POST /api/auth/email-login`: Maksimal 30 percobaan per 15 menit per IP.
- `POST /api/auth/email-register`: Maksimal 30 percobaan per 15 menit dan 10 pembuatan karakter per jam per IP.
- `POST /api/auth/web-login`: Maksimal 30 percobaan per 15 menit dan 10 pembuatan karakter per jam per IP; jika nama karakter sudah terdaftar, server mengembalikan status `403 Forbidden`.
- `POST /api/auth/refresh`: Dibatasi 100 permintaan per 15 menit per IP.

---

## 4. Otorisasi Developer / Admin (`requireAdmin`)

Middleware `requireAdmin` memverifikasi otorisasi secara ketat:
1. Memeriksa apakah `req.user.userId` terdaftar di environment variable `OWNER_IDS` (daftar ID Discord dipisahkan koma).
2. Memeriksa apakah dokumen karakter di database memiliki flag `player.isAdmin === true`.
3. Menolak akses dengan status `403 Forbidden` jika kedua syarat di atas tidak terpenuhi (tidak mengizinkan akses hanya karena memiliki JWT valid).
