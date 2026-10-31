# Diagnosis Sistem Jalan & Artefak Rel/Tangga V14 (H1 Road Diagnosis)

Dokumen ini mendokumentasikan akar penyebab matematis dan arsitektural dari temuan **H1 (Jalan berpola rel/tangga di Xingcun dan lingkaran krem berantai di Frost)** pada basis kode V13 (HEAD `1cffde7`).

---

## 1. Temuan Bukti Visual & Metrik
- Pada screenshot `review/shots_v13/shot_v12_audit_a_xingcun_z10.png`:
  Jalan membentang horizontal di (2050, 2650), menampilkan deretan balok putih persegi berulang secara periodik setiap 1 sel (54 px) dengan ujung membulat dan batas tajam, menyerupai bantalan rel kereta api atau tangga horizontal.
- Pada screenshot `review/shots_v13/shot_v12_audit_f_frost_z10.png` di Xueshan (2350, 4300):
  Jalan tampil sebagai rangkaian bulatan/lingkaran krem berantai yang kontras dengan salju biru muda, tanpa blending organik ke bioma sekitar.
- Metrik autokorelasi 1D `G_ROAD_LADDER_AUTOCORR` di V14 baseline melaporkan nilai `1` (GAGAL) dengan korelasi puncak residual $> 0.35$ dan periodisitas seragam $\sigma < 0.22$.

---

## 2. Analisis Akar Masalah: Rendering Ganda & Atlas Sprites

### 2.1 Lapisan 1: Base Bitmap Macro Ground (`groundRenderer.ts` Step 4c)
- `renderChunkMacroGround` membangun mask poligon jalan kontinu `drawSoftBlobRoadPath` dan mengisinya dengan tekstur makro tanah `road_stone`.
- Lapisan ini sebenarnya menghasilkan tekstur jalan berbutir lembut dan cukup organik.

### 2.2 Lapisan 2: Penimpaan Atlas Sprite Autotile (`groundRenderer.ts` Step 6a)
- Namun, pada `groundRenderer.ts` baris 1390–1407:
  ```typescript
  // Step 6a: Autotiles for Rivers & Roads (G4 Base)
  for (const t of tiles) {
    const isRiver = t.terrainType.includes('river') || ...;
    const isRoad = t.terrainType.includes('road');
    if (isRiver || isRoad) {
      const bitmask = calculateAutotileBitmask(t.tileX, t.tileY, t.terrainType, chunkNeighborTerrain);
      const frameId = getAutotileFrameId(t.terrainType, bitmask);
      if (atlasLoader.hasFrame(frameId)) {
        atlasLoader.drawSprite(ctx, frameId, sx, sy, tileSize, tileSize, 0.95);
      }
    }
  }
  ```
- `getAutotileFrameId` memetakan jalan ke `autotile_road_mXX` pada atlas sprite `core_1`.
- Frame `autotile_road_mXX` ini dirancang dengan gaya tilemap retro 100x100: masing-masing frame memiliki balok batu putih krem dengan tepi bulat di setiap petak sel.
- Saat digambar dengan opacity 0.95 tepat di atas base macro, sprite balok autotile ini menimpa dan memusnahkan tekstur dasar, menghasilkan deretan balok putih persegi periodik yang tampak seperti anak tangga / rel.

### 2.3 Lapisan 3: Penimpaan Ketiga di Canvas Dinamis (`WorldCanvas.tsx` L755-757)
- Pada `WorldCanvas.tsx`:
  ```typescript
  } else if (!chunkHasBitmap && tile.terrainType.includes('road')) {
    renderL4AutotileGround(ctx, sx, sy, currentTileSize, tx, ty, tile.terrainType, time, getNeighborTerrain);
  }
  ```
  Jika chunk belum selesai digambar atau fallback dieksekusi, `renderL4AutotileGround` kembali memanggil `atlasLoader.drawSprite(ctx, frameId, ...)`.

### 2.4 Decal Rumput Tepi Periodik (`groundRenderer.ts` L1352-1374)
- Blok 4h menaruh decal rumput pada setiap sel non-road yang bertetangga dengan jalan, menciptakan bercak-bercak hijau tajam periodik yang semakin memperkuat ilusi kisi bergaris.

---

## 3. Rencana Solusi Terpadu V14 P1
1. **Single-Layer Authoritative Road**:
   - Seluruh rendering jalan dialihkan 100% ke ground macro bitmap kontinu di `groundRenderer.ts` Step 4c.
   - Hapus pemanggilan `atlasLoader.drawSprite` untuk kategori `road` di Step 6a `groundRenderer.ts` dan di `renderL4AutotileGround`.
   - Di `WorldCanvas.tsx`, hapus pemanggilan `renderL4AutotileGround` untuk kategori jalan.
2. **Koordinat Absolut Dunia untuk Undulasi Organik**:
   - Gantikan koordinat lokal `px, py` pada fungsi undulasi `drawSoftBlobRoadPath` dengan koordinat absolut dunia `(worldX, worldY)` sehingga tidak ada diskontinuitas di perbatasan chunk.
   - Sambungan boundary antarsel dikunci pada lebar seragam $0.44 \times \text{tileSize}$ dengan filleted corners $r = 0.30 \times \text{tileSize}$.
3. **Pembersihan Decal Periodik**:
   - Hapus penempatan decal rumput seragam di tepi jalan pada Step 4h.
4. **Adaptasi Bioma Salju**:
   - Jalan di bioma bersalju/glasier menyatu lembut dengan rona es/tanah beku tanpa bentuk lingkaran krem berantai.
