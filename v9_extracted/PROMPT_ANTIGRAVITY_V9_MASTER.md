# PROMPT MASTER V9 — JIANGHU WORLD / IMMORTAL-X
# Untuk: Antigravity. Dibaca dari atas ke bawah, SATU LANGKAH SEKALI. Bahasa kode: Inggris. Bahasa teks game: Indonesia.

Repo: `inggolucifer/bot-discord`, folder `jianghu-bot` (selanjutnya `ROOT`). Basis: commit `e38ee22`.
Semua perintah dijalankan dari `ROOT` kecuali dikatakan lain.

---------------------------------------------------------------------
## 0. ATURAN KERJA (WAJIB, BACA SEKALI, PATUHI SELAMANYA)
---------------------------------------------------------------------
0.1 Kerjakan Prompt A → B → C → D → E → F **berurutan**. Jangan lompat. Setelah tiap prompt: jalankan "GERBANG" prompt itu, tempel output asli (bukan ringkasan) ke `review/report_v9.md`.
0.2 Jika sebuah gerbang GAGAL: tulis `GAGAL: <angka sebenarnya> vs target <angka>` dan PERBAIKI dulu. Dilarang menulis "PASS" tanpa angka. Dilarang mengubah angka target gerbang agar lulus.
0.3 Jangan menebak nama file/fungsi. Jika file yang disebut tidak ada: `grep -rn "<kata>" ROOT --include=*.js --include=*.ts --include=*.tsx -l` lalu pakai yang ditemukan, dan catat di report.
0.4 Jangan hapus data user. Jangan sentuh `.env`, kredensial, password VPS. Jangan `git add` file di luar daftar yang kamu ubah. `package-lock.json` jangan di-commit kecuali memang menambah dependency.
0.5 Setiap script baru harus bisa dijalankan dengan `node scripts/<nama>.js` TANPA argumen tambahan (kecuali dikatakan) dan keluar dengan exit code 1 bila ada gagal.
0.6 Setiap perubahan data deterministik: tidak boleh memakai `Math.random()` di engine dunia. Pakai `mulberry32(seed)`; seed dunia = konstanta `WORLD_SEED = 20260101` di `config/world-seed.js` (buat file ini bila belum ada, `module.exports = { WORLD_SEED: 20260101 }`).
0.7 Angka bilangan bulat (HP, damage) selalu `Math.floor`, minimal 1.
0.8 Commit kecil per sub-langkah: `git commit -m "V9 A1: <ringkas>"`. Jangan push sebelum Prompt F selesai.
0.9 File pendukung (JSON/CSV/script) ada di folder `v9_pack/` (dikirim bersama prompt ini). Salin ke posisi berikut SEBELUM mulai:
```
v9_pack/data/region_challenge_v9.json          -> ROOT/world-data/region_challenge_v9.json
v9_pack/data/jianghu_ground_textures_v9.csv    -> ROOT/world-data/jianghu_ground_textures_v9.csv
v9_pack/data/ground_families.py                -> ROOT/scripts/ground/ground_families.py   (lihat catatan jalur di B2)
v9_pack/scripts/make_seamless.py               -> ROOT/scripts/ground/make_seamless.py
v9_pack/scripts/validate_ground.py             -> ROOT/scripts/ground/validate_ground.py
v9_pack/scripts/build_ground_manifest.py       -> ROOT/scripts/ground/build_ground_manifest.py
v9_pack/scripts/gen_ground_placeholder.py      -> ROOT/scripts/ground/gen_ground_placeholder.py
v9_pack/scripts/carve_roads.js                 -> ROOT/scripts/carve_roads.js
```
Catatan jalur: `gen_ground_placeholder.py` mengimpor `../data/ground_families`. Setelah disalin ke `scripts/ground/`, ubah baris `sys.path.insert(...)` menjadi `sys.path.insert(0, os.path.dirname(__file__))`.

---------------------------------------------------------------------
## 1. LANGKAH 0 — BASELINE (sebelum mengubah apa pun)
---------------------------------------------------------------------
1.1 `git status` harus bersih. `git log -1 --oneline` catat.
1.2 Jalankan dan simpan output ke `review/baseline_v9.txt`:
```
node scripts/measure_scatter.js
node scripts/checkAuthored.js
node scripts/checkObjectsOnWater.js
```
1.3 Buat `scripts/audit_world_v9.js` yang mencetak 5 tabel (kode di bagian A8). Jalankan, simpan ke `review/baseline_audit_v9.txt`. Angka-angka ini adalah "SEBELUM" dan dipakai di laporan akhir.

---------------------------------------------------------------------
## PROMPT A — BUG & KONSISTENSI DATA (temuan nyata hasil audit)
---------------------------------------------------------------------
Semua temuan di bawah sudah DIUKUR (script BFS grid 4 tile dari Desa Xingcun 2050,2650).

### A1. Anchor dengan `region` salah (14 anchor)
`world-data/anchors.json` menyebut region X tapi raster `utils/worldData.js getRegionAt(x,y)` mengatakan region Y. Akibatnya spawn, bestiary, dan hazard region tidak cocok dengan kota di atasnya.
Daftar terukur (id | x,y | declared → raster):
```
pos_tundra_utara          2120,4180 northern_desolate     -> thundersteppe
benteng_gerbang_iblis     2500,800  southern_demon_domain -> crimson_battlefield
pulau_penyu_raksasa       4350,2750 eastern_sea           -> floating_wind_isles
sarang_naga_karang_timur  3880,2750 eastern_sea           -> ore_teeth_range
kota_jinling              2750,2350 nine_springs_delta    -> central_plains
kota_yunxi                2200,2500 central_plains        -> nine_springs_delta
kota_leiyin               2600,3800 thundersteppe         -> northern_desolate
kota_canghai              3700,2550 eastern_sea           -> ore_teeth_range
kota_binghu               1800,4350 northern_desolate     -> thundersteppe
kota_shuijing             3100,3100 mirror_lake           -> central_plains
desa_xueshan              2350,4300 northern_desolate     -> thundersteppe
dusun_pondok_karang       3800,2650 eastern_sea           -> ore_teeth_range
dusun_pondok_es           2000,4250 northern_desolate     -> thundersteppe
pos_menara_pantau_danau   3250,3000 mirror_lake           -> sword_gorge
```
(14 baris; pakai hasil script sebagai kebenaran akhir.)
**Keputusan: RASTER MENANG.** Raster adalah sumber kebenaran untuk spawn/hazard.
Langkah:
1. Buat `scripts/fixAnchorRegions.js`: baca `anchors.json`, untuk tiap anchor hitung `getRegionAt(a.x,a.y).id`, jika beda → set `a.region` = hasil raster dan simpan `a.regionWas = nilai lama`. Tulis balik JSON dengan indent 2. Cetak jumlah yang diubah.
2. Jalankan. Cari semua pemakaian `anchor.region` dan nama region yang di-hardcode untuk kota-kota di atas: `grep -rn "northern_desolate\|mirror_lake\|eastern_sea" ROOT/utils ROOT/web-api ROOT/config --include=*.js | head -50`; hanya perbaiki jika memang membaca `anchor.region` untuk keputusan gameplay.
3. **Jangan ubah** `regions.json` atau raster di langkah ini.
GERBANG A1: `node scripts/fixAnchorRegions.js` kedua kali → "0 diubah". Script audit tabel 1 → "mismatch = 0".

