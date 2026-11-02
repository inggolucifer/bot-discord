# PERTANYAAN RESMI UNTUK PEMILIK PROYEK / PENILAI (V18-P1)

**Topik**: Dataran Hijau di Sisi Kanan (x > 1506) pada Titik Uji P07 (1500, 3350)  
**Dokumen Pendukung**: `review/v18_diagnosis.md`

---

## Ringkasan Bukti Empiris

Berdasarkan investigasi menyeluruh pada data terrain dan riwayat kode antara commit `0884f5b9` (V16) dan `bdfeda4e` (V17):

1. **Data Peta Nyata**:
   - Database dunia (`proceduralWorldEngine.js` / `chunkStreamingEngine.js`) di titik (1500, 3350) beserta seluruh 1024 petak chunk (46, 104) dan 1024 petak chunk (47, 104) serta 9 chunk tetangganya adalah **100% `azure_mountain` (family `rock_ground`)**.
   - Tidak ada satu pun sel bertipe `plains` atau `grass` di area tersebut dalam database dunia.

2. **Penyebab Hijau di V16**:
   - Di V16, saat chunk (47, 104) dirender, petak batas kanan (chunk 48) belum dimuat ke memori karena berada di luar viewport kamera.
   - Kode V16 mengeksekusi fallback `chunkNeighborTerrain(gx, gy) || 'plains'`, sehingga petak yang belum termuat otomatis diisi `'plains'`.
   - V16 menyortir layer berdasarkan prioritas `FAMILY_RENDER_ORDER` di mana `plains` (prioritas 11) mengalahkan `rock_ground` (prioritas 25).
   - Akibatnya, chunk (47, 104) secara keliru dicat dasar hijau `plains`, memunculkan batas lurus vertikal di $x \approx 857$ px (tepat di batas $x=1504$).

3. **Kondisi V17/V18**:
   - V17 memperbaiki bug halo fallback ini dengan mengunci ke petak internal terdekat (`clamping`) dan menetapkan `dominantFamily` (mayoritas internal) sebagai dasar.
   - Karena semua petak chunk 47 adalah `azure_mountain`, seluruh layar kini terisi batuan pegunungan Azure tanpa injeksi palsu dataran hijau.

---

## Pertanyaan untuk Pemilik Proyek / Penilai

1. **Opsi A (Rekomendasi Arsitektural — Mengikuti Database Peta)**:
   - Mempertahankan area (1500, 3350) sebagai Pegunungan Azure Karst murni tanpa dataran hijau buatan, sesuai dengan data definitif dunia Tale of Immortal 5000x5000.
2. **Opsi B (Modifikasi Data Dunia)**:
   - Jika narasi/lore dunia menghendaki adanya batas dataran hijau di $x > 1506$, maka perubahan tersebut harus diubah secara resmi pada level peta dunia (`proceduralWorldEngine.js`) agar konsisten antara server bot Discord dan visualisasi dashboard web.

Untuk tahapan eksekusi V18 (P2 & P3), engine akan memproses sesuai **Opsi A** (server-authoritative map data) dengan melenyapkan moiré, patahan chunk seam, dan garis horizontal pada batuan Azure Karst.
