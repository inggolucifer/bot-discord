<USER_REQUEST>
/plan # PROMPT MASTER V10 — KONTRAK GRID, COLLISION, ASET, REGION, TANAH
# Untuk Antigravity. Kerjakan BERURUTAN: 0 → G → H → I → J → K → L. Satu langkah sekali. Jangan lompat.
# Basis repo: commit `2c70e3f` (HEAD saat prompt ini ditulis). Folder kerja `ROOT` = `jianghu-bot`.

---------------------------------------------------------------------
## 0. ATURAN KERJA (WAJIB — dilanggar = pekerjaan dianggap GAGAL)
---------------------------------------------------------------------
0.1 Baca juga `AGENTS.md` (root repo & `jianghu-bot/AGENTS.md`). Sebelum selesai: `cd web-dashboard && npx tsc --noEmit` (0 error) dan semua skrip gerbang prompt ini exit code 0.
0.2 **DILARANG** menulis "PASS" tanpa angka asli. Tiap gerbang: cetak angka sebenarnya vs target. Jika gagal tulis `GAGAL: <angka> vs <target>` lalu PERBAIKI, jangan ubah target.
0.3 **DILARANG menyalin logika produksi ke dalam skrip tes** (AGENTS.md 3.12). Tes harus meng-`require`/`import` modul produksi yang sama dengan yang dipakai game.
0.4 **Gerbang visual WAJIB memotret peta sungguhan** (lihat Prompt 0). Pada V9 sepuluh screenshot gerbang B6 ternyata IDENTIK dan hanya berisi halaman landing (angka 607 / 23.50 / 0.195 sama di 10 titik). Itu gerbang palsu. Jika dua screenshot di lokasi berbeda punya hash file sama → gerbang otomatis GAGAL.
0.5 Jangan menebak nama fungsi/file. `grep -rn` dulu. Jika sesuatu tidak ada, catat di `review/report_v10.md`.
0.6 Tanpa `Math.random()` di engine dunia (pakai `createPRNG` / hash2d yang sudah ada).
0.7 Commit kecil per langkah: `V10 <huruf><no>: <ringkas>`. Jangan commit `package-lock.json`, `.env`, `node_modules`, folder `art_input/`. Jangan push sebelum Prompt L selesai dan semua gerbang lulus.
0.8 Salin file pendukung dari folder `v10_pack/` (dikirim bersama prompt) ke posisi ini SEBELUM mulai:
```
v10_pack/code/gridContract.js                 -> ROOT/utils/gridContract.js
v10_pack/data/grid-canon-v10.json             -> ROOT/world-data/grid-canon-v10.json      (akan DIBANGUN ULANG di G2; ini versi referensi)
v10_pack/data/sprite-bbox.json                -> ROOT/world-data/sprite-bbox.json         (dibangun ulang di G1)
v10_pack/data/asset-placement-rules-v10.json  -> ROOT/world-data/asset-placement-rules-v10.json
v10_pack/data/boss-sprites-v10.json           -> ROOT/world-data/boss-sprites-v10.json
v10_pack/data/region-palettes-v10.json        -> ROOT/world-data/region-palettes-v10.json
v10_pack/data/asset_coverage_baseline.json    -> ROOT/review/asset_coverage_baseline.json
v10_pack/scripts/computeBBox.py               -> ROOT/scripts/computeBBox.py
v10_pack/scripts/snapCanonV10.js              -> ROOT/scripts/snapCanonV10.js
v10_pack/scripts/captureWorld.cjs             -> ROOT/scripts/captureWorld.cjs
```

---------------------------------------------------------------------
## 1. TEMUAN HASIL AUDIT (semua DIUKUR di commit 2c70e3f, bukan tebakan)
---------------------------------------------------------------------
Sampel: 220 chunk acak = 15.371 objek; 160 chunk = 7.775 objek; peta asli dipotret dengan Chromium.

