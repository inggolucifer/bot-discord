# Daftar 18 Makro Ground Menunggu Aset Baru (V17 Needs User Art)

Berdasarkan audit ketat konten makro ground (1024×1024), teridentifikasi **18 file tekstur** yang mengandung cacat struktural berupa **objek/jalan terpanggang (*baked objects/paths*)** atau **periodisitas kisi (*lattice autocorrelation > 0.35*)**.

Engine perender `groundRenderer.ts` saat ini secara aman mengisolasi atau melewati varian-varian kotor ini dengan hanya memanggil varian bersih yang terverifikasi, sehingga visual runtime di dalam game tetap mulus, organik, dan bebas cacat. Dokumen ini mendokumentasikan ke-18 file tersebut untuk memudahkan tim artis/pengguna dalam memproduksi aset pengganti di masa mendatang.

---

## 1. Tabel 18 Makro yang Menunggu Seni Baru

| No | File Makro | Masalah Terdeteksi | Nilai Terukur | Rekomendasi Prompt Pengganti / Perbaikan |
|---|---|---|---|---|
| 1 | `plains_m1.webp` | Baked Path (Jalur rel/jalan terpanggang) | Baked Path Score: 0.58 (Batas $\le 0.40$) | Buat tekstur padang rumput bersih murni tanpa jalur jalan tanah diagonal yang tercetak di tekstur. |
| 2 | `crater_m3.webp` | Lattice Autocorrelation (Pola konsentris) | 0.679 (Batas $\le 0.35$) | Tekstur kawah vulkanik acak asimetris tanpa lingkaran konsentris berulang. |
| 3 | `desert_sand_m2.webp` | Lattice Autocorrelation (Garis riak sejajar) | 0.739 (Batas $\le 0.35$) | Gumuk pasir gurun alami, hindari garis riak sejajar buatan. |
| 4 | `dune_m1.webp` | Lattice Autocorrelation (Gelombang periodik) | 0.594 (Batas $\le 0.35$) | Variasikan arah tiupan angin gumuk pasir, hindari gelombang periodik 64px. |
| 5 | `farmland_m3.webp` | Lattice Autocorrelation (Alur bajak kaku) | 0.734 (Batas $\le 0.35$) | Tanah bajakan sawah organik tanpa garis bajak lurus mekanis. |
| 6 | `forest_floor_m2.webp` | Lattice Autocorrelation (Kisi berulang) | 0.477 (Batas $\le 0.35$) | Serasah daun hutan berserak acak tanpa pola kisi berulang. |
| 7 | `formation_tile_m1.webp` | Lattice Autocorrelation (Pola heksagonal kaku) | 0.621 (Batas $\le 0.35$) | Formasi retakan batu alami asimetris tanpa kisi sarang lebah mekanis. |
| 8 | `glacier_m1.webp` | Lattice Autocorrelation (Retakan simetris) | 0.551 (Batas $\le 0.35$) | Retakan es organik fraktal tanpa kisi simetris. |
| 9 | `glacier_m2.webp` | Lattice Autocorrelation (Gelombang es berulang) | 0.428 (Batas $\le 0.35$) | Lapisan es biru laut tanpa gelombang periodik. |
| 10 | `lightning_scar_m4.webp` | Lattice Autocorrelation (Sambaran berulang) | 0.450 (Batas $\le 0.35$) | Bekas sambaran petir fraktal bercabang organik asimetris. |
| 11 | `meadow_m3.webp` | Lattice Autocorrelation (Kisi rumput) | 0.392 (Batas $\le 0.35$) | Padang rumput lembut bergradasi alami tanpa pengulangan kisi. |
| 12 | `oasis_m3.webp` | Lattice Autocorrelation (Riak konsentris) | 0.490 (Batas $\le 0.35$) | Pasir basah oasis tanpa riak konsentris mekanis. |
| 13 | `oasis_m4.webp` | Lattice Autocorrelation (Pola lingkaran) | 0.510 (Batas $\le 0.35$) | Tepian air hijau zamrud tanpa lingkaran berulang. |
| 14 | `plains_m3.webp` | Baked Objects (Rumpun bunga & batu besar) | 0.870 (Batas $\le 0.20$) | Tekstur rumput murni; objek batu dan bunga besar harus ditempatkan oleh object scatter engine. |
| 15 | `plains_m4.webp` | Baked Objects (Batu jingga kontras tinggi) | 0.404 (Batas $\le 0.20$) | Hapus batu-batu jingga kontras tinggi yang terpanggang pada tekstur ground. |
| 16 | `river_m4.webp` | Lattice Autocorrelation (Gelombang sinus) | 0.590 (Batas $\le 0.35$) | Aliran air sungai mengalir tanpa pola gelombang sinus sejajar buatan. |
| 17 | `snow_m1.webp` | Lattice Autocorrelation (Kristal periodik) | 0.567 (Batas $\le 0.35$) | Lapisan salju lembut berbutir halus tanpa kristal berulang periodik. |
| 18 | `swamp_m3.webp` | Lattice Autocorrelation (Gelembung kisi) | 0.657 (Batas $\le 0.35$) | Lumpur rawa organik tanpa kisi gelembung berjarak sama. |

---

## 2. Kriteria Penerimaan Aset Baru (1024×1024)
1. **Seamless 4-Side Diff**: $\le 4.0$ (sambungan ubin tanpa garis patah).
2. **Lattice Autocorrelation**: $\le 0.35$ (tidak ada kisi periodik berulang).
3. **Baked Path Score**: $\le 0.40$ (tidak ada garis jalan terpanggang).
4. **Baked Object Score**: $\le 0.20$ (tidak ada batu/pohon/bunga besar terpanggang).
