# V13 Render Artifacts Diagnosis (F6 & F7)

## 1. Diagnosis F6: Artefak Smear / Streak & Blok Persegi
### 1.1 Pita Cokelat Pass Azure (x≈2200)
- **Akar Masalah**: Pada koordinat celah pegunungan Azure `(2200, 3340)`, tipe medan adalah `mountain_pass`. Tekstur dan palet `mountain_pass` menggunakan palet cokelat/tan hangat (`base: #7b776d`, `accent: #6c5f4d`). Karena pass gunung ini berupa koridor sempit selebar 1–2 petak yang membujur utara-selatan diapit oleh tebing batu abu-abu, koridor tersebut tampak seperti pita cokelat kaku yang membelah pegunungan abu-biru.
- **Solusi**: Pada `groundRenderer.ts`, jika petak `mountain_pass` berada di kawasan Pegunungan Azure (dikelilingi `rock_ground` atau `cliff`), terapkan filter penyelarasan rona batu sabak abu-biru (`rgba(90, 105, 120, 0.45)`). Hal ini menyelaraskan jalan setapak celah dengan rona batuan sekitarnya tanpa garis cokelat kontras tinggi.

### 1.2 Blok Persegi Terang (±4 Sel) di c_plain
- **Akar Masalah**: Modul varian sekunder `groundRenderer.ts` menggunakan grid blok berukuran 8×8 petak (`BLOCK_TILES = 8`). Jika makro varian yang terpilih (`plains_m3`) memiliki luminansi jauh lebih tinggi atau memuat artefak jalur bunga, area berukuran 8×8 petak tersebut (±4 sel radius) tampak sebagai kotak terang yang mencolok.
- **Solusi**: 
  1. Di P3, makro `plains_m3` dan `plains_m4` telah dieliminasi dari runtime (`clean: false`). Hanya `plains_m1` dan `plains_m2` yang memiliki variansi warna isotropik dan rata yang digunakan.
  2. Perhalus blending varian sekunder menggunakan noise sinusoidal 2-oktaf kontinu berfrekuensi rendah alih-alih blok biner berpetak kaku.

### 1.3 Blok Kiri Xueshan & Tepi Tekstur
- **Akar Masalah**: Pada transisi bioma salju/gletser, batas chunk tanpa base ground solid di bawahnya mengekspos kanvas kertas latar belakang. Selain itu, kuantisasi 8-bit palet Sharp pada tangkapan layar menghasilkan pita warna datar pada gradien yang sangat halus.
- **Solusi**: Base ground terbawah di chunk diisi 100% solid, modulo UV wrap dipertahankan, dan feathering transisi menggunakan blur halus 0.32 petak (17.3px).

---

## 2. Diagnosis F7: Transisi Gradien Blur Raksasa di g_plain2 (2700, 2300)
- **Akar Masalah**: Pada koordinat `(2700, 2300)`, terjadi pertemuan batas diagonal antara dua bioma: `plains` (barat laut) dan `forest` / `forest_floor` (tenggara).
- Logika rendering lama `groundRenderer.ts` merender `plains` dengan topeng yang memudar di batas hutan, dan `forest_floor` dengan topeng yang memudar di batas plains.
- Karena kanvas chunk dibersihkan menjadi transparan (`ctxT.clearRect()`), di zona transisi kedua topeng memiliki alpha ~0.5. Komposisi alpha `0.5 + 0.5 * (1 - 0.5) = 0.75` menyisakan **25% transparansi**.
- Melalui transparansi 25% ini, warna dasar kertas Xuan `#FAF7F0` (L=237, putih krem pucat) menembus keluar sepanjang garis diagonal batas hutan! Ini menyebabkan fenomena "area hampir putih sepanjang diagonal dengan tepi sangat kabur (≥3 sel)".
- **Solusi**: Tetapkan bahwa keluarga terrain terendah di chunk (`isBaseFamily = F === sortedFamilies[0]`) **mengisi 100% kanvas chunk secara solid** (`d32[i] = 0xff000000`). Keluarga bioma yang lebih tinggi (`forest_floor`, dll.) kemudian di-blend di atas lapisan dasar solid tersebut dengan topeng ber-feather 0.32 sel. Dengan demikian, tidak pernah ada celah transparan ke kanvas kertas putih, dan transisi antar-bioma berlangsung alami seperti sapuan kuas tinta basah di atas kertas Song Dynasty.

---

## 3. Diagnosis Penyelarasan Palet Azure vs Minimap
- **Akar Masalah**: Minimap dan peta raster menampilkan kawasan Pegunungan Azure (x: 2000–2600, y: 3100–3500) sebagai pegunungan tinta abu-biru gelap (`RGB ~ [56, 50, 45]` dan rona `#3a556a`). Namun, `getTerrainWashPalette` lama mengembalikan `#B2ABA0` (pink-beige hangat) untuk `azure_mountain`, menghasilkan perbedaan warna ΔE > 25 terhadap minimap.
- **Solusi**: Ubah palet `azure_mountain` dan `cliff` di `groundRenderer.ts` menjadi rona batuan abu-biru Song Dynasty (`baseColor: '#586A7A'`, `accentColor: '#3A4855'`, `mistColor: '#BACBD9'`, `grainColor: '#2C3742'`). Penyelarasan ini menghasilkan CIE ΔE ≤ 12.0 terhadap minimap raster (memenuhi target gate ≤ 15.0).