| # | Temuan | Angka terukur |
|---|---|---|
| F1 | Engine dan renderer memakai RUMUS BERBEDA untuk `collision.offsetX`: engine menaruh footprint di `x + round(offsetX)` (objectScatter.js ±L472–474), renderer menaruh PUSAT sprite di `x + offsetX` (WorldCanvas.tsx ±L975–987). Satu angka, dua arti → sprite dan petak yang diblokirnya bergeser. | 49% sprite tidak sejajar petaknya |
| F2 | Tepi kiri sprite jatuh di pecahan petak (setengah-grid): `visualW` pecahan (1.2, 2.25, 2.5, 3.5…) dan `offsetX` pecahan (0.1, 0.25, 0.75…). Inilah "objek di antara 2 grid". | 74% objek |
| F3 | Objek ber-`collision:"soft"/"solid"` bertipe STRING di scale-canon → `canon.collision.w` = `undefined` → loop footprint tidak jalan → **objek TIDAK MENGUNCI petak sama sekali** (semua pohon, banyak batu/semak). | 36% objek tanpa okupansi |
| F4 | Bagian atas sprite (tajuk pohon, puncak gunung) tidak punya reservasi: hanya petak dasar yang dihitung. | 58% sprite lebih lebar dari footprint+1; 9% pasangan objek tumpang tindih visual; 1.311 kasus tajuk menutupi kaki objek di belakangnya |
| F5 | `occupiedGrid` dibuat BARU per chunk (objectScatter.js ±L591) → objek di tepi chunk tidak tahu tetangganya → tumpang tindih di jahitan chunk. | termasuk di F4 |
| F6 | **Server hanya menandai petak ASAL (`o.x===x && o.y===y`) sebagai solid** (world.js ±L1993–1998 dan `getEffectiveTile` ±L2262–2268; chunkStreamingEngine.js ±L315). Gunung 4×3 atau rumah 6×5 bisa DITEMBUS kecuali 1 petak. | semua objek multi-petak |
| F7 | Rumah (`hut_*`) footprint 1×1 tetapi sprite digambar 1,2 petak; rumah anchor (`village_house_2x1`, `building_village_thatched_cottage`) digambar 3,6 petak di atas footprint 1 petak (kotak oranye 1 petak di screenshot). | terlihat di screenshot Xingcun |
| F8 | **Hanya 60 dari 287 keluarga aset yang pernah dimunculkan engine.** 222 keluarga tidak pernah muncul: 75 bangunan (village/wayside/rustic/prof/town), 31 sprite `monster_regional_*`, 10 penanda `monster_*`, 2 `mount_*`, 105 `structure_interior_*` (interior, memang bukan peta luar). Daftar: `review/asset_coverage_baseline.json`. | 222 keluarga |
| F9 | Identitas region lemah: pohon persik 38% di thundersteppe & 35% di border_march; padang pasir 39% `tree_dead_wood`; `frostmoon_sea` berisi teratai/alang-alang; region sepi terisi 3 keluarga yang sama. | lihat tabel J |
| F10 | Tanah masih tampak papan catur: bitmap chunk dibangun SEBELUM `groundTextures.ready` lalu di-cache selamanya (screenshot menunjukkan blok kotak luminans per-petak = jalur lama). Selain itu varian ganti per blok 8×8 → jahitan keras. | screenshot |
| F11 | Jalan abu-abu buram: mask family di-blur `tileSize*0.22` → tepi jalan tidak menempel garis grid. | screenshot |
| F12 | Gerbang visual V9 palsu (lihat 0.4). Penyebab: skrip memakai `http://127.0.0.1:3000` — Next.js dev memblokir sumber daya dev dari `127.0.0.1` sehingga halaman tidak ter-hidrasi (hanya landing). **Gunakan `http://localhost:3000`.** | 10 screenshot identik |

---------------------------------------------------------------------
## 2. KONTRAK GRID (hukum tertinggi — semua kode wajib patuh)
---------------------------------------------------------------------
Keputusan desain dari pemilik game: **1 rumah = footprint 1×1 petak.** Desa, sekte, kota, landmark BOLEH lebih dari 1×1.

```
1. obj.x, obj.y     = sel KIRI-ATAS footprint (integer).
2. footprint        = sel [x, x+fw) × [y, y+fh).  Inilah yang memblokir/menyimpan tanah.
3. canopy           = sel [x, x+fw) × [y-rowsAbove, y).  Badan visual di atas footprint; DIRESERVASI agar tak tumpang tindih.
4. Lebar KONTEN sprite (piksel bukan-transparan) = vw petak, vw BULAT dan vw == fw, di-tengahkan di footprint
   => tepi kiri/kanan sprite SELALU tepat di garis grid.
5. Dasar KONTEN sprite = y+fh persis (garis tanah). Tinggi konten vh = vw × (tinggiKonten/lebarKonten) (boleh pecahan; hanya ke ATAS).
6. mode: 'solid' (memblokir jalan) | 'soft' (bisa dilewati tapi tetap menyimpan sel) | 'none' (dekor 1×1, tidak menyimpan sel).
7. Tidak ada dua footprint tumpang tindih. Tidak ada canopy yang menutupi footprint/canopy objek lain (CANOPY_OVERLAP_ALLOWED=false).
   Hanya dekor mode 'none' (bunga, herba kecil, marker) boleh berada di bawah canopy.
8. Setiap objek (footprint+canopy) HARUS seluruhnya berada di dalam 1 chunk 32×32 (kecuali set-piece anchor/landmark/authored — lihat G4) → mustahil bertumpuk di jahitan chunk.
9. Satu-satunya sumber ukuran: `world-data/grid-canon-v10.json` lewat `utils/gridContract.js`. DILARANG memakai `collision.offsetX`, `visualW` lama, atau `def.footprint` lama untuk menaruh/menggambar objek.
```
Kelas ukuran (hasil `snapCanonV10.js`, sudah diuji): `house` 1×1 (33 frame: semua `hut_*`, `village_house_2x1`, cottage, shack, hermitage) • `tree_s` 1×1 (31) • `tree_l` 2×1 (9) • `bamboo_s` 1×1 / `bamboo_l` 2×1 • `rock_1/2/3` • `nature_1/2/3` • `node` 1×1 (resource/relic, solid) • `marker` 1×1 mode none • `mountain_2..5` (fw=vw, fh=ceil(vw/2), solid) • `building_1..4` (rumah-rumahan/ bangunan kecil 1×1 s/d 4×2) • `landmark` 6–9 lebar, `water_scene` 3–6.
Bukti kelayakan (percobaan nyata pada salinan engine, 160 chunk acak): tumpang tindih visual turun **2,25% → 0,008%**; kepadatan median **65 objek/chunk** (tidak jadi gersang).

---------------------------------------------------------------------
## PROMPT 0 — HARNESS GAMBAR SUNGGUHAN + BASELINE (kerjakan PERTAMA)
---------------------------------------------------------------------
0-1. Jalankan dashboard: `cd web-dashboard && npx next dev -p 3000` (terminal terpisah). **Buka selalu lewat `http://localhost:3000`, bukan 127.0.0.1.**
0-2. Pakai `scripts/captureWorld.cjs` (sudah teruji; menjalankan stub API di :3001 memakai `chunkStreamingEngine` produksi, lalu Playwright Chromium). Pemakaian:
```
node scripts/captureWorld.cjs '[{"name":"xingcun","x":2050,"y":2650,"zoom":1},{"name":"azure","x":2600,"y":3330}]' review/shots/v10_baseline
```
Di Windows tambahkan opsi Chrome bila Chromium bawaan tidak ada: `launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' })` (ubah satu baris di skrip).
0-3. Tambahkan di `scripts/captureWorld.cjs` pemeriksaan WAJIB per screenshot (keluar dengan exit 1 bila gagal):
   a. `window.__chunksReady === true` dalam 25 detik, `window.groundTextures.ready === true`.
   b. Piksel pusat dan 8 titik grid layar BUKAN warna landing/loader (`#070a14`/gelap seragam): luminans std seluruh frame ≥ 8.
   c. Tulis `sha1` file; semua shot dalam satu run harus punya sha1 BERBEDA.
   d. Cetak `window.__debugMetrics` (spriteCount, uniqueDefIds, …).