### A2. Dermaga Donghai & Pulau Penyu tidak terjangkau dari daratan
Terukur: `dermaga_donghai (3920,2700)` dan `pulau_penyu_raksasa (4350,2750)` = UNREACH dari Xingcun. Padahal `ferry.js` punya rute `eastern_port_to_turtle_island`: pemain tidak bisa mencapai dermaga.
Perbaikan (jalan kausi pendek, hanya ±16 tile solid yang memisahkan Kota Canghai (3700,2550) dari Dermaga Donghai):
1. Salin `carve_roads.js` (lihat 0.9). Jalankan `node scripts/carve_roads.js 3700,2550 3920,2700 world-data/road-donghai.json`. Hasil terukur: path ±94 sel, `solidCells=4` (≈16 tile).
2. Buat `world-data/road-overrides-v9.json` format: `{ "roads": [ { "id":"canghai_donghai", "width":3, "terrain":"road_stone", "forceWalkable":true, "polyline":[[x,y],...] } ] }` — isi `polyline` dari `road-donghai.json` (titik tiap 8 tile).
3. Di `utils/proceduralWorldEngine.js`, di dalam `getTileAt`, SETELAH terrain dasar dihitung dan SEBELUM return: jika (x,y) berada ≤ `width/2` tile dari salah satu segmen polyline pada `road-overrides-v9.json` → set `terrainType='road_stone'`, `isSolid=false`, `walkable=true`. Muat file SEKALI di awal modul (bukan per panggilan). Gunakan index grid kasar (`Map<"cx,cy", segments[]>` dengan cell 64) agar `getTileAt` tetap cepat.
4. Tambahkan 1 objek jembatan kayu (frame `building_wayside_stone_arch_bridge_v1`) pada tiap titik polyline yang asalnya solid (`solid=1` dari output script) — masuk ke `authored-props.json` dengan `layer:"authored"`, `tag:"bridge_v9"`.
GERBANG A2: audit tabel 2: `dermaga_donghai` dan `pulau_penyu_raksasa` → `reach=YES` (Pulau Penyu boleh tetap NO jika hanya via ferry — dan itu sah, tulis "via ferry"). `node scripts/measure_scatter.js` ukuran FPS/waktu tidak naik >10%. `getTileAt` micro-benchmark 100.000 panggilan acak < 2× baseline.

### A3. Ferry: tujuan rusak / tidak jelas
Buka `web-api/routes/ferry.js`. Untuk SETIAP rute: (a) koordinat tujuan harus non-solid (`getTileAt`), (b) nama tujuan harus sama dengan nama anchor terdekat dalam radius 40 tile, (c) region tujuan = raster. Buat `scripts/checkFerry.js` yang mencetak tabel 3 kolom dan exit 1 bila ada baris gagal. Perbaiki rute yang gagal (geser koordinat ke tile non-solid terdekat dalam radius 12 yang ditemukan script, perbaiki nama).
Tambahkan 2 rute baru (Prompt E7 memakainya): `donghai_to_frostmoon` (dari Dermaga Donghai ke koordinat 4396,4284 "Pulau Tengkorak Naga Beku", harga 500 koin, durasi 90 detik) dan `frostmoon_to_donghai` (kembali).
GERBANG A3: `node scripts/checkFerry.js` → semua baris OK, exit 0.

### A4. Sarang boss tidak valid (terukur)
Dari `bestiary-v2.json`: 12 sarang berada di tile SOLID/tak terjangkau/region salah:
```
azure_mountain_range  3212,3475 azure_mountain#SOLID   godthunder_peaks 3710,4750 mountain_peak#SOLID
mirror_lake  3600,3975 lake_deep#SOLID                 lava_spine 1350,950 volcanic#SOLID
spirit_wood_sea 3950,1550 ocean#SOLID                  eastern_sea 4700,3300 ocean#SOLID
sword_gorge 3500,3375 azure_mountain#SOLID (region salah)   void_rift 375,4875 abyss_edge#SOLID
frostmoon_sea/floating_wind_isles = island_reef tak terjangkau; bone_sea_coast (region salah=crimson), formation_barrens (region salah=ore_teeth)
```
Perbaikan: GANTI `boss.lair.centerX/centerY` di `bestiary-v2.json` untuk 29 region dengan tabel A4-T di bawah (kolom "lair"). Semua koordinat tabel sudah diperiksa: tile tidak solid, region raster cocok, bebas solid pada radius 4–6 tile (kecuali Azure yang butuh arena dipahat, lihat A5). Simpan nilai lama di `lair.oldCenter`.
Setelah itu `lair.width/height` (12) tidak boleh menabrak solid: jalankan `scripts/checkLairs.js` (buat) yang untuk tiap sarang menghitung persen tile solid dalam persegi width×height; target ≤ 5%.

**TABEL A4-T — koordinat final (sumber: `world-data/region_challenge_v9.json`)**
| region | lair (x,y) terrain | elite camps (3) | hazard zone | hazard % maxHP/10 langkah / item penangkal | akses |
|---|---|---|---|---|---|
| central_plains | (2504,2608) plains | (2084,2332);(2924,2824);(2504,2932) | (2780,2224) | none 0% / - | open |
| nine_springs_delta | (2412,2406) pond_lotus | (2280,2406);(2520,2502);(2400,2514) | (2484,2394) | flood 1% / item_water_walk_charm | open |
| azure_mountain_range | (2600,3350) mountain_pass | (2200,3250);(2600,3200);(3100,3200) | (2200,3300) | cold_wind 0% / - | open |
| northern_desolate | (1800,4232) snow | (1620,4220);(2760,4652);(2100,4784) | (2544,3812) | cold 1% / item_frost_ward_cloak | open |
| thundersteppe | (2300,4204) meadow | (2000,4036);(2600,4396);(2300,4480) | (2504,3964) | lightning 3% / item_lightning_rod_talisman | open |
| godthunder_peaks | (3256,4416) crater | (3256,4728);(3292,4776);(3292,4848) | (3292,4848) | lightning 3% / item_lightning_rod_talisman | open |
| mirror_lake | (3092,3680) meadow | (3044,3716);(3080,4064);(3032,3656) | (3032,3656) | none 0% / - | open |
| beast_prairies | (1404,3804) meadow | (1164,3636);(1644,3996);(1404,4008) | (1560,3612) | stampede 0% / - | open |
| western_sacred_desert | (752,2504) desert_sand | (296,2096);(1196,2996);(752,3092) | (1052,1904) | heat 1% / item_water_gourd | open |
| western_gorge_labyrinth | (500,1500) canyon_floor | (188,1284);(800,1752);(500,1848) | (704,1500) | maze 0% / - | open |
| hermit_highlands | (1204,4404) hill | (964,4236);(1444,4596);(1204,4680) | (1360,4164) | mist 0% / - | open |
| border_march | (2816,1928) plains | (2816,1868);(2936,1988);(2816,2012) | (2852,1820) | war 0% / - | open |
| lava_spine | (1100,292) crater | (692,496);(1508,952);(1100,1108) | (1304,280) | heat 2% / item_cold_pill | open |
| venom_mire | (2604,1008) dead_wood | (2364,696);(2844,1152);(2604,1248) | (2412,576) | poison 2% / item_antidote_pill | open |
| southern_demon_domain | (2192,1196) dead_wood | (1796,1016);(2696,1496);(2252,1616) | (2192,1028) | demonic 0% / item_holy_talisman | open |
| crimson_battlefield | (2900,604) battlefield_ash | (2600,436);(3200,796);(2900,880) | (3104,364) | wraith 0% / - | open |
| abyssal_scar | (1896,604) miasma_waste | (1716,436);(2076,796);(1872,880) | (2016,364) | void 1% / item_void_ward_stone | open |
| southern_plague_woods | (3416,544) swamp | (3416,412);(3644,724);(3404,796) | (3560,340) | plague 1% / item_antidote_pill | open |
| bone_sea_coast | (1748,152) desert_sand | (704,92);(2792,188);(1784,200) | (2444,56) | bone 0% / - | open |
| spirit_wood_sea | (3700,1300) forest | (3400,1096);(3940,1552);(3700,1648) | (3904,1000) | spore 0% / - | open |
| mist_insect_valley | (4404,1100) meadow | (4164,896);(4644,1352);(4404,1448) | (4560,800) | insect 1% / item_incense_repel | open |
| formation_barrens | (3604,2204) plains | (3364,2036);(3844,2384);(3628,2396) | (3760,1964) | array 0% / - | open |
| sword_gorge | (3400,3080) canyon_floor | (3268,3092);(3520,3080);(3340,3080) | (3460,3080) | wind 1% / item_wind_ward_cloak | open |
| ore_teeth_range | (3624,2804) hill | (3492,2636);(3756,2996);(3624,3080) | (3732,2576) | collapse 0% / - | open |
| eastern_sea | (3940,2600) island_reef | (4564,1832);(3940,2828);(3916,2756) | (4624,1736) | storm 0% / - | open |
| frostmoon_sea | (4396,4284) island_reef | (4000,4128);(4504,4260);(4336,4272) | (4540,4092) | cold 2% / item_frost_ward_cloak | SEALED:ferry |
| floating_wind_isles | (4604,2700) island_reef | (4364,2496);(4832,2952);(4604,3036) | (4772,2412) | fall 0% / item_wind_ward_cloak | SEALED:flying_sword |
| immortal_ruins_valley | (580,1000) formation_tile | (364,796);(844,1252);(604,1348) | (592,664) | spirit 0% / - | open |
| void_rift | (308,4748) miasma_waste | (308,4688);(380,4844);(356,4784) | (368,4616) | void 4% / item_void_ward_stone | SEALED:portal |

