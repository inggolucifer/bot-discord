# INSTRUKSI MASTER: ARSITEKTUR JURUS, STAT CORE, KITAB & HUKUM ALAM, SERTA ARENA SECTE (INSTRUKSI.MD)

Dokumen ini adalah instruksi otoritatif dan panduan referensi utama bagi seluruh agen AI (Antigravity, Gemini, Copilot, dll.) dan pengembang mengenai konfigurasi menyeluruh sistem jurus, manual bela diri, pertumbuhan stat core, arena pertempuran, dan tangga peringkat di Jianghu Bot (Immortal-X).

---

## 1. Ringkasan Prinsip Arsitektur (Golden Rules)

1. **Aturan Kapasitas Manual Eksternal (Formula Core Stat)**:
   $$\text{Batas Maksimal Manual Eksternal yang Dapat Dipelajari} = 4 + \left\lfloor\frac{\text{player.kungfuSkills.core}}{5}\right\rfloor$$
   - Karakter baru / fana (`core = 0`) secara default **hanya dapat mempelajari maksimal 4 Manual Eksternal**.
   - Setiap akumulasi **5 poin pada stat `core`** menambah **+1 kapasitas manual** (misal: Core 5 $\to$ 5 manual, Core 10 $\to$ 6 manual, Core 20 $\to$ 8 manual).
2. **Pengecualian Mutlak untuk Skill Bawaan Law (Skill Tree)**:
   - Jurus bawaan dari Pohon Hukum Semesta (`player.cultivationLaw.unlockedSkillIds`) **TIDAK MEMAKAN SLOT KAPASITAS MANUAL**.
   - Skill Law hanya dibatasi oleh alokasi Skill Points (SP), persyaratan Tier, dan percabangan pohon Dao.
   - Pembatasan kapasitas di atas **HANYA BERLAKU UNTUK KITAB MANUAL EKSTERNAL** (`player.manuals`) yang dipelajari dari item kitab jurus (Pedang, Golok, Tinju, Tombak, Formasi, dll.).
3. **Fitur Lupakan Manual (*Forget Skill / Manual*)**:
   - Di tab antarmuka *"Kitab & Hukum Alam"*, tersedia tombol **[🗑️ Lupakan Manual / Forget Manual]**.
   - Mengizinkan pemain menghapus manual yang sudah dipelajari untuk mengosongkan slot kapasitas manual ketika ingin mempelajari kitab tingkat tinggi baru.
4. **Sistem XP Skill Berbasis Serangan Tempur Nyata (Combat Attack XP)**:
   - Setiap kali pemain menyerang di medan tempur menggunakan skill tersebut (berlaku untuk **SEMUA skill**, baik Manual Eksternal maupun Law Skill), skill tersebut memperoleh **Skill Mastery XP**.
   - Ketika XP mencapai ambang batas, skill tersebut **Level Up** secara otomatis.
   - **Filter Anti-Abuse**: Perolehan XP skill ini **HANYA BERFUNGSI DI COMBAT ASLI DUNIA NYATA** (monster petak peta spasial, ambush liar, labirin gua kuno). Pertarungan proyeksi seperti **Sect Arena** (sparring) dan **World Boss** (sukma) **DILARANG MEMBERI XP SKILL**.
5. **Pertumbuhan Stat `core` Otomatis**:
   - **Stat `core` naik +1 poin secara permanen setiap kali ada manual atau skill yang dipelajari naik 1 level!**
   - Menghasilkan siklus gameplay harmonis: Sering bertarung $\to$ Skill naik level $\to$ Stat Core bertambah $\to$ Kapasitas mempelajari manual baru meluas ($+1$ tiap 5 Core).
6. **Perolehan SP Seimbang di Realm 2 (Anti Beli Semua Jurus)**:
   - Setiap terobosan mini-stage di Realm 2 memberikan **+2 SP per stage** (total 18 SP di Realm 2).
   - Biaya membuka jurus berskala sesuai Tier ($1 \to 2 \to 3 \to 5 \to 7\text{ SP}$).
   - Total SP yang dimiliki pemain dibatasi sehingga **TIDAK BISA MEMBELI SEMUA JURUS** pada pohon Law, memaksa pemain memilih spesialisasi cabang build (*Offense*, *Defense*, atau *Utility*).
7. **Integritas Tangga Sect Arena & Anti-Duplikasi**:
   - Pemain **DILARANG KERAS** menantang pemain di peringkat bawah atau peringkatnya sendiri (`targetRank >= challengerRank`).
   - Hanya boleh menantang rival 1–5 tingkat di atas (`targetRank < challengerRank`).
   - Transaksi pergeseran peringkat (*Cascade Shift*) wajib menggunakan transaksi atomik untuk mencegah bug duplikasi akun di leaderboard.
