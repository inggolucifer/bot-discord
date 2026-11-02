# Catatan Perubahan Gate & Titik Uji V19

## 1. Pembaruan Titik Uji P16_west_farm
- **Titik Lama**: `(1800, 2400)`
- **Titik Baru**: `(2215, 2444)`
- **Kelas**: `field` (zoom 1.4)
- **Alasan**: Titik lama `(1800, 2400)` terletak di muara delta sungai Donghai (`water = 0.780`), yang merupakan kesalahan penentuan koordinat dari pihak penilai. Pemilik menyetujui Opsi 1 (memperbarui koordinat P16 ke area sawah sah di dekat pemukiman). Titik `(2215, 2444)` telah diverifikasi secara geografis sebagai area lahan sawah pertanian sah (`green = 0.996`).
- **SHA256 Baru `scripts/v16/requiredPoints.json`**: `84d4b1dfd2428c09a1458ba786752e47ae12dba9a796f74d56a05505ed6e101e`
- **Pembaruan Checksum**: Tercatat dan disinkronkan pada `review/v18_tool_hashes.json`.
