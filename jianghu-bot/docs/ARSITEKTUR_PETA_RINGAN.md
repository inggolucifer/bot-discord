# ARSITEKTUR PETA DUNIA RINGAN & ANTI-LAG (V21)

Dokumen ini mendokumentasikan spesifikasi arsitektur resmi untuk sistem rendering peta dunia dan sinkronisasi spasial ringan multi-pemain pada repositori **Jianghu Bot (Immortal-X)**.

---

## 1. Filosofi & Visi Desain
Peta dunia Jianghu mencakup kanvas spasial berskala $5000 \times 5000$ petak dengan puluhan pemukiman, sekte, dan ratusan pemain online bersamaan. Sistem V21 memprioritaskan performa rendering 60 FPS pada mesin pengguna berspesifikasi rendah tanpa mengorbankan estetika tinta Tiongkok (*Dark Ink Shan Shui*) dan keputusan arsitektur V20 (*Satu Pemukiman = SATU Bangunan Besar*).

Prinsip Utama:
1. **Bake Once, Draw Millions**: Hindari prosedur penggambaran tekstur tanah berulang (blur, filtering, pixel readback) di jalur panas render klien.
2. **Dual-Canvas Dirty Separation**: Pisahkan elemen statis (tanah/grid) dari elemen dinamis (karakter, monster, partikel) agar CPU/GPU idle saat pemain diam.
3. **Text-First Scalability ('Sekitar Anda')**: Berikan visibilitas instan terhadap entitas terdekat melalui daftar teks terindeks sebelum pemain mendekati dan merender detail visual penuh.
4. **Graph Node Travel (0 Chunk Fetch)**: Perjalanan jarak jauh antar-wilayah diperlakukan sebagai pergerakan simpul graf (Dijkstra) tanpa membebani jaringan dengan unduhan chunk tanah yang terlewati.

---

## 2. Struktur Modul Peta Frontend (`web-dashboard/src/components/map/`)

Modul lama monolithic `WorldCanvas.tsx` (2572 baris) telah dipecah menjadi modul-modul fungsional independen dengan batas maksimal $\le 700$ baris:

```
web-dashboard/src/components/map/
├── WorldCanvas.tsx              # Orkestrator utama, inisialisasi dual-canvas ref, loop rAF (< 600 baris)
├── StaticLayerRenderer.ts       # Render tanah pre-baked, Shan Shui wash, grid garis, build zone overlay (< 450 baris)
├── DynamicLayerRenderer.ts      # Frustum culling, Y-sorting entitas, marker pemukiman, monster, NPC (< 610 baris)
├── WeatherParticleOverlay.ts    # Hujan tinta, salju, kabut spiritual, pencahayaan malam (< 260 baris)
├── InteractionOverlay.ts        # Bingkai seleksi emas, xuan paper tooltip, awan batas dunia (< 190 baris)
└── useCanvasGestures.ts         # Hook penanganan gestur pan, zoom, pinch-to-zoom, inersia (< 250 baris)
```

---

## 3. Pipeline Tanah Pre-Baked (`public/baked/`)

### 3.1. Spesifikasi Aset Baked WebP
Tanah di-bake menggunakan skrip Node.js berorientasi deterministik `scripts/v21/bakeGround.js`:
- `z0` (Full Detail / Zoom Normal): Resolusi $1728 \times 1728$ piksel (54px per sel mikro $32 \times 32$).
- `z1` (Half Detail / Zoom Sedang): Resolusi $864 \times 864$ piksel (27px per sel).
- `z2` (Quarter Detail / Zoom Makro): Resolusi $432 \times 432$ piksel (13.5px per sel).
- **Format**: WebP dengan kompresi lossless/near-lossless berkualitas tinggi.
- **Manifest**: `public/baked/manifest.json` mencatat SHA-256 seluruh berkas biner.

### 3.2. LRU In-Memory Cache Klien
Fungsi `getBakedChunk(cx, cy, tier)` pada `groundRenderer.ts` mengunduh WebP secara asinkron via `createImageBitmap()` dan menyimpannya dalam LRU cache (kapasitas 64 chunk). Saat kapasitas terpenuhi, chunk terjauh dari kamera dilepas secara otomatis.

---

## 4. Dual-Canvas & Dirty Rendering Loop