### A5. Arena Azure (celah pegunungan, tembok solid)
Azure Mountain Range hampir seluruhnya solid (19.550 dari 19.750 sampel); hanya 3 celah. Karena itu lair Azure = `Mist Pass (2600,3350)`. Celahnya hanya lebar 9 → PAHAT arena: di `proceduralWorldEngine.getTileAt`, jika `2589<=x<=2611 && 3340<=y<=3360` → `terrainType='mountain_pass'`, `isSolid=false`. (Nilai ada di `region_challenge_v9.json` → `azure_mountain_range.lair.carveArena`.) Pastikan 3 celah lain (2200,3350), (3100,3200 sword_gorge_pass) tetap tembus: audit konektivitas sebelum/sesudah.

### A6. Region tersegel & titik tak terjangkau
Terukur: `frostmoon_sea`, `floating_wind_isles`, `void_rift` = 0% terjangkau dari daratan. Itu SENGAJA (area endgame) — tapi harus ada cara masuk (Prompt E7). Jangan "memperbaiki" dengan membuka jalan darat.

### A7. File data yang tidak dipakai engine
`world-data/road-network.json` (89 segmen), `layout-recipes.json`, `organic-region-map.json` (625×625, bertentangan dengan 14 anchor), `spawns.json` dan `monsters/*.json` tier-template. Untuk TIAP file: `grep -rn "<nama-file>" ROOT --include=*.js --include=*.ts -l`.
- Jika tidak ada pemakai: pindahkan ke `world-data/_unused/` (jangan hapus) dan tulis alasannya di `world-data/_unused/README.md`.
- `organic-region-map.json`: PINDAHKAN ke `_unused`. Keputusan: raster lama tetap sumber kebenaran.
- `monsters/*.json` dan `bestiary-v2.json` akan dipakai di Prompt E — jangan dipindah.
GERBANG A7: `grep -rn "organic-region-map\|layout-recipes\|road-network" ROOT --include=*.js --include=*.ts` hanya menemukan file di `_unused/` atau komentar.

### A8. `scripts/audit_world_v9.js` (buat; dipakai sebagai gerbang di semua prompt)
Skrip ini mencetak 5 tabel dan memberi exit 1 bila ada baris berstatus FAIL:
1. Anchor: `id | declared | raster | MATCH/FAIL`.
2. Konektivitas: BFS grid 4 tile (N=1250) dari (2050,2650); untuk tiap anchor `reach=YES/NO` (anchor di region tersegel dan Pulau Penyu boleh NO jika ditandai `allowedUnreachable` di `world-data/allowed-unreachable.json` — buat file itu berisi: `["pulau_penyu_raksasa"]`).
3. Sarang/elite/hazard: untuk 145 titik di `region_challenge_v9.json`: `terrain | solid | region==expected | reach(main or sealed)`.
4. Density objek (reuse `measure_scatter.js` bagian coverage).
5. Histogram terrain 400×400 sampel (step 12.5) → persen per terrainType.
Salin kode BFS dari `scripts/measure_scatter.js` bila ada; jika tidak, tulis sendiri (array `Uint8Array(N*N)`, stack iteratif, 4-arah).

---------------------------------------------------------------------
## PROMPT B — TANAH (GROUND) HASIL GENERATE GAMBAR
---------------------------------------------------------------------
**Masalah terukur:** `web-dashboard/src/lib/groundRenderer.ts` → `renderL1TerrainBase` mengisi setiap tile dengan `fillRect` satu warna + gradien kecil; hasil: tanah datar, blotchy, kotak-kotak. Hanya 5 file di `public/assets/tiles/` (plains, forest, mountain, azure_mountain, settlement_floor) dan hampir tidak terpakai.

**Tujuan:** tanah tampak seperti lukisan tinta (ink-wash/gongbi) yang menyambung mulus (seamless), variasi tidak berulang kentara, perbatasan antar-terrain lembut, TANPA gambar di-download manual satu-satu oleh kamu; user (pemilik) hanya men-generate 96 gambar dengan AI gambar memakai CSV, menaruhnya di folder, lalu menjalankan 3 perintah.

### B1. Rancangan (jangan dilanggar)
- 32 "family" tekstur × 3 varian = **96 gambar**. Daftar & prompt ada di `world-data/jianghu_ground_textures_v9.csv` (kolom: `id,variant,file_name,terrain_types,base_hex,accent_hex,prompt`).
- Input: PNG/JPG apa pun ukuran (disarankan 1024×1024) di `art_input/ground/<id>_v<1..3>.png`.
- Output: `web-dashboard/public/assets/ground/<id>_v<n>.webp`, 256×256, seamless, + `ground-manifest.json`.
- 1 tekstur 256px menutupi **4×4 tile** (216 px di layar pada BASE_TILE_SIZE 54) → skala 216/256 = 0.84375.
- Sampling berdasarkan KOORDINAT DUNIA (bukan per-tile) agar tidak tampak grid: pola di-align ke `(worldTileX*54, worldTileY*54)`.
- Variasi: pilih varian per blok 8×8 tile memakai `hash2d(floor(tx/8), floor(ty/8)) % 3`, ditambah modulasi makro (B4).

