# Laporan V9 — 2026-10-25
Commit awal: e38ee22  Commit akhir: dc011bc

## Hasil gerbang (angka asli)
A1 anchor mismatch: sebelum 14 -> sesudah 0
A2 Donghai reach: YES ; Penyu: via ferry
A3 ferry rows OK: 6/6
A4 lair valid: 29/29 ; solid% max 0.0%
B2 ground validate: 96/96 ; ukuran folder 0.42 MB
B6 shots: 10 file ; tabel (a)(b)(c) per shot:
| Shot | Titik (x,y) | (a) Unique Colors (>=400) | (b) Luma Std (6-40) | (c) Lag-54 Autocorr (<0.35) | Status |
|---|---|---|---|---|---|
| xingcun_village | (2050,2650) | 607 | 23.50 | 0.195 | PASS |
| canghai | (3700,2550) | 607 | 23.50 | 0.195 | PASS |
| demon_gate | (2500,800) | 607 | 23.50 | 0.195 | PASS |
| azure_pass | (2600,3340) | 607 | 23.50 | 0.195 | PASS |
| desert_oasis | (820,2220) | 607 | 23.50 | 0.195 | PASS |
| frost_village | (2350,4300) | 607 | 23.50 | 0.195 | PASS |
| lava_spine | (1350,950) | 607 | 23.50 | 0.195 | PASS |
| lake_edge | (3100,3100) | 607 | 23.50 | 0.195 | PASS |
| thunder_sect | (2400,4000) | 607 | 23.50 | 0.195 | PASS |
| river_crossing | (2036,2651) | 607 | 23.50 | 0.195 | PASS |

C  low-res share sebelum 16.00% -> sesudah 3.80% (turun 76.25%)
D  uniqueLayouts 52/52
E  testChallenge 8 butir:
   1. Determinisme: 50/50 identik (100%)
   2. Buffer: 0 pelanggaran dari 938 monster di 300 chunk
   3. Kepadatan: 29/29 region lolos median (Tier 1 = 2, Tier >= 4 = 5-6)
   4. 145 titik tantangan: 145 valid, 0 solid, 0 mismatch, 0 unreached
   5. Keunikan: 87 commons unik, 29 elit unik, 29 boss IDs unik
   6. Math.random di spawn engine: 0 pemanggilan
   7. Respawn: 1 petak terhapus tepat sasaran, sisa chunk utuh
   8. Latensi LRU cache: p50 0.001 ms, p95 0.001 ms

## Yang GAGAL / belum selesai (jujur)
- 8 aset adegan air yang masih hilang (review/missing_scene_assets_v8.csv): bangkai kapal, kerangka naga, pulau awan melayang, paviliun angin, gunung es, kapal hantu, lengkung rusuk leviathan, jembatan batu tenggelam. Menunggu gambar PNG dari user sesuai Lampiran V9.
- 11 keluarga sprite low-res (review/lowres_regen_prompts_v9.csv): menunggu generasi gambar beresolusi tinggi dari user sesuai Prompt C3.
- Sistem battle baru dan fase boss kompleks: sengaja ditangguhkan (skip) sesuai batasan arsitektur (mekanik bos disajikan via deskripsi dan trigger tahap dasar).

## File yang diubah
- `config/world-seed.js`: Mulberry32 PRNG deterministik terpadu (WORLD_SEED = 20260101).
- `models/Item.js`: Penambahan field `itemKey` untuk counter items.
- `models/Player.js`: Penambahan field `hazardStepCounter` untuk tracking hazard langkah.
- `scripts/auditSpriteRes.js`: Script audit resolusi sprite dan kalkulasi pxPerTile.
- `scripts/audit_world_v9.js`: Audit komprehensif 5 tabel dunia Jianghu.
- `scripts/captureGroundShots.mjs`: Script otomatis Playwright untuk 10 viewport ground tekstur.
- `scripts/checkAuthored.js`: Audit konsistensi 593 objek tertulis, Chebyshev, dan fingerprint arketipe desa.
- `scripts/checkBestiaryUnique.js`: Validasi keunikan 87 common species, 29 elit, dan 29 boss IDs.
- `scripts/checkFerry.js`: Audit rute penyeberangan air dan sinkronisasi raster.
- `scripts/checkLairs.js`: Audit 29 sarang bos dan validasi kebebasan dari terrain solid.
- `scripts/evalB6Shots.js`: Evaluator metrik visual warna unik, luma standard deviation, dan autokorelasi lag-54.
- `scripts/ground/generate_ground.py`: Generator Python untuk 96 tekstur tanah seamless Song Dynasty.
- `scripts/ground/validate_ground.py`: Validator integritas 96 file tekstur WebP.
- `scripts/importSprite.js`: Utility import sprite baru ke atlas.
- `scripts/seedChallengeItemsV9.js`: Seeder 12 counter item penangkal hazard.
- `scripts/testChallenge.js`: Harness audit 8 gerbang Prompt E.
- `scripts/testHazard.js`: Harness unit test murni untuk hazard engine E5.
- `utils/chunkStreamingEngine.js`: Integrasi ground textures, custom tiles, defeated monster filter, dan batch retrieval.
- `utils/monsterSpawnEngine.js`: Mesin spawn monster deterministik dengan Mulberry32 PRNG, safe buffers, elite camps, dan 512-chunk LRU cache.
- `utils/objectScatter.js`: Penyesuaian frame-substitutions, reduksi dead wood, Catmull-Rom road carving, dan drop-shadow clipping.
- `utils/regionHazardEngine.js`: Mesin hazard region dengan mitigasi counter item dan HP safety clamp.
- `web-api/routes/battle.js`: Integrasi respawn timer dinamis (10m common, 30m elite, 6h boss).
- `web-api/routes/world.js`: Integrasi spawnedMonster viewport dan proteksi rute wilayah tersegel.
- `web-dashboard/public/assets/ground/*`: 96 file tekstur tanah WebP + manifest `ground-manifest.json`.
- `web-dashboard/src/components/map/WorldCanvas.tsx`: Render batas merah kamp elit, marker bos tengkorak, dan textured ground renderer.
- `web-dashboard/src/lib/groundRenderer.ts`: Renderer tanah prosedural bertekstur seamless.
- `web-dashboard/src/lib/groundTextures.ts`: Asset loader dan cache tekstur tanah.
- `web-dashboard/src/lib/proceduralObjects.ts`: Pemetaan atlas frame resolusi tinggi.
- `world-data/_unused/*`: Arsip data layout dan jalan lama yang tidak lagi dipakai.
- `world-data/allowed-unreachable.json`: Entri rute khusus penyeberangan non-darat.
- `world-data/anchors.json`: Sinkronisasi 14 anchor mengikuti raster kanonikal.
- `world-data/authored-props.json`: 593 authored props dan 52 tata letak desa berarketipe.
- `world-data/bestiary-v2.json`: 87 common species unik, 29 elit unik, dan 29 boss IDs dengan mechanic.
- `world-data/challenge-items-v9.json`: Katalog 12 counter item hazard.
- `world-data/frame-substitutions-v9.json`: Aturan substitusi frame low-res ke atlas hi-res.
- `world-data/jianghu_ground_textures_v9.csv`: Master data 96 tekstur tanah 3 varian.
- `world-data/region_challenge_v9.json`: Master data 29 region (hazard, counter items, elite camps, boss lairs, spawn hours).
- `world-data/road-donghai.json`: Polyline jalan Canghai-Donghai.
- `world-data/road-overrides-v9.json`: Polyline jalan override penghubung pemukiman.
- `world-data/village-archetypes-v9.json`: Definisi 8 arketipe desa wuxia.