`WorldCanvas.tsx` mengelola dua elemen kanvas HTML5 bertumpuk:
1. **Static Ground Canvas (`staticCanvasRef`)**:
   - Hanya digambar ulang bila `isCameraDirty(camera, lastCamera)` bernilai `true` (saat kamera digeser atau di-zoom).
   - Saat kamera diam di dalam kota atau saat meditasi, pemanggilan render tanah turun menjadi **0 frame per detik**.
2. **Dynamic Entity Canvas (`dynamicCanvasRef`)**:
   - Dikosongkan via `ctx.clearRect()` dan digambar ulang setiap frame `requestAnimationFrame` untuk menjamin kehalusan animasi langkah kaki, aura monster, dan partikel cuaca pada 60 FPS.

---

## 5. Sistem 'Sekitar Anda' (Nearby Spatial Broadcaster)

### 5.1. Database Model & Indeks Majemuk
Model `PlayerBuilding.js` menggunakan indeks majemuk:
```javascript
playerBuildingSchema.index({ chunkX: 1, chunkY: 1 });
playerBuildingSchema.index({ ownerId: 1 });
playerBuildingSchema.index({ locationKey: 1, visibility: 1 });
```
Rencana eksekusi terverifikasi menggunakan **IXSCAN** b-tree, mencegah terjadinya table scan penuh (**COLLSCAN**).

### 5.2. REST Endpoint `GET /api/world/nearby`
- Parameter: `cx`, `cy`, `tileX`, `tileY`, `r` (radius $1 \le r \le 2$ chunk).
- Arah 8 mata angin dihitung via fungsi arc-tangen geometris (`nearbyEngine.js`).
- Jarak diklasifikasikan secara kualitatif:
  - $\le 5$ tile: `dekat`
  - $6 \dots 15$ tile: `sedang`
  - $> 15$ tile: `jauh`
- Membatasi keluaran maksimal 30 entri terdekat dengan penghitung overflow `"dan N lainnya"`.
- Rate limiting 1 permintaan per 2 detik dengan validasi header `ETag` (HTTP 304 Not Modified).

### 5.3. Socket.io Batch Broadcaster
- Layanan `nearbyBroadcaster.js` mengumpulkan mutasi posisi pemain per room `chunk:{cx}:{cy}`.
- Broadcast delta dijalankan terpusat setiap **500 ms (2x/detik)**.
- Dilarang keras melakukan broadcast global (`io.emit`) per langkah individu.
- Teruji melayani 500 klien dummy bergerak secara bersamaan dengan latensi p95 hanya **1.386 ms** dan ukuran paket maksimal **2.30 KB** (< 8 KB).

---

## 6. Perjalanan Simpul Graf (Dijkstra Node Travel)

Perjalanan jarak jauh antar-pemukiman tidak lagi memuat petak per petak:
1. `travelGraph.js` memetakan 52 anchor pemukiman ke dalam adjacency list `distancesLi` dan menghitung rute tercepat via algoritma **Dijkstra**.
2. Durasi tempuh dihitung deterministik berdasarkan jarak Li dan diskon ranah/mount:
   $$\text{Durasi (ms)} = \frac{\text{Total Li}}{\text{Kecepatan (Li/jam)}} \times 3600 \times 1000$$
3. Event perjalanan (perampok, anomali spiritual, pedagang keliling) ditentukan secara deterministik melalui *seed hash*:
   $$\text{Seed} = \text{hashFNV1a}(\text{playerId} : \text{edgeKey} : \text{startedAt})$$
   Memastikan hasil identik saat pemain mengalami putus koneksi atau memuat ulang halaman.
4. **Pencegahan Beban Jaringan**: Saat status `player.travel.active === true`, pemanggilan chunk dinonaktifkan (`chunkManager.setTravelActive(true)`), menjamin **tepat 0 permintaan jaringan ke `/baked/*`**.

---

## 7. Mekanisme Fallback Darurat

Apabila terjadi kendala pada lingkungan tertentu, sistem dapat dikembalikan ke renderer dinamis lama secara instan menggunakan environment variable:
```env
NEXT_PUBLIC_LIGHT_WORLD=0
```
Flag ini mengaktifkan kembali jalur render procedural `groundRenderer.ts` tanpa merusak integritas data dunia pemain.
