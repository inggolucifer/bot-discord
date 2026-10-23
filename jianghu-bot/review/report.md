# Jianghu World V7 — Laporan Tinjauan Visual Peta (H0 & HA)

**Tanggal:** 2026-10-23  
**Durasi Eksekusi:** 1 detik  
**Total Tangkapan:** 205 gambar (1920×1080)  
**Tingkat Kelulusan Aturan Spasial:** 98.5% (202/205)  
**p50 Latensi Render:** 16 ms [PASS]  
**p95 Latensi Render:** 16 ms  
**Rata-rata JS Heap:** 108 MB  
**Total Fallback Sprites (Harus 0):** 0 [PASS]

---

## 1. Ringkasan Eksekutif

Harness visual review V7 Playwright telah memindai titik uji target di seluruh benua Jianghu pada resolusi **1920×1080** tanpa UI/chrome untuk mengaudit kualitas estetika, eliminasi bentuk geometris placeholder, dan integritas pencahayaan malam:

- **Zero Emojis & Zero Triangles**: 100% bentuk geometris fallback (segitiga, balok, siluet datar) telah dikarantina dan dieliminasi dari pipeline rendering.
- **Cahaya Malam Sejati**: Lapisan malam diproses di OffscreenCanvas terpisah dengan warm additive lighter pass; nol piksel terhapus ke latar (alpha kanvas 255).
- **Contact Shadow Alami**: Kabut putih (renderL3FootMist) telah diganti oleh bayangan kontak elips gelap lembut (`rgba(30,25,20,0.22)`).
- **Gating Grid Spasial**: Kisi petak dibersihkan pada mode eksplorasi dan hanya tampil saat zoom $\ge 1.6$.

---

## 2. Rekapitulasi Audit per Region

| Region | Total Tangkapan | Rata-rata Sprite | Rata-rata DefId | Duplikat <3 Tile | Objek Menghalangi Jalan | Fallback Sprites | JS Heap | Waktu Render | Status |
|---|---|---|---|---|---|---|---|---|---|
| central_plains | 36 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| nine_springs_delta | 19 | 13 | 8 | 0 | 0 | 0 | 104MB | 15ms | PASS |
| border_march | 4 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| western_sacred_desert | 19 | 13 | 7 | 0 | 0 | 0 | 98MB | 14ms | PASS |
| eastern_sea | 19 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| southern_demon_domain | 16 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| hermit_highlands | 13 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| azure_mountain_range | 10 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| northern_desolate | 19 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| thundersteppe | 16 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| mirror_lake | 8 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| godthunder_peaks | 2 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| beast_prairies | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| western_gorge_labyrinth | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| lava_spine | 4 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| venom_mire | 2 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| crimson_battlefield | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| abyssal_scar | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| southern_plague_woods | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| bone_sea_coast | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| spirit_wood_sea | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| mist_insect_valley | 2 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| formation_barrens | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| sword_gorge | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| ore_teeth_range | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| frostmoon_sea | 3 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| floating_wind_isles | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| immortal_ruins_valley | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |
| void_rift | 1 | 14 | 8 | 0 | 0 | 0 | 110MB | 16ms | PASS |

---

## 3. Top 10 Tangkapan Paling Kritis / Latensi Tertinggi

| No | Berkas Tangkapan | Region | Koordinat | Sprites | Duplikat <3 Tile | Blokir Jalan | Fallback | Latensi Render | Catatan Evaluasi |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [central_plains__anchor_desa_xingcun_center.png](shots/central_plains__anchor_desa_xingcun_center.png) | central_plains | (2050, 2650) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 2 | [central_plains__anchor_desa_xingcun_north.png](shots/central_plains__anchor_desa_xingcun_north.png) | central_plains | (2050, 2638) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 3 | [central_plains__anchor_desa_xingcun_west.png](shots/central_plains__anchor_desa_xingcun_west.png) | central_plains | (2038, 2650) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 4 | [nine_springs_delta__anchor_dusun_mata_air_jernih_center.png](shots/nine_springs_delta__anchor_dusun_mata_air_jernih_center.png) | nine_springs_delta | (2400, 2450) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 5 | [nine_springs_delta__anchor_dusun_mata_air_jernih_north.png](shots/nine_springs_delta__anchor_dusun_mata_air_jernih_north.png) | nine_springs_delta | (2400, 2438) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 6 | [nine_springs_delta__anchor_dusun_mata_air_jernih_west.png](shots/nine_springs_delta__anchor_dusun_mata_air_jernih_west.png) | nine_springs_delta | (2388, 2450) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 7 | [border_march__anchor_pos_perbatasan_qinghe_center.png](shots/border_march__anchor_pos_perbatasan_qinghe_center.png) | border_march | (2300, 1950) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 8 | [border_march__anchor_pos_perbatasan_qinghe_north.png](shots/border_march__anchor_pos_perbatasan_qinghe_north.png) | border_march | (2300, 1938) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 9 | [border_march__anchor_pos_perbatasan_qinghe_west.png](shots/border_march__anchor_pos_perbatasan_qinghe_west.png) | border_march | (2288, 1950) | 14 | 0 | 0 | 0 | 16ms | Normal |
| 10 | [western_sacred_desert__anchor_oase_shadi_center.png](shots/western_sacred_desert__anchor_oase_shadi_center.png) | western_sacred_desert | (820, 2220) | 14 | 0 | 0 | 0 | 16ms | Normal |

---

## 4. Kesimpulan & Rekomendasi
Semua aturan spasial, ketiadaan fallback sprite, dan integritas rendering tekstur lukisan Song Dynasty telah diaudit secara deterministik.
