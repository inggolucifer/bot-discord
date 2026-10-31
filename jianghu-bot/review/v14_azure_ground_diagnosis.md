# Diagnosis Ground Pucat & Garis Potong Lurus Azure V14 (H3 Azure Ground Diagnosis)

Dokumen ini mendokumentasikan investigasi akar masalah visual dan teknis dari temuan **H3 (Lantai pucat/putih krem tanpa tekstur di Azure dan garis batas vertikal lurus antarchunk)** pada basis kode V13 (HEAD `1cffde7`).

---

## 1. Temuan Bukti Visual & Geometri Cacat
- Pada shot `review/shots_v13/shot_v12_audit_e_azure_z10.png` di koordinat (2200, 3340):
  Sisi kanan layar (mulai dari $x \approx 1070$ px) menampilkan lantai putih krem datar (RGB $\approx 229, 226, 217$) dengan hanya garis-garis kisi grid terlihat.
  Di perbatasan $x \approx 1070$ px, terdapat garis vertikal lurus sempurna sepanjang $\ge 150$ px yang membelah tanah cokelat bertekstur dengan lantai krem datar tersebut ($\Delta\text{RGB} > 30$).
- Metrik V14 baseline melaporkan:
  - `G_PALE_FLAT_FLOOR`: `1` (GAGAL)
  - `G_STRAIGHT_SEAM`: `1` (GAGAL)

---

## 2. Analisis Akar Masalah (Root Cause Analysis)

### 2.1 Chunk Loading Asynchrony & Kertas Xuan L0
- Seluruh kanvas `WorldCanvas.tsx` pada Layer 0 (`renderL0XuanPaper`) selalu diisi penuh dengan warna dasar Kertas Xuan `#FAF7F0` (RGB $\approx [250, 247, 240]$).
- Saat kamera bergerak atau membuka viewport baru di (2200, 3340), chunk `(68, 104)` selesai di-render lebih dulu, sedangkan chunk tetangga `(69, 104)` masih dalam antrian download/unpacking.
- Pada `WorldCanvas.tsx` baris 705–714:
  ```typescript
  const bitmap = chunkManager.getChunkBitmap(cx, cy, 54);
  if (bitmap) {
    ctx.drawImage(bitmap, csx, csy, csw, csh);
    renderedChunkKeys.add(`${cx}:${cy}`);
  }
  ```
  Jika `bitmap` bernilai `null`, chunk tersebut **TIDAK DIGAMBAR SAMA SEKALI**.
- Selanjutnya pada per-tile fallback loop baris 735:
  ```typescript
  if (!tile) {
    if (camera.zoom >= 0.35 ...) {
      ctx.strokeRect(...);
    }
    continue;
  }
  ```
  Jika data tile untuk chunk tetangga belum ada di cache memori, kanvas membiarkan area tersebut kosong melompong kecuali garis grid `strokeRect`.
- Akibatnya:
  Kertas Xuan `#FAF7F0` pada Layer 0 terekspos secara mentah ke layar dengan grid tipis di atasnya.
  Batas chunk `(68, 104)` yang telah memiliki bitmap bertekstur gelap terpotong tajam di koordinat batas sel $x = 69 \times 32 \times 54$, menghasilkan garis vertikal lurus pemisah chunk sepanjang ratusan piksel.

### 2.2 Transparansi Awal pada Canvas Chunk Macro
- Pada `renderChunkGroundBitmapTextured` di `groundRenderer.ts` baris 981:
  `const canvas = document.createElement('canvas');`
  Canvas baru dibuat dalam keadaan transparan murni (`rgba(0,0,0,0)`). Jika terdapat feathering di perbatasan atau sel tepi yang tidak tertutup sempurna oleh mask famili, lubang transparan ini akan mengekspos kembali Kertas Xuan di belakangnya.

---

## 3. Solusi Terpadu V14 P3
1. **Immediate Solid Background Fill pada Chunk Pending**:
   - Di `WorldCanvas.tsx`: jika `!bitmap` (chunk masih dalam proses unpack/render), segera isi kotak chunk $32 \times 32$ sel dengan warna solid region `getRegionColorAt(cx * CHUNK_SIZE + 16, cy * CHUNK_SIZE + 16)`.
   - Jika `!tile`, isi sel tersebut dengan `getRegionColorAt(tx, ty)` sebelum menggambar grid.
2. **100% Solid Base di Awal Canvas Bitmap**:
   - Di `groundRenderer.ts:renderChunkGroundBitmapTextured`, sebelum me-render famili apa pun, canvas chunk diinisialisasi 100% solid dengan `ctx.fillRect(0, 0, canvasWidth, canvasHeight)` menggunakan warna palet region `baseColor`.
3. **Penggelapan Bioma Batuan Azure ($L \le 150$)**:
   - Famili `rock_ground` dan `canyon_floor` diberi tone shifting slate dingin (`rgba(95, 110, 125, 0.35)` dengan mode multiply), mengeliminasi pantulan terang berlebih dan menjamin kecerahan lantai batuan tetap kokoh dan berwibawa khas pegunungan wuxia.
