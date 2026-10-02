> Baca dokumen ini SEBELUM mengubah Law atau Combat.
> Jika konflik dengan kode, PERCAYAI KODE dan perbarui dokumen ini.

# Law Cultivation & Combat — AI Context (Source of Truth for Agents)

Dokumen ini adalah ringkasan arsitektur otoritatif tertinggi untuk seluruh agen AI (Antigravity, Gemini, Copilot, dll.) mengenai ekosistem 20 Hukum Semesta (Law Cultivation) dan Sistem Tempur Interaktif Terpadu (Combat Depth).

---

## 1. Ringkasan Arsitektur & Katalog 20 Law (`LAW_DEFINITIONS` Keys)

Kunci `lawType` di bawah ini adalah **satu-satunya kunci sah** yang terdaftar di `jianghu-bot/utils/lawCultivationEngine.js` (`LAW_DEFINITIONS`). Dilarang keras menggunakan alias fiktif atau nama generik.

### Elemen (6)
| lawType | Nama (`name` field) |
|---|---|
| `element_phoenix_fire` | Api Phoenix Sejati |
| `element_azure_water` | Samudra Naga Azure |
| `element_xuanwu_earth` | Inti Bumi Xuanwu |
| `element_qingdi_wood` | Pohon Hayat Qingdi |
| `element_roc_wind` | Sayap Badai Roc Kuno |
| `element_godthunder_light` | Petir Hukuman Dewa |

### Spesial (4)
| lawType | Nama (`name` field) |
|---|---|
| `body_tempering` | Penempaan Raga Suci |
| `gu_master` | Rongga Sepuluh Ribu Gu |
| `natal_artifact` | Pusaka Jiwa Kelahiran |
| `natal_beast` | Satwa Roh Kelahiran |

### Demonic (5)
| lawType | Nama (`name` field) |
|---|---|
| `demonic_turbid_core` | Pelebur Inti Siluman |
| `demonic_blood_soul` | Penghisap Darah & Jiwa |
| `demonic_myriad_venom` | Seribu Racun Pemusnah |
| `demonic_abyssal_pact` | Kontrak Iblis Abyss |
| `demonic_nether_darkness` | Bayangan Sembilan Yin |

### Righteous (5)
| lawType | Nama (`name` field) |
|---|---|
| `righteous_heavenly_merit` | Hukum Jasa Langit |
| `righteous_pure_yang` | Kitab Yang Murni |
| `righteous_sword_heart` | Hati Pedang |
| `righteous_formation_array` | Formasi Bendera |
| `righteous_karmic_mirror` | Cermin Karma |

---

### Prinsip Fundamental Law Cultivation:
- **Dual Track Cultivation**:
  - `systemCultivation`: Ranah kultivasi awal tubuh fana (Mortal Stage 1–10).
  - `cultivationLaw`: Terbuka secara permanen dan eksklusif setelah mengikat hukum alam pada Mortal Stage 10.
- **Stage 10 Bind Gate**: Pemain hanya dapat mengikat 1 Law seumur hidup ketika telah mencapai ranah Mortal Stage 10 (`realmIndex === 0 && realmStage >= 10`). Bersifat permanen dan tidak dapat ditukar.
- **Bar Esensi (Essence-First Pipeline)**:
  - `currentEssence`: Menggantikan konsep bar kosong pasif.
  - **Essence kosong = 0 Qi channel** (bukan 15%). Tidak ada aliran Qi tanpa esensi.
  - Absorb item (`/law/essence/absorb`) hanya mengisi bar esensi, tidak memberikan Qi instan (`INSTANT_QI_ON_ABSORB = 0`).
- **Tier Matching & Afinitas**:
  - `playerTier = law.rank + 1`.
  - Item over-tier (`itemTier > playerTier`) ditolak untuk melindungi dantian pemain dari ledakan Qi.
  - Item under-tier dikenakan penalti efisiensi penyerapan bertingkat.
