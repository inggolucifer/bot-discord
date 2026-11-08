# Reconnaissance Report (V28 / A0)

Dokumen ini mencatat temuan arsitektural dan baseline kode sebelum eksekusi V28 dilakukan, dengan kutipan baris kode langsung dari basis kode.

---

### R1. Bentuk `Npc.inventory` (Field apa saja)
Didefinisikan di `models/Npc.js` baris 3–11 (`npcInventoryItemSchema`) dan digunakan di baris 109:

```javascript
// models/Npc.js:3-11
const npcInventoryItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  itemModel: { type: String, default: 'Item' },
  name: { type: String, default: '' },
  category: { type: String, default: 'misc' },
  quantity: { type: Number, default: 1 },
  equippedSlot: { type: String, default: null },
  qualityTier: { type: String, default: 'common' }
}, { _id: false });

// models/Npc.js:109
inventory: { type: [npcInventoryItemSchema], default: [] },
```
**Daftar field:**
1. `itemId`: ObjectId (ref: 'Item')
2. `itemModel`: String (default 'Item')
3. `name`: String (default '')
4. `category`: String (default 'misc')
5. `quantity`: Number (default 1)
6. `equippedSlot`: String (default null)
7. `qualityTier`: String (default 'common')

---

### R2. Field Slot `Player.inventory` (Penanda Dipakai/Terkunci/Terikat)
Didefinisikan di `models/Player.js` baris 77–86 (`inventoryItemSchema`) dan digunakan di baris 674:

```javascript
// models/Player.js:77-86
const inventoryItemSchema = new mongoose.Schema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity: { type: Number, default: 1 },
  // Fields for crafted items / tools
  creatorName: { type: String, default: null },
  qualityMultiplier: { type: Number, default: 1.0 },
  durability: { type: Number, default: null }, // Current durability for tools
  maxDurability: { type: Number, default: null },
  isEquipped: { type: Boolean, default: false },
});

// models/Player.js:674
inventory: { type: [inventoryItemSchema], default: [] },
```
**Analisis penanda:**
- **Dipakai**: Ada field `isEquipped: { type: Boolean, default: false }` (baris 85).
- **Terkunci (`isLocked`)**: **TIDAK ADA**.
- **Terikat (`isBound`)**: **TIDAK ADA**.

---

### R3. Lokasi `extendedStats` dan `stats` di `Player.js`
Didefinisikan dan disematkan pada skema `Player.js`:

1. **`playerStatsSchema` (stats)**: Baris 15–20:
```javascript
// models/Player.js:15-20
const playerStatsSchema = new mongoose.Schema({
  baseHp: { type: Number, default: 100 },
  baseAtk: { type: Number, default: 15 },
  baseDef: { type: Number, default: 10 },
  baseSpd: { type: Number, default: 10 }
}, { _id: false });
```
Disematkan di skema utama baris 572:
`stats: { type: playerStatsSchema, default: () => ({}) },`

2. **`extendedStatsSchema` (extendedStats)**: Baris 33–74:
```javascript
// models/Player.js:33-56
const extendedStatsSchema = new mongoose.Schema({
  // === GENERAL ===
  maxLifespan:   { type: Number, default: 100 },
  mood:          { type: Number, default: 100, min: 0, max: 100 },
  luck:          { type: Number, default: 10 },
  insight:       { type: Number, default: 10 },
  vitality:      { type: Number, default: 100 },
  maxVitality:   { type: Number, default: 100 },
  innerEnergy:   { type: Number, default: 100 },
  maxInnerEnergy: { type: Number, default: 100 },
  focus:         { type: Number, default: 100 },
  maxFocus:      { type: Number, default: 100 },

  // === COMBAT ===
  critRate:      { type: Number, default: 5 },
  critResist:    { type: Number, default: 0 },
  comboRate:     { type: Number, default: 5 },
  agility:       { type: Number, default: 10 },
  critDmg:       { type: Number, default: 150 },
  critDmgReduce: { type: Number, default: 0 },
  travelSpeed:   { type: Number, default: 100 },
  martialRes:    { type: Number, default: 0 },
  spiritualRes:  { type: Number, default: 0 },
...
```
Disematkan di skema utama baris 573:
`extendedStats: { type: extendedStatsSchema, default: () => ({}) },`