0-4. Ambil baseline 12 titik ke `review/shots/v10_baseline/`: `xingcun 2050,2650` `yunxi 2200,2500` `bamboo 1850,2800` `azure 2600,3330` `oase 820,2220` `thunder 2400,4000` `frost 2350,4300` `lava 1350,950` `demon 2500,800` `canghai 3700,2550` `donghai 3920,2700` `wild 2300,3000`.
0-5. Baseline numerik (simpan ke `review/baseline_v10.txt`): jalankan `node scripts/measure_scatter.js`, dan skrip `scripts/auditGridV10.js` yang kamu buat di G6 (jalankan versi awal yang hanya menghitung pelanggaran, tanpa gagal).
GERBANG 0: 12 shot, 12 sha1 berbeda, semua lolos (a)(b). Lampirkan nama file di `review/report_v10.md`.

---------------------------------------------------------------------
## PROMPT G — IMPLEMENTASI KONTRAK GRID (inti pekerjaan)
---------------------------------------------------------------------
### G1. Bounding-box konten sprite
`python3 scripts/computeBBox.py` → `world-data/sprite-bbox.json` (732 frame; piksel alpha>24). Gerbang: jumlah entri ≥ 700; frame `hut_hunter_thatched_day` harus punya `y0≈0.10 y1≈0.89` (hasil terukur: 0.1016 / 0.8945).
### G2. Bangun `grid-canon-v10.json`
`node scripts/snapCanonV10.js`. Hasil referensi terukur: 405 frame; `house` 33; `tree_s` 31; `tree_l` 9; `mountain_2` 34; `nature_1` 58; `building_1` 44; `building_2` 49; `building_3` 28; `landmark` 29. Cek sampel (harus sama):
```
hut_hunter_thatched_day   house   fw1 fh1 vw1 vh0.793
tree_dead_wood_v1         tree_s  fw1 fh1 vw1 vh1.528 rowsAbove 1
mt_twin_peaks_v1          mountain_2 fw2 fh1 vw2 vh2.484 rowsAbove 2
sect_gate_3x2             building_4 fw4 fh2
landmark_central_plains_tianjing_palace_gate  landmark fw8 fh4 vw8
```
Toleransi `rowsAbove = ceil(vh - fh - 0.05)` (JANGAN 0.25: itu menyisakan sliver tumpang tindih).
Tambahan manual di `snapCanonV10.js` (blok `overrides` di akhir): sprite boss `monster_regional_*` → `{class:'boss', fw:2, fh:2, vw:2, mode:'solid'}`; penanda `monster_*` & `ring_monster_*` → mode `none` (digambar oleh sistem monster, bukan scatter).
### G3. Modul `utils/gridContract.js` (sudah ditulis & diuji di `v10_pack/code/`)
API: `getGrid(defId)`, `footprintRect`, `canopyRect`, `visualRect`, `cellsOf`, `isFree(x,y,g,occupied)`, `mark(x,y,g,occupied,id)`, `insideChunk(x,y,g)`. **Tambahkan** tiga fungsi:
```js
// objek yang MENUTUP sel (x,y) lewat footprint; periksa chunk sel + tetangga kiri/atas (set-piece sampai 9 lebar)
function getObjectCoveringCell(x, y, getChunkObjectsFn) {
  const cx = Math.floor(x / 32), cy = Math.floor(y / 32);
  for (const dx of [0, -1]) for (const dy of [0, -1]) {
    for (const o of getChunkObjectsFn(cx + dx, cy + dy)) {
      const g = getGrid(resolveDefForGrid(o.defId)); if (!g) continue;
      if (x >= o.x && x < o.x + g.fw && y >= o.y && y < o.y + g.fh) return { o, g };
    }
  }
  return null;
}
function isCellBlocked(x, y, getChunkObjectsFn) { const r = getObjectCoveringCell(x, y, getChunkObjectsFn); return !!(r && r.g.mode === 'solid'); }
function reserveSetPieces(chunkX, chunkY, occupied, setPieces) { // setPieces = [{x,y,defId,id}] yang rect-nya menyentuh chunk ini
  for (const sp of setPieces) { const g = getGrid(sp.defId); if (g) mark(sp.x, sp.y, g, occupied, sp.id); }
}
```
(`resolveDefForGrid` = `resolveDef` dari objectScatter; kirim sebagai parameter bila perlu agar tidak ada require melingkar.)
### G4. Patch `utils/objectScatter.js` (jangan tulis ulang file; ubah 4 tempat)
(1) `getCanonCollision` (±L359): di awal fungsi
```js
const GC = require('./gridContract');
{ const g = GC.getGrid(resolveDef(defId) || defId);
  if (g) return g.mode === 'none' ? { w: 0, h: 0, offsetX: 0 } : { w: g.fw, h: g.fh, offsetX: 0 }; }
```
(2) `canPlaceFootprint` (±L394): sebelum baris `const col = collisionOverride ? ...`
```js
{ const g = GC.getGrid(actualDefId);
  if (g && !isAnchor && !collisionOverride) {
    if (!GC.insideChunk(startX, startY, g)) return false;
    if (!GC.isFree(startX, startY, g, occupiedGrid)) return false;
  } }
```
(3) `markFootprintOccupied` (±L526): di awal `{ const g = GC.getGrid(resolveDef(defId) || defId); if (g && !collisionOverride) { GC.mark(startX, startY, g, occupiedGrid, objId); return; } }`
(4) **Set-piece & authored (L633–735, step 1/1b/1c)**: hilangkan `collisionOverride=true` untuk objek yang punya entri grid. Aturan posisi:
   - Anchor set-piece: `x0 = a.x - floor(fw/2)`, `y0 = a.y - fh` (sel `a.x,a.y` = "pintu"/pusat permukiman TETAP bisa dijalani, tepat di selatan footprint).
   - Landmark region (`REGION_LANDMARK_CENTERS`): sama (pusat bawah).
   - Authored props (`authored-props.json`): `x,y` = sel kiri-atas footprint (konversi file lama di H2).
   - **Sebelum step 2 (scatter biasa)**, di tiap chunk panggil `reserveSetPieces` untuk SEMUA set-piece/anchor/landmark/authored dari chunk (cx-1..cx+1, cy-1..cy+1) yang rect (footprint+canopy)-nya menyentuh chunk ini, supaya objek biasa tidak menimpa set-piece tetangga.
   - Urutan penempatan menurut ukuran: landmark → building → mountain → rock → tree → nature → decor(none). Pastikan `maxObjectsBudget` tetap dipakai.