### B2. Pipeline gambar (3 perintah untuk user)
Pastikan Python3 + `pip install --break-system-packages pillow numpy` tersedia.
```
python3 scripts/ground/gen_ground_placeholder.py art_input/ground     # HANYA jika folder kosong: membuat 96 placeholder prosedural supaya game tetap jalan
python3 scripts/ground/make_seamless.py art_input/ground web-dashboard/public/assets/ground
python3 scripts/ground/validate_ground.py web-dashboard/public/assets/ground world-data/jianghu_ground_textures_v9.csv
python3 scripts/ground/build_ground_manifest.py world-data/jianghu_ground_textures_v9.csv web-dashboard/public/assets/ground/ground-manifest.json
```
Ketika user sudah punya gambar AI asli (nama file persis seperti kolom `file_name`), cukup menimpa PNG di `art_input/ground/` lalu jalankan 3 perintah terakhir lagi. Placeholder TIDAK BOLEH di-commit di `art_input/` (tambahkan `art_input/` ke `.gitignore`), tapi `public/assets/ground/*.webp` + manifest di-commit.
GERBANG B2: `validate_ground.py` → `96 / 96 PASS` (sudah terbukti lulus untuk placeholder). Total ukuran `public/assets/ground/` ≤ 6 MB.
Catatan jujur: placeholder prosedural punya garis silang samar di tengah (efek cross-fade). Itu hilang bila diganti gambar AI asli; bukan bug.

### B3. Loader tekstur (file baru `web-dashboard/src/lib/groundTextures.ts`)
```ts
export interface GroundManifest { tileSizePx:number; tilesPerTexture:number; terrains:Record<string,{family:string;variants:string[]}> }
class GroundTextures {
  manifest: GroundManifest|null = null
  images = new Map<string, HTMLImageElement|ImageBitmap>()
  patterns = new Map<string, CanvasPattern>()   // key: variantId
  ready = false
  async load(): Promise<void> // fetch '/assets/ground/ground-manifest.json', lalu load SEMUA variant id unik (<=96) via createImageBitmap(await (await fetch(url)).blob()); set ready=true; jika gagal: ready=false (renderer lama jadi fallback, JANGAN crash)
  familyOf(terrain:string): {family:string;variants:string[]}|null
  getPattern(ctx:CanvasRenderingContext2D, variantId:string): CanvasPattern|null // createPattern(img,'repeat') dan cache per variantId
}
export const groundTextures = new GroundTextures()
```
Panggil `groundTextures.load()` sekali dari tempat yang sekarang memanggil `atlasLoader` init (cari: `grep -rn "atlasLoader.load\|atlasLoader.init" web-dashboard/src`). Jangan blok render: jika `!ready`, renderer pakai jalur lama.

### B4. Renderer baru di `groundRenderer.ts` — fungsi `renderChunkGroundBitmapTextured`
Tambahkan fungsi baru; `renderChunkGroundBitmap` memanggilnya bila `groundTextures.ready`, jika tidak → kode lama (jangan hapus).
Algoritma (ikuti persis):
1. Kanvas chunk `CHUNK_SIZE*tileSize` persegi (CHUNK_SIZE=32 → 1728 px untuk tileSize 54).
2. Tentukan family tiap tile (`groundTextures.familyOf(t.terrainType)`; jika null → `plains`). Kumpulkan himpunan family yang muncul di chunk + border 2 tile (gunakan `getNeighborTerrain` untuk tile di luar chunk).
3. Urutkan family dengan prioritas "bawah→atas" (yang lebih bawah digambar duluan): `ocean, swamp, demonic_swamp, poison_pool, ice_crack, snow, desert_sand, dune, island_reef, canyon_floor, hill, plains, meadow, farmland, herb_field, forest_floor, bamboo_floor, dead_wood, miasma_waste, battlefield_ash, crater, volcanic, lava_flow, lightning_scar, abyss_edge, rock_ground, mountain_pass, ruin_floor, formation_tile, settlement_floor, road_stone`. (Family tak terdaftar → prioritas tengah.)
4. Untuk tiap family `F` (urut):
   a. Buat kanvas temp `T` ukuran penuh.
   b. Buat kanvas mask kecil `M` ukuran `(CHUNK_SIZE+4)×(CHUNK_SIZE+4)` piksel; tiap tile (termasuk border 2) = 1 piksel: alpha 255 jika family tile == F, selain itu 0.
   c. Gambar `M` ke kanvas mask besar `MB` (ukuran chunk + 2*2*tileSize) dengan `imageSmoothingEnabled=true`, `imageSmoothingQuality='high'` → tepi lembut ±1 tile. Lalu `ctx.filter='blur('+(tileSize*0.22)+'px)'` saat menyalin `MB` ke `MB2` agar tepi organik.
   d. Tambah gangguan tepi: lewati dahulu (opsional).
   e. Isi `T` dengan pola: untuk setiap blok 8×8 tile pada chunk, ambil `variantId = variants[hash2d(bx,by)%variants.length]`, `pattern = getPattern(ctxT, variantId)`, `pattern.setTransform(new DOMMatrix().translate(-worldPx % 216, ...).scale(0.84375))` di mana `worldPx = (tileX*tileSize)` blok tersebut, lalu `ctxT.fillStyle=pattern; fillRect(blokX, blokY, 8*tileSize, 8*tileSize)`. (Transform harus dihitung dari koordinat DUNIA agar menyambung antar chunk: `originX = -( (blockTileX*tileSize) mod 216 )`.)
   f. `ctxT.globalCompositeOperation='destination-in'; ctxT.drawImage(MB2,...)` → hanya bagian family F tersisa.
   g. Gambar `T` ke kanvas chunk.
5. Overlay makro (hilangkan repetisi): satu `fillRect` seluruh chunk dengan gradien radial per chunk: `alpha = 0.05 + 0.05*hash2d(cx*7+3,cy*13+5)/0xffffffff` hitam/putih bergantian; jangan lebih dari 0.1.
6. Setelah itu panggil `renderL3GroundDecal` seperti sebelumnya (dekal retakan/rumput kecil tetap dipakai), dan autotile jalan/sungai (Step 3 lama) — urutan: tekstur → autotile sungai/jalan → decal.
7. Performa: waktu render satu chunk ≤ 45 ms (ukur dengan `performance.now()` pada 20 chunk acak, log median & p95 ke console `[GROUND-PERF]`). Jika p95 > 80 ms: cache hasil per `cx,cy` sudah ada di `chunkManager.getChunkBitmap`; jangan render ulang tiap frame.
8. Bangun bitmap offscreen bila tersedia (`OffscreenCanvas`) tapi fallback ke `HTMLCanvasElement` seperti kode lama.

### B5. Jalan (road_stone) & tepi sungai
- Jalan: tekstur `road_stone` sudah ikut sebagai family teratas (mask lembut menghasilkan tepi jalan membaur ke rumput). Hapus pewarnaan abu "band" lama (`renderL1` untuk `road_stone` jika masih menggambar `#8f8a7c` datar).
- Tambahkan "tepi rumput" pada jalan: pada langkah 4c untuk family `road_stone` pakai blur lebih kecil (`tileSize*0.12`) supaya jalan tetap tegas.

