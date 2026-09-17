# JIANGHU BOT & IMMORTAL-X: MASTER AI ARCHITECTURE GUIDE (AGENTS.md)

Refer to the primary instruction guide at the workspace root: [../AGENTS.md](../AGENTS.md).
This project is an authoritative Wuxia/Xianxia MMORPG combining a Discord Bot and Next.js 15 Web Dashboard.
All backend routes, MongoDB schemas, and `globalAssets.ts` mappings must remain 100% synchronized.
TypeScript compilation (`npx tsc --noEmit`) and blueprint integrity tests (`node test_phase_blueprint_integrity.js`) must strictly pass with zero errors.

### 3.4. Dermaga & Moda Penyeberangan Air
- **Rakit Bambu (Ekonomis)**: Tiket murah (20 Perak), perjalanan nyata dengan countdown 30 detik diiringi animasi ombak air dan kesempatan memancing di atas rakit.
- **Kapal Cepat / Pedang Terbang (Mewah)**: Tiket premium (150 Perak / 1 Giok), tiba seketika (*instant arrival*) di dermaga tujuan.

### 3.5. Sistem Gulungan Law & Pengikatan Fondasi Fana (Mortal Only Law Binding)
- **Aturan Ranah Mutlak**: Gulungan Hukum Alam (`category: 'law'`) **HANYA DAPAT DIGUNAKAN KETIKA PEMAIN MASIH DI RANAH MORTAL (`realmIndex === 0`)**.
- **Prinsip Lore**: Tubuh fana yang masih murni adalah satu-satunya wadah yang dapat mematri intisari Dao dasar. Begitu menembus ranah Qi Refining (`realmIndex >= 1`), dantian telah terikat dan menolak penyerapan hukum fondasi baru.
- **Batasan Jumlah**: Setiap kultivator hanya dapat mengikat **1 Hukum Alam Utama seumur hidup** (`player.laws.length === 1`). Hukum ini menentukan elemen spiritual dan bonus multiplikator stat fundamental.

### 3.6. Sistem Manual Teknik & Syarat Kemahiran (Mastery & Realm Prerequisites)
- Kitab jurus teknik (`category: 'manual'`) memiliki sistem validasi persyaratan (*prerequisites*) sebelum dapat dipelajari di `/api/inventory/use-manual`:
  1. **Syarat Ranah Kultivasi (`minRealmIndex`)**: Kapasitas dantian pemain harus mencapai level ranah minimal (misal: *Kitab Pedang Angin Puyuh* butuh ranah Qi Refining / Index 1).
  2. **Syarat Kemahiran Senjata / Profesi (`requiredSkillType` & `requiredSkillPoints`)**: Pemain wajib melatih kemahiran senjata terkait (contoh: Kemahiran Pedang / `kungfuSkills.sword >= 30`, atau Kemahiran Pukulan / `kungfuSkills.fist >= 15`).
  3. **Syarat Afiliasi Sekte (`requiredSectId`)**: Manual esoteris sekte hanya dapat dipelajari oleh murid sah sekte tersebut dengan pangkat yang mencukupi.
  4. **Progres Pemahaman**: Dimulai dari Level 0 dan ditingkatkan bertahap melalui meditasi pemahaman waktu nyata (*timeToComprehendHours*).

### 3.7. Monster Spasial Grid & Pemicu Pertarungan Turn-Based (Interactive Battle Arena)
- **Penempatan Spasial**: Monster ditempatkan secara eksplisit pada petak koordinat tertentu (`ZoneTile.spawnedMonster`), contoh petak uji coba **(2452, 2481)** untuk *Serigala Roh Darah* (`wolf_azure`).
- **Zero Clutter Policy**: Petak kosong tanpa monster **DILARANG** menampilkan icon monster `👹`. Hanya petak dengan monster aktif yang merender aura crimson merah dan icon siluman.
- **Mekanisme Turn-Based**: Klik tombol `[⚔️ Tantang]` pada kartu inspektur petak (`GridTileInspectorCard`) memicu endpoint `/api/battle/start` (targetType `'monster'`), membuka modal `BattleArena` fullscreen dengan sistem ATB dinamis, penggunaan Qi, cooldown jurus, dan drop hadiah (EXP & Perak).
