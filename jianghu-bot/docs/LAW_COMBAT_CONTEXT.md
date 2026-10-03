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
  - GET `/law/skill-tree` mengembalikan `activeBranch`, `spentEstimate`, `combatSignatures`, dan `lockedReason` (`'max_level' | 'branch_locked' | 'need_rank' | 'need_parent' | 'need_sp'`).
  - POST `/law/skill/allocate` menolak alokasi yang melanggar prasyarat dengan pesan Bahasa Indonesia yang ramah pengguna.
- **Keunikan Capstone Fingerprint (Zero Duplicate Capstones)**:
  - Seluruh 40 Capstone Tier 3 di 20 Law wajib memiliki skema JSON efek yang 100% unik.
  - Azure Water Capstone (`water_bottomless_ocean`: `defMult 0.008, flatHp 20, hpMult 0.015`) vs Qingdi Wood Capstone (`qingdi_evergreen_dao`: `hpMult 0.014, flatHp 18, combatHpRegenPct 0.006, essenceGainPct 0.01`).
  - Roc Wind Capstone (`roc_nine_heavens`: `firstStrikeAtkPct 0.02, flatSpd 4, spdMult 0.015`) vs Nether Darkness Capstone (`nether_void_walker`: `spdMult 0.014, flatSpd 3, netherZoneAtkBonus 0.02, reflectPct 0.01`).
- **Abyss Signature (`abyssalCurseResist`) & Mitigasi Penalti Upeti Altar**:
  - Node `abyss_umbral_mantle` (+0.06/lvl, spiritualRes 2, defMult 0.012) dan `abyss_fiend_embrace` (+0.06/lvl, defMult 0.014, flatHp 18) memuat atribut resistensi kutukan abyss (`abyssalCurseResist`), dibatasi hard-cap $\le 0.40$.
  - Di `playerCombat.js`, keterlambatan upeti kurban darah altar abyss dikenakan penalti stat $0.80$ (Lv 1) atau $0.65$ (Lv 2). Nilai `abyssalCurseResist` melunakkan penalti ini secara deterministik:
    $$\text{effectivePenalty} = \text{penaltyMult} + (1.0 - \text{penaltyMult}) \times \text{abyssalCurseResist}$$
  - Terpapar langsung di `combatSignatures` (`status.skillTree` & `/law/skill-tree`) dan `panel.demonicData`.
- **Daftar & Makna UI `combatSignatures`**:
  - Array signature aktif diekstrak secara otomatis oleh engine via `getActiveCombatSignatures(player.extendedStats)`:
    - `combatHpRegen`: Regenerasi HP pasif saat bertarung (maks 3% Max HP per ronde).
    - `burnProc`: Tumpukan efek bakar api abadi (maks 15 stack).
    - `chillProc`: Peluang hawa dingin pembeku gerakan musuh.
    - `defenseUpProc`: Peluang memicu pertahanan kokoh penahan 50% damage ronde ini.
    - `firstStrike`: Pengganda serangan pembuka pada ronde 1 pertempuran.
    - `stunProc`: Peluang totokan meridian yang melumpuhkan target (maks 15%).
    - `lifesteal`: Persentase hisap darah musuh (maks 8%).
    - `injuryResist`: Toleransi fisik penahan akumulasi luka dalam (maks 40%).
    - `venomPoisonProc`: Suntikan racun korosif otomatis saat mendaratkan serangan.
    - `yangCleanse`: Peluang pemurnian racun/kutukan di awal giliran.
    - `swordBleed`: Peluang tebasan pedang memicu pendarahan luka terbuka.
    - `reflect`: Pantulan kerusakan karma (maks 25%).
    - `abyssalCurseResist`: Resistensi terhadap kutukan kegelapan/keterlambatan upeti Abyss (maks 40%).
    - `netherZone`: Pengganda serangan dan dominasi wilayah malam/Yin.
    - `corruptionToDef`: Konversi indeks korupsi iblis menjadi pengali pertahanan.
    - `guSignature`: Resonansi serangan tambahan dari cacing Gu tempur aktif.
    - `artifactInfusion`: Infusi energi pusaka kelahiran ke serangan dasar.
    - `beastHeal`: Pemulihan HP instan saat menumbangkan musuh berkat satwa roh.

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