8. **Kebijakan Zero-Reward Sect Arena (Pure Honor Sparring)**:
   - Kemenangan di Sect Arena disetel **0 Item Drop, 0 Keping Perak, dan 0 EXP**.
   - Murni ajang duel sparring kehormatan dengan ucapan apresiasi sekte dan pergeseran peringkat tangga.
9. **Combat Status Alert Banner**:
   - Banner peringatan dinamis animasi meluncur (*slide-down*) saat status debuff/buff mendarat (misal: `[ ☠️ TERACUNI! -35 HP/Turn ]`), berdenyut selama 2 detik, lalu memudar (*fade-to-badge*) menyisakan simbol ikon status bercahaya pada bar battler.

---

## 2. Struktur Data Mongoose (`Player.js`)

```javascript
// 1. Kapasitas Core dalam kungfuSkills
kungfuSkills: {
  sword: { type: Number, default: 0 },
  saber: { type: Number, default: 0 },
  staff: { type: Number, default: 0 },
  fist: { type: Number, default: 0 },
  finger: { type: Number, default: 0 },
  core: { type: Number, default: 0 }, // Stat Core: Menentukan kapasitas manual eksternal (4 + Math.floor(core / 5))
  // ...
},

// 2. Kitab Manual Eksternal (Tunduk pada batas Core)
manuals: [{
  manualId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  name: { type: String },
  level: { type: Number, default: 1 },
  exp: { type: Number, default: 0 },
  maxLevel: { type: Number, default: 5 },
  learnedAt: { type: Date, default: Date.now }
}],

// 3. Jurus Hukum Semesta (Bebas batas Core, tunduk pada SP)
cultivationLaw: {
  activeLawType: { type: String, default: null },
  unlockedSkillIds: [{ type: String }],
  skillLevels: { type: Map, of: Number, default: () => new Map() },
  skillExp: { type: Map, of: Number, default: () => new Map() }, // XP pemakaian tempur
  combatLoadout: [{ type: String }], // Max 4 jurus aktif terpilih
  lawSkillPoints: { type: Number, default: 0 }
}
```

---

## 3. Rumus & Algoritma Authoritative

### 3.1. Formula Kapasitas Manual Eksternal
```javascript
function getMaxManualCapacity(player) {
  const coreVal = player.kungfuSkills?.core || 0;
  return 4 + Math.floor(coreVal / 5);
}

function canLearnNewManual(player) {
  const currentCount = (player.manuals || []).length;
  const maxAllowed = getMaxManualCapacity(player);
  return currentCount < maxAllowed;
}
```

### 3.2. Formula XP Serangan Tempur Nyata (Combat Attack XP)
Penguasaan jurus di Jianghu tidak instan melainkan membutuhkan ribuan repetisi serangan dalam pertarungan sesungguhnya. Menggunakan kurva kuadratik jangka panjang Wuxia:
$$\text{XP}_{\text{req}}(L) = \lfloor 25 \times L^2 \rfloor$$

#### Tabel Skala Latihan Tempur Riil (Hits per Level)
| Tingkat Jurus | Serangan Dibutuhkan (Hits) | Akumulasi Serangan | Catatan Penguasaan |
|---|---|---|---|
| **Level 1 $\to$ 2** | **25 serangan** | 25 | Pemula memahami pola gerakan dasar |
| **Level 2 $\to$ 3** | **100 serangan** | 125 | Membentuk kebiasaan otot & alur Qi stabil |
| **Level 3 $\to$ 4** | **225 serangan** | 350 | Gerakan menyatu dengan refleks tubuh |
| **Level 4 $\to$ 5** | **400 serangan** | 750 | Menguasai teknik inti (Batas Kitab Tier 2) |
| **Level 5 $\to$ 6** | **625 serangan** | 1.375 | Menembus batas fisik, Qi memancar keluar |
| **Level 6 $\to$ 7** | **900 serangan** | 2.275 | Pemahaman mendalam (Batas Kitab Tier 3) |
| **Level 7 $\to$ 8** | **1.225 serangan** | 3.500 | Memanipulasi ruang & aura elemen semesta |
| **Level 8 $\to$ 9** | **1.600 serangan** | 5.100 | Jurus melegenda di seantero sembilan benua |
| **Level 9 $\to$ 10** | **2.025 serangan** | 7.125 | **Puncak Kesempurnaan Dao (Dao Mastery)** |

