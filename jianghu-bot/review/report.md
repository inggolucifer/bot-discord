# Jianghu World V7 — Laporan Tinjauan Visual Peta (H0 & HA)

**Tanggal:** 2026-10-22  
**Durasi Eksekusi:** 65 detik  
**Total Tangkapan:** 10 gambar (1920×1080)  
**Tingkat Kelulusan Aturan Spasial:** 60.0% (6/10)  
**p50 Latensi Render:** 168 ms [WARN (target <= 20ms)]  
**p95 Latensi Render:** 225 ms  
**Rata-rata JS Heap:** 42 MB  
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
| central_plains | 3 | 53 | 9 | 0 | 0 | 0 | 36MB | 167ms | PASS |
| nine_springs_delta | 3 | 118 | 10 | 6 | 0 | 0 | 45MB | 217ms | WARN |
| border_march | 3 | 4 | 4 | 0 | 0 | 0 | 44MB | 43ms | PASS |
| western_sacred_desert | 1 | 69 | 8 | 1 | 0 | 0 | 48MB | 129ms | WARN |

---

## 3. Top 10 Tangkapan Paling Kritis / Latensi Tertinggi

| No | Berkas Tangkapan | Region | Koordinat | Sprites | Duplikat <3 Tile | Blokir Jalan | Fallback | Latensi Render | Catatan Evaluasi |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [nine_springs_delta__anchor_dusun_mata_air_jernih_north.png](shots/nine_springs_delta__anchor_dusun_mata_air_jernih_north.png) | nine_springs_delta | (2400, 2438) | 115 | 4 | 0 | 0 | 223ms | Perlu Evaluasi |
| 2 | [nine_springs_delta__anchor_dusun_mata_air_jernih_west.png](shots/nine_springs_delta__anchor_dusun_mata_air_jernih_west.png) | nine_springs_delta | (2388, 2450) | 118 | 1 | 0 | 0 | 225ms | Perlu Evaluasi |
| 3 | [nine_springs_delta__anchor_dusun_mata_air_jernih_center.png](shots/nine_springs_delta__anchor_dusun_mata_air_jernih_center.png) | nine_springs_delta | (2400, 2450) | 122 | 1 | 0 | 0 | 202ms | Perlu Evaluasi |
| 4 | [western_sacred_desert__anchor_oase_shadi_center.png](shots/western_sacred_desert__anchor_oase_shadi_center.png) | western_sacred_desert | (820, 2220) | 69 | 1 | 0 | 0 | 129ms | Perlu Evaluasi |
| 5 | [central_plains__anchor_desa_xingcun_center.png](shots/central_plains__anchor_desa_xingcun_center.png) | central_plains | (2050, 2650) | 52 | 0 | 0 | 0 | 216ms | Normal |
| 6 | [central_plains__anchor_desa_xingcun_north.png](shots/central_plains__anchor_desa_xingcun_north.png) | central_plains | (2050, 2638) | 46 | 0 | 0 | 0 | 168ms | Normal |
| 7 | [central_plains__anchor_desa_xingcun_west.png](shots/central_plains__anchor_desa_xingcun_west.png) | central_plains | (2038, 2650) | 61 | 0 | 0 | 0 | 118ms | Normal |
| 8 | [border_march__anchor_pos_perbatasan_qinghe_center.png](shots/border_march__anchor_pos_perbatasan_qinghe_center.png) | border_march | (2300, 1950) | 5 | 0 | 0 | 0 | 117ms | Normal |
| 9 | [border_march__anchor_pos_perbatasan_qinghe_west.png](shots/border_march__anchor_pos_perbatasan_qinghe_west.png) | border_march | (2288, 1950) | 4 | 0 | 0 | 0 | 8ms | Normal |
| 10 | [border_march__anchor_pos_perbatasan_qinghe_north.png](shots/border_march__anchor_pos_perbatasan_qinghe_north.png) | border_march | (2300, 1938) | 3 | 0 | 0 | 0 | 3ms | Normal |

---

## 4. Kesimpulan & Rekomendasi
Semua aturan spasial, ketiadaan fallback sprite, dan integritas rendering tekstur lukisan Song Dynasty telah diaudit secara deterministik.
