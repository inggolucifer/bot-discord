# Hasil Pengintaian B0 — Data Dunia & Visibilitas NPC

Dokumen ini disusun pada tahap B0 (tanpa modifikasi kode produksi) sebagai dasar authoritative untuk Gelombang B.

---

## 1. R4: Pemetaan Koordinat ke `zoneId`
- **Kondisi Kode**:
  Tidak ada fungsi terpisah bernama `coordToZoneId(x, y)` atau sejenisnya di codebase. Seluruh peta dunia makro (5000x5000 tile) dipetakan secara terpusat ke satu `zoneId` master: `'tianyuan_world_map'`.
- **Kutipan `config/zones/tianyuan_world_map.js`**:
  ```javascript
  module.exports = {
    zoneId: 'tianyuan_world_map',
    regionSlug: 'central_plains',
    displayName: 'Jianghu',
    gridWidth: 5000,
    gridHeight: 5000,
    defaultTerrain: 'plains',
    ambientDangerTier: 1.5,
    isMacroGrid: true,
    spawnPoint: { tileX: 2455, tileY: 2485 }
  };
  ```
- **Kutipan Fallback di `web-api/routes/world.js` L1576 & `services/interiorService.js` L25**:
  ```javascript
  const currentZoneId = player.gridPosition?.zoneId || 'tianyuan_world_map';
  ```
- **Kesimpulan untuk NPC Dunia**:
  Semua NPC di peta dunia luar ruang (anchors, wilderness, wandering) memiliki `zoneId: 'tianyuan_world_map'`.

---

## 2. Bentuk Koleksi `ZoneTile` Bertipe `npc_spawn`
- **Definisi Skema `models/ZoneTile.js`**:
  ```javascript
  const zoneTileSchema = new mongoose.Schema({
    guildId: { type: String, required: true, index: true },
    zoneId: { type: String, required: true },
    tileX: { type: Number, required: true },
    tileY: { type: Number, required: true },
    tileType: {
      type: String,
      enum: [
        'poi', 'resource_node', 'buildable_plot', 'npc_spawn',
        'dungeon_entrance', 'hazard', 'ground', 'water', 'road', 'door', 'wall'
      ],
      default: 'ground',
      required: true
    },
    linkedRefId: { type: mongoose.Schema.Types.ObjectId, default: null },
    label: { type: String, default: null },
    isOccupied: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    terrainType: { ... },
    isSolid: { type: Boolean, default: false }
    // ...
  });
  zoneTileSchema.index({ guildId: 1, zoneId: 1, tileX: 1, tileY: 1 }, { unique: true });
  ```
- **Karakteristik Dokumen `npc_spawn`**:
  - `tileType`: `'npc_spawn'`
  - `linkedRefId`: Referensi `_id` ke dokumen `Npc`
  - `label`: Nama NPC (misal `"Zhou Haotian"`)
  - `guildId`: String (misal `'global'` atau guild ID spesifik)
  - `zoneId`: `'tianyuan_world_map'`

---

## 3. Fungsi Walkability V24 & Pengujian Tile Berjalan
- **Sumber Penentu Walkability**:
  1. `proceduralWorldEngine.getTileAt(x, y)`:
     - Mengembalikan objek tile dengan `isSolid: boolean`, `terrainType: string`.
     - Berdasarkan `world-data/walkability-policy-v24.json`, terrain non-walkable ditandai `isSolid: true` (`ocean`, `sea`, `lake_deep`, `abyss_edge`, `cliff`, `azure_mountain`, `mountain_peak`, `mountain_rock`, `mountain`, `lava_flow`, `volcanic`, `boundary`), sedangkan `lake` dan `glacier` adalah `isSolid: false` dengan cost stamina.
  2. `objectScatter.isCellBlocked(x, y)`:
     - Menguji apakah koordinat `(x, y)` terhalang oleh objek rintangan padat (prop dekorasi/scatter solid).
     - Kutipan `utils/objectScatter.js` L2625:
       ```javascript
       isCellBlocked: (x, y) => GC.isCellBlocked(x, y, getChunkObjects, resolveDef)
       ```
- **Tanda Tangan & Fungsi Penentu Walkability Standar**:
  ```javascript
  const pwe = require('../utils/proceduralWorldEngine');
  const obs = require('../utils/objectScatter');

  function isTileWalkable(tileX, tileY) {
    const tile = pwe.getTileAt(tileX, tileY);
    if (!tile || tile.isSolid) return false;
    if (typeof obs.isCellBlocked === 'function' && obs.isCellBlocked(tileX, tileY)) return false;
    return true;
  }
  ```

---

## 4. Jumlah Jangkar per Tipe (`world-data/anchors.json`)
Total 52 jangkar dengan distribusi:
- `village`: 10
- `hamlet`: 9
- `sect`: 8
- `town`: 7
- `outpost`: 4
- `major_city`: 4
- `secret_realm`: 4
- `port`: 2
- `danger_zone`: 2
- `capital_city`: 1
- `island`: 1

---

## 5. Analisis `Npc.guildId` Default vs `player.guildId` Nyata
- **`Npc.guildId`**:
  - Kutipan `models/Npc.js` L15:
    ```javascript
    guildId: { type: String, default: 'global', index: true },
    ```
  - Secara default seluruh NPC yang di-seed memiliki `guildId: 'global'`.
- **`player.guildId`**:
  - Kutipan `models/Player.js` L409:
    ```javascript
    guildId: { type: String, required: false, index: true, default: null },
    ```
  - Pada JWT payload (`web-api/middlewares/auth.js`), token membawa `guildId` jika request berasal dari Discord bot kontekstual (snowflake angka Discord), atau `undefined`/`null` jika request dari Web API mandiri.
- **Dampak Bug B10 di `web-api/routes/world.js`**:
  - `GET /world/npcs` saat ini melakukan query:
    ```javascript
    npcs = await Npc.find({
      guildId: player.guildId,
      isActive: true,
      // ...
    });
    ```
  - Karena `player.guildId` adalah snowflake Discord (misal `'1092837465'`) sedangkan NPC ber-`guildId: 'global'`, query selalu mengembalikan array kosong!
  - **Solusi Authoritative**: Ubah query menjadi:
    ```javascript
    guildId: { $in: [player.guildId, 'global'] }
    ```
    Dan pastikan mencakup NPC hidup (`'vitalStatus.isAlive': true` atau `isActive: true`).