---

## 12. Skill Tree Signatures & Uniqueness (Target 9+/10)

Setiap Law memiliki pohon 5-node terstruktur (Root, Path A, Cap A, Path B, Cap B) dengan cabang eksklusif (`exclusiveGroup: 'main_path'`) dan `branch_locked` yang mencegah pengambilan kedua jalur sekaligus. Anggaran SP dan hard power cap tetap dijaga ketat:

### 12.1. Signature Combat Procs & Systems
Setiap Law **wajib memiliki minimal 1 node** dengan `effectType: 'combat_proc'` atau `'system'` (bukan pohon pasif stat murni):
- **Phoenix Fire (`element_phoenix_fire`)**: Path A = Crit/ATK pasif; Path B = `burnProcStacks` (Cap 15) & `burnTickBonus` DoT multiplier di `tickStatuses`.
- **Azure Water (`element_azure_water`)**: Path A = HP/Spiritual RES; Path B = `chillProcChance` (Cap 25%) & `spdSlowOnHit` (Cap 20%) yang memperlambat pergerakan musuh di medan tempur.
- **Xuanwu Earth (`element_xuanwu_earth`)**: Path A = DEF/HP; Path B = `defenseUpProcChance` (Cap 20%) saat terkena serangan musuh, memicu kuda-kuda bertahan (-50% damage taken).
- **Qingdi Wood (`element_qingdi_wood`)**: Path A = HP/Vitality; Path B = `combatHpRegenPct` (Cap 3% Max HP/ronde) & `essenceGainPct` sistem percepatan kultivasi.
- **Roc Wind (`element_roc_wind`)**: Path A = SPD/Agility; Path B = `firstStrikeAtkPct` (Cap 25% damage pembuka ronde pertama vs tiap musuh).
- **God Thunder (`element_godthunder_light`)**: Path A = Raw ATK; Path B = `stunProcChance` (Cap 15% shock stun) & `bonusAtkOnStun` (Cap 20% damage vs target lumpuh).
- **Body Tempering (`body_tempering`)**: Path A = Bone DEF/HP; Path B = `injuryResist` (Cap 40% menahan benturan Heavy Hit) & `unarmedPenaltyMitigation`.
- **Gu Master (`gu_master`)**: Path A = Flat ATK & `guSlotAtkBonus` (Cap +20 ATK); Path B = `poisonProcFromGu` (Cap 30% suntikan racun aperture).
- **Natal Artifact (`natal_artifact`)**: Path A = `boundOnly` + `artifactInfusionAtk` (Cap +25 ATK); Path B = `boundOnly` + `defMult` & `spiritualRes`.
- **Natal Beast (`natal_beast`)**: Path A = `boundOnly` + `atkMult` & `crit`; Path B = `boundOnly` + `beastHealOnKillPct` (Cap 8% Max HP pulih saat memangsa musuh gugur).
- **Demonic Turbid Core (`demonic_turbid_core`)**: Path A = HP/DEF pasif; Path B = `corruptionToDefPct` (Cap 10% korupsi dikonversi menjadi DEF tambahan) & `martialRes`.
- **Demonic Blood Soul (`demonic_blood_soul`)**: Path A = ATK/Crit; Path B = `lifestealPct` (Cap 8% serapan darah dari damage serangan).
- **Demonic Myriad Venom (`demonic_myriad_venom`)**: Path A = `venomPoisonProc` racun darah; Path B = `corrosionDefShred` (Cap 15% pengikisan zirah lawan).
- **Demonic Abyssal Pact (`demonic_abyssal_pact`)**: Path A = Altar Power Void ATK; Path B = `abyssalCurseResist` & `defMult`.
- **Demonic Nether Darkness (`demonic_nether_darkness`)**: Path A = SPD/Veil; Path B = `netherZoneAtkBonus` sergap malam/zona & `reflectPct`.
- **Righteous Heavenly Merit (`righteous_heavenly_merit`)**: Path A = Divine Merit HP/DEF; Path B = `atkWantedMult` Smite vs Buronan/Iblis.
- **Righteous Pure Yang (`righteous_pure_yang`)**: Path A = Yang ATK vs Kegelapan; Path B = `yangCleanseChance` pembersihan racun otomatis di awal ronde.
- **Righteous Sword Heart (`righteous_sword_heart`)**: Path A = `swordOnly` Crit/ATK; Path B = `swordBleedChance` robekan pendarahan pada tebasan pedang.
- **Righteous Formation Array (`righteous_formation_array`)**: Path A = Global Array ATK/DEF; Path B = `homeOnly` + `homeBonusAdd` & `essenceGainPct`.
- **Righteous Karmic Mirror (`righteous_karmic_mirror`)**: Path A = Mirror DEF/Spirit RES; Path B = `reflectPct` pantulan karma (Hard Cap 25%).

