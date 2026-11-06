# PANDUAN INTEGRASI ZONA INSTANS DAN JIMAT SPASIAL V25

Dokumen otoritatif ini menjelaskan mekanisme teknis sistem area khusus berinstans, jimat mitigasi pertemuan siluman, pembatasan tier cincin pemukiman, dan soket realtime yang diimplementasikan pada pembaruan V25.

---

## 1. Sistem Area Khusus Berinstans (Instanced Zones)

### 1.1. Penemuan & Akses Masuk
- Zona instans terdaftar secara otoritatif di `world-data/zones-v23.json` (55 area instans di seluruh benua Jianghu).
- Endpoint `GET /api/world/nearby` memuat zona-zona yang berada dalam radius Chebyshev $\le 14$ petak dari posisi server pemain.
- Format pengenal: diawali dengan prefiks `inst_` (contoh: `inst_spirit_valley_godthunder_peaks_1`).
- Tombol **[Masuk]** hanya aktif jika:
  1. Jarak Chebyshev pemain ke pusat zona $\le 3$ petak.
  2. Karakter tidak sedang dalam perjalanan (`isTraveling === false`).
  3. Karakter tidak sedang berada dalam pertempuran aktif (`activeBattleId === null`).
  4. Ranah kultivasi karakter memenuhi syarat minimum (`player.realmIndex >= requiredRealmIndex`).

### 1.2. Pengerasan Route & Persistensi Basis Data
- Request body `POST /api/instanced-zones/enter` **hanya menerima parameter `{ zoneId }`**. Parameter `dangerTier` dan `zoneType` dibaca langsung dari berkas otoritatif semesta di server untuk mencegah eksploitasi manipulasi tier/tipe oleh klien.
- Sesi disimpan secara persisten di koleksi MongoDB `InstancedZoneSession` (menggantikan `Map` in-memory lama), tahan terhadap restart server maupun cluster multi-proses.
- Sesi memiliki masa kedaluwarsa 2 jam via TTL index `{ expiresAt: 1 }`.
- Mendukung pemulihan otomatis (*auto-resume*): jika pemain meninggalkan aplikasi dan kembali, sesi aktif disajikan kembali tanpa kehilangan progres.

### 1.3. 4 Tipe Area Khusus & Resolusi Aksi
1. **Lembah Roh (`spirit_valley`)**:
   - Formasi 9 kamar ($3 \times 3$).
   - Fitur jebakan: dapat dijinakkan (`disarm_trap`) atau terpicu (`trigger_trap` / luka mengabaikan DEF).
   - Penjaga roh kamar diselesaikan bertahap (`clear_room`).
2. **Tanah Roh (`land_of_spirits`)**:
   - 5 ruang berturut-turut (Ruang 1–4 Penjaga Hawa Murni, Ruang 5 Altar Intisari Ilahi / Bos).
   - Aksi: `clear_chamber`.
3. **Lingkaran Pertahanan (`defense_circle`)**:
   - Moda bertahan hidup 5 gelombang siluman penyerbu segel kuno.
   - Aksi: `clear_wave`.
4. **Tanah Elemen (`elemental_land`)**:
   - 3 gelombang siluman penghasil kepingan roh elemen murni (*elemental shards*).
   - Kepingan dapat ditempa menjadi Kristal Roh Tingkat Tinggi di Bengkel Pemukiman (*Workshop V20*).

---

## 2. Sistem Jimat Spasial & Mitigasi Ambush

### 2.1. Efek & Durasi Jimat
- **Jimat Pengusir Monster (`repellent_charm`)**: Mengurangi peluang disergap monster di alam liar sebesar 50% selama 30 menit (1800 detik).
- **Jimat Penarik Monster (`attraction_charm`)**: Meningkatkan peluang disergap monster di alam liar sebesar 75% selama 30 menit (1800 detik) untuk keperluan panen material.
- **Sifat Saling Meniadakan (*Mutual Exclusivity*)**: Menggunakan Jimat Pengusir secara otomatis membatalkan Jimat Penarik yang sedang aktif, dan sebaliknya.

### 2.2. Validasi Buffer & Ambush Engine
- Status jimat tersimpan di `player.activeBuffs` dengan schema Mongoose tervalidasi.
- Engine pergerakan `web-api/routes/world.js` memeriksa buff aktif secara waktu nyata dan menghitung risiko sergapan efektif:
  $$\text{Risk}_{\text{efektif}} = \text{Risk}_{\text{dasar}} \times (1 - \text{repellentBonus}) \times (1 + \text{attractionBonus})$$
- Telah diverifikasi melalui simulasi deterministik 20.000 langkah (PRNG Mulberry32 seed 1618) dengan deviasi $< 2\%$ dari target teoritis.

---

## 3. Pembatasan Tier Otoritatif Cincin Pemukiman

Di sekitar 52 anchor pemukiman kanonikal:
1. **Zona Eksklusi ($d \le R$)**: Ambush mutlak 0, `dangerTier = 1`.
2. **Cincin Penyangga ($R < d \le R + 12$)**:
   $$\text{tierEfektif} = \min(\text{tierAlami}, \text{tierPemukiman} + 1)$$
3. **Penyebaran Bertahap ($d > R + 12$)**:
   $$\text{tierEfektif} = \min\left(\text{tierAlami}, \text{tierPemukiman} + 1 + \left\lfloor\frac{d - (R + 12)}{12}\right\rfloor\right)$$
- Telah diverifikasi melalui audit komprehensif pada 17.472 titik uji tanpa satu pun pelanggaran (0 pelanggaran).

---

## 4. Keamanan Soket Realtime & Privasi Spasial

1. **Kuantisasi Koordinat**: Posisi pemain lain yang disiarkan via Socket.io `nearby_delta` dikuantisasi ke blok kelipatan 8 petak (`Math.floor(x / 8) * 8`), mencegah penjejakan koordinat persis (*radar-sniffing*).
2. **Validasi Langganan (*Subscription Guard*)**: Server menolak permintaan langganan chunk (`subscribe_chunks`) yang berjarak $> 2$ chunk dari posisi terverifikasi pemain di server.
3. **Pembersihan Event Usang**: Event `player_position_update` telah dihilangkan secara total; pergerakan kini ditangani melalui sinkronisasi batch `nearbyBroadcaster` 500ms.