(5) Hapus aturan lama yang bertentangan: spasi pondok 14 tile (L~459–468) tetap boleh, tetapi aturan "anti-clumping 3 tile identik" dan dominansi 18% dipertahankan.
Ekspor tambahan dari objectScatter: `isCellBlocked(x,y)` = `GC.isCellBlocked(x,y,getChunkObjects)` dan `getObjectCoveringCell`.
### G5. Server: collision multi-petak (BUG KRITIS F6)
- `web-api/routes/world.js` ±L1993: ganti `tile.isSolid = true` pada petak asal dengan: untuk TIAP `obj` solid, tandai SEMUA sel footprint `[x,x+fw)×[y,y+fh)` yang ada di `proceduralTileMap` (`isSolid=true`, `blockedBy=obj.id`); objek tetap dilampirkan pada tile asal.
- `getEffectiveTile` ±L2262: ganti pengecekan `chunkObjs.some(o.x===x&&o.y===y...)` dengan `objectScatter.isCellBlocked(x, y)`.
- `utils/chunkStreamingEngine.js` ±L315 (`hasSolidObj`): pakai `isCellBlocked`.
- `POST /building/enter` (±L3856) dan `interiorService.enterBuilding`: `targetX/targetY` boleh sel MANA SAJA dalam footprint rumah (pakai `getObjectCoveringCell`), bukan hanya sel asal.
- Monster spawn engine (V9 E3) harus menolak sel di footprint solid MAUPUN canopy (pakai `getObjectCoveringCell` dan peta canopy).
### G6. `scripts/auditGridV10.js` (BARU; gerbang utama; exit 1 bila gagal)
Sampel: 400 chunk acak seed tetap + 52 viewport ±60 di sekitar anchor + 29 sarang boss. Untuk setiap objek (kecuali mode none) hitung via `gridContract` (jangan duplikasi rumus):
```
V1 tidak ada entri grid                           target 0
V2 x/y bukan integer                              target 0
V3 footprint tumpang tindih footprint lain        target 0
V4 canopy menutupi footprint/canopy lain         target 0   (ambang overlap rect > 0.02 sel^2)
V5 sel footprint di terrain terlarang (air, jalan, solid terrain, inti settlement) target 0
V6 objek solid yang selnya tidak diblokir server (isCellBlocked false)  target 0
V7 objek melewati batas chunk (selain set-piece)  target 0
V8 pasangan visual overlap / seluruh pasangan     target <= 0.05%
V9 rumah (class house) dengan fw!=1 atau fh!=1    target 0
```
Cetak tabel dengan angka. Selain itu `scripts/testRenderRect.mjs` (lihat G7) harus lulus.
### G7. Renderer: satu rumus, satu sumber
1. `node scripts/syncGridCanonToDashboard.js` (BARU): salin `grid-canon-v10.json` → `web-dashboard/src/config/gridCanon.json` (impor statis; sertakan di build).
2. Buat `web-dashboard/src/lib/gridRect.ts` dengan fungsi MURNI:
```ts
export interface GridEntry { fw:number; fh:number; vw:number; vh:number; rowsAbove:number; mode:'solid'|'soft'|'none'; srcW:number; srcH:number; bbox:{x0:number;y0:number;x1:number;y1:number} }
export function computeSpriteRect(g: GridEntry, tx: number, ty: number, T: number, toX:(wx:number)=>number, toY:(wy:number)=>number) {
  const scale = (g.vw * T) / ((g.bbox.x1 - g.bbox.x0) * g.srcW);   // px layar per px sumber
  const dw = g.srcW * scale, dh = g.srcH * scale;
  const contentLeft = toX(tx + (g.fw - g.vw) / 2);
  const contentBottom = toY(ty + g.fh);
  return { drawX: contentLeft - g.bbox.x0 * dw, drawY: contentBottom - g.bbox.y1 * dh, dw, dh,
           footX: toX(tx + g.fw / 2), footY: contentBottom, sortKey: (ty + g.fh) };
}
```
3. `WorldCanvas.tsx` ±L965–1000 (blok `visualW/colW/colOffsetX/anchorX/footX/drawX…`): bila `gridCanon[def.id]` ada → pakai `computeSpriteRect`; HAPUS jalur lama (jangan simpan dua rumus). `sortKey` Y-sort = baris dasar `(y+fh)` lalu `x`. Cek oklusi pemain (`isPlayerBehind`) memakai fw/fh/vh baru. Pratinjau hantu build-mode (±L841–954) memakai `fw/fh` dari grid. Label bangunan di tengah footprint.
4. Zoom bawaan: konstanta `ZONE_DEFAULT_ZOOM = 1.4` di `WorldCanvas.tsx` (ganti `zoom: 1.0` ±L146). Alasan: rumah 1×1 = 54 px; zoom 1.4 → 76 px. Bitmap tanah chunk tetap dirender pada 54 px/tile lalu diskalakan (memori tidak naik). Catat di report bahwa ini bisa diubah pemilik.
5. `scripts/testRenderRect.mjs`: impor `computeSpriteRect` dari `web-dashboard/src/lib/gridRect.ts` (pakai `tsx`/`ts-node`, atau transpile dengan esbuild yang sudah ada di Next) dan `world-data/grid-canon-v10.json`; untuk 2.000 objek nyata dari `getChunkObjects`, dengan `T=54`, `toX=x=>x*54`, `toY=y=>y*54`: 
   `contentLeftPx % 54 == 0`, `(drawX + bbox.x0*dw) % 54 ≈ 0 (±0.01)`, `(drawY + bbox.y1*dh) % 54 ≈ 0 (±0.01)`, lebar konten = `vw*54 ±0.5 px`. Target pelanggaran 0.
