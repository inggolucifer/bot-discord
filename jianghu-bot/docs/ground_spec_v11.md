# SPESIFIKASI TEKNIS GROUND AI V11 (KONTRAK GAMBAR & RENDERING)

Dokumen ini mendefinisikan arsitektur dan spesifikasi teknis untuk sistem tekstur permukaan tanah (Ground Layer) dunia Jianghu (Immortal-X) V11.

---

## 1. Parameter Teknis Resolusi & Ukuran
- **Resolusi Dunia Per Sel:** **128 px/sel** (pada zoom kamera 1.4x $\approx 75$ px layar; pada zoom 2.0x $\approx 108$ px layar).
- **Macro-Texture Per Family:**
  - Setiap famili tanah memiliki **4 file macro-texture** unik: `FAMILY_m1.png` s/d `FAMILY_m4.png`.
  - Dimensi: **1024×1024 px** (mencakup area spasial $8 \times 8$ sel grid).
  - Karakteristik: **Seamless 4-Sisi (Tileable)**, proyeksi top-down orthographic (tanpa perspektif), pencahayaan rata (tanpa bayangan objek buatan), tanpa objek bernama (bebas pohon/batu besar/bangunan/karakter), tanpa garis kisi grid, tanpa teks/watermark, kontras rendah-sedang (RMS contrast $\le 0.12$) agar sprite di atasnya tetap terbaca jelas (*high readability*).
  - Gaya Seni: **Shan Shui Tradisional (Tinta Bak & Cat Air Wuxia)** dengan tekstur kertas Xuan kuno halus.

---

## 2. Algoritma Pemetaan Sel Spasial ke Piksel (Anti-Repeating & Anti-Tiling)

Untuk menghilangkan efek pengulangan ubin (tiling) dan garis sambungan:
1. Peta dunia dibagi menjadi super-blok $16 \times 16$ sel:
   $$bx = \lfloor tx / 16 \rfloor, \quad by = \lfloor ty / 16 \rfloor$$
2. Hitung hash deterministik per blok:
   $$h = \text{hash2d}(bx \times 7919 + \text{famId}, \; by \times 104729 + \text{famId})$$
3. Pilih variasi macro, rotasi, dan flip:
   $$\text{macroIdx} = h \pmod{\text{macros.length}}$$
   $$\text{rot} = (h \gg 3) \ \& \ 3 \quad (0^\circ, 90^\circ, 180^\circ, 270^\circ)$$
   $$\text{flip} = (h \gg 5) \ \& \ 1 \quad (\text{normal atau horizontal flip})$$
4. Koordinat sel lokal dalam super-blok dipetakan ke macro $8 \times 8$:
   $$lx = ((tx \pmod{16}) + 16) \pmod{16} \pmod 8$$
   $$ly = ((ty \pmod{16}) + 16) \pmod{16} \pmod 8$$
5. Setelah transformasi rotasi dan flip pada $(lx, ly)$, koordinat UV sampling pada macro adalah:
   $$u_0 = lx \times 128 \text{ px}, \quad v_0 = ly \times 128 \text{ px}$$
6. **Hasil:** Periode pengulangan efektif $\ge 16$ sel dengan $32$ kombinasi orientasi per famili, menghilangkan pola kisi 4x4 dan garis berulang.

---

## 3. Detail Overlay (Memecah Homogenitas Visual)
- **File:** `FAMILY_detail.png` (dimensi 512×512 px seamless, channel Alpha).
- **Penerapan:** Dicampur sebesar **20% opacity** pada skala 0.5x di atas macro-texture menggunakan compositing `source-over` atau `soft-light`.

---

## 4. Sistem Transisi Berbasis Topeng Organik (Mask-Based Transition)
- **Larangan:** DILARANG menggunakan gradien warna datar linear untuk transisi antar biome.
- **Mekanisme:**
  - Menggunakan 4 topeng grayscale organik: `transition_mask_a.png` s/d `transition_mask_d.png` (256×256 px tileable, noise perlin-cellular Shan Shui).
  - Sel yang bertetangga dengan famili berbeda menggambar famili tetangga dengan topeng transisi ter-rotasi sesuai arah mata angin (N, S, E, W, NE, NW, SE, SW) dan digabungkan via `destination-in`.
  - Lebar transisi: **0.6 s/d 1.0 petak**, menghasilkan tepian alami seperti sapuan kuas tinta basah.