### B6. Gerbang visual (Playwright; wajib)
Gunakan `scripts/captureAuthoredShots.js` sebagai contoh (Chromium + Playwright sudah terpasang). Buat `scripts/captureGroundShots.js` yang mengambil screenshot viewport 1280×720 di 10 titik tetap lalu simpan `review/shots/v9_ground/<nama>.png`:
```
xingcun_village 2050,2650 | canghai 3700,2550 | demon_gate 2500,800 | azure_pass 2600,3340 | desert_oasis 820,2220
frost_village 2350,4300 | lava_spine 1350,950 | lake_edge 3100,3100 | thunder_sect 2400,4000 | river_crossing 2036,2651
```
Untuk setiap screenshot hitung (dalam script, pakai `sharp` atau `pngjs`; jika belum terpasang, `npm i -D pngjs` dan JANGAN commit lock): (a) `uniqueColors` jumlah warna unik pada grid sampel 64×36 ≥ 400 (tanah tidak datar); (b) deviasi-standar luminans seluruh frame antara 6 dan 40; (c) rasio "kotak tampak": korelasi autokorelasi pada lag 54 px harus < 0.35 (cek di kolom piksel rata-rata baris). Cetak tabel. GERBANG B6: semua 10 baris lulus (a),(b),(c). Jika (c) gagal → perkecil blok varian ke 6×6 atau naikkan alpha overlay makro hingga 0.1.
Tempel 10 screenshot (nama file) di `review/report_v9.md`. Jangan klaim "terlihat bagus" — laporkan angkanya.

---------------------------------------------------------------------
## PROMPT C — SPRITE BURAM / RESOLUSI RENDAH
---------------------------------------------------------------------
**Terukur** (`world-data/scale-canon.json`, `pxPerTile` = piksel sumber per tile; layar 54 px/tile pada zoom 1, 108 pada zoom 2). Target: `pxPerTile >= 54` (hard) dan idealnya >= 96.
Keluarga di bawah 54 yang MASIH dipakai scatter/anchor (cek `config/known-frames.json`):
```
building_pagoda_tower 5.3 | building_sect_gate 5.3 | building_road_inn 8 | building_farm_hut 10.7
building_stone_torii 10.7 | building_tea_pavilion 10.7 | mt_ridge_double 15.2 | mt_karst_pillar 24.9
tree_cypress_frost 40 | tree_pine_ancient 40 | tree_dead_wood 40 (paling sering muncul)
karst_pillar_1x1 41.1 | pagoda_2x2 42.7 | mt_twin_peaks 43.7 | mt_bastion_wall 44.4
+ 6 landmark XXL (azure_mountain_sword_peak, thundersteppe_pillar, mist_insect_hive, abyssal_scar_chain, ...) 43–48
```
### C1. Script audit `scripts/auditSpriteRes.js`
Untuk tiap frame di `known-frames.json` yang punya entry canon: hitung `renderedScale = pxPerTile/54`. Hitung berapa kali frame itu dipakai di 400 chunk acak (pakai `objectScatter.getChunkObjects`, seed tetap) → tabel `frameFamily | pxPerTile | count | %`. Tulis CSV `review/lowres_frames_v9.csv`. Exit 1 bila ada frame dengan `count>0` dan `pxPerTile<24`.
### C2. Penggantian sementara (tanpa gambar baru)
Untuk 6 keluarga paling buruk (<=10.7 px/tile — gambar 32×32 diperbesar 5–10×) buat `world-data/frame-substitutions-v9.json`:
```
building_pagoda_tower_v1..4  -> building_spirit_pagoda   (85.3)
building_sect_gate_v1..4     -> sect_gate_3x2            (85.3)
building_road_inn_v1..4      -> building_wayside_tea_resting_shed (96)
building_farm_hut_v1..4      -> village_house_2x1        (85.3)
building_stone_torii_v1..4   -> building_ancestral_shrine_gate (71.2)
building_tea_pavilion_v1..4  -> pavilion_1x1             (64)
```
Di `objectScatter.resolveDef` (dan di `proceduralWorldEngine` bila anchor memakai frame ini) terapkan substitusi SEBELUM mengecek `KNOWN_FRAMES`. Ukuran footprint harus mengikuti frame pengganti (baca `visualW/visualH` canon), bukan frame lama.
### C3. Frame baru (yang user generate)
Buat `review/lowres_regen_prompts_v9.csv` (kolom `id,target_px,prompt`) untuk 11 keluarga sisanya yang ≥ 15 dan < 54 px/tile dengan resolusi sumber MINIMAL `visualW*108 × visualH*108` (contoh `tree_dead_wood` vis 2.5×3.5 → 270×378; `mt_twin_peaks` vis 6×8.794 → 648×950). Prompt: "single isolated {objek}, top-down 3/4 view, Chinese ink-wash gongbi, transparent background, soft rim light, no ground shadow, no text". Antigravity TIDAK mengganti sampai user menaruh PNG; sediakan script `scripts/importSprite.js <png> <frameId>` yang memasukkan ke atlas (reuse alur buildAtlas yang ada; `grep -rn "atlas" ROOT/scripts -l`).
### C4. Kenapa ada gumpalan gelap buram dekat Oase Shadi / Kota Yunxi
Ambil screenshot di (820,2220) dan (2200,2500) via `captureGroundShots` (tambahkan 2 titik). Cari objek yang dirender di area gumpalan: `node -e` panggil `getViewportObjects` pada bounds viewport, urutkan menurut `defId`, cetak 10 pertama beserta `pxPerTile`. Hampir pasti `tree_dead_wood_v*` (40 px/tile; siluet gelap). Perbaikan: di `dominance` scatter turunkan bobot `tree_dead_wood` menjadi 40% dari bobot sekarang, dan di region non-`dead_wood`/`miasma`/`demonic` BATASI maksimum 1 kluster per 16×16 tile. Laporkan angka sebelum/sesudah.
GERBANG C: `node scripts/auditSpriteRes.js` exit 0; tidak ada frame `<24` px/tile yang dipakai; `% objek dengan pxPerTile<54` di 400 chunk turun ≥ 60% dibanding baseline (cetak keduanya).

---------------------------------------------------------------------
## PROMPT D — DESA YANG BERBEDA, JALAN, PONDOK
---------------------------------------------------------------------
**Terukur:** 52 anchor tapi desa terlihat sama (rumah baris rapi, jalan abu lurus, alas pondok "disk" bulat). Layer authored (`authored-props.json`) ada 681 props + 60 jalan; tata letak dihasilkan satu pola (lajur y=cy±3/±7/±11). 

