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

### 3.7. Monster Spasial Grid & Sistem Pertarungan Turn-Based Interaktif (Battle Arena V2)
- **Penempatan Spasial**: Monster ditempatkan secara eksplisit pada petak koordinat tertentu (`ZoneTile.spawnedMonster`), contoh petak uji coba **(2452, 2481)** untuk *Serigala Roh Darah* (`wolf_azure`).
- **Zero Clutter Policy**: Petak kosong tanpa monster **DILARANG** menampilkan icon monster `👹`. Hanya petak dengan monster aktif yang merender aura crimson merah dan icon siluman.
- **Antarmuka Gaya Pokemon / RPG Maker (Fight & Run)**:
  - **Mode COMMAND**: Pilihan utama `[⚔️ BERTARUNG]` dan `[🏃 KABUR]`.
  - **Mode SKILLS**: Bar jurus rapi dalam grid terisolasi, tidak tembus ke samping layar.
- **Dukungan 1-8 Musuh & Tim Sekutu (Allies)**:
  - Max 4 musuh aktif di medan tempur (`session.enemies`), sisa di antrian cadangan (`session.enemyQueue`).
  - Ketika musuh aktif gugur, musuh di antrian otomatis melangkah maju.
  - Pemain dapat membawa hingga 3 sekutu (Pet / NPC) untuk melancarkan serangan bantuan.
- **Status Efek (Buff & Debuff)**:
  - `poison`: Damage DoT tiap ronde (badge `☠️`).
  - `stun`: Melumpuhkan target selama 1 ronde (badge `⚡`).
  - `defense_up`: Menahan 50% damage serangan lawan (badge `🛡️`).
- **Kematian & Pemulihan Dantian 4 Jam (Death Recovery)**:
  - Karakter gugur terkena masa pemulihan dantian selama **4 jam diam di tempat**.
- **Penghapusan Monster yang Dikalahkan (Defeated Monster Removal)**:
  - Monster yang dikalahkan disimpan di `DefeatedMonsterTile` dan dihilangkan dari peta hingga waktu respawn selesai.

### 3.8. Kategori Senjata & Disiplin KungFu (Weapon Categories & Discipline Map)
Setiap senjata dipetakan ke disiplin beladiri (`player.kungfuSkills`) menggunakan `resolveWeaponDiscipline(item)`:
- `sword`: **Tebasan Pedang** (🗡️, Logam, +5% Crit Rate)
- `saber`: **Tebas Golok** (⚔️, Logam, +25% Stance Damage)
- `staff`: **Sapuan Senjata** (🥢, Tanah, AoE ke semua musuh aktif)
- `fist`: **Pukulan Telak** (👊, Netral, Regenerasi +5 Qi)
- `hiddenWeapon`: **Lemparan Rahasia** (🎯, Netral, 15% Racun)
- `finger`: **Totokan Meridian** (👆, Netral, 20% Lumpuh/Stun 1R)
- `fist` (unarmed): **Tinju Tangan Kosong** (👊, Netral, Regenerasi +5 Qi)

**Slot Jurus Battle Arena**:
- Slot 1: [WAJIB] Basic Attack Adaptif (sesuai senjata / tangan kosong).
- Slot 2+: HANYA manual teknik yang dipelajari pemain (`player.manuals`).
- Jurus hardcoded lama (`qi_strike`, `iron_wall`, `qi_overload`) telah **DIHAPUS SECARA TOTAL**.