- **Progresi Authoritative**: Dihitung dari `RANK_TARGET_DAYS` (Rank 0 = 7 hari ... akumulatif ~935 hari channel aktif untuk mencapai puncak keabadian). Dilarang keras memodifikasi kurva tanpa skrip estimasi matematis.
- **LAW_RANK_NAMES English Epithets (Index 0–8)**: Setiap 20 Hukum Semesta memiliki julukan ranah berbahasa Inggris unik dari Rank 0 s/d Rank 8. Rank 0 adalah ranah permulaan Hukum Semesta yang sah setelah bind (Initiate/Novice), berbeda mutlak dari tahapan fana `systemCultivation` (Stage 1–10). Representasi ranah ke pemain terpusat lewat helper `formatLawRealmDisplay(playerOrLaw)`, yang selalu memuat julukan Inggris, Rank, dan Stage (contoh: `Ember Initiate · Rank 0 · Stage 0/9`).

---

## 1.1. Skill Tree (Build Choice & Scarcity)
- **Sumber SP (Skill Points)**:
  - Mini Breakthrough (Stage): +1 SP per stage.
  - Major Breakthrough (Rank): +2 SP per rank (dikalibrasi dari +3 SP untuk menegakkan kelangkaan).
  - Lifetime SP (Rank 0–8): $(9 \times 9) + (8 \times 2) = 97$ SP maksimal sepanjang hidup karakter.
- **Struktur Pohon (Tepat 5 Node per Law)**:
  ```text
  [ROOT] Tier 1, maxLevel 5, cost 2 SP/lvl (Total 10 SP)
     ├── [BRANCH_A] Tier 2, maxLevel 5, cost 3 SP/lvl (Total 15 SP)
     │      └── [CAPSTONE_A] Tier 3, maxLevel 4, cost 4 SP/lvl (Total 16 SP)
     └── [BRANCH_B] Tier 2, maxLevel 5, cost 3 SP/lvl (Total 15 SP) [Eksklusif vs Branch A]
            └── [CAPSTONE_B] Tier 3, maxLevel 4, cost 4 SP/lvl (Total 16 SP)
  ```
- **Cabang Eksklusif (Mutual Exclusion)**:
  - `branchId: 'A'` dan `branchId: 'B'` terikat dalam `exclusiveGroup: 'main_path'`.
  - Mengalokasikan 1 poin ke Cabang A mengunci Cabang B secara permanen (`lockedReason: 'branch_locked'`), dan sebaliknya.
  - Pemain dipaksa menentukan spesialisasi build (misalnya: Fire Offensive Burst vs Fire Healing/Immortal Flame).
- **Ekonomi & Batasan Anggaran (Hard Budget Caps)**:
  - Biaya satu jalur penuh (Root Max + Path Max + Capstone Max) = $10 + 15 + 16 = 41$ SP (dalam target anggaran 35–50 SP).
  - Biaya kedua jalur sekaligus = $72$ SP (mustahil diambil bersamaan karena aturan mutual exclusion).
  - Dilarang keras menetapkan `crit >= 0.5`, `atkMult >= 0.025`, `flatHp >= 35`, atau kombinasi stat OP di tingkat Capstone.
- **Tipe Efek & Wiring Nyata (`effectType`)**:
  - `passive`: Modifikasi stat permanen (`hpMult`, `atkMult`, `defMult`, `spdMult`, `flatHp`, `flatAtk`, `flatDef`, `flatSpd`, `crit`, `reflectPct` [maks 25%]).
  - `combat_proc`: Memicu efek tempur situasional (misal: racun batin `venomPoisonProc`, tebasan pendarahan `bleed`, bonus vs buronan `atkWantedMult`, atau damage vs corrupt `dmgVsCorrupted`).
  - `system`: Efek utilitas duniawi (misal: pemurnian racun `yangCleanseChance`, mitigasi unarmed `unarmedPenaltyMitigation`, efisiensi penyerapan esensi `essenceGainPct` [maks +15%], atau bonus hub formasi `homeBonusAdd`).
- **Penegakan API (`/law/skill/allocate` & `/law/skill-tree`)**:
  - GET `/law/skill-tree` mengembalikan `activeBranch`, `spentEstimate`, dan `lockedReason` (`'max_level' | 'branch_locked' | 'need_rank' | 'need_parent' | 'need_sp'`).
  - POST `/law/skill/allocate` menolak alokasi yang melanggar prasyarat dengan pesan Bahasa Indonesia yang ramah pengguna.

---