```javascript
function getRequiredSkillCombatExp(level) {
  const l = Math.max(1, Number(level) || 1);
  return Math.floor(25 * Math.pow(l, 2));
}

// Dipanggil di InteractiveBattleService saat pemain menyerang dengan skill (Real Combat Only)
async function processSkillCombatXp(player, skillId, session) {
  const isRealCombat = !session.battleConfig?.isProjection 
    && session.battleConfig?.eventContext !== 'sect_arena' 
    && session.battleConfig?.eventContext !== 'world_boss';

  if (!isRealCombat || skillId === 'basic_attack') return;

  if (!player.historicSkillMastery) player.historicSkillMastery = new Map();

  // 1. Cek apakah ini Manual Eksternal (Berlaku sama untuk semua manual)
  const manual = (player.manuals || []).find(m => m.manualId?.toString() === skillId || m.name === skillId);
  if (manual) {
    const curLvl = manual.level || 1;
    const maxLvl = manual.maxLevel || 5;
    if (curLvl < maxLvl) {
      manual.exp = (manual.exp || 0) + 1;
      const reqExp = getRequiredSkillCombatExp(curLvl);
      if (manual.exp >= reqExp) {
        manual.level = curLvl + 1;
        manual.exp = Math.max(0, manual.exp - reqExp);
        const mKey = manual.manualId?._id?.toString() || manual.manualId?.toString() || skillId;

        // ANTI-ABUSE: Cek rekor tertinggi yang pernah dicapai seumur hidup karakter
        const prevPeak = (player.historicSkillMastery.get ? player.historicSkillMastery.get(mKey) : player.historicSkillMastery[mKey]) || 0;
        if (manual.level > prevPeak) {
          if (player.historicSkillMastery.set) player.historicSkillMastery.set(mKey, manual.level);
          else player.historicSkillMastery[mKey] = manual.level;
          player.kungfuSkills.core = (player.kungfuSkills.core || 0) + 1;
          session.logs.push(`✨ [Pencerahan Tempur]: Manual ${manual.name} menembus rekor baru ke Level ${manual.level}! Stat Fondasi Inti (Core) bertambah +1 (Total: ${player.kungfuSkills.core}).`);
        } else {
          session.logs.push(`✨ [Pemulihan Pemahaman]: Manual ${manual.name} dipulihkan kembali ke Level ${manual.level}! (Rekor lampau: Level ${prevPeak}, Stat Core tidak bertambah demi mencegah exploit).`);
        }
      }
    }
    return;
  }

  // 2. Cek apakah ini Law Skill (Berlaku identik untuk SELURUH 15 HUKUM SEMESTA)
  if ((player.cultivationLaw?.unlockedSkillIds || []).includes(skillId)) {
    const law = player.cultivationLaw;
    const curLevel = (law.skillLevels?.get ? law.skillLevels.get(skillId) : law.skillLevels[skillId]) || 1;
    const maxLvl = 10;
    if (curLevel < maxLvl) {
      const curExp = ((law.skillExp?.get ? law.skillExp.get(skillId) : law.skillExp[skillId]) || 0) + 1;
      const reqExp = getRequiredSkillCombatExp(curLevel);

      if (curExp >= reqExp) {
        const nextLevel = curLevel + 1;
        if (law.skillLevels?.set) law.skillLevels.set(skillId, nextLevel);
        else law.skillLevels[skillId] = nextLevel;

        const excess = Math.max(0, curExp - reqExp);
        if (law.skillExp?.set) law.skillExp.set(skillId, excess);
        else law.skillExp[skillId] = excess;

        // ANTI-ABUSE: Cek rekor tertinggi yang pernah dicapai seumur hidup karakter
        const prevPeak = (player.historicSkillMastery.get ? player.historicSkillMastery.get(skillId) : player.historicSkillMastery[skillId]) || 0;
        if (nextLevel > prevPeak) {
          if (player.historicSkillMastery.set) player.historicSkillMastery.set(skillId, nextLevel);
          else player.historicSkillMastery[skillId] = nextLevel;
          player.kungfuSkills.core = (player.kungfuSkills.core || 0) + 1;
          session.logs.push(`⚡ [Pencerahan Law]: Jurus Law ${skillId} menembus rekor baru ke Level ${nextLevel}! Stat Fondasi Inti (Core) bertambah +1 (Total: ${player.kungfuSkills.core}).`);
        } else {
          session.logs.push(`⚡ [Pemulihan Law]: Jurus Law ${skillId} dipulihkan kembali ke Level ${nextLevel}! (Rekor lampau: Level ${prevPeak}, Stat Core tidak bertambah).`);
        }
      } else {
        if (law.skillExp?.set) law.skillExp.set(skillId, curExp);
        else law.skillExp[skillId] = curExp;
      }
    }
  }
}
```