### 12.2. Batas Keamanan Global (Safety Caps)
- `stunProcChance` $\le 0.15$
- `lifestealPct` $\le 0.08$
- `burnProcStacks` $\le 15$
- `combatHpRegenPct` $\le 0.03$ (3% Max HP per ronde)
- `reflectPct` $\le 0.25$ (25% pantulan damage)
- `injuryResist` $\le 0.40$
- `defenseUpProcChance` $\le 0.20$
- `chillProcChance` $\le 0.25$
- `spdSlowOnHit` $\le 0.20$
- `firstStrikeAtkPct` $\le 0.25$
- `bonusAtkOnStun` $\le 0.20$
- `corruptionToDefPct` $\le 0.10$
- `guSlotAtkBonus` $\le 20$
- `artifactInfusionAtk` $\le 25$
- `beastHealOnKillPct` $\le 0.08$

---

## 13. Standardisasi Tab Kultivasi, Modal Jurus, Biaya Material Terobosan, & Tier Affinity

Dokumentasi pembaruan komprehensif sistem kultivasi 20 Law dan antarmuka web dashboard.

### 13.1. Tab Kultivasi Murni (Zero Fake Chrome Policy)
- **Eliminasi Navigasi Fiktif**: Seluruh tombol dan tab tiruan yang tidak fungsional atau membingungkan pemain telah dihapus dari antarmuka kultivasi:
  - `Buka Pohon Dao` (tombol redundan).
  - `Jejak Kultivasi` (tab dummy).
  - `Tabel Master` (`MasterRealmRoadmapAccordion` yang memuat tabel mockup 9 ranah).
  - `Buka Pohon Jurus` (tombol duplikat).
- **Fokus Tunggal**: Tab Kultivasi kini menyajikan visualisasi murni: status ranah aktif, kapasitas dantian, sirkulasi Qi & intisari, 9 modal penyerapan esensi material alam, dan tombol navigasi langsung ke Rasi Bintang Law yang aktif (`/cultivation?lawTree=...`).

### 13.2. Modal Detail Jurus Data-Driven (`LawConstellationTree.tsx`)
- **Sumber Data Otoritatif**: Node rasi bintang hukum alam merender modal rincian jurus yang ditarik langsung dari konfigurasi engine `LAW_SKILL_TREES[lawType].nodes`.
- **Formatting Dinamis**:
  - Multiplier, persentase proc, dan resistensi diformat dalam notasi `+X%`.
  - Peningkatan stat langsung diformat dalam notasi `+X`.
  - Tipe jurus diklasifikasikan secara dinamis: `Combat Proc`, `Sistem Kultivasi`, `Pasif Tempur`, atau `Transformasi Dantian`.
