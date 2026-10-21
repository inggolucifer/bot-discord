# Jianghu World V6 — Laporan Tinjauan Visual Peta

**Tanggal:** 2026-10-21  
**Durasi Eksekusi:** 2869 detik  
**Total Tangkapan:** 205 gambar (1920×1080)  
**Tingkat Kelulusan Aturan Spasial:** 83.9% (172/205)

---

## 1. Ringkasan Eksekutif

Harness visual review otomatis Playwright telah memindai **52 anchor (3 sudut pandang)**, **29 pusat region**, dan **20 titik acak deterministik** di seluruh peta dunia $5000 \times 5000$. Seluruh gambar ditangkap pada resolusi **1920×1080** tanpa UI/chrome untuk mengaudit kualitas estetika, sebaran objek alam, culling performa, dan integritas jalan.

- **Zero Emojis**: 100% emoji kanvas telah digantikan oleh sprite atlas atau lencana kaligrafi Wuxia.
- **Frustum Culling**: Seluruh frame dibatasi maksimal 1.500 sprite per frame dengan prioritas hierarki.
- **Contact Sheet Interaktif**: Tersedia di [`review/index.html`](index.html).

---

## 2. Rekapitulasi Audit per Region

| Region | Total Tangkapan | Rata-rata Sprite | Rata-rata DefId | Duplikat <3 Tile | Objek Menghalangi Jalan | Rata-rata Waktu Render | Status |
|---|---|---|---|---|---|---|---|
| central_plains | 36 | 84 | 10 | 26 | 0 | 56ms | WARN |
| nine_springs_delta | 19 | 118 | 9 | 20 | 0 | 103ms | WARN |
| border_march | 4 | 3 | 3 | 0 | 0 | 46ms | PASS |
| western_sacred_desert | 19 | 61 | 7 | 3 | 0 | 75ms | WARN |
| eastern_sea | 19 | 66 | 9 | 1 | 0 | 50ms | WARN |
| southern_demon_domain | 16 | 57 | 9 | 0 | 0 | 31ms | PASS |
| hermit_highlands | 13 | 125 | 16 | 30 | 0 | 107ms | WARN |
| azure_mountain_range | 10 | 205 | 17 | 8 | 0 | 47ms | WARN |
| northern_desolate | 19 | 42 | 7 | 2 | 0 | 36ms | WARN |
| thundersteppe | 16 | 50 | 8 | 2 | 0 | 30ms | WARN |
| mirror_lake | 8 | 39 | 7 | 0 | 0 | 24ms | PASS |
| godthunder_peaks | 2 | 127 | 11 | 0 | 0 | 30ms | PASS |
| beast_prairies | 1 | 106 | 19 | 0 | 0 | 181ms | PASS |
| western_gorge_labyrinth | 1 | 83 | 7 | 0 | 0 | 14ms | PASS |
| lava_spine | 4 | 88 | 5 | 0 | 0 | 96ms | PASS |
| venom_mire | 2 | 64 | 4 | 0 | 0 | 18ms | PASS |
| crimson_battlefield | 1 | 61 | 6 | 0 | 0 | 15ms | PASS |
| abyssal_scar | 1 | 124 | 6 | 0 | 0 | 178ms | PASS |
| southern_plague_woods | 1 | 111 | 5 | 0 | 0 | 182ms | PASS |
| bone_sea_coast | 1 | 63 | 10 | 0 | 0 | 21ms | PASS |
| spirit_wood_sea | 1 | 150 | 3 | 0 | 0 | 19ms | PASS |
| mist_insect_valley | 2 | 0 | 0 | 0 | 0 | 10ms | PASS |
| formation_barrens | 1 | 76 | 7 | 0 | 0 | 245ms | PASS |
| sword_gorge | 1 | 260 | 14 | 0 | 0 | 27ms | PASS |
| ore_teeth_range | 1 | 131 | 13 | 0 | 0 | 31ms | PASS |
| frostmoon_sea | 3 | 40 | 4 | 0 | 0 | 15ms | PASS |
| floating_wind_isles | 1 | 0 | 0 | 0 | 0 | 37ms | PASS |
| immortal_ruins_valley | 1 | 0 | 0 | 0 | 0 | 16ms | PASS |
| void_rift | 1 | 2 | 1 | 0 | 0 | 8ms | PASS |

---

## 3. Top 10 Tangkapan Paling Kritis / Latensi Tertinggi

| No | Berkas Tangkapan | Region | Koordinat | Sprites | Duplikat <3 Tile | Blokir Jalan | Latensi Render | Catatan Evaluasi |
|---|---|---|---|---|---|---|---|---|
| 1 | [hermit_highlands__anchor_kemah_dataran_tinggi_petapa_center.png](shots/hermit_highlands__anchor_kemah_dataran_tinggi_petapa_center.png) | hermit_highlands | (1200, 4200) | 217 | 14 | 0 | 20ms | Perlu Evaluasi |
| 2 | [hermit_highlands__anchor_kemah_dataran_tinggi_petapa_north.png](shots/hermit_highlands__anchor_kemah_dataran_tinggi_petapa_north.png) | hermit_highlands | (1200, 4188) | 260 | 13 | 0 | 254ms | Perlu Evaluasi |
| 3 | [central_plains__anchor_luoyang_kecil_center.png](shots/central_plains__anchor_luoyang_kecil_center.png) | central_plains | (2600, 2200) | 194 | 10 | 0 | 32ms | Perlu Evaluasi |
| 4 | [nine_springs_delta__anchor_lembah_kabut_merah_north.png](shots/nine_springs_delta__anchor_lembah_kabut_merah_north.png) | nine_springs_delta | (2350, 2408) | 122 | 7 | 0 | 572ms | Perlu Evaluasi |
| 5 | [nine_springs_delta__anchor_dusun_mata_air_jernih_north.png](shots/nine_springs_delta__anchor_dusun_mata_air_jernih_north.png) | nine_springs_delta | (2400, 2438) | 115 | 4 | 0 | 229ms | Perlu Evaluasi |
| 6 | [nine_springs_delta__anchor_lembah_kabut_merah_center.png](shots/nine_springs_delta__anchor_lembah_kabut_merah_center.png) | nine_springs_delta | (2350, 2420) | 116 | 4 | 0 | 17ms | Perlu Evaluasi |
| 7 | [azure_mountain_range__anchor_sekte_awan_pedang_west.png](shots/azure_mountain_range__anchor_sekte_awan_pedang_west.png) | azure_mountain_range | (2188, 3350) | 224 | 3 | 0 | 72ms | Perlu Evaluasi |
| 8 | [azure_mountain_range__anchor_kaki_gunung_azure_west.png](shots/azure_mountain_range__anchor_kaki_gunung_azure_west.png) | azure_mountain_range | (2188, 3340) | 224 | 3 | 0 | 70ms | Perlu Evaluasi |
| 9 | [central_plains__anchor_kota_fengyang_west.png](shots/central_plains__anchor_kota_fengyang_west.png) | central_plains | (2938, 2600) | 79 | 3 | 0 | 43ms | Perlu Evaluasi |
| 10 | [central_plains__anchor_sekte_pedang_langit_north.png](shots/central_plains__anchor_sekte_pedang_langit_north.png) | central_plains | (2150, 2788) | 211 | 3 | 0 | 34ms | Perlu Evaluasi |

---

## 4. Kesimpulan & Rekomendasi
Semua aturan spasial (jarak minimum antar objek sejenis $\ge 3$ tile, larangan objek solid di atas petak jalan, serta keberadaan focal point) telah divalidasi secara sistematis.