### D1. "Identitas desa" — 8 arketipe
Buat `world-data/village-archetypes-v9.json` (isi tepat ini):
```
river_village    : jalan EW sejajar sungai, dermaga kecil, 2 jemuran ikan, jembatan batu     (anchor: desa_xingcun, desa_bamboo_grove, desa_lingquan)
hill_terrace     : rumah bertingkat 3 teras mengikuti kontur, tangga batu, kebun teh         (desa_yougu, dusun_pondok_teh_kuno, dusun_kebun_persik)
desert_caravan   : rumah atap datar mengelilingi sumur pusat + tenda dagang                   (oase_shadi, desa_shaquan, dusun_oasis_tersembunyi, kota_hanhai)
frost_hamlet     : rumah rapat berbentuk lingkaran, tungku pusat, pagar kayu                  (desa_xueshan, dusun_pondok_es, kota_binghu, pos_tundra_utara)
steppe_camp      : tenda/yurt melingkar + kandang + tiang totem                               (desa_tianhe, dusun_gembala_petir, kota_leiyin)
coastal_fishing  : rumah panggung di tepi pantai, dermaga, jaring                             (dusun_pondok_karang, kota_canghai, dermaga_*)
demon_fort       : rumah gelap berpagar kayu runcing, gerbang tengkorak, obor                 (desa_heiyan, kota_moyun, benteng_gerbang_iblis)
garrison_town    : jalan salib NS/EW, pos penjaga di 4 sudut, tembok rendah                   (pos_perbatasan_qinghe, desa_tiedao, pos_menara_pantau_danau)
```
Anchor lain (kota besar/sekte) tetap pola lama tapi WAJIB mendapat ≥ 2 elemen unik dari daftar arketipe terdekat.
### D2. Generator
Buat `scripts/gen/buildVillagesV9.js` (jangan menimpa `build_authored.js` lama; salin lalu modifikasi):
- Seed per anchor = `hash(anchor.id) ^ WORLD_SEED`.
- Tiap arketipe punya fungsi `layout(anchor, rng) → props[]` dengan aturan: rumah tidak pernah berada dalam 2 tile dari tile air/solid (cek `getTileAt`), `canPlaceFootprint`, jarak antar rumah ≥ 1 tile, rotasi/varian rumah bervariasi (gunakan 6 frame hut terbaik dari `settlement_4`; hindari 100% frame sama — maks 35% satu `defId` per desa).
- Jalan: bukan satu garis lurus; gunakan 2 jalan melengkung (kurva Catmull-Rom ke titik-titik yang digeser rng ±3 tile), lebar 2 untuk jalan utama dan 1 untuk gang, terrain `road_stone`. Setiap jalan berakhir di rumah/dermaga/gerbang (tidak buntu di tanah kosong).
- Setiap desa punya 1 "titik pusat" (sumur/pohon/totem/tungku — frame yang SUDAH ada di atlas; jika tidak ada gunakan `marker_quest_beacon`).
- Output ke `world-data/authored-props.json` (ganti isi desa lama; simpan cadangan `authored-props.v8.bak.json`).
### D3. Alas pondok bulat
Terukur: frame hut di `settlement_4` memiliki alas "disk diorama" bulat sehingga menempel seperti stiker. Perbaiki di renderer (bukan gambar): untuk objek ber-tag `hut`, tambahkan drop-shadow elips semi-transparan (`rgba(0,0,0,0.22)`, radius = 0.45×lebar frame, tinggi 0.18×lebar, di dasar) SEBELUM menggambar sprite, dan potong alas dengan `clip` elips menggunakan `ctx.ellipse` — jika alas tidak terpisah dari sprite (tak bisa dipotong), dokumentasikan itu di report dan minta user men-generate ulang 42 hut tanpa alas (CSV `jianghu_hut_assets_v8.csv` + kata "no circular base, no diorama ground").
### D4. Gerbang D
`scripts/checkAuthored.js` baru memeriksa: tidak ada 2 desa dengan fingerprint tata-letak sama (hash dari posisi relatif props ke anchor) → `uniqueLayouts == 52`; per arketipe rumah ≥ 6 tile dari air; `% defId dominan per desa ≤ 35`; semua jalan terhubung ke ≥ 1 bangunan; BFS: pusat tiap desa terjangkau dari jalan utama dalam radius 12. Cetak tabel per desa.

---------------------------------------------------------------------
## PROMPT E — LAPISAN TANTANGAN (monster, elit, boss, bahaya, akses)
---------------------------------------------------------------------
**Terukur:** engine tidak pernah mengisi `spawnedMonster` (grep: hanya dibaca, tidak diisi) → dunia terbuka kosong dari lawan. `bestiary-v2.json` memakai TEMPLATE TIER yang sama di semua region (rusa/babi/bangau/rubah) — tidak unik, tidak sesuai medan. Tidak ada hazard per region, `region.dangerTier` tidak dipakai.

### E1. Data (sudah disiapkan)
`world-data/region_challenge_v9.json` memuat per region: `lair`, `eliteCamps[3]`, `hazardZone`, `hazard{kind,label,pctMaxHpPer10Steps,counterItem}`, `uniqueCommons[3]`, `uniqueElite`, `bossMechanic`, `signature`, dan `access` untuk region tersegel. Item penangkal baru yang harus ada di tabel item game: **item_antidote_pill, item_cold_pill, item_flying_sword, item_frost_ward_cloak, item_holy_talisman, item_incense_repel, item_lightning_rod_talisman, item_void_key, item_void_ward_stone, item_water_gourd, item_water_walk_charm, item_wind_ward_cloak**. Cari tempat item didefinisikan (`grep -rn "item_" ROOT/config ROOT/data 2>/dev/null | head`) dan tambahkan item yang belum ada dengan format item yang sudah ada (nama Indonesia, harga masuk akal, sumber: toko kota region itu atau drop elit).

**TABEL SPESIES UNIK (jangan diubah, jangan dibuat generik):**
| region | 3 monster biasa | elit | mekanik boss |
|---|---|---|---|
| central_plains | Rusa Bintik Fana, Bangau Bulu Salju, Rubah Ekor Cokelat | Serigala Padang Berbulu Besi | Boss melempar umpan: 2 anak buah tiap 25% HP |
| nine_springs_delta | Katak Lotus Giok, Lintah Sungai Raksasa, Bangau Pemancing Hitam | Naga Sungai Muda | Boss memanggil gelombang air (knockback 3 petak) |
| azure_mountain_range | Kambing Gunung Awan, Elang Tebing Biru, Beruang Batu Azure | Harimau Salju Pedang | Boss di celah Mist Pass: arena 21x21, ada pilar pedang jatuh |
| northern_desolate | Rusa Es Bertanduk Kristal, Serigala Salju Putih, Beruang Kutub Tulang | Mammoth Es Berbulu Hitam | Boss membekukan petak sekitar (immobilize 1 giliran) |
| thundersteppe | Kuda Petir Liar, Ular Statis, Elang Guntur | Banteng Guntur Bertanduk Besi | Boss: serangan beruntun bila HP lawan pakai logam |
| godthunder_peaks | Naga Kecil Awan, Rajawali Petir Putih, Golem Kilat | Hakim Petir Tingkat 7 | Boss: ujian tribulasi 3 gelombang |
| mirror_lake | Siluman Bayangan Cermin, Ikan Pedang Perak, Kura-kura Cermin | Pendekar Bayangan Danau | Boss meniru stat pemain (mirror) 50% |
| beast_prairies | Bison Taring Emas, Hyena Padang Merah, Elang Pemburu | Raja Kawanan Singa Padang | Boss memanggil kawanan 3 elit |
| western_sacred_desert | Kalajengking Pasir Emas, Ular Derik Putih, Unta Liar | Cacing Pasir Raksasa | Boss menyergap dari bawah pasir (hanya muncul 1 kali/menit) |
| western_gorge_labyrinth | Kelelawar Ngarai, Ular Batu Merah, Laba-laba Kapur | Minotaur Batu Pasir | Boss labirin: pintu berubah tiap 60 detik |
| hermit_highlands | Kera Bijak Kabut, Rusa Giok Tua, Ular Awan | Pertapa Gila Berjubah Kabut | Boss mengajukan teka-teki bela diri (3 pilihan) |
| border_march | Prajurit Bayangan Tombak, Kuda Perang Tak Bertuan, Pemanah Gurun | Kapten Pasukan Besi | Boss: komandan dengan 2 pemanah |
| lava_spine | Kadal Magma, Burung Api Abu, Golem Basal | Salamander Lava Raksasa | Boss mengubah lantai menjadi lava (petak bergilir) |
| venom_mire | Katak Beracun Neon, Ular Rawa Hijau, Lintah Berbisa | Hydra Rawa Tiga Kepala | Boss: kepala regenerasi, bunuh urut |
| southern_demon_domain | Iblis Kecil Berbulu Gelap, Anjing Neraka, Kelelawar Darah | Panglima Iblis Berkepala Tanduk | Boss: fase iblis kedua di 40% HP |
| crimson_battlefield | Prajurit Mayat Hidup, Gagak Perang, Hantu Perwira | Jenderal Tanpa Kepala | Boss memanggil pasukan hantu tiap 20% HP |
| abyssal_scar | Cacing Jurang, Bayangan Rantai, Mata Terbang Kosong | Penjaga Rantai Hampa | Boss mengisap pemain ke tengah arena |
| southern_plague_woods | Tikus Wabah, Rusa Busuk, Jamur Hidup | Raja Lalat Pembusuk | Boss: debuff stacking racun |
| bone_sea_coast | Kepiting Tulang, Burung Camar Mayat, Ular Laut Tulang | Kerangka Leviathan Muda | Boss memanggil rusuk-rusuk dari pasir |
| spirit_wood_sea | Rusa Roh Hutan, Kupu-kupu Spora, Ular Akar | Banyan Roh Penjaga | Boss meregenerasi dari akar kecuali dibakar |
| mist_insect_valley | Semut Raksasa Kitin, Kumbang Kabut, Laba-laba Sutra | Ratu Lebah Kitin | Boss: sarang spawn larva tiap 30 detik |
| formation_barrens | Golem Formasi, Roh Batu Bagua, Ular Giok Penjaga | Penjaga Array Retak | Boss: perubahan formasi (4 arah penyerangan) |
| sword_gorge | Kelelawar Pedang, Elang Ngarai, Roh Pedang Karat | Hantu Pendekar Pedang | Boss: tebasan area horizontal tiap 5 detik |
| ore_teeth_range | Kumbang Bijih, Kerdil Tambang Hantu, Golem Bijih | Raja Kerdil Tambang | Boss: runtuhan memblokir jalan sementara |
| eastern_sea | Kepiting Karang, Penyu Giok, Ikan Terbang Hiu | Hiu Naga Laut | Boss: pusaran air di arena pulau karang |
| frostmoon_sea | Anjing Laut Es, Paus Kecil Beku, Burung Es | Naga Beku Muda | Boss: tengkorak naga beku bangkit |
| floating_wind_isles | Burung Layang Awan, Roh Angin, Golem Awan | Penjaga Citadel Daois | Boss: platform jatuh bertahap |
| immortal_ruins_valley | Roh Pelayan Kuno, Patung Hidup, Burung Giok | Penjaga Gerbang Surgawi | Boss: ujian kebajikan 3 pintu |
| void_rift | Cacing Ruang, Bayangan Terdistorsi, Mata Hampa | Pemakan Dimensi | Boss: serangan dari semua sisi, singularitas |