---

### R4. Daftar Nilai `type` yang Sah di `anchors.json` dan Jumlahnya
Berdasarkan `world-data/anchors.json` (total 52 anchor):
- `village`: 10
- `hamlet`: 9
- `sect`: 8
- `town`: 7
- `outpost`: 4
- `major_city`: 4
- `secret_realm`: 4 (Zona rahasia / dungeon terisolasi)
- `port`: 2
- `danger_zone`: 2 (Zona bahaya monster)
- `capital_city`: 1
- `island`: 1

---

### R5. Baris Query NPC di `web-api/routes/world.js` dan Filter Field yang Dipakai
Ada 2 lokasi query NPC utama di `web-api/routes/world.js`:

1. **Endpoint `/npcs` (Local viewport tiles)** baris 1287–1299:
```javascript
// web-api/routes/world.js:1287-1299
npcs = await Npc.find({
    guildId: player.guildId,
    isActive: true,
    $or: [
        { _id: { $in: linkedIds } },
        { name: { $in: npcNames } },
        {
            zoneId: currentZoneId,
            tileX: { $gte: px - 2, $lte: px + 2 },
            tileY: { $gte: py - 2, $lte: py + 2 }
        }
    ]
});
```
*Filter yang dipakai*: `guildId`, `isActive`, `$or` dengan `_id`, `name`, dan (`zoneId`, `tileX`, `tileY`). Karena NPC seeded tidak memiliki `guildId` eksplisit (default 'global') atau `zoneId` kosong/berbeda dengan `player.guildId`, NPC tersaring habis.

2. **Endpoint `/zone/:zoneId` (Macro map tile aggregation)** baris 2070–2075 & 2081:
```javascript
// web-api/routes/world.js:2070-2075
const npcQuery = player.guildId ? { guildId: player.guildId, isActive: true } : { isActive: true };
if (isMacro && viewport && viewport.bounds) {
    npcQuery.tileX = { $gte: viewport.bounds.minX, $lte: viewport.bounds.maxX };
    npcQuery.tileY = { $gte: viewport.bounds.minY, $lte: viewport.bounds.maxY };
}
const allActiveNpcs = await Npc.find(npcQuery).select('_id name title description greeting portraitUrl imageUrl zoneId tileX tileY settlementName buildingName').lean();
```
Dan di baris 2081:
```javascript
// web-api/routes/world.js:2081
if (typeof npc.tileX === 'number' && typeof npc.tileY === 'number' && (!npc.zoneId || npc.zoneId === zoneId)) {
```

3. **Di `web-api/routes/nearby.js` baris 172–173**:
```javascript
// web-api/routes/nearby.js:172-173
const nx = n.schedule?.tileX ?? n.tileX ?? (cx * 32 + 16);
const ny = n.schedule?.tileY ?? n.tileY ?? (cy * 32 + 16);
```
*Bug kritis*: Karena default `schedule.tileX` di skema `Npc.js` adalah `0`, operator nullish coalescing `??` menganggap angka `0` sebagai nilai valid (bukan null/undefined), sehingga seluruh NPC terpental ke koordinat (0, 0).

---

### R6. Lokasi `Player.stats.attack` vs `baseAtk` (Status Getter / Virtual)
- **`Player.stats.attack`**: **TIDAK ADA**. Field yang ada pada `playerStatsSchema` adalah `baseAtk: { type: Number, default: 15 }` (baris 17).
- **Virtual / Getter**: Di baris 752–773 hanya ada virtual untuk:
  - `currentPosition` (baris 752)
  - `realmIndex` (baris 762)
  - `stamina` (baris 768)
- **Kesimpulan**: Tidak ada virtual getter untuk `attack` atau `agility` di model `Player`. Akses ke `player.attack`, `player.attributes.agility`, atau `player.attributes.insight` di route lama menghasilkan `undefined`, sehingga nilai kalkulasi aksi NPC selalu jatuh ke nilai default/fallback palsu. Akses sah yang benar adalah:
  - `player.stats.baseAtk`
  - `player.stats.baseDef`
  - `player.extendedStats.agility`
  - `player.extendedStats.insight`