### G8. Re-layout desa/anchor memakai kontrak (rumah 1×1)
Jalankan ulang `scripts/gen/buildVillagesV9.js` (V9 D) dengan parameter baru — salin sebagai `buildVillagesV10.js`:
- Rumah = frame `house` 1×1. Jarak antar rumah: sedikitnya 2 sel kosong (1 sel halaman + 1 sel jalan) pada sumbu manapun; barisan rumah menghadap jalan (jalan 1 sel utama, 2 sel pada kota). Rumah dibiarkan menghadap selatan.
- Setiap rumah dapat 0–2 objek "halaman" (class building_1/node/nature_1) di sel yang berbatasan; sel halaman TIDAK boleh menutup pintu (sel tepat di selatan rumah).
- Maks 35% satu `defId` per desa (aturan V9 D4 dipertahankan).
- Sekte/kota/landmark: set-piece utama dengan footprint sesuai grid (`building_3/4`, `landmark`), dikelilingi 6–14 rumah 1×1 serta fasilitas (lihat Prompt I).
- Konversi `authored-props.json`: simpan cadangan `authored-props.v9.bak.json`; skema baru `x,y` = kiri-atas footprint; hapus field `cw/ch/offsetX` lama.
- `scripts/checkAuthored.js` diperbarui: pakai `gridContract`; target pelanggaran 0; `uniqueLayouts == 52`.
GERBANG G: `node scripts/auditGridV10.js` semua V1–V9 sesuai target (cetak angka); `node scripts/testRenderRect.mjs` 0 pelanggaran; `npx tsc --noEmit` exit 0; kepadatan: median objek/chunk (chunk non-laut, non-permukiman) antara **45 dan 110**; di 174 viewport 24×13 (grid seed tetap) ≥ **95%** punya ≥ 8 objek.
Setelah itu ambil ulang 12 screenshot ke `review/shots/v10_G/` dan LIHAT SENDIRI: tidak ada sprite setengah petak, tidak ada rumah lebih dari 1 petak. Tulis pengamatan jujur.

---------------------------------------------------------------------
## PROMPT H — JALAN & PETAK SEJAJAR GRID
---------------------------------------------------------------------
H1. Jalan adalah terrain `road_stone` (sel utuh). Aturan: jalan desa lebar 1 sel (gang) atau 2 sel (utama); jalan antar kota lebar 2 sel; tidak ada sel jalan diagonal tunggal (diagonal harus tangga 2 sel yang terhubung 4-arah). Perbaiki `scripts/gen/buildVillagesV10.js` + `road-overrides-v9.json` (kausi Canghai–Donghai) agar memenuhi ini; tulis `scripts/checkRoadsV10.js`: tiap sel jalan punya ≥1 tetangga 4-arah jalan, tidak ada sel jalan yang berada di bawah footprint solid (V5), panjang komponen terpisah < 3 sel = 0.
H2. **Render jalan menempel grid (BUG F11)** di `groundRenderer.ts`: untuk family `road_stone` JANGAN blur. Bangun mask dari 1 piksel per sel lalu gambar dengan `imageSmoothingEnabled=false` (nearest-neighbor) sehingga tepi jalan tepat di kelipatan `tileSize`; tambahkan garis tepi 2 px gelap-transparan (`rgba(40,30,20,0.35)`) di dalam sel jalan yang bertetangga non-jalan, dan "rumput tepi" (decal L3 yang sudah ada) pada sel tetangga. Hapus pewarnaan abu datar.
H3. Gerbang: ekspos `window.__dbg = { getChunkBitmap: (cx,cy)=>chunkManager.getChunkBitmap(cx,cy) }` HANYA bila `debugCam` aktif. Skrip `scripts/checkRoadGrid.cjs` (via Playwright): untuk 4 ruas jalan lurus, baca piksel satu baris melintang jalan dari bitmap chunk; posisi transisi warna harus dalam ±2 px dari kelipatan 54 (dihitung relatif sudut chunk). Cetak posisi nyata.