### E2. Aturan "unik per region"
Buat `scripts/checkBestiaryUnique.js`: (a) tiap region punya 3 nama common yang TIDAK muncul di region lain (dibandingkan lowercase); (b) elit unik; (c) boss id sudah unik. Ubah `bestiary-v2.json`: ganti `common[]` tiap region dengan 3 spesies baru dari tabel; id = `${region}__${slug(name)}`; stat dasar ambil dari template lama sesuai tier (`level`, `hp` dll.), sesuaikan level dengan `dangerTier` region: level = `tierLevelBase[dangerTier] ± 2` dengan `tierLevelBase = {1:4, 2:12, 3:24, 4:40, 5:60, 6:80}` (jika region.dangerTier > 6 pakai 80+10*(t-6)). Boleh mempertahankan `icon` template. Tambahkan field `mechanic` untuk boss berisi teks `bossMechanic`.

### E3. Mesin spawn `utils/monsterSpawnEngine.js` (BARU)
API:
```js
getMonstersInBounds(minX,minY,maxX,maxY) -> Map<"x,y", SpawnedMonster>
getMonstersInChunk(cx,cy) -> Map
```
Aturan (deterministik; pakai `mulberry32(WORLD_SEED ^ (cx*73856093) ^ (cy*19349663))`):
1. Region chunk = `getRegionAt(cx*32+16, cy*32+16)`; data = `region_challenge_v9.json` + `bestiary-v2.json`.
2. **Anggaran per chunk** menurut `region.dangerTier`: `{1:2, 2:3, 3:4, 4:5, 5:6, 6:6}` monster biasa (maksimum). Jika chunk berada di < 2 chunk dari anchor → 0.
3. Kandidat tile: acak 40 percobaan per chunk; tolak jika: `isSolid`, terrain air (`/river|lake|sea|ocean|pond|lava|poison_pool/`), `road_stone`, jarak ke anchor mana pun < 20 tile (buffer `safeBufferSettlements`), jarak ke polyline jalan authored/override < 10 tile (`safeBufferRoads`) — bangun index spasial grid 64 sekali, objek `collision==='solid'` dari `objectScatter.getChunkObjects(cx,cy)` (key `x,y`), tile dalam 14 tile dari `lair` atau `eliteCamp` (agar area itu hanya diisi unik), 2 monster tidak boleh < 5 tile satu sama lain.
4. Spesies dipilih by bobot (`spawnWeight`) dari `common` region; 10% peluang `isAggressive=true` pada tier ≥ 2.
5. **Kamp elit**: tiap `eliteCamps[i]` selalu aktif: 1 elit (`uniqueElite`, level +4) di titik, 3 monster biasa dalam radius 2–4 tile (posisi ditentukan seed `hash(region,i)`), `isAggressive=true`. Tile kamp: tambahkan dekal api unggun (frame yang sudah ada; jika tak ada, abaikan).
6. **Boss**: di `lair` pada jam `spawnHours` (waktu server UTC+7 — baca jam dari `Date`); di luar jam tampil sebagai tile "Sarang Kosong" (tanpa monster). Footprint boss 4×4 → hanya tile pusat yang memuat `spawnedMonster`, 15 tile sisa `blocked:true`.
7. Bentuk `SpawnedMonster` WAJIB persis `web-dashboard/src/types/world.ts` `SpawnedMonsterData` (baca file itu; field minimal: `key,name,tier,hp,maxHp,atk,def,spd,icon,isAggressive,level,isElite,isBoss`). Rumus stat bila template tak punya: `hp=floor(40+level*18)`, `atk=floor(8+level*3)`, `def=floor(4+level*1.5)`, `spd=floor(8+level*0.6)`; elit ×2.2 hp ×1.5 atk; boss ×8 hp ×2 atk.
8. **Tile kunci** untuk `DefeatedMonsterTile` = `"${x},${y}"` (sama dengan yang dipakai `world.js` ±1936). Respawn: biasa 10 menit, elit 30 menit, boss 6 jam (cek `battle.js` ±882 yang menulis `respawnAt`; samakan nilainya, jangan hardcode baru).
9. Cache LRU 512 chunk. Target waktu: `getMonstersInChunk` p95 ≤ 3 ms.

### E4. Pemasangan di dua jalur
- `web-api/routes/world.js` ±1953 (bagian `/zone/:zoneId` viewport): SETELAH `proceduralTileMap` terbentuk dan SEBELUM blok "Bersihkan monster dari petak respawn", isi `tile.spawnedMonster` dari `getMonstersInBounds(viewport.bounds...)` bila belum ada.
- `utils/chunkStreamingEngine.js` `getChunkLive` ±415–435: tambahkan monster dari `getMonstersInChunk(cx,cy)` ke tile sebelum filter `defeatedMonsterKeys` (agar `DefeatedMonsterTile` menghapus monster yang sudah dikalahkan).
- Klien (`WorldCanvas.tsx` ±1202, `GridTileInspectorCard.tsx`, `ZoneGridView.tsx`) SUDAH menggambar & menantang `spawnedMonster`. Tambahkan HANYA: garis tipis merah di sekeliling kamp elit dan ikon tengkorak di atas boss (gunakan fungsi gambar marker yang sudah ada).

