# V12 Needs User Art Manifest

Daftar aset seni gambar yang membutuhkan generasi AI dari pengguna (format prompt standar Lampiran A & B). Selama aset belum di-generate oleh pengguna, sistem secara otomatis mengaktifkan fallback prosedural berstruktur tinggi yang diakui jujur dalam laporan audit akhir ("SEBAGIAN: ground/road masih procedural").

---

## 1. Autotile Road Blob Sets (P2)
Format: 8x6 cells pada 128 px per sel (1024x768 px), 47-blob autotile set, transparent background, soft ink-washed edges, no hard outlines, no center line.

### `art_input/road/road_stone.png`
- **Prompt**:
  ```text
  Top-down autotile blob set, ancient Chinese wuxia weathered flagstone and grey cobblestone, 8x6 cells at 128 px, edges soft ink-washed irregular fading into transparent, no hard outlines, no center line, muted palette #7a756b base, traditional Shan Shui ink wash aesthetic.
  ```

### `art_input/road/road_dirt.png`
- **Prompt**:
  ```text
  Top-down autotile blob set, packed dry loam and tamped wilderness dirt path, 8x6 cells at 128 px, edges soft ink-washed irregular fading into transparent, no hard outlines, no center line, earthy brown palette #7a6444 base with mossy specks.
  ```

### `art_input/road/road_snow.png`
- **Prompt**:
  ```text
  Top-down autotile blob set, trodden snowy trail with subtle frost crust and pale blue shadows, 8x6 cells at 128 px, edges soft ink-washed irregular fading into transparent, no hard outlines, no center line, muted glacial palette #d0dde8.
  ```

### `art_input/road/road_sand.png`
- **Prompt**:
  ```text
  Top-down autotile blob set, wind-carved desert sandstone and caravan trail packed sand, 8x6 cells at 128 px, edges soft ink-washed irregular fading into transparent, no hard outlines, no center line, warm ochre palette #c4a76c.
  ```

### `art_input/road/road_gravel.png`
- **Prompt**:
  ```text
  Top-down autotile blob set, dark crushed volcanic basalt and obsidian gravel trail, 8x6 cells at 128 px, edges soft ink-washed irregular fading into transparent, no hard outlines, no center line, dark charcoal palette #3d3835.
  ```

---

## 2. Sprite Karakter Pemain (P5)
Format: 70x115 px pada skala 128 px/sel, transparent background, no ground disc, no shadow.

### `art_input/player/cultivator_player.png`
- **Prompt**:
  ```text
  Single young wuxia cultivator, 3/4 view from above, full body, white-cream robe with teal sash, black hair bun, transparent background, no ground disc, no shadow, 70x115 px at 128 px/cell scale, thin dark ink outline, soft watercolor shading.
  ```

---

## 3. Massif Gunung Raksasa (P10)
Format: Orthographic 35° view from above, ink-wash Shan Shui style, transparent background, no ground disc, no shadow, flat bottom edge for side-by-side tiling.

### `art_input/mountain/mountain_XXL_{A..F}.png` (8x4 cells -> 1024x1500 px)
- **Prompt Template**:
  ```text
  Single colossal mountain massif for a top-down-ish 2.5D wuxia game, painted ink-wash (shan shui) style, jagged granite peaks with mist in the valleys and tiny pine silhouettes, transparent background, NO ground disc, NO shadow, NO text, NO character, view ~35 degrees from above. Canvas 1024x1500 px, base spans full width, bottom edge flat so it tiles side-by-side with identical sprites. Variant: {A: snow-capped, B: green karst, C: red desert mesa, D: black volcanic, E: ice spire, F: purple demon crag}.
  ```