---

## 5. Sistem Jalan & Perairan (Autotile 47-Blob)
- Menggunakan atlas autotile standar 47-frame (dimensi $1024 \times 768$ px, $8 \times 6$ sel @128 px):
  - `road_stone`, `road_dirt`, `road_snow`, `river`, `shore`.
- Tepian potongan jalan memiliki sudut membulat 0.25 sel dan batas bergelombang lembut tanpa garis outline hitam kaku.

---

## 6. Tabel Target Luminansi & Palet Famili (Normalisasi P2)

| Famili | Hex Dasar | Hex Aksen | Target Lum (0-255) | Max RMS Contrast |
|---|---|---|---|---|
| plains | #7f9a5a | #8a8f55 | 145 ± 8 | 0.12 |
| meadow | #6fa05a | #c9b86a | 150 ± 8 | 0.12 |
| farmland | #7a6444 | #88a05a | 115 ± 8 | 0.11 |
| herb_field | #4f7d5c | #5fb3a0 | 120 ± 8 | 0.12 |
| forest_floor | #3f5b3a | #5a4a33 | 92 ± 8 | 0.11 |
| bamboo_floor | #6f7d4a | #a39a6a | 125 ± 8 | 0.12 |
| dead_wood | #6e6a62 | #8d877c | 110 ± 8 | 0.11 |
| hill | #78875f | #8c8a80 | 132 ± 8 | 0.12 |
| rock_ground | #6d7378 | #8b857b | 118 ± 8 | 0.12 |
| mountain_pass | #7b776d | #6c5f4d | 122 ± 8 | 0.12 |
| canyon_floor | #a2603f | #c08f62 | 115 ± 8 | 0.12 |
| desert_sand | #d2b57e | #c9a566 | 175 ± 8 | 0.10 |
| dune | #cfa968 | #b58b50 | 170 ± 8 | 0.10 |
| oasis | #bda978 | #6c8f50 | 148 ± 8 | 0.11 |
| snow | #eef3f7 | #cfe0ec | 235 ± 8 | 0.08 |
| ice_crack | #b9d8e8 | #e8f3f9 | 205 ± 8 | 0.10 |
| swamp | #55663f | #3e4a33 | 95 ± 8 | 0.11 |
| demonic_swamp | #3b2a48 | #5b3f6a | 75 ± 8 | 0.11 |
| poison_pool | #5f8b35 | #9acb4a | 110 ± 8 | 0.12 |
| miasma_waste | #5e5666 | #7e7482 | 100 ± 8 | 0.11 |
| battlefield_ash | #4a4540 | #6d655b | 85 ± 8 | 0.11 |
| volcanic | #2e2a2a | #d2561f | 60 ± 8 | 0.14 |
| lava_flow | #3b2018 | #ff7a1a | 80 ± 8 | 0.15 |
| crater | #4a3a32 | #7c5a44 | 82 ± 8 | 0.11 |
| lightning_scar | #2f3440 | #9ec9ff | 85 ± 8 | 0.14 |
| formation_tile | #6f7770 | #6fd0c4 | 120 ± 8 | 0.12 |
| ruin_floor | #78756b | #5d7a4c | 118 ± 8 | 0.12 |
| island_reef | #4fb3b0 | #e5d9a8 | 165 ± 8 | 0.12 |
| abyss_edge | #2a2530 | #5a3a6a | 55 ± 8 | 0.12 |
| settlement_floor | #b6a57a | #a49468 | 155 ± 8 | 0.10 |
| ocean | #2f5e84 | #4f86ab | 95 ± 8 | 0.10 |
| river | #4a86a6 | #6fa8c0 | 118 ± 8 | 0.10 |
| lake | #3f7f8f | #6aa3a6 | 112 ± 8 | 0.10 |
| cliff | #5d6064 | #7a756b | 105 ± 8 | 0.12 |
| glacier | #9cc4da | #d6e9f3 | 195 ± 8 | 0.10 |
