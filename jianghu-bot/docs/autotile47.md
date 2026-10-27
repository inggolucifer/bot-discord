# SPESIFIKASI AUTOTILE 47-BLOB V11 (JALAN & TEPIAN AIR)

Dokumen ini mendefinisikan sistem atlas autotile 47-blob untuk permukaan jalan dan tepian perairan di Jianghu (Immortal-X) V11.

---

## 1. Konsep & Prinsip Desain
- **Dimensi Atlas:** $1024 \times 768$ piksel.
- **Grid Sub-Ubin:** $8 \times 6$ sel = 48 slot ubin ($128 \times 128$ piksel per sub-ubin).
  - Slot 0 s/d 46: 47 kombinasi topologi unik (blob bitmask).
  - Slot 47: Cadangan/Center kosong.
- **Resolusi Rendering:** 128 px/sel (1-to-1 dengan macro-texture ground layer).
- **Estetika Wuxia Shan Shui:**
  - Tepian jalan atau bibir air memiliki kelengkungan sudut halus ($r = 0.25$ sel $\approx 32$ piksel).
  - Transisi batas bergradasi lembut (feathered alpha blending $\le 0.08$ per pixel) menyerupai sapuan kuas tinta basah di atas kertas beras Xuan.
  - **DILARANG KERAS** menggunakan outline hitam pekat (garis kartun).

---

## 2. Sistem Bitmask 8-Tetangga (8-Neighbor Bitmasking)

Setiap sel memeriksa 8 sel di sekelilingnya yang bertipe sama (misal `isRoad` atau `isWater`):

```
+-----+-----+-----+
| NW  |  N  | NE  |       Bobot:
| (7) | (0) | (1) |       N  = 1    (bit 0)
+-----+-----+-----+       NE = 2    (bit 1)
|  W  | SEL |  E  |       E  = 4    (bit 2)
| (6) |     | (2) |       SE = 8    (bit 3)
+-----+-----+-----+       S  = 16   (bit 4)
| SW  |  S  | SE  |       SW = 32   (bit 5)
| (5) | (4) | (3) |       W  = 64   (bit 6)
+-----+-----+-----+       NW = 128  (bit 7)
```

### Aturan Reduksi Sudut Diagonal (Corner Reduction Rule)
Tetangga diagonal (NE, SE, SW, NW) hanya dihitung aktif jika **kedua** tetangga kardinal yang mengapitnya juga aktif:
- `NE` hanya relevan jika `N` dan `E` aktif. Jika tidak, abaikan bit NE.
- `SE` hanya relevan jika `S` dan `E` aktif. Jika tidak, abaikan bit SE.
- `SW` hanya relevan jika `S` dan `W` aktif. Jika tidak, abaikan bit SW.
- `NW` hanya relevan jika `N` dan `W` aktif. Jika tidak, abaikan bit NW.

Dengan aturan reduksi ini, dari $2^8 = 256$ kemungkinan, terdapat tepat **47 topologi bentuk blob yang kanonikal**.

---

## 3. Tabel Pemetaan Indeks Atlas 47-Blob ($8 \times 6$)

| Indeks | Kolom, Baris | Deskripsi Topologi | Karakteristik Visual |
|---|---|---|---|
| 0 | 0, 0 | Pulau Tunggal (Isolated 0-neighbor) | 4 sudut membulat, batu bundar terisolir |
| 1 | 1, 0 | Ujung Buntu Utara (Dead-end N) | Jalan buntu menghadap Utara |
| 2 | 2, 0 | Ujung Buntu Timur (Dead-end E) | Jalan buntu menghadap Timur |
| 3 | 3, 0 | Ujung Buntu Selatan (Dead-end S) | Jalan buntu menghadap Selatan |
| 4 | 4, 0 | Ujung Buntu Barat (Dead-end W) | Jalan buntu menghadap Barat |
| 5 | 5, 0 | Lorong Vertikal (N-S Pipe) | Jalur lurus Utara-Selatan, tepian kiri/kanan bergelombang |
| 6 | 6, 0 | Lorong Horizontal (E-W Pipe) | Jalur lurus Barat-Timur, tepian atas/bawah bergelombang |
| 7 | 7, 0 | Sudut Luar Barat-Laut (Corner NW) | Sudut tajam/membulat membelok dari N ke W |
| 8 | 0, 1 | Sudut Luar Timur-Laut (Corner NE) | Sudut membelok dari N ke E |
| 9 | 1, 1 | Sudut Luar Tenggara (Corner SE) | Sudut membelok dari S ke E |
| 10 | 2, 1 | Sudut Luar Barat-Daya (Corner SW) | Sudut membelok dari S ke W |
| 11 | 3, 1 | Persimpangan T menghadap Utara | Sambungan N, E, W |
| 12 | 4, 1 | Persimpangan T menghadap Timur | Sambungan N, E, S |
| 13 | 5, 1 | Persimpangan T menghadap Selatan | Sambungan E, S, W |
| 14 | 6, 1 | Persimpangan T menghadap Barat | Sambungan N, S, W |
| 15 | 7, 1 | Persimpangan 4 Arah (Crossroads) | Sambungan N, E, S, W tanpa inner diagonal |
| 16..19 | 0..3, 2 | Sudut Dalam Tunggal (1 Inner Corner) | Permukaan penuh dengan 1 lekukan sudut dalam |
| 20..25 | 4..7, 2 / 0..1, 3 | Sudut Dalam Ganda (2 Inner Corners) | Kombinasi dua lekukan sudut dalam berlawanan |
| 26..29 | 2..5, 3 | Tiga Sudut Dalam (3 Inner Corners) | Permukaan penuh dengan 3 lekukan sudut dalam |
| 30 | 6, 3 | Empat Sudut Dalam (4 Inner Corners) | Permukaan penuh dengan 4 lekukan sudut dalam |
| 31..45 | 7, 3 / 0..7, 4 / 0..5, 5 | Kombinasi Tepi Kardinal & Sudut Dalam | Varian kompleks tepi lurus dengan lekukan dalam |
| 46 | 6, 5 | Pusat Penuh (Solid Center / Full Fill) | Ubin tengah tertutup penuh tekstur batu/air |
| 47 | 7, 5 | Cadangan (Reserved Blank) | Slot kosong transparan |

---

## 4. Lapisan Pengguna Autotile 47-Blob di V11
1. **Jalan Batu Kuno (`road_stone`):**
   - Tekstur batu kali berlumut halus dengan retakan batu alami.
2. **Jalan Tanah Pedesaan (`road_dirt`):**
   - Jalur tanah liat padat berpasir dengan serakan jerami halus.
3. **Jalan Salju Pegunungan (`road_snow`):**
   - Jejak pijakan salju padat dengan kristal es beku.
4. **Bibir Sungai (`river`):**
   - Aliran air segar pegunungan dengan tepian batu halus dan buih arus.
5. **Pesisir Pantai / Danau (`shore`):**
   - Garis pasang surut pasir basah bergradasi lembut ke air dangkal.
