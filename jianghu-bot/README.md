# 🏯 Jianghu World Discord Bot

Bot Discord untuk server roleplay Xianxia/Wuxia, terinspirasi sistem [jianghu-world](https://github.com/inggo-alvn/jianghu-world). Dibuat khusus supaya **admin non-programmer** bisa mengelola semuanya lewat form (modal), tombol, dan slash command — tanpa perlu menyentuh kode sama sekali setelah bot berjalan.

---

## 1. Rekomendasi Stack & Alasannya

| Komponen | Pilihan | Kenapa |
|---|---|---|
| Bahasa & Runtime | **Node.js + discord.js v14** | Library Discord bot paling matang, dokumentasi lengkap, komunitas besar. Bukan yang "paling no-code" (seperti BotGhost), tapi paling **fleksibel** untuk sistem currency/inventory kompleks seperti Jianghu World — BotGhost/Discord Bot Maker akan sangat terbatas begitu butuh logika seperti barter dengan validasi, atau relasi antar player. |
| Database | **MongoDB (Mongoose)** | Dipilih dibanding PostgreSQL karena: (1) skema fleksibel — cocok untuk item/pet yang field-nya bisa beda-beda; (2) tidak perlu menulis migration SQL manual, cukup edit file model; (3) setup MongoDB Atlas (cloud, gratis) jauh lebih mudah untuk pemula dibanding setup PostgreSQL sendiri. |
| Proses Manager (VPS) | **PM2** | Bikin bot auto-restart kalau crash, auto-start saat VPS reboot, dan gampang lihat log (`pm2 logs`). Ini industry-standard untuk hosting bot Node.js. |
| Interaksi Admin | **Slash Command + Modal + Button** | Ini fitur bawaan Discord (bukan bot pihak ketiga), jadi 100% gratis, cepat, dan tidak butuh maintenance tambahan. Admin tinggal isi form, tidak perlu hafal syntax command panjang. |

**Kenapa BUKAN BotGhost / Discord Bot Maker?**
Tools "no-code" itu bagus untuk bot sederhana (auto-role, welcome message), tapi sistem RP seperti ini butuh:
- Validasi anti-cheat (cek ulang saldo sebelum eksekusi transfer/barter)
- Relasi data kompleks (player ↔ item ↔ pet ↔ asset ↔ shop ↔ loot pool)
- Logika custom (konversi currency berjenjang, reset harian per-timezone)

Semua ini SANGAT terbatas atau tidak mungkin di tools no-code, dan kamu akan cepat mentok. Solusi di project ini sudah 100% jadi kode siap pakai — kamu **tidak perlu menulis kode apapun**, cukup ikuti tutorial deploy di bagian 5.

---

## 2. Struktur Database (MongoDB Collections)

Semua collection otomatis dibuat oleh Mongoose saat bot pertama kali jalan — **kamu tidak perlu membuat tabel manual**.

### `players`
Data karakter, terikat permanen ke `discordId` + `guildId` (unique index, sehingga 1 akun Discord = 1 karakter per server).
```
discordId, guildId, characterName, realm, stage, age, sect, characterImage,
currency: { silver, gold, jade, spirit },
inventory: [{ itemId, quantity }],
pets: [{ petId, nickname, quantity }],
assets: [{ assetId, quantity, lastClaimAt }],
status: active | frozen | dead,
lastDailyClaim, registeredAt
```

### `items`
```
guildId, name, rank (Common/Uncommon/Rare/Epic/Legendary/Mythical), tier (1-9),
description, imageUrl, effect, origin, basePrice, priceCurrency, createdBy
```
`basePrice` + `priceCurrency` adalah harga dasar — dipakai sebagai referensi shop dan basis fitur `/jual` (20% dari harga ini).

### `pets`
Struktur sama seperti `items`.

### `assets`
```
guildId, name, description, imageUrl, dailyProfit, profitCurrency,
basePrice, priceCurrency, rank (opsional), createdBy
```

### `shops`
```
guildId, category (item/pet/asset), refId, refModel, price, priceCurrency,
stock (-1 = unlimited), isActive, addedBy
```

### `transactionlogs`
Log **setiap** pergerakan currency/item — dipakai untuk audit anti-cheat.
```
guildId, type, fromUserId, toUserId, currency, amount,
itemDescription, balanceAfter (snapshot saldo!), note, createdAt
```

### `adminlogs`
Log setiap aksi admin (siapa, ngapain, kapan, ke siapa).
```
guildId, adminId, action, targetUserId, details, createdAt
```

### `barters`
```
guildId, fromUserId, toUserId, offerItems, offerCurrency,
requestItems, requestCurrency, status (pending/accepted/declined/expired),
expiresAt, messageId
```

### `lootpools`
Harta karakter yang mati, ditujukan ke 1 player tertentu.
```
guildId, deceasedUserId, deceasedCharacterName, targetUserId,
currency, inventory, pets, claimed, claimedAt
```

### `guildconfigs`
Konfigurasi per-server (support multi-server).
```
guildId, logChannelId, adminLogChannelId, adminRoleIds
```

---

## 3. Daftar Command Lengkap

**Player Commands:**
- `/daftar`
- `/profil [@user]`
- `/daily`
- `/convert [dari] [ke] [jumlah]`
- `/transfer [@user] [jenis] [jumlah]`
- `/barter [@user] ...`
- `/shop [kategori]`
- `/beli [kategori] [nama] [jumlah]`
- `/jual [kategori] [nama] [jumlah]`
- `/cek item|pet|asset [nama]`
- `/claim profit|loot`
- `/inventory`
- `/craft`
- `/cari-item`
- `/leaderboard`
- `/restart-karakter`
- `/ubah-umur`

**Player Subcommands:**
- `/worker daftar|batal|ubah|pindah|sewa-sistem|pekerja-saya`
- `/asset bangun|claim-profit`
- `/listing jual-item|jual-pet|jual-asset|beli|batal`
- `/sekte list|info|donasi|deposit-resource|craft|bangun-asset|claim-profit|kelola-anggota|kick|leaderboard`
- `/tournament bracket`
- `/help`

**Admin Commands:**
- `/admin-panel`
- `/admin-item add|edit|delete`
- `/admin-pet add|edit|delete`
- `/admin-asset add|edit|delete|set-construction|finish-construction|set-build-requirement|remove-build-requirement|add-recipe|remove-recipe|set-worker|remove-worker`
- `/admin-give currency|item|pet|asset`
- `/admin-player edit|freeze|unfreeze|kill|unregister|set-status|remove-item|remove-pet|remove-asset`
- `/admin-shop add|remove`
- `/admin-channel add|remove|list`
- `/admin-log set|set-retention|clear`
- `/admin-role set`
- `/admin-realm-role set|remove|list`
- `/adminLeaderboardRole`
- `/admin-sekte create|delete|assign|remove-member|give-resource|give-asset|war`
- `/admin-tournament create|start|cancel|list|add-player|remove-player|set-winner`
- `/admin-worker-channel set`
- `/help-admin`


## 4. Contoh Kode Fitur Kunci

Semua kode sudah lengkap di project ini. Beberapa contoh untuk pemahaman:

- **Registrasi + auto-nickname**: `commands/player/daftar.js` — memanggil `interaction.member.setNickname(nama)`.
- **Claim daily akurat WIB**: `utils/timezone.js` fungsi `isClaimedToday()` membandingkan tanggal kalender di zona `Asia/Jakarta`, bukan cuma selisih 24 jam — supaya reset selalu tepat jam 00:00 WIB.
- **Transfer aman**: `commands/player/transferCurrency.js` — memakai Button Accept/Decline dengan `createMessageComponentCollector`, lalu **re-fetch data dari database** sebelum eksekusi (mencegah double-spend kalau ada 2 transaksi bersamaan).
- **Admin modal**: `commands/admin/adminAddItem.js` menampilkan `ModalBuilder`, hasil isian diproses di `events/interactionCreate.js` bagian `modal_add_item`.
- **Anti-cheat logging**: `utils/logger.js` — setiap transaksi disimpan ke DB (`TransactionLog`) **dengan snapshot saldo setelah transaksi**, jadi kalau ada kecurigaan cheat, admin bisa telusuri riwayat lengkap.

---

## 5. Tutorial Deploy ke VPS (Ubuntu) — Langkah demi Langkah

Asumsi: kamu punya VPS Ubuntu 22.04 (bisa dari provider mana saja) dan akses SSH.

### Step 1 — Login ke VPS
```bash
ssh root@ip_vps_kamu
```

### Step 2 — Update sistem & install Node.js 20
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # pastikan muncul versi v20.x.x
```

### Step 3 — Install MongoDB
**Opsi A (paling mudah untuk pemula): MongoDB Atlas (cloud gratis)**
1. Daftar di https://www.mongodb.com/cloud/atlas/register
2. Buat cluster gratis (M0)
3. Buat database user (Database Access) + izinkan akses dari IP VPS kamu (Network Access → Add IP, atau `0.0.0.0/0` untuk semua IP)
4. Copy connection string, contoh: `mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/jianghu`
5. Tempel ini ke `MONGODB_URI` di `.env`

**Opsi B: Install MongoDB sendiri di VPS**
```bash
curl -fsSL https://pgp.mongodb.com/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```
Lalu di `.env`: `MONGODB_URI=mongodb://127.0.0.1:27017/jianghu`

### Step 4 — Upload project ke VPS
Dari komputer kamu (bukan di VPS), kompres folder project ini lalu upload:
```bash
scp jianghu-bot.zip root@ip_vps_kamu:/root/
```
Lalu di VPS:
```bash
cd /root
apt install -y unzip
unzip jianghu-bot.zip
cd jianghu-bot
```

### Step 5 — Install dependency project
```bash
npm install
```

### Step 6 — Buat Bot Discord & Ambil Token
1. Buka https://discord.com/developers/applications → **New Application**
2. Ke tab **Bot** → klik **Reset Token** → copy token (JANGAN dibagikan ke siapapun)
3. Di tab **Bot**, aktifkan (scroll ke "Privileged Gateway Intents"):
   - ✅ **Server Members Intent** (wajib, untuk ubah nickname & cek role)
   - ✅ **Message Content Intent** (opsional, jaga-jaga untuk fitur masa depan)
4. Ke tab **OAuth2 → URL Generator**:
   - Scopes: centang `bot` dan `applications.commands`
   - Bot Permissions: centang `Manage Nicknames`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Use Slash Commands`
5. Copy URL yang dihasilkan di bawah, buka di browser, pilih server kamu, klik **Authorize**
6. Di tab **General Information**, copy **Application ID** (ini `CLIENT_ID`)

### Step 7 — Konfigurasi `.env`
```bash
cp .env.example .env
nano .env
```
Isi `DISCORD_TOKEN`, `CLIENT_ID`, `MONGODB_URI`, `OWNER_IDS` (Discord User ID kamu — aktifkan Developer Mode di Discord settings untuk copy ID). Simpan dengan `Ctrl+O`, Enter, `Ctrl+X`.

### Step 8 — Daftarkan Slash Command ke Discord
```bash
node deploy-commands.js
```
Kalau muncul `[DEPLOY] Sukses!`, command siap dipakai.

### Step 9 — Jalankan Bot dengan PM2 (supaya tetap online 24/7)
```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup     # ikuti instruksi yang muncul (copy-paste command yang diberikan)
```

Cek status & log:
```bash
pm2 status
pm2 logs jianghu-bot
```

Kalau nanti ubah kode/config, restart dengan:
```bash
pm2 restart jianghu-bot
```

Selesai! Bot sudah online 24/7 di server Discord kamu. 🎉

---

## 6. Cara Mudah Tambah Item/Pet/Asset Baru (Tanpa Coding Berulang)

Kamu **TIDAK PERLU** menyentuh kode sama sekali untuk menambah konten baru. Semua dilakukan lewat Discord:

1. Ketik `/admin-add-item` (atau buka `/admin-panel` → klik tombol "Tambah Item")
2. Form muncul di Discord → isi Nama, Rank, Tier, Deskripsi, URL Gambar
3. Submit → item langsung tersimpan ke database dan bisa dicek player dengan `/cek-item`

Sama persis untuk pet (`/admin-add-pet`) dan aset (`/admin-add-asset`). Untuk edit, gunakan `/admin-edit-item [nama]` dll — form akan otomatis terisi data lama, tinggal ubah yang perlu.

**Tentang gambar**: paling praktis, upload gambar ke channel Discord mana saja (misalnya channel privat khusus admin), klik kanan gambar → **Copy Link**, lalu tempel link itu ke kolom "URL Gambar" di form. Discord CDN linknya permanen selama file/pesan tidak dihapus manual.

**Untuk menjual di shop**: setelah item/pet/asset dibuat, jalankan `/admin-shop-add [kategori] [nama] [harga] [currency] [stok]`.

---

## 7. Saran Anti-Cheat Tambahan

Yang sudah diimplementasikan di kode ini:
- **Re-validasi saat eksekusi**: transfer & barter mengambil ulang data terbaru dari database tepat sebelum eksekusi (bukan pakai data lama saat command pertama dipanggil) — mencegah exploit "klik cepat berkali-kali" atau race condition.
- **Snapshot saldo di setiap log transaksi** (`balanceAfter`) — kalau ada laporan kecurigaan, admin bisa lihat persis riwayat saldo naik-turunnya.
- **Status `frozen`** memblokir semua transaksi (daily, transfer, barter, beli, claim-profit) untuk karakter yang dicurigai curang, sambil admin investigasi.
- **Unique index** `discordId + guildId` di database mencegah 1 akun Discord punya lebih dari 1 karakter (exploit farming).

Saran tambahan yang bisa kamu terapkan secara manual/operasional:
1. **Review log berkala**: cek channel log admin & transaksi setiap beberapa hari, terutama transfer dengan jumlah besar atau mendadak sering.
2. **Batasi siapa yang punya role Admin Bot** — makin sedikit orang yang bisa `/admin-give-currency`, makin kecil risiko abuse.
3. **Backup database rutin** (`mongodump`) minimal mingguan, supaya kalau ada masalah bisa rollback.
4. **Rate limit sosial**: karena ini bot RP, cheat besar biasanya dari admin/mod yang disalahgunakan, bukan dari player biasa (karena semua transaksi player sudah divalidasi ketat). Jadi kontrol akses admin adalah prioritas anti-cheat nomor satu.
5. Kalau ke depan mau lebih ketat, bisa ditambah fitur "approval 2 admin" untuk pemberian currency dalam jumlah besar — tinggal bilang saja kalau kamu mau saya tambahkan.

---

## 8. Struktur Folder Project

```
jianghu-bot/
├── .env.example          # Contoh konfigurasi environment
├── .gitignore
├── ecosystem.config.js   # Konfigurasi PM2
├── package.json
├── index.js              # Entry point bot
├── deploy-commands.js    # Script daftar slash command
├── config/
│   └── database.js       # Koneksi MongoDB
├── models/                # Skema database (Mongoose)
│   ├── Player.js
│   ├── Item.js
│   ├── Pet.js
│   ├── Asset.js
│   ├── Shop.js
│   ├── TransactionLog.js
│   ├── AdminLog.js
│   ├── Barter.js
│   ├── LootPool.js
│   └── GuildConfig.js
├── commands/
│   ├── player/            # 14 command player
│   └── admin/              # 21 command admin
├── events/
│   ├── ready.js
│   └── interactionCreate.js  # Pusat semua modal/button/select
└── utils/
    ├── currency.js
    ├── timezone.js
    ├── embeds.js
    ├── logger.js
    └── permissions.js
```

---

## 9. Update Besar: Whitelist Channel, Rank Bahasa Inggris, Efek Dramatis, Harga & Jual-Balik

### 9.1 Whitelist Channel
Bot sekarang bisa dibatasi hanya aktif di channel tertentu.
- `/admin-channel-add [channel]` — izinkan bot di channel ini (default: channel saat command dijalankan)
- `/admin-channel-remove [channel]` — cabut izin
- `/admin-channel-list` — lihat semua channel yang diizinkan

**Cara kerja**: kalau daftar masih kosong, bot aktif di SEMUA channel (default). Begitu kamu tambahkan minimal 1 channel, bot HANYA merespon command player di channel-channel itu. **Admin tetap bisa pakai semua command di channel manapun** (supaya tetap bisa mengelola dari channel admin-only sekalipun).

### 9.2 Rank Berganti ke Bahasa Inggris
Rank item/pet/asset sekarang: **Common → Uncommon → Rare → Epic → Legendary → Mythical** (dari terlemah ke terkuat), menggantikan nama Cina sebelumnya. Kalau bot kamu sudah pernah dipakai (ada data lama), **wajib jalankan migrasi** (lihat bagian 10) supaya data lama tidak rusak.

### 9.3 Efek Dramatis & Warna Sesuai Rank/Ranah
- Semua embed item/pet/asset sekarang otomatis berwarna dan bertambah "megah" sesuai rank: Common polos abu-abu, sampai Mythical merah menyala dengan judul dihias simbol ⚡🌌 dan deskripsi dramatis.
- Profil karakter (`/profil`) sekarang juga berwarna & bertambah dramatis sesuai **Tier Kekuatan Ranah** (1-10) yang di-set admin lewat `/admin-edit-player` — makin tinggi tier, makin epik badge dan kalimat flourish-nya (mis. tier 9-10 dapat badge ⚡🌌 dan teks "KEKUATAN DEWA").

### 9.4 Harga Saat Pembuatan Item/Pet/Asset
Form `/admin-add-item`, `/admin-add-pet`, `/admin-add-asset` (dan versi edit-nya) sekarang punya kolom harga langsung saat pembuatan — tidak perlu langkah terpisah lagi. Karena Discord modal maksimal 5 kolom, beberapa field digabung dalam satu baris:
- **Rank & Tier**: isi contoh `Epic 5`
- **Harga Dasar & Currency**: isi contoh `500 silver`
- Untuk aset ada tambahan **Profit Harian & Currency**: contoh `50 silver`, dan kolom harga bisa diisi rank opsional: `500 silver Epic`

Harga ini otomatis dipakai baik untuk `/admin-shop-add` (kalau kamu mau jual manual dengan harga beda) maupun sebagai basis fitur jual-balik ke sistem di bawah.

### 9.5 Fitur Jual ke Sistem (20%)
Player sekarang bisa menjual item/pet/aset yang mereka punya langsung ke sistem dengan `/jual [kategori] [nama] [jumlah]`, dapat **20% dari harga dasar** yang di-set admin. Kalau item/pet/aset belum punya harga dasar (masih 0), tidak bisa dijual — admin perlu set dulu lewat `/admin-edit-item` dkk.

### 9.6 Command Delete yang Sebelumnya Kurang
Ditambahkan `/admin-delete-pet [nama]` dan `/admin-delete-asset [nama]` (sebelumnya cuma ada delete-item), lengkap dengan konfirmasi tombol seperti delete-item.

---

## 10. Cara Update Bot yang Sudah Berjalan di VPS

Karena bot kamu **sudah online dan berfungsi**, ikuti langkah ini supaya update tidak mengganggu data yang sudah ada:

### Step 1 — Backup database dulu (WAJIB, buat jaga-jaga)
```bash
mongodump --uri="isi_MONGODB_URI_kamu" --out=/root/backup-$(date +%Y%m%d)
```

### Step 2 — Upload file yang berubah ke VPS
Dari komputer kamu, upload ulang seluruh folder project (paling gampang: zip seluruh folder project terbaru ini, lalu upload timpa yang lama):
```bash
scp jianghu-bot-updated.zip root@ip_vps_kamu:/root/
```
Di VPS:
```bash
cd /root
pm2 stop jianghu-bot          # matikan dulu botnya sementara
unzip -o jianghu-bot-updated.zip -d jianghu-bot   # -o = timpa file lama
cd jianghu-bot
```
**Catatan**: pastikan file `.env` kamu yang lama TIDAK ikut tertimpa/terhapus (file `.env` tidak ada di dalam zip project ini, jadi aman — tapi cek ulang untuk memastikan).

### Step 3 — Install ulang dependency (kalau ada yang baru)
```bash
npm install
```

### Step 4 — Jalankan migrasi rank (WAJIB kalau bot sudah pernah dipakai sebelumnya)
```bash
node migrate-ranks.js
```
Ini akan mengubah semua rank lama (Fan-Grade, dst) di database jadi rank baru (Common, dst) secara otomatis. Aman dijalankan, tidak menghapus data apapun.

### Step 5 — Daftarkan ulang slash command (karena ada command baru)
```bash
node deploy-commands.js
```

### Step 6 — Nyalakan lagi botnya
```bash
pm2 restart jianghu-bot
pm2 logs jianghu-bot   # cek tidak ada error saat startup
```

### Step 7 — Setup awal fitur baru (opsional tapi disarankan)
1. Di Discord, tentukan channel mana saja yang boleh dipakai RP/ekonomi bot, lalu jalankan `/admin-channel-add` di masing-masing channel itu.
2. Untuk item/pet/asset lama yang mau bisa dijual player (`/jual`), buka `/admin-edit-item [nama]` (atau pet/asset) lalu isi kolom harga dasarnya (defaultnya 0 = belum bisa dijual).
3. Untuk karakter player yang sudah ada, kalau mau tampilan profilnya makin dramatis sesuai kekuatan, jalankan `/admin-edit-player @user` dan isi tier kekuatan (1-10) di kolom "Ranah & Tier Kekuatan".

Selesai — bot sudah update tanpa kehilangan data lama. 🎉

---

## 11. FAQ Singkat

**Q: Bot tida bisa ubah nickname player?**
A: Pastikan role bot **di atas** role player di urutan role server (Server Settings → Roles), dan bot punya permission `Manage Nicknames`. Bot tidak bisa ubah nickname Server Owner (batasan Discord).

**Q: Command tidak muncul di Discord?**
A: Jalankan ulang `node deploy-commands.js`. Kalau pakai mode global (tanpa `GUILD_ID`), tunggu sampai ~1 jam untuk sync.

**Q: Mau pakai bot ini di server lain juga?**
A: Bot sudah didesain multi-server dari awal (semua data dipisah per `guildId`). Cukup invite bot dengan link OAuth2 yang sama ke server baru — data antar server otomatis terpisah.

**Q: Bagaimana kalau saya ingin fitur tambahan (misalnya sistem battle, quest, dsb)?**
A: Struktur project ini modular — tinggal minta bantuan lagi untuk menambahkan file command baru mengikuti pola yang sudah ada.
