# Panduan Mengatasi Chat "Menyambungkan..." di VPS (Socket.io)

Jika Anda melihat chat terus-menerus menampilkan pesan "Menyambungkan..." (atau sekarang menjadi "Koneksi Gagal") saat mendeploy aplikasi ini di VPS, kemungkinan besar masalahnya terletak pada **Reverse Proxy Nginx** atau **Konfigurasi Environment URL**.

Socket.io (yang digunakan untuk Chat Global) menggunakan teknologi **WebSocket**. Secara *default*, web server seperti Nginx akan memblokir atau tidak meneruskan koneksi WebSocket dengan benar kecuali dikonfigurasi secara eksplisit.

Berikut adalah langkah-langkah untuk menyelesaikannya.

---

## 1. Konfigurasi Environment Variables (`.env`)

Pastikan URL untuk frontend dan backend sudah disetel menggunakan domain Anda, BUKAN `localhost`.

**A. Di Backend (`jianghu-bot/.env`)**
Pastikan Anda memiliki konfigurasi origin frontend agar CORS tidak memblokir koneksi. Tambahkan baris ini (sesuaikan dengan domain Anda):
```env
FRONTEND_URL="https://immortal-x.online"
```
*(Catatan: pastikan tidak ada garis miring `/` di akhir URL)*

**B. Di Frontend (`jianghu-bot/web-dashboard/.env.local`)**
Pastikan `NEXT_PUBLIC_API_URL` mengarah ke domain Anda (biasanya disertai `/api`):
```env
NEXT_PUBLIC_API_URL="https://api.immortal-x.online/api"
```
*(Catatan: pastikan domain API tersebut valid. Jika API Anda berada di subdomain yang berbeda, gunakan itu. Jika berada di domain yang sama, gunakan domain tersebut).*

---

## 2. Konfigurasi Nginx untuk Mendukung WebSocket

Masalah yang paling sering terjadi adalah Nginx tidak meneruskan *Upgrade headers* yang dibutuhkan oleh WebSocket.

Buka konfigurasi Nginx Anda untuk domain API backend (atau domain utama jika API dan frontend digabung). Biasanya berada di `/etc/nginx/sites-available/immortal-x.online` (atau nama domain Anda).

### Contoh Blok Konfigurasi Nginx untuk API & Socket.io

Pastikan pada blok `location` yang meneruskan trafik ke backend (Node.js port 3001), Anda menambahkan header `Upgrade` dan `Connection`.

```nginx
server {
    listen 80;
    server_name api.immortal-x.online; # Sesuaikan dengan domain API Anda

    location / {
        proxy_pass http://127.0.0.1:3001; # Port backend Express & Socket.io Anda
        proxy_http_version 1.1;

        # 3 BARIS INI WAJIB UNTUK SOCKET.IO / WEBSOCKET
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Header standar proxy
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

*Catatan: Jika Anda menggunakan blok khusus `location /api/socket.io/`, pastikan header di atas juga diletakkan di sana.*

---

## 3. Terapkan Perubahan

Setelah memperbarui `.env` dan konfigurasi Nginx, lakukan langkah berikut:

1. **Restart Nginx**
   ```bash
   sudo nginx -t     # Tes apakah konfigurasi Nginx valid
   sudo systemctl restart nginx
   ```

2. **Restart Backend (PM2 / Node.js)**
   Jika menggunakan PM2:
   ```bash
   pm2 restart jianghu-backend
   ```
   *(Sesuaikan nama proses PM2 Anda)*

3. **Rebuild dan Restart Frontend (Next.js)**
   Karena Next.js "membakar" (bake in) nilai `NEXT_PUBLIC_API_URL` saat proses build, Anda **wajib** melakukan build ulang jika nilai di `.env.local` berubah.
   ```bash
   cd jianghu-bot/web-dashboard
   npm run build
   pm2 restart jianghu-frontend
   ```
   *(Sesuaikan nama proses PM2 frontend Anda)*

---

## 4. Cara Mengetes

Setelah semuanya direstart:
1. Buka browser dan hapus *cache* (atau gunakan mode Incognito / Private Window).
2. Login ke web dashboard.
3. Buka fitur Chat.
4. Anda akan melihat indikator warna hijau bertuliskan **Terhubung**, dan chat dapat digunakan.

Jika Anda membuka DevTools browser (F12) -> Tab `Network` -> filter `WS` (WebSocket), Anda akan melihat koneksi sukses dengan status `101 Switching Protocols`.