- **Progres SP Hakiki**: Mengeliminasi indikator XP palsu pada jurus; level node ditampilkan dengan format SP riil (misal `Lv. 2/5 (Total SP: 4)`), beserta perbandingan efek saat ini (*Current Level*) dan efek level berikutnya (*Next Level*).

### 13.3. Terobosan Ranah Menggunakan Material Murni (Zero Currency Policy)
- **Bebas Mata Uang**: Terobosan ranah hukum alam **DILARANG MENGURANGI MATA UANG** (Tembaga, Perak, Emas, maupun Spirit Stone kurensi).
- **Formula Kebutuhan Material (Option A)**:
  $$\text{Qty} = 2 + \text{Rank} + \lfloor \text{Stage} / 3 \rfloor$$
- **Validasi Kategori**: Material yang sah meliputi kategori `breakthrough_material`, `spirit_stone` (item inventori fisik), `catalyst`, atau `herb`.
- **Syarat Tier Material**: `itemTier <= playerTier` di mana `playerTier = rank + 1`. Material dengan tier lebih tinggi dari ranah dantian kultivator akan ditolak oleh backend.

### 13.4. Matriks Efisiensi Penyerapan Intisari (Tier Affinity Penalty)
Setiap penyerapan material atau pemberian makan intisari ke dalam dantian divalidasi melalui `assertAbsorbTier(playerRank, itemTier)`:
- **Pemain Tier**: $\text{playerTier} = \text{playerRank} + 1$ (Rank 0 = Tier 1, Rank 1 = Tier 2, Rank 2 = Tier 3, dst.).
- **Batas Atas Mutlak**: $\text{itemTier} > \text{playerTier} \implies$ **HTTP 400 Bad Request** ("Kapasitas dantian belum mampu menyerap intisari tingkat tinggi").
- **Matriks Efisiensi ($\Delta = \text{playerTier} - \text{itemTier}$)**:
  - $\Delta = 0$: **Efisiensi Optimal 100% (`1.0`)**. Dantian menyerap intisari secara utuh.
  - $\Delta = 1$: **Efisiensi Berkurang 50% (`0.50`)**. Resonansi intisari melemah karena kultivator berada 1 tingkat di atas material.
  - $\Delta \ge 2$: **Efisiensi Anjlok 20% (`0.20`)**. Penyerapan intisari tingkat rendah oleh kultivator tingkat tinggi menghasilkan residu yang nyaris sia-sia ($< 0.5$).
- **Penerapan Penuh**: Diberlakukan pada seluruh 12 endpoint serap/feed di `web-api/routes/lawCultivation.js` (Elemental, Gu, Beast, Artifact, Nether, Turbid Core, Blood Soul, Venom, Abyssal, Array, Heavenly Merit, Karmic Mirror) dan divisualisasikan dengan badge status (`isOptimal`, persentase efisiensi, dan peringatan penurunan hasil) di seluruh 9 modal serap frontend.

### 13.5. Penamaan Ranah Terpadu & Standar Fallback 10-Tier
- **Sinkronisasi Otoritatif**: Komponen frontend (`LawCultivationTab.tsx`, `SkillTreeClient.tsx`, `LawConstellationTree.tsx`) mengutamakan `realmLabel` atau `realmDisplay.display` yang dikirim dari API.
- **Standar Fallback 10-Tier (`LAW_RANK_STANDARD_NAMES`)**:
  1. Rank 0: *Qi Condensation* (炼气)
  2. Rank 1: *Foundation Establishment* (筑基)
  3. Rank 2: *Core Formation* (结丹)
  4. Rank 3: *Nascent Soul* (元婴)
  5. Rank 4: *Soul Formation* (化神)
  6. Rank 5: *Void Refinement* (炼虚)
  7. Rank 6: *Body Integration* (合体)
  8. Rank 7: *Great Ascension* (大乘)
  9. Rank 8: *Tribulation Transcendence* (渡劫)
  10. Rank 9: *Dao Lord* (道君)