## 2. File Kritis Law Cultivation
- `jianghu-bot/utils/lawCultivationEngine.js`:
  - `LAW_DEFINITIONS`, `LAW_PROGRESSION`, `ESSENCE_PROFILE`, `SKILL_TREES`.
  - Helper matematis: `getTierAffinity`, `getLawCombatModifiers`, `applyLawDamageModifiers`, `getMaxCombatQi`, `getCombatQiRegenPerRound`, `isPlayerWieldingSword`, `isOnOwnFormationHub`.
- `jianghu-bot/web-api/routes/lawCultivation.js`:
  - Endpoint REST API utama: `/bind`, `/channel/start`, `/channel/stop`, `/essence/absorb`, `/breakthrough/stage`, `/breakthrough/rank`, `/status`, serta ritual khusus faksi Demonic dan Righteous.
- `jianghu-bot/utils/playerCombat.js`:
  - `calculatePlayerStats` mengintegrasikan `LAW_BALANCE` (nerf/buff terkalibrasi) dan kalkulasi `reflectPct`.
- `jianghu-bot/models/Player.js`:
  - Schema database untuk sub-dokumen `cultivationLaw`, `boundEntity`, `demonicData`, `righteousData`, dan `bodyTemperingParts`.

---

## 3. File Kritis Combat Depth
- `jianghu-bot/utils/combatStatus.js`:
  - Modul sentral terpadu untuk `COMBAT_STATUS`, `ensureCombatState`, `applyStatus`, `removeStatus`, `hasStatus`, `getDefenseDamageMultiplier`, `getStatusBadges`, `tickStatuses`, `onSkillHitLawExtras`, dan `onTurnStartLawExtras`.
- `jianghu-bot/utils/combatBody.js`:
  - Kalkulasi penalti tubuh fisik: `getBodyPartCombatMultipliers` (9 bagian tubuh Body Tempering dengan floor aman $\ge 0.50$), `getVitalityCombatPenalty` (floor aman $\ge 0.80$), `getStaminaActionPenalty` (penalti lunak 0.90 / 0.85), `getInjuryStatPenalties` (-3% ATK/DEF, -2% Qi per level), `checkAndApplyHeavyHitInjury` ($\ge 15\%$ Max HP), dan `applyPillarCombatModifiers`.
- `jianghu-bot/services/InteractiveBattleService.js`:
  - Engine pertempuran turn-based interaktif (PVE monster, world boss, arena sparring), koordinasi ronde, wire law modifiers, konsumsi stamina aksi, regenerasi ronde, serta payload response.
- `jianghu-bot/utils/simulateBattle.js`:
  - Simulator duel PVP cepat, arena ladder, sparring sekte, dengan sinkronisasi pilar dan sinergi status.
- `jianghu-bot/utils/statCalculator.js`:
  - Jembatan komputasi atribut menyeluruh (`getComputedStats`), mengintegrasikan equipment, manual, kungfu, dan injury.
- `jianghu-bot/web-api/routes/battle.js`:
  - Endpoint REST API tipis untuk pemicu sesi (`/start`, `/action`, `/state`, `/flee`, `/item`).

---

## 4. Aturan yang JANGAN Pernah Dilanggar (Invariants)
1. **Combat Qi Isolation**: Jangan pernah mengurangi `player.cultivationLaw.qi` untuk biaya jurus. Biaya jurus tempur HANYA mengurangi `session.player.qi` (Combat Qi / MP tempur).
2. **Essence Reality**: Dilarang mengisi bar esensi dari meditasi AFK tanpa mengonsumsi sumber daya dunia nyata (kecuali pipeline khusus penempaan tubuh).
3. **Single DoT Tick Policy**: Tepat 1 kali eksekusi `tickStatuses` per ronde di akhir turn. Dilarang menduplikasi perhitungan damage racun/bleed di tengah giliran menyerang.
4. **Reflect Cap & Anti-Loop**: Nilai `reflectPct` dibatasi keras pada $25\%$ (`REFLECT_CAP = 0.25`). Damage pantulan wajib menyertakan flag `skipReflect: true` agar tidak memicu pemantulan berulang (infinite bounce loop).
5. **Keseimbangan Progresi**: Jangan mengubah angka `RANK_TARGET_DAYS` atau `LAW_BALANCE` tanpa validasi simulasi ekonomi.
6. **Death Recovery 4 Jam**: Kematian karakter di medan laga memicu masa pemulihan dantian selama 4 jam tanpa bisa di-bypass.