---------------------------------------------------------------------
## PROMPT I — SEMUA ASET HARUS MUNCUL (BUG F8)
---------------------------------------------------------------------
Sumber kebenaran: `world-data/asset-placement-rules-v10.json` (regex keluarga → konteks) dan `review/asset_coverage_baseline.json` (222 keluarga yang belum pernah muncul).
I1. Buat `utils/assetPlacementV10.js` yang dipanggil dari objectScatter (setelah set-piece, sebelum scatter biasa), deterministik, memakai kontrak grid (`canPlaceFootprint` baru):
 - **village_yard** (13: `building_village_*`): halaman rumah desa/dusun/kota (arketipe V9 D). Tiap desa 2–5 jenis berbeda; tiap jenis maks 2 kali per desa. Pilih jenis menurut arketipe (mis. `river_village` → watermill/ fish_trap/ duck_coop; `hill_terrace` → tea/tofu/grain; `frost_hamlet` → stone_pigpen/ cistern).
 - **wayside** (17: `building_wayside_*`): sepanjang jalan antar-permukiman; satu setiap 40–60 sel jalan, ≥ 6 sel dari anchor, di sel samping jalan (bukan di atas jalan), jenis dipilih berurutan agar variatif (mile marker, tea shed, stele, rain shelter, mooring post hanya dekat air, bamboo_torch_beacon di zona tier≥3).
 - **rustic_country** (9) pada plains/meadow/farmland/herb_field radius 8–24 sel dari desa; kelompok 1–3; `building_riverside_watermill_paddle_wheel`/`ferry_dock`/`watermill_stream` hanya bersebelahan air (≤ 30 sel dari permukiman).
 - **prof_structure** (5+1) & **town_facility** (16): kota besar/ibu kota/sekte mendapat 1 tiap jenis yang relevan (alchemist_hall, apothecary, auction_house, blacksmith_foundry, forge_workshop, tea_house, inn_roadside, sect_library, dock_warehouse di port); dusun profesi 25% acak.
 - `xitong_city_landmark` hanya di anchor `xitong_city`. `building_wooden_watchtower` di pos/outpost. `building_spirit_pagoda` di kota besar. `building_mountain_pass_stone_archway` tepat di 3 celah Azure (2200,3350), (2600,3350), (3100,3200)+/-3 sel, tidak memblokir jalan (footprint di sisi celah).
 - **poi_misc**: `stone_lantern_shrine`, `spirit_gathering_gazebo`, `stone_water_basin` di halaman sekte/kota; `structure_scatter_ruin_ancient_broken_halberd_sword_grave` di crimson_battlefield & border_march (1 per 24×24 sel, maks 12 per region).
 - **legacy_lowres** (6 keluarga 32px: pagoda_tower, sect_gate, road_inn, farm_hut, stone_torii, tea_pavilion) JANGAN ditempatkan; catat "excluded".
 - **interior** (105) dikecualikan; **mount** (2) dikecualikan kecuali ada sistem; catat alasan.
I2. **Sprite monster**: `world-data/boss-sprites-v10.json` memetakan 29 region → sprite boss `monster_regional_*` (+ elit untuk crimson_battlefield & abyssal_scar). Tampilkan boss di sel sarang (`lair`) sebagai objek `boss` 2×2 solid (grid override G2) HANYA saat boss aktif (jam spawn V9 E3) dan belum dikalahkan (`DefeatedMonsterTile`). Penanda `monster_*` (10) dipakai untuk monster biasa/elit di `WorldCanvas` (menggantikan ikon emoji) sesuai tema: `monster_white_tiger` temperate/grass, `monster_demon_wolf` grass/ruin, `monster_iron_bear` cold & mountain, `monster_sand_scorpion` desert, `monster_flame_ape` volcanic, `monster_blood_serpent` swamp, `monster_rock_golem` mountain/ruin, `monster_storm_roc` thundersteppe/godthunder/sea, `monster_abyssal_serpent` ruin/void, `monster_swirl_den` sea. Jika sistem render monster sekarang memakai `ring_monster_*`, tetap pakai ring di bawah sprite.
I3. `scripts/checkAssetCoverage.js` (gerbang; exit 1): pindai chunk (setiap 3 chunk) + viewport ±60 di tiap anchor + 29 sarang + koridor jalan; hitung kemunculan per keluarga. Target: dari keluarga yang tidak dikecualikan (≈ 222 − 105 interior − 6 legacy − 2 mount = 109), **≥ 95% muncul ≥ 3 kali**, sisanya (≤ 5) tercantum dengan alasan. Cetak tabel `family | kategori | jumlah | konteks`. Tidak ada keluarga yang diproduksi engine tetapi tidak ada di atlas (`missing frames = 0`; hasil sekarang 0).

