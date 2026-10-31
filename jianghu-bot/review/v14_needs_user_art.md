# Daftar 17 Makro Ground Kotor & Rekomendasi Regenerasi Aset (V14 Needs User Art)

Berdasarkan audit ketat V14 (`scripts/v14/groundContentAudit.py`), ditemukan 17 dari 144 makro ground (1024x1024) yang mengandung cacat struktural berupa **kisi berlian periodik (lattice autocorrelation > 0.35)** atau **objek diskrit terpanggang (baked objects > 0.20)**.

Saat ini game secara aman memfilter dan hanya menggunakan varian bersih (`m1`/`m2` atau varian bersih lainnya per bioma), sehingga kualitas visual di dalam game tetap mulus tanpa cacat. Dokumen ini disediakan sebagai panduan jika pengguna ingin menghasilkan/meregenerasi 17 varian ini dengan model AI di kemudian hari.

---

## 1. Tabel 17 Makro yang Perlu Digenerasi Ulang

| No | File Makro | Masalah Terdeteksi | Nilai Terukur | Rekomendasi Prompt AI |
|---|---|---|---|---|
| 1 | `crater_m3.webp` | Lattice Autocorrelation | 0.679 (Ambang $\le 0.35$) | Gunakan ground tekstur kawah vulkanik acak tanpa pola konsentris periodik. |
| 2 | `desert_sand_m2.webp` | Lattice Autocorrelation | 0.739 | Hasilkan gumuk pasir acak, hindari garis riak pasir sejajar buatan. |
| 3 | `dune_m1.webp` | Lattice Autocorrelation | 0.594 | Variasikan arah angin gumuk, hindari gelombang riak periodik 64px. |
| 4 | `farmland_m3.webp` | Lattice Autocorrelation | 0.734 | Buat tekstur tanah bajakan organik tanpa alur garis bajak lurus kaku. |
| 5 | `forest_floor_m2.webp` | Lattice Autocorrelation | 0.477 | Serakan serasah daun hutan acak tanpa kisi berulang. |
| 6 | `formation_tile_m1.webp` | Lattice Autocorrelation | 0.621 | Pola formasi batu heksagonal alami tanpa kisi buatan. |
| 7 | `glacier_m1.webp` | Lattice Autocorrelation | 0.551 | Retakan es organik acak (Voronoi fractal) tanpa kisi simetris. |
| 8 | `glacier_m2.webp` | Lattice Autocorrelation | 0.428 | Lapisan es biru laut tanpa gelombang periodik. |
| 9 | `lightning_scar_m4.webp` | Lattice Autocorrelation | 0.450 | Bekas sambaran petir fraktal bercabang asimetris. |
| 10 | `meadow_m3.webp` | Lattice Autocorrelation | 0.392 | Rumput padang rumput lembut bergradasi alami. |
| 11 | `oasis_m3.webp` | Lattice Autocorrelation | 0.490 | Pasir basah oasis tanpa riak air mekanis. |
| 12 | `oasis_m4.webp` | Lattice Autocorrelation | 0.510 | Tepian air hijau zamrud tanpa lingkaran berulang. |
| 13 | `plains_m3.webp` | Baked Objects (Bunga/Batu) | 0.870 (Ambang $\le 0.20$) | Hapus rumpun bunga besar & batu panggang; ground harus murni tekstur tanah/rumput mikro. Objek besar harus ditempatkan lewat engine scatter. |
| 14 | `plains_m4.webp` | Baked Objects (Batu Jingga) | 0.404 | Hapus batu-batu jingga kontras tinggi yang terpanggang di tekstur. |
| 15 | `river_m4.webp` | Lattice Autocorrelation | 0.590 | Tekstur air sungai mengalir tanpa gelombang sinus sejajar buatan. |
| 16 | `snow_m1.webp` | Lattice Autocorrelation | 0.567 | Salju lembut berbutir halus tanpa kristal berulang periodik. |
| 17 | `swamp_m3.webp` | Lattice Autocorrelation | 0.657 | Lumpur rawa organik tanpa kisi gelembung berjarak sama. |

---

## 2. Aturan Kualitas untuk Aset Pengganti
Setiap gambar baru berukuran 1024×1024 wajib memenuhi kriteria berikut saat diuji dengan `scripts/v14/groundContentAudit.py`:
1. **Seamless 4-Side Diff**: $\le 4.0$ (tepi kiri-kanan dan atas-bawah menyambung sempurna).
2. **Lattice Autocorrelation**: $\le 0.35$ (tidak ada kisi berlian / pola berulang).
3. **Baked Path Score**: $\le 0.40$ (tidak ada jalur/jalan diagonal yang tergambar di tekstur).
4. **Baked Object Score**: $\le 0.20$ (tidak ada batu, pohon, atau bunga besar kontras tinggi di tekstur).