---

## 5. Faksi & Karakteristik Identitas Aliran
### Faksi Demonic (Jalan Pintas Bertumbuh di Bawah Bayang-Bayang)
- `demonic_turbid_core`: Inti keruh menyerap energi mentah; menghasilkan korupsi dantian.
- `demonic_blood_soul`: Menghisap saripati darah makhluk hidup; scaling damage tinggi dengan risiko instabilitas jiwa.
- `demonic_myriad_venom`: Mengubah Qi menjadi racun mematikan; serangan otomatis menularkan Poison, toleransi racun batin.
- `demonic_abyssal_pact`: Kontrak jurang purba; mengorbankan vitalitas fisik untuk ledakan kekuatan gaib.
- `demonic_nether_darkness`: Menghimpun esensi dingin neraka; memicu countdown Nether Realm yang harus diseimbangkan di altar.

### Faksi Righteous (Jalan Terang Menembus Langit)
- `righteous_heavenly_merit`: Mengumpulkan pahala kebajikan; bonus damage terukur melawan buronan Jianghu (`isWantedByOrthodox`).
- `righteous_pure_yang`: Hawa murni matahari menolak hawa kotor; resistensi 30% terhadap racun dan peluang membersihkan racun di awal giliran.
- `righteous_sword_heart`: Harmoni mutlak pendekar pedang; syarat wajib menggunakan pedang, memberikan bonus crit dan peluang Bleed pada tebasan kritikal.
- `righteous_formation_array`: Ahli formasi segel; memperoleh perlindungan pertahanan ekstra saat bertarung di dekat pusat formasi sekte.
- `righteous_karmic_mirror`: Cermin pembalas karma; memantulkan sebagian kerusakan lawan kembali ke penyerang (maks 25%).

---

## 6. Alur 1 Ronde Combat (Execution Pipeline)
1. **Validasi Giliran**: Cek apakah entitas terkena Stun atau Membeku (Frozen $\ge 100$). Jika ya, lewati aksi dengan pesan naratif.
2. **Sinergi Awal Giliran (`onTurnStartLawExtras`)**: Pure Yang berpeluang membakar racun (-25 poison); formasi memulihkan stance.
3. **Aksi Pemain (Basic / Skill / Defend / Item)**:
   - Konsumsi stamina aksi (`basic: 2`, `skill: 4`, `defend: 1`, `item: 1`).
   - Cek penalti stamina: jika stamina $< 20\%$, damage $\times 0.90$, akurasi $\times 0.95$; jika stamina $= 0$, damage $\times 0.85$.
   - Hitung damage dasar, perhitungkan defense lawan, buff `defense_up` lawan.
   - Panggil `applyLawDamageModifiers(attacker, defender, damage)`.
   - Cek crit: jika gagal dan `luckRerollEligible === true`, lakukan 1 kali reroll keberuntungan surga.
   - Kurangi HP dan Stance target.
4. **Sinergi Pendaratan Serangan (`onSkillHitLawExtras`)**:
   - Demonic Myriad Venom otomatis menyuntikkan racun.
   - Sword Heart memicu Bleed pada critical hit.
   - Heavy Hit: Jika damage $\ge 15\%$ Max HP target, sematkan Cedera Dalam (`injury` +1).
5. **Serangan Balik Musuh (Enemy AI)**:
   - AI musuh melancarkan aksi dengan kalkulasi damage dan penyerapan pertahanan yang sama.
   - Jika pemain memiliki `reflectPct > 0`, pantulkan kembali sebagian kerusakan ke musuh (cap 25%).
6. **Tick Status Akhir Ronde (`tickStatuses`)**:
   - Dieksekusi tepat satu kali per ronde.
   - DoT damage: Racun (Poison), Pendarahan (Bleed), Terbakar (Burn).
   - Peluruhan alami: Durasi Stun berkurang, Buff Bertahan berkurang, tingkat keparahan Cedera Dalam menyusut (-0.25).
7. **Regenerasi Ronde**:
   - Regenerasi Combat Qi sesuai efisiensi ranah Law.
   - Regenerasi Stamina kecil (+3 stamina per ronde, diperkuat oleh bagian tubuh tulang belakang/dantian jika mengikat Law Tubuh).