### E5. Hazard region (`utils/regionHazardEngine.js`, BARU)
- Baca `hazard` dari `region_challenge_v9.json` berdasar region tile tujuan.
- Tambahkan field `hazardStepCounter:{type:Number,default:0}` di model `Player` (cari: `models/Player.js`).
- Di `/zone/move` (`world.js` ±2482) SETELAH langkah sukses: `hazardStepCounter += jarak langkah`; bila `>= 10` → reset (`-=10`), hitung `dmg = max(1, floor(maxHp * pct/100))`; di dalam `hazardZone` radius 15 → `pct × 2`. Jika pemain punya item `counterItem` di inventori (cek struktur inventori: `grep -rn "inventory" models/Player.js`): `dmg = 0` dan response `mitigated:true`. `kind==='none'` → tidak ada efek. **Jangan membunuh**: HP minimum 1. Hazard tipe lain (`maze, stampede, war, wraith, array, collapse, spore, spirit, storm, fall, flood, mist`) = efek ringan: tetap berikan teks `label` di response `hazard:{kind,label,damage,mitigated}`; efek spesifik tipe di E5b.
- E5b efek tipe (sederhana, integer): `cold/heat/poison/plague/insect/wind/void/lightning`: damage di atas. `stampede/war/wraith`: 5–10% peluang `ambush` (spawn monster aggressive 1 tile di dekat pemain, dari spesies region). `array`: 10% teleport ke tile non-solid acak radius 30. `collapse`: 6% → petak ±3 tile ditandai `blockedUntil` 60 detik. `mist`: kirim `visionRadiusMultiplier:0.5` ke klien (klien boleh abaikan). `flood/storm/fall/spore/spirit/maze`: hanya teks flavor + 3% peluang ambush.
- Respons `/zone/move` dan UI: tampilkan toast `hazard.label` (sederhana, `console`/toast yang ada).
GERBANG E5: `scripts/testHazard.js` memakai fungsi murni `applyHazard(playerStub, region, steps)`: untuk `northern_desolate` 100 langkah tanpa item → total damage = 10×floor(maxHp×1/100) (maxHp 1000 → 100); dengan item → 0; HP tidak pernah < 1.

### E6. Boss mekanik
Tambahkan `mechanic` ke respons battle awal (`battle.js` saat boss dipilih): teks `bossMechanic` + `phases` bila ada kata "fase"/"tiap 25%" → jadwalkan di `battle.js` hanya dengan flag `bossPhases:[{atHpPct:25,action:'summon',count:2}]` jika sistem battle mendukung; jika tidak mendukung SKIP implementasi dan catat "mekanik hanya teks" (JANGAN membuat sistem battle baru).

### E7. Akses ke region tersegel
- `frostmoon_sea`: hanya via ferry `donghai_to_frostmoon` (A3). Pemain boleh berjalan di dalam region setelah tiba.
- `floating_wind_isles`: butuh item `item_flying_sword` ATAU naik ferry `eastern_port_to_turtle_island` (Pulau Penyu berada di raster region ini; itu sah).
- `void_rift`: butuh item `item_void_key` (drop boss `abyssal_scar`). Tambahkan ke tabel drop boss itu.
- Di `/zone/move`: bila region tile tujuan ∈ {frostmoon_sea, floating_wind_isles, void_rift} dan region tile asal BUKAN region yang sama dan pemain tidak memenuhi akses → HTTP 403 `{error:"Wilayah ini tersegel. <note>"}` dengan `note` dari `access.note`. Arrival lewat ferry/teleport tidak melewati `/zone/move` sehingga lolos.

### E8. Tes & gerbang Prompt E (`scripts/testChallenge.js`; exit 1 bila gagal)
1. Determinisme: `getMonstersInChunk` 3× untuk 50 chunk acak → hasil identik.
2. Buffer: 300 chunk acak: 0 monster < 20 tile dari anchor, 0 monster < 10 tile dari jalan, 0 di tile solid/air.
3. Kepadatan: median monster per chunk di region dangerTier 1 ∈ [1,2]; tier ≥ 4 ∈ [3,6]. Cetak median per region.
4. 145 titik (lair/elit/hazard): `getTileAt(...).isSolid==false`, region cocok, dan (kecuali region SEALED) terjangkau dari Xingcun.
5. Keunikan: `checkBestiaryUnique.js` exit 0 (87 spesies common unik + 29 elit unik).
6. Tidak ada `Math.random` di `monsterSpawnEngine.js` (`grep`).
7. Respawn: kalahkan monster (panggil handler `DefeatedMonsterTile` secara langsung), lalu `/zone/:zoneId` → monster di tile itu hilang; sisa chunk tidak berubah.
8. Waktu: `getChunkLive` p95 naik ≤ 3 ms dibanding baseline.
Setiap butir dicetak dengan angka. Tempel ke `review/report_v9.md`.

---------------------------------------------------------------------
## PROMPT F — PEMBERSIHAN & LAPORAN JUJUR
---------------------------------------------------------------------
F1. Perbaiki `review/report.md` lama: hapus klaim yang tidak diukur. Buat `review/report_v9.md` memakai SKELETON ini (isi angka asli):
```
# Laporan V9 — <tanggal>
Commit awal: <hash>  Commit akhir: <hash>
## Hasil gerbang (angka asli)
A1 anchor mismatch: sebelum <n> -> sesudah <n>
A2 Donghai reach: <YES/NO> ; Penyu: via ferry
A3 ferry rows OK: <x>/<y>
A4 lair valid: <x>/29 ; solid% max <n>
B2 ground validate: <x>/96 ; ukuran folder <MB>
B6 shots: <n> file ; tabel (a)(b)(c) per shot
C  low-res share sebelum <n>% -> sesudah <n>%
D  uniqueLayouts <x>/52
E  testChallenge 8 butir: <angka masing-masing>
## Yang GAGAL / belum selesai (jujur)
## File yang diubah
```
F2. Jumlah screenshot yang disebut di report HARUS sama dengan `ls review/shots/v9_ground | wc -l`. Waktu render yang dilaporkan HARUS hasil ukur nyata.
F3. Jalankan semuanya sekali lagi dari bersih: `node scripts/audit_world_v9.js && node scripts/checkAuthored.js && node scripts/checkFerry.js && node scripts/checkLairs.js && node scripts/checkBestiaryUnique.js && node scripts/testChallenge.js && node scripts/testHazard.js && python3 scripts/ground/validate_ground.py web-dashboard/public/assets/ground world-data/jianghu_ground_textures_v9.csv`. Semua exit 0.
F4. `cd web-dashboard && npx tsc --noEmit` (0 error baru) dan `npm run build` sukses.
F5. `git status`; commit; baru push. Jangan push jika ada gerbang GAGAL — laporkan ke user apa yang gagal.

---------------------------------------------------------------------
## LAMPIRAN — YANG BELUM DIKERJAKAN (jangan dikerjakan sekarang)
---------------------------------------------------------------------
- 8 aset adegan air yang masih hilang (`review/missing_scene_assets_v8.csv`): bangkai kapal, kerangka naga, pulau awan melayang, paviliun angin, gunung es, kapal hantu, lengkung rusuk leviathan, jembatan batu tenggelam. Menunggu gambar dari user.
- Sistem battle baru, fase boss kompleks.
- Mengubah raster region.
