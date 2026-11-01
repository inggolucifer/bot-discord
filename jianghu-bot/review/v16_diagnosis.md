# V16 Diagnosis Log (Satu Perubahan = Satu Penyebab = Satu Bukti)

## Ringkasan Inisiasi V16 (P0)
- **Baseline Capture**: 32 titik terkunci (P01..P34) berhasil ditangkap di `review/v16_baseline/` dari build V15 (`HEAD 2561ac63`).
- **Required Points**: `scripts/v16/requiredPoints.json` (32 titik, SHA-256: `7f119234316fdfcb4e37a07de83aebb307996471b0fddb2acd0486aa2180daf8`).
- **Self-Test Suite**: `scripts/v16/pixelGates.py --self-test` mencatat 12/12 uji mandiri PASS 100% (`review/v16_selftest.json`).
- **Verifikasi Baseline Defect**: `scripts/v16/evaluateBaseline.js` mengonfirmasi 10/10 kegagalan nyata baseline V15 (Target >= 8):
  1. `P04_farm` groundColorSanity(field): Hue = 64.8 deg (dry olive-brown) -> GAGAL
  2. `P04_farm` groundTextureRichness: flat single macro tanpa komposit sawah -> GAGAL
  3. `P21_boundary_t1` biomeTransition: transitionWidthCells = 0.389 (< 1.0 cel) batas lurus kaku di (1500, 3350) -> GAGAL
  4. `P22_boundary_t1` biomeTransition: transitionWidthCells = 0 (< 1.0 cel) batas lurus kaku di (2200, 3340) -> GAGAL
  5. `P01_xingcun` roadNaturalness: edgeRoughnessCells = 2.19 (> 0.4 cel) tepi lurus kaku -> GAGAL
  6. `P02_xingcun_cross` roadNaturalness: edgeRoughnessCells = 1.83 (> 0.4 cel) persimpangan kaku -> GAGAL
  7. `P11_xueshan` roadNaturalness: snow trench dark blue (snowRoadBRDiff = 15.5) -> GAGAL
  8. `P13_road_h` roadNaturalness: straight horizontal road segment -> GAGAL
  9. `P06_azure_pass` groundTextureRichness: batu abu datar satu makro (Sobel mean 4.14) -> GAGAL
  10. `P08_azure_far_west` groundTextureRichness: batu abu datar satu makro (Sobel mean 6.49) -> GAGAL

---

## Log Perubahan Fase
### P1: Continuous World Noise Mask & Weighted Variant Selection
*(Akan dicatat pada P1)*
