# Dokumentasi Anchor yang Melintasi Batas Chunk (32x32)

Berdasarkan analisis spasial pada peta dunia Jianghu (grid 5000x5000 dengan ukuran chunk 32x32 tile), terdapat 6 anchor pemukiman yang bentang bangunannya (`spanWidth` × `spanHeight`) atau radius visualnya melintasi batas chunk 32x32.

## Daftar 6 Anchor

| ID Anchor | Nama | Tipe | Koordinat (x, y) | Span (W×H) | Chunk yang Bersilangan |
|---|---|---|---|---|---|
| `pos_perbatasan_qinghe` | Pos Perbatasan Qinghe | outpost | (2495, 2495) | 3×3 | (77, 77), (78, 77), (77, 78), (78, 78) |
| `pulau_penyu_raksasa` | Pulau Penyu Raksasa | island | (2559, 2558) | 4×4 | (79, 79), (80, 79), (79, 80), (80, 80) |
| `istana_es_abadi` | Istana Es Abadi | sect | (2463, 2430) | 4×4 | (76, 75), (77, 75) |
| `sarang_naga_karang_timur`| Sarang Naga Karang Timur | danger_zone | (2591, 2526) | 3×3 | (80, 78), (81, 78) |
| `kota_jinling` | Kota Jinling | major_city | (2526, 2526) | 4×4 | (78, 78), (79, 78) |
| `kota_binghu` | Kota Danau Es | town | (2430, 2430) | 3×3 | (75, 75), (76, 75) |

## Aturan Arsitektural V20 (Immutable Constraint)

1. **JANGAN MENGGESER KOORDINAT ANCHOR**:
   - Koordinat anchor terikat erat dengan sistem quest, navigasi ferry/dermaga, kompas perjalanan, dan penanda peta.
   - Menggeser koordinat anchor dapat merusak save data pemain yang sedang berada di lokasi tersebut atau referensi kuest lama.

2. **Penempatan Objek Marker**:
   - Objek marker ditempatkan pada chunk yang memuat tile asal anchor `(a.x, a.y)`.
   - Chunk streaming engine (`chunkStreamingEngine.js` dan `assetPlacementV10.js`) memperhitungkan objek dengan bounding box visual yang melebihi batas chunk (overhang) saat melakukan rendering atau culling.

3. **Collision & Tile Forecourt**:
   - Setiap tile dalam span anchor dihitung secara absolut di `proceduralWorldEngine.getTileAt(x, y)`.
   - Perhitungan tile solid (`y < a.y + a.spanHeight - 1`) dan tile forecourt/entrance (`y === a.y + a.spanHeight - 1`) dilakukan murni per koordinat dunia independen dari batas chunk.