8. **Sinkronisasi Response UI**:
   - Menghasilkan array `statusBadges` baku pada pemain dan seluruh musuh.

---

## 7. Integrasi 5 Pilar Tempur (Combat Snapshot Modifiers)
Diterapkan tepat **SATU KALI** pada saat inisialisasi sesi tempur (`applyPillarCombatModifiers`):
- **Focus (Fokus Mental)**:
  - Base 50. Bonus akurasi hit `(focus - 50) * 0.05%`, dibatasi keras pada $\pm 8\%$.
  - Bonus resistensi stun hingga 10%.
- **Mood (Suasana Hati)**:
  - Base 50. Bonus critical hit rate `(mood - 50) * 0.04%`, dibatasi keras pada $\pm 5\%$.
- **Vitality (Daya Tahan Hidup)**:
  - Skala 0–100. Pengali daya tahan `0.80 + (vitality / 100) * 0.20`, dibatasi pada rentang $[0.80, 1.00]$.
- **Luck (Keberuntungan Surga)**:
  - Jika `luck >= 70`, memberikan hak 1 kali reroll otomatis saat serangan kritikal gagal mendarat. Dilarang membuat Luck menjamin crit 100%.
- **Body Tempering 9 Parts**:
  - Hanya aktif jika pemain mengikat hukum alam `body_tempering`.
  - Level tiap bagian tubuh (0–N) memberikan pengali $[0.55, 1.15]$. Level 0 dijamin tidak menyebabkan kelumpuhan karakter (floor aman $\ge 0.55$).

---

## 8. Endpoint Law Cultivation Utama
- `POST /api/law/bind`: Pengikatan hukum alam permanen (syarat Mortal Stage $\ge 10$).
- `POST /api/law/channel/start` & `stop`: Memulai atau menghentikan penyerapan Qi dari esensi.
- `POST /api/law/essence/absorb`: Menelan pil atau batu mineral spiritual untuk mengisi esensi.
- `POST /api/law/breakthrough/stage` & `rank`: Terobosan tingkat kecil (Stage) dan tingkat besar (Rank).
- `GET /api/law/status`: Status komprehensif Law (Mortal gate, unique panel, progression feel, skill tree).

---

## 9. Protokol Menambah Law Baru
1. Daftarkan identitas di `LAW_DEFINITIONS`, `RANK_NAMES`, `ESSENCE_PROFILE`, dan `BINDING_REQUIREMENTS` pada `lawCultivationEngine.js`.
2. Tentukan kalkulasi bonus/nerf stat di `playerCombat.js` (`LAW_BALANCE`) dan efek situasional di `getLawCombatModifiers`.
3. Buat pohon kemampuan di `SKILL_TREES`.
4. Tambahkan katalog item penunjang esensi bertier dan bertag sesuai elemen Law.
5. Buat skrip verifikasi otomatis dan tambahkan ke checklist QA.
6. **Dilarang keras menyentuh `RANK_TARGET_DAYS` tanpa simulasi matematis jangka panjang.**

---

## 10. Protokol Memodifikasi Sistem Tempur
1. Ubah logika dasar pada helper terisolasi di `combatStatus.js` atau `combatBody.js`.
2. Hubungkan call-site di `InteractiveBattleService.js` dan `simulateBattle.js`. Hindari menduplikasi rumus matematika di luar modul helper.
3. Perbarui dokumen pengujian di `jianghu-bot/docs/COMBAT_QA.md`.
4. Jalankan rangkaian skrip pengujian:
   - `node jianghu-bot/scripts/testCombatDepthComprehensive.js`
   - `node jianghu-bot/scripts/testLawCombatBattleWire.js`
   - `node jianghu-bot/scripts/testRighteousLawsComprehensive.js`

---

## 11. Verifikasi Anti-Drift
Setiap kali menambah, memperbarui, atau menghapus Law, jalankan perintah berikut dari folder `jianghu-bot`:
```bash
node -e "const {LAW_DEFINITIONS}=require('./utils/lawCultivationEngine'); console.log(Object.keys(LAW_DEFINITIONS).sort().join('\n'))"
```
Pastikan seluruh daftar kunci `lawType` pada tabel di Seksi 1 dokumen ini selalu identik 1:1 dengan luaran perintah di atas.
