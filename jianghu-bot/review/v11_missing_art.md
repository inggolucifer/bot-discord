# REVIEW V11 — DAFTAR KEBUTUHAN ASET SENI (MISSING ART & ASSET WISHLIST)
Dibuat pada Prompt P4 (V11) sebagai pencatatan jujur aset seni visual Jianghu Bot.

## 1. Status Aset Bertema Salju & Arktik (T4)

Saat ini, zona Arktik (Desa Xueshan, Dusun Pondok Es, Pos Tundra Salju) menggunakan aset kanonikal yang ada di atlas:
- `hut_snow_thatched_day` (Rumah jerami beratap salju kanonikal)
- `hut_snow_thatched_dusk` (Rumah jerami beratap salju senja)
- `hut_pine_woodcutter_day` / `dusk` (Gubuk penebang kayu pinus)
- `structure_prof_cooking_immortal_delicacy_hearth_oven` (Tungku perapian kayu)
- `structure_scatter_mountain_daoist_stone_lantern_beacon` (Lentera batu tahan beku)
- `nature_scatter_frost_crystal_pine_bonsai` (Pinus kerdil kristal es)
- `prop_firewood_stack` (Tumpukan kayu bakar)
- `prop_wooden_fence_corner` (Pagar kayu kasar bersalju)
- `prop_stone_prayer_stela` (Prasasti batu doa)

## 2. Aset Seni Tambahan yang Disarankan (Wishlist Masa Depan)

Aset-aset berikut saat ini disubstitusikan secara deterministik dengan prop sejenis dari atlas:
1. `prop_animal_fur_drying_rack`: Rak jemuran kulit & bulu binatang Arktik (saat ini fallback ke `prop_drying_fish_rack` / `prop_firewood_stack`).
2. `prop_ice_lantern_carved`: Lentera es ukir spiritual (saat ini fallback ke `structure_scatter_mountain_daoist_stone_lantern_beacon`).
3. `hut_igloo_ice_brick_day`: Rumah kubah balok es abadi (saat ini fallback ke `hut_snow_thatched_day`).
4. `prop_reindeer_sled_wooden`: Kereta luncur kayu rusa kutub (saat ini fallback ke `prop_wooden_fence_corner` / gerobak kayu).

Seluruh prop yang ada telah memenuhi kontrak 0 pelanggaran larangan silang (0 cherry blossom, 0 bamboo di Xueshan).