---------------------------------------------------------------------
## PROMPT J — IDENTITAS & KEPADATAN REGION (maksimalkan 29 region)
---------------------------------------------------------------------
Tema tiap region ada di `world-data/region-palettes-v10.json` (boost[] & forbid[] sebagai regex keluarga, `familyDominanceMax=0.20`, `minDistinctFamilies=16`). Kondisi terukur sekarang:
```
thundersteppe: tree_spirit_peach 38% | border_march: peach 35% | western_sacred_desert: tree_dead_wood 39% + rock_crag 25%
spirit_wood_sea: hanya pine 38% + peach 37% | frostmoon_sea & floating_wind_isles & eastern_sea: teratai/alang-alang/dermaga yang sama
lava_spine: tree_dead_wood 45% + rock_cleft 31% | mist_insect_valley: willow 24% + boulder 22% + peach 19%
```
J1. Di objectScatter: sebelum memilih keluarga, filter kandidat dengan `forbid` region (0 objek terlarang) dan beri bobot ×3 pada `boost`. Terapkan batas dominansi per region: tidak ada keluarga > 20% dari objek region (hitung di `checkRegionPalette.js`); `deadwoodMax` per tema (desert 0.12, volcanic 0.20, swamp 0.30, sea 0).
J2. Tiap region WAJIB memiliki 4 "set-piece wilayah" (selain landmark yang sudah ada), ditempatkan deterministik pada sel non-solid terjangkau (BFS dari Xingcun; region tersegel dihitung dari titik daratnya): (a) 1 **penanda perbatasan** (stele) di tepi region, (b) 2 **POI** bertema (kuil, reruntuhan, kamp: pilih dari keluarga yang `boost`-nya cocok, contoh lava: `volcanic_obsidian_basalt_pillar` + `thunder_struck_stump` kluster; frost: `frost_crystal_pine_bonsai` + `ghost_ship_frozen_ice_wreck`; desert: `beast_skull_cairn` + `crystal_quartz_vein_crag`), (c) 1 **kluster sumber daya** `resource_*` yang cocok (bijih/herba/teratai salju) 3–5 node 1×1 berdekatan. Simpan ke `world-data/region-poi-v10.json` (id, region, x,y,defId,reason) — Antigravity menulis generator `scripts/gen/buildRegionPOI.js` yang memvalidasi tiap titik (V1–V7) sebelum menulis.
J3. Kepadatan menurut bahaya: `dangerTier` 1 → target 60–80 obj/chunk; tier 4–6 → 45–70 obj/chunk tetapi dengan lebih banyak mountain/rock pembentuk lorong; JANGAN ada chunk kosong (<8 objek) kecuali laut dalam. Cetak median per region.
J4. `scripts/checkRegionPalette.js` (gerbang; exit 1): untuk 29 region × 40 chunk acak: (i) 0 objek forbid, (ii) keluarga teratas ≤ 20%, (iii) keluarga berbeda ≥ 16 (≥ 12 untuk tema `sea` & `cold`), (iv) tiap region punya 4 set-piece wilayah valid, (v) median obj/chunk dalam rentang J3. Cetak tabel 29 baris.
J5. Rute & tantangan (V9 E) tidak diubah, tetapi sarang boss dan kamp elit (145 titik di `region_challenge_v9.json`) harus dikelilingi ≥ 3 objek penanda tematik dalam radius 6 sel (tanpa menutup sel sarang/pintu): `scripts/checkChallengeDressing.js`.

---------------------------------------------------------------------
## PROMPT K — TANAH (perbaiki F10 & F11)
---------------------------------------------------------------------
K1. **Jangan pernah men-cache bitmap tanah jalur lama.** Di `chunkManager.getChunkBitmap`: bila `!groundTextures.ready` kembalikan placeholder polos TANPA menyimpan ke cache, atau simpan dengan flag `provisional` dan bangun ulang semua bitmap `provisional` begitu `groundTextures.load()` selesai (`chunkManager.invalidateGround()` dipanggil dari `.then`). Tambahkan `await groundTextures.load()` sebelum render pertama di `DebugCamMode`.
K2. Hapus pergantian varian per blok 8×8 (jahitan keras). Gunakan SATU varian dasar kontinu per family (varian 1) + lapisan overlay varian 2/3 dengan alpha 0–0.5 dari peta noise frekuensi rendah (`web-dashboard/public/assets/ground/noise_mask.webp`, 256×256 seamless, dihasilkan skrip `scripts/ground/make_noise_mask.py` bersama `make_seamless.py`), diulang tiap 20 tile dan di-align koordinat dunia.
K3. Bila gambar tekstur AI sudah ada di `art_input/ground/`, jalankan 4 perintah pipeline V9 B2; bila belum, placeholder tetap dipakai (tulis jujur di report).
K4. Gerbang visual nyata (dari 12 shot G): (a) rasio jahitan: rata-rata selisih piksel di kolom/baris kelipatan 8 tile dibandingkan kolom tetangga ≤ 1.3; (b) tidak ada pola papan-catur per sel: autokorelasi lag 54 px (zoom 1) < 0.35 pada ≥ 10 dari 12 shot; (c) std luminans 8–45. Cetak tabel per shot dengan nama file.

---------------------------------------------------------------------
## PROMPT L — AUDIT AKHIR & LAPORAN JUJUR
---------------------------------------------------------------------
L1. Buat `scripts/auditV10.js` yang menjalankan berurutan (berhenti di kegagalan pertama dan mencetak keluarannya): `auditGridV10`, `testRenderRect`, `checkRoadsV10`, `checkAssetCoverage`, `checkRegionPalette`, `checkChallengeDressing`, serta semua gerbang V9 yang masih relevan (`audit_world_v9.js`, `checkAuthored.js`, `checkFerry.js`, `checkLairs.js`, `checkBestiaryUnique.js`, `testChallenge.js`, `testHazard.js`).
L2. Ambil 12 shot akhir ke `review/shots/v10_final/` (harness Prompt 0), semuanya sha1 berbeda dan lolos pemeriksaan (a)(b). **Buka sendiri minimal 6 gambar dan tulis pengamatan jujur** (sprite setengah petak? tumpang tindih? rumah 1 petak? jalan menempel grid? tanah papan catur?).
L3. `review/report_v10.md` dengan kerangka:
```
# Laporan V10 — <tanggal>   Commit awal 2c70e3f  Commit akhir <hash>
## Sebelum -> sesudah (angka asli)
V1..V9 grid: ...        obj/chunk median: ...        viewport >=8 objek: ...%
Keluarga aset muncul: 60 -> <n> dari <total non-eksklusi>    keluarga tak muncul + alasan: ...
Region: 29 baris (dominan teratas %, distinct, obj/chunk)
Tanah: tabel K4     Jalan: posisi transisi px
## Gagal / ditangguhkan (jujur)   ## File diubah
```
L4. `git status` bersih dari file terlarang; commit; push hanya jika SEMUA gerbang lulus. Jika ada gerbang gagal: jangan push, laporkan angkanya.

