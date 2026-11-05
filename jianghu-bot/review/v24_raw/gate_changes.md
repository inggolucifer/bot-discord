# Dokumentasi Penyesuaian Gerbang Kualitas V24 (Gate Changes)

## Latar Belakang Perubahan
Pada arsitektur V20, gerbang pemukiman menerapkan skema kolisi separuh solid:
- Baris atas (`spanWidth` × `spanHeight - 1`) diberi atribut `isSolid = true` sebagai penanda kolisi fisik kompleks bangunan.
- Hanya baris terbawah (`isForecourt`) dan petak pintu masuk (`entrance`) yang dibiarkan terbuka (`isSolid = false`).

Namun, desain ini menyebabkan masalah fatal dalam gameplay nyata:
1. Pemain yang mendekati desa atau kota dari arah utara, barat, atau timur menabrak petak solid di tepi pemukiman.
2. Pesan kesalahan default memunculkan *"Jalur terhalang oleh Tebing Batu Curam! Membutuhkan artefak pedang terbang."*, seolah-olah desa adalah tebing batu.
3. Pathfinding A* di klien menolak merencanakan rute langsung ke dalam pemukiman karena petak footprint ditandai `isSolid = true`.

Sesuai perintah langsung pemilik proyek pada V24:
> **"PEMUKIMAN HARUS BISA DIINJAK + PERBAIKAN MASALAH LAIN. Yang seharusnya solid hanya gunung dan sejenisnya; pemukiman harus bisa diinjak untuk masuk."**

## Penyesuaian Gerbang P4 (`scripts/v20/auditSettlements.js`)

### 1. G4.2: Collision Area $\to$ Footprint Walkability
- **Sebelum (V20)**: Mengharuskan seluruh petak `dy < spanH - 1` bernilai `isSolid === true`.
- **Sesudah (V24)**: Mengharuskan **seluruh petak** dalam footprint (`dy < spanH`, `dx < spanW`) bernilai `isSolid === false` (bebas dilalui), serta memiliki `settlementId` yang valid dan `label` sesuai nama pemukiman.
- **Rasional**: Memastikan pemain dapat menginjak setiap petak pemukiman dari sudut kedatangan mana pun tanpa rintangan buatan.

### 2. G4.3: Forecourt Walkable & Span Resolvable
- **Sebelum (V20)**: Memverifikasi baris bawah `dy = spanH - 1` tidak solid.
- **Sesudah (V24)**: Memverifikasi baris bawah tetap tidak solid dan fungsi `findAnchorBySpan(tx, bottomY)` secara deterministik mengembalikan objek anchor pemukiman terkait.

### 3. G4.6: Chunk Border Consistency (6 Border Anchors)
- **Penyesuaian**: Pada `utils/objectScatter.js` dan `utils/chunkStreamingEngine.js`, objek marker pemukiman diberi sifat `collision: 'walkable'` dan diabaikan dari penandaan solid di bitmask occupancy/specialTiles.
- **Hasil**: Unpacked chunk tiles dan direct `getTileAt` 100% konsisten menyatakan seluruh petak pemukiman sebagai `isSolid: false`.

### 4. G4.7: Entrance & Span Triggers settlementPrompt
- **Sebelum (V20)**: Hanya memverifikasi petak pintu masuk memicu dialog.
- **Sesudah (V24)**: Memverifikasi bahwa petak pintu masuk maupun seluruh petak span pemukiman memicu payload `settlementPrompt` secara konsisten di `settlementZones.js`, `movementService.js`, dan endpoint `/world/zone/step-move`.