### 3.3. Arsitektur Anti-Abuse Core Stat Farming (`historicSkillMastery`)
Untuk mencegah pemain mengeksploitasi siklus *"Pelajari Manual $\to$ Naikkan ke Level Maksimal $\to$ Lupakan Manual $\to$ Pelajari Ulang dari Level 1 $\to$ Farm Stat Core Tanpa Batas"*, sistem menerapkan protokol **Historic Skill Mastery Ledger**:
1. Setiap karakter memiliki ledger absolut `player.historicSkillMastery` (Map ID Jurus $\to$ Level Puncak).
2. Ketika pemain melupakan (*forget*) manual, entri di `historicSkillMastery` **TIDAK PERNAH DIHAPUS**.
3. Jika pemain mempelajari kembali manual yang pernah ia lupakan dan menaikkan levelnya dari Level 1 ke Level 2, 3, dst., sistem mendeteksi bahwa $\text{Level Baru} \le \text{Rekor Puncak}$.
4. Akibatnya:
   - **Level Jurus tetap naik normal** (penguasaan bela diri tetap pulih).
   - **TIDAK ADA penambahan Stat Core sama sekali** ($\Delta\text{Core} = 0$).
   - Pemain hanya bisa memperoleh Stat Core dari manual tersebut jika ia berhasil menembus level yang belum pernah ia capai sebelumnya ($\text{Level Baru} > \text{Rekor Puncak}$).

### 3.3. Endpoint Lupakan Manual (`POST /api/manuals/forget`)
```javascript
router.post('/manuals/forget', authenticateToken, async (req, res) => {
  const { manualId } = req.body;
  const player = await resolvePlayer(req);

  const idx = player.manuals.findIndex(m => m.manualId?.toString() === manualId || m._id?.toString() === manualId);
  if (idx === -1) {
    return res.status(404).json({ error: 'Manual tidak ditemukan pada daftar jurusmu.' });
  }

  const removedName = player.manuals[idx].name;
  player.manuals.splice(idx, 1);

  // Hapus dari combatLoadout jika terpasang
  if (player.cultivationLaw?.combatLoadout) {
    player.cultivationLaw.combatLoadout = player.cultivationLaw.combatLoadout.filter(id => id !== manualId);
  }

  await player.save();
  res.json({
    success: true,
    message: `🗑️ Berhasil melupakan manual ${removedName}. 1 slot kapasitas manual telah dikosongkan.`,
    manuals: player.manuals
  });
});
```

---

## 4. Antarmuka UI Web Dashboard: "Kitab & Hukum Alam"

Komponen terpadu `KitabDanHukumAlamView.tsx` menampilkan:
1. **Header Kapasitas Core**:
   - Menampilkan: `Kapasitas Manual Eksternal: [X / Y] (Core: Z)`
   - Progress bar dinamis yang berubah kuning saat mendekati batas maksimal, dan merah saat penuh.
2. **Koleksi Manual Eksternal**:
   - Menampilkan kartu setiap manual yang dipelajari.
   - Indikator Level (misal `Lv. 3 / 5`) dan bar progress serangan tempur `[ 18 / 35 Serangan ]`.
   - Tombol **[Pasang ke Loadout]** dan tombol **[🗑️ Lupakan Manual]** dengan dialog konfirmasi.
3. **Koleksi Jurus Hukum Semesta (Law Skills)**:
   - Menampilkan kartu jurus Law yang telah di-unlock dari Pohon Konstelasi.
   - Indikator bahwa jurus Law **tidak memakan slot kapasitas manual**.
   - Indikator Level dan bar progress serangan tempur `[ 12 / 35 Serangan ]`.
4. **4 Slot Jurus Tempur Aktif (Combat Loadout 4+1)**:
   - Slot 0: Basic Attack Adaptif Senjata (Otomatis).
   - Slot 1–4: Pilihan bebas pemain (kombinasi Law Skills dan Manual Bela Diri).

---

## 5. Protokol Arena & Combat Integritas

1. **Sect Arena**:
   - Validasi: `targetRank < challengerRank` (Wajib menantang ke atas, rentang 1–5 peringkat).
   - Jika `targetRank >= challengerRank`, kembalikan error status 400.
   - Hasil menang: 0 item, 0 perak, 0 exp, 0 skill exp. Hanya pergeseran peringkat tangga dan log kehormatan.
2. **Combat Alert Banner**:
   - Render banner peringatan beranimasi meluncur saat battler terkena debuff DoT (`Poison`, `Bleed`, `Burn`, `Frozen`, `Stun`).
   - Bertahan 2 detik dengan animasi denyut (*pulse*), lalu memudar (*fade-to-badge*) menyisakan simbol ikon kecil di bar HP battler.

---

*Dokumen ini mengikat secara hukum kode pada seluruh sistem backend `jianghu-bot/web-api` dan frontend `jianghu-bot/web-dashboard`.*