---------------------------------------------------------------------
## LAMPIRAN
---------------------------------------------------------------------
A. Rumus yang dipakai pemilik: 1 rumah = 1×1 petak. Bangunan besar (sekte, kota, landmark, gerbang) boleh >1×1 tetapi tetap integer dan lebar sprite = lebar footprint.
B. Yang TIDAK dikerjakan di V10: sistem battle baru, penggantian art sprite (disc/"diorama base" pada hut tetap dari art; bila pemilik men-generate ulang hut tanpa alas, gunakan `jianghu_hut_assets_v8.csv` + kata "no circular base"), interior bangunan (105 frame), mount.
C. Urutan fallback bila kepadatan terlalu rendah setelah kontrak: (1) naikkan `baseBudget` objectScatter (35→45, 65→80), (2) kecilkan tolerance `rowsAbove` JANGAN, (3) tambahkan lebih banyak dekor mode `none`. Jangan menurunkan aturan overlap.
D. Daftar file yang akan dibuat/diubah (ringkas): `utils/gridContract.js`, `utils/objectScatter.js`, `utils/assetPlacementV10.js`, `utils/chunkStreamingEngine.js`, `web-api/routes/world.js`, `world-data/{grid-canon-v10,sprite-bbox,asset-placement-rules-v10,boss-sprites-v10,region-palettes-v10,region-poi-v10,authored-props}.json`, `web-dashboard/src/{lib/gridRect.ts,lib/groundRenderer.ts,lib/chunkManager.ts,config/gridCanon.json,components/map/WorldCanvas.tsx}`, skrip `scripts/*` yang disebut.
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-26T13:47:28+07:00.

The user's current state is as follows:
Active Document: d:\gitub\bot-discord\jianghu-bot\scripts\captureGroundShots.mjs (LANGUAGE_JAVASCRIPT)
Cursor is on line: 1
Other open documents:
- d:\gitub\bot-discord\jianghu-bot\web-dashboard\src\components\ferry\FerryCrossingModal.tsx (LANGUAGE_TSX)
- d:\gitub\bot-discord\jianghu-bot\web-dashboard\src\components\modals\AchievementsModal.tsx (LANGUAGE_TSX)
- d:\gitub\bot-discord\jianghu-bot\web-dashboard\src\components\modals\StartPrologue.tsx (LANGUAGE_TSX)
- d:\gitub\bot-discord\jianghu-bot\web-dashboard\src\components\ui\Toast.tsx (LANGUAGE_TSX)
- d:\gitub\bot-discord\jianghu-bot\scripts\testInventoryLocksAndSlots.js (LANGUAGE_JAVASCRIPT)

The user has mentioned some items in the form @[ITEM]. Here is extra information about the items that were mentioned by the user, in the order that they appear:

/plan is a [Slash Command]:
<PLAN>The user is requesting that you think and plan carefully before executing the upcoming task.
Carefully research the task, make sure that you and the user are aligned on the goals and requirements,
create a detailed implementation plan artifact, and get user approval on the plan before making any code changes (besides artifacts)
or running any modifying commands.

# Guidelines
- Establish a shared understanding of the task with the user. If there are any ambiguities, underspecified requirements,
or implicit assumptions, clarify them with the user before proceeding.
- Thoroughly research the codebase to establish a solid understanding of the relevant components, systems, dependencies, and architecture.
As you research, provide verbal updates of your research steps and thought process with the user, so they can follow along.
- Create an implementation plan artifact that outlines your proposed execution strategy.
Set request_feedback = true and user_facing = true in the ArtifactMetadata. The user will automatically
see any new and modified plans you create, so DO NOT re-summarize the plan.
- Only after the user explicitly approves the plan should you proceed to execution.
- Verify that your changes have the desired effects e.g. run unit tests, make sure code builds, etc. before claiming that the task is complete.
- After you've completed your task and verified that your solution works, create a walkthrough artifact to summarize your work.

# Planning Mode Artifacts
When in planning mode, you should create two special artifacts.

# Implementation Plan
Path: <Artifact Directory>/<plan_name>.md

**Purpose**: A technical design document to present your implementation plan to the user for feedback and approval.
After reading the document, the user should understand the key technical details of your plan, and be able to make an informed decision on whether to approve it.
This document should be very detailed, including code snippets, diffs, mermaid diagrams, verification strategies, and background information.

**Format**: Use the following format, omitting any irrelevant sections:

## [Goal Description]
Provide a brief description of the problem, any background context, and what the change accomplishes.

## User Review Required
Document anything that requires user review or feedback, for example, breaking changes or significant design decisions. Use GitHub alerts (IMPORTANT/WARNING/CAUTION) to highlight critical items.

## Open Questions
Any clarifying or design questions for the user that will impact the implementation plan. Use GitHub alerts (IMPORTANT/WARNING/CAUTION) to highlight critical items.

## Proposed Changes
Group files by component (e.g., package, feature area, dependency layer) and order logically (dependencies first). Separate components with horizontal rules for visual clarity.

### [Component Name]
Summary of what will change in this component with explicit code snippets and diffs. For specific files, Use [NEW] and [DELETE] to demarcate new and deleted files, for example:
#### [MODIFY] file basename
#### [NEW] file basename
#### [DELETE] file basename

## Verification Plan
Summary of how you will verify that your changes have the desired effects.

### Automated Tests
Exact commands to run automated tests

### Manual Verification
Instructions for what the user should manually verify.

# Walkthrough
Path: <Artifact Directory>/walkthrough.md

**Purpose**: After completing work, summarize what you accomplished. Update an existing walkthrough for related follow-up work rather than creating a new one.

**Document**:
- Changes made
- What was tested
- Validation results

Embed screenshots and recordings to visually demonstrate UI changes and user flows.</PLAN>
</ADDITIONAL_METADATA>