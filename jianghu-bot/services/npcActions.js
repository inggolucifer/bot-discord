/**
 * Pure Business Logic Engine for NPC Interactions (V28 / A4)
 * Fully decoupled from Express routes. Implements authoritative rules,
 * anti-exploit daily limits, currency transfers, and skill/stat formulas.
 */

const mongoose = require('mongoose');
const { hasEnoughCurrency, payCurrency, addCopper } = require('../utils/currency');

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function getPlayerRealmIndex(player) {
  if (typeof player.realmIndex === 'number') return player.realmIndex;
  const realmStr = player.systemCultivation?.realm || player.realm || '';
  if (realmStr) {
    const realmOrder = [
      'fana', 'mortal',
      'kondensasi qi', 'qi condensation', 'qi refining',
      'fondasi', 'foundation',
      'inti emas', 'golden core', 'core',
      'jiwa baru lahir', 'nascent soul',
      'pemisahan roh', 'soul formation',
      'penyatuan dao', 'void refinement',
      'kesengsaraan surga', 'tribulation',
      'keabadian sejati', 'immortal'
    ];
    const rLower = String(realmStr).toLowerCase();
    for (let i = 0; i < realmOrder.length; i++) {
      if (rLower.includes(realmOrder[i])) {
        return Math.floor(i / 2);
      }
    }
  }
  return 0;
}

function ensureDailyStructures(player, relation) {
  const today = new Date().toISOString().slice(0, 10);

  if (!relation.dailyLimits || relation.dailyLimits.date !== today) {
    relation.dailyLimits = { steal: 0, threaten: 0, date: today };
  }
  if (!relation.interactionCountDaily || relation.interactionCountDaily.date !== today) {
    relation.interactionCountDaily = { chat: 0, gift: 0, spar: 0, steal: 0, threaten: 0, date: today };
  }
  if (!player.npcDaily || player.npcDaily.date !== today) {
    player.npcDaily = { stealCount: 0, threatenCount: 0, date: today };
  }
}

const { makeRng } = require('../utils/npcRng');
const DEFAULT_RNG = makeRng(0xC0FFEE);

/**
 * Evaluates an interaction action authoritatively.
 *
 * @param {string} action
 * @param {Object} context
 * @param {Object} context.player - Player document / object
 * @param {Object} context.npc - Npc document / object
 * @param {Object} context.relation - NpcPlayerRelation document / object
 * @param {Object} context.payload - Request payload
 * @param {Function} context.rng - Seeded random function returning 0..1
 * @returns {Object} { success, status, message, deltaAffinity, resultData }
 */
function evaluateAction(action, { player, npc, relation, payload = {}, rng = DEFAULT_RNG }) {
  if (!player || !npc || !relation) {
    return { success: false, status: 400, message: 'Konteks interaksi tidak valid.' };
  }

  ensureDailyStructures(player, relation);

  // Authoritative player stats lookup (B7 fix, with attributes fallback for backward compat)
  const playerInsight = player.extendedStats?.insight ?? player.attributes?.insight ?? 10;
  const playerAgility = player.extendedStats?.agility ?? player.attributes?.agility ?? 10;
  const playerAtk = player.stats?.baseAtk ?? player.attributes?.attack ?? 15;
  const playerDef = player.stats?.baseDef ?? player.attributes?.defense ?? 10;

  // NPC stats
  const npcAgility = npc.attributes?.agility ?? npc.extendedStats?.agility ?? 10;
  const npcInsight = npc.attributes?.insight ?? npc.extendedStats?.insight ?? 10;
  const npcAtk = npc.stats?.baseAtk ?? npc.attributes?.attack ?? 15;
  const npcDef = npc.stats?.baseDef ?? npc.attributes?.defense ?? 10;

  if (npc.tradeCoins === undefined || npc.tradeCoins === null) {
    npc.tradeCoins = 100;
  }

  let deltaAffinity = 0;
  let message = '';
  let resultData = {};

  switch (action) {
    case 'chat': {
      if (relation.interactionCountDaily.chat >= 3) {
        return {
          success: false,
          status: 400,
          message: 'Batas obrolan harian tercapai (Maks 3 kali per hari). NPC butuh waktu bermeditasi.'
        };
      }
      relation.interactionCountDaily.chat += 1;
      deltaAffinity = rng() < 0.8 ? 2 : 3;
      relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
      message = `Anda berbincang hangat mengenai kabar Jianghu dengan ${npc.name}. (Afinitas +${deltaAffinity})`;
      break;
    }

    case 'inquire': {
      message = `${npc.name} mencondongkan badan dan berbisik: "Kudengar di pegunungan timur ada aura spiritual kuno yang baru saja bangkit..."`;
      resultData.clue = 'Kabut spiritual di pegunungan timur.';
      break;
    }

    case 'spar': {
      if ((player.currentStamina ?? player.stamina ?? 0) < 5) {
        return {
          success: false,
          status: 400,
          message: 'Stamina tidak mencukupi untuk sparring (Butuh min 5 Stamina).'
        };
      }
      if (player.currentStamina !== undefined) player.currentStamina -= 5;
      else if (player.stamina !== undefined) player.stamina -= 5;

      deltaAffinity = 2;
      relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
      message = `Anda bertukar beberapa jurus persahabatan dengan ${npc.name}. Keduanya saling mengagumi kemahiran beladiri! (Stamina -5, Afinitas +2)`;
      break;
    }

    case 'duel': {
      message = `Anda menyatakan duel hidup-mati kepada ${npc.name}! Niat membunuh menyelimuti medan pertempuran!`;
      resultData.duelReady = true;
      break;
    }

    case 'gift': {
      const { itemId } = payload;
      if (!itemId) {
        return {
          success: false,
          status: 400,
          message: 'ID barang (itemId) wajib disertakan untuk memberikan hadiah.'
        };
      }

      if (relation.interactionCountDaily.gift >= 2) {
        return {
          success: false,
          status: 400,
          message: 'Batas pemberian hadiah harian tercapai (Maks 2 hadiah per hari).'
        };
      }

      const inv = player.inventory || [];
      const invIdx = inv.findIndex(i =>
        (i.itemId?.toString() === itemId.toString() || i.id?.toString() === itemId.toString() || i._id?.toString() === itemId.toString())
        && i.quantity > 0
      );

      if (invIdx === -1) {
        return {
          success: false,
          status: 400,
          message: 'Barang tidak ditemukan di dalam inventori Anda.'
        };
      }

      const playerItem = inv[invIdx];
      if (playerItem.quantity > 1) {
        playerItem.quantity -= 1;
      } else {
        inv.splice(invIdx, 1);
      }

      relation.interactionCountDaily.gift += 1;
      deltaAffinity = 8;
      relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
      message = `${npc.name} tersenyum lebar menerima pemberian Anda: "Terima kasih banyak atas hadiah ini, budi baikmu akan selalu kuingat!" (Afinitas +${deltaAffinity})`;
      break;
    }

    case 'bribe': {
      const amount = Math.max(50, Math.floor(payload.amount || 100));
      if (!hasEnoughCurrency(player.currency, amount, 'copper')) {
        return {
          success: false,
          status: 400,
          message: 'Koin tembaga Anda tidak mencukupi untuk menyuap.'
        };
      }

      payCurrency(player.currency, amount, 'copper');

      const morality = npc.personality?.morality ?? 50;
      const primaryTrait = npc.personality?.primary || 'righteous';
      const isHighMorality = morality > 70 || ['righteous', 'honest'].includes(primaryTrait);

      if (isHighMorality) {
        deltaAffinity = -10;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `${npc.name} menepis koin Anda dengan geram: "Simpan logam kotormu! Aku bukan orang rendahan!" Uang disita sebagai denda ketertiban umum. (Afinitas -10)`;
      } else {
        deltaAffinity = 6;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        npc.tradeCoins += amount;
        message = `${npc.name} menyelipkan koin ke dalam lengan bajunya dengan senyum puas. (Afinitas +6)`;
      }
      break;
    }

    case 'recruit': {
      if (relation.affinity < 60) {
        return {
          success: false,
          status: 400,
          message: `Afinitas belum mencukupi untuk merekrut (Butuh min 60, saat ini: ${relation.affinity}).`
        };
      }
      const recruitChance = 0.50 + ((relation.affinity - 60) * 0.01);
      if (rng() < recruitChance) {
        relation.specialStatus.isSwornSibling = true;
        message = `${npc.name} mengangguk mantap: "Bersamamu melintasi bahaya Jianghu adalah kehormatan bagiku!"`;
      } else {
        deltaAffinity = -2;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        return {
          success: false,
          status: 200,
          message: `${npc.name} merenung sejenak lalu menolak sopan: "Aku masih memiliki urusan pribadi yang belum tuntas di dunia fana."`,
          deltaAffinity
        };
      }
      break;
    }

    case 'confess': {
      if (relation.affinity < 70) {
        return {
          success: false,
          status: 400,
          message: `Afinitas belum mencukupi untuk menyatakan asmara (Butuh min 70, saat ini: ${relation.affinity}).`
        };
      }
      deltaAffinity = 5;
      relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
      message = `${npc.name} tersipu malu: "Sejak pertama kali bertemu di rimba bambu, hatiku pun tak pernah tenang..." (Afinitas +5)`;
      break;
    }

    case 'propose': {
      if (relation.affinity < 85) {
        return {
          success: false,
          status: 400,
          message: `Afinitas belum mencukupi untuk ikatan Pasangan Dao (Butuh min 85, saat ini: ${relation.affinity}).`
        };
      }
      const proposeChance = 0.50 + ((relation.affinity - 85) * 0.02);
      if (rng() < proposeChance) {
        relation.specialStatus.isDaoCompanion = true;
        deltaAffinity = 10;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `Di bawah saksi langit dan bumi, Anda dan ${npc.name} resmi mengikat sumpah sebagai Pasangan Dao! (Afinitas +10)`;
      } else {
        deltaAffinity = -2;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        return {
          success: false,
          status: 200,
          message: `${npc.name} menunduk tersipu namun menggeleng lembut: "Hati Dao-ku belum sepenuhnya tenang untuk mengikat janji seumur hidup saat ini..."`,
          deltaAffinity
        };
      }
      break;
    }

    case 'divorce': {
      if (!relation.specialStatus.isDaoCompanion) {
        return {
          success: false,
          status: 400,
          message: 'Anda tidak memiliki ikatan Pasangan Dao dengan karakter ini.'
        };
      }
      relation.specialStatus.isDaoCompanion = false;
      deltaAffinity = -50;
      relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
      message = `Ikatan Pasangan Dao diputuskan. ${npc.name} memalingkan muka dengan tatapan pedih dan dingin. (Afinitas -50)`;
      break;
    }

    case 'adopt': {
      if (relation.affinity < 50) {
        return {
          success: false,
          status: 400,
          message: `Afinitas belum mencukupi untuk hubungan perguruan (Butuh min 50, saat ini: ${relation.affinity}).`
        };
      }
      const adoptChance = 0.60 + ((relation.affinity - 50) * 0.01);
      if (rng() < adoptChance) {
        relation.specialStatus.isApprentice = true;
        deltaAffinity = 5;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `${npc.name} membungkuk hormat dan menyambut hubungan perguruan. (Afinitas +5)`;
      } else {
        return {
          success: false,
          status: 200,
          message: `${npc.name} tersenyum santun: "Keahlianku belum cukup layak untuk mendampingi jalur perguruanmu."`
        };
      }
      break;
    }

    case 'steal': {
      // 1. Daily limits check
      if (relation.dailyLimits.steal >= 3) {
        return {
          success: false,
          status: 400,
          message: 'Batas harian mencuri pada target ini tercapai (Maks 3 kali per NPC per hari).'
        };
      }
      if (player.npcDaily.stealCount >= 10) {
        return {
          success: false,
          status: 400,
          message: 'Batas harian mencuri global tercapai (Maks 10 kali per hari).'
        };
      }

      // 2. Anti-exploit money check: NPC must have tradeCoins or valuable items
      const hasCoins = typeof npc.tradeCoins === 'number' && npc.tradeCoins > 0;
      const hasItems = Array.isArray(npc.inventory) && npc.inventory.some(i => i.quantity > 0);
      if (!hasCoins && !hasItems) {
        return {
          success: false,
          status: 400,
          message: `${npc.name} tidak membawa barang berharga atau koin tembaga di sakunya.`
        };
      }

      relation.dailyLimits.steal += 1;
      player.npcDaily.stealCount += 1;

      // 3. Sigmoid chance based on agility vs maximum of NPC agility and insight
      const npcDefenseStat = Math.max(npcAgility, npcInsight);
      const successChance = sigmoid((playerAgility - npcDefenseStat) * 0.05);
      const isSuccess = rng() < successChance;
      resultData.isSuccess = isSuccess;

      if (isSuccess) {
        const stolenCopper = Math.min(npc.tradeCoins, 10 + Math.floor(rng() * 16)); // 10-25 copper
        npc.tradeCoins -= stolenCopper;
        addCopper(player.currency, stolenCopper);
        message = `Anda dengan lincah menyambar kantong kecil berisi ${stolenCopper} Koin Tembaga tanpa disadari ${npc.name}!`;
        resultData.stolenCopper = stolenCopper;
      } else {
        deltaAffinity = -25;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        player.wantedLevel = Math.min(5, (player.wantedLevel || 0) + 1);
        message = `Tertangkap basah! ${npc.name} mencengkeram tangan Anda dengan amarah: "Pencuri keparat!" (Afinitas -25, Buronan +1)`;
        resultData.caught = true;
      }
      break;
    }

    case 'threaten': {
      if (relation.dailyLimits.threaten >= 1) {
        return {
          success: false,
          status: 400,
          message: 'Batas mengancam target ini telah tercapai hari ini (Maks 1 kali per hari).'
        };
      }
      relation.dailyLimits.threaten += 1;
      player.npcDaily.threatenCount += 1;

      const playerRealm = getPlayerRealmIndex(player);
      const npcRealm = npc.cultivation?.realmIndex ?? 0;

      // Backlash against higher cultivation realm NPC
      if (npcRealm > playerRealm) {
        deltaAffinity = -40;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        if (typeof player.hp === 'number') {
          player.hp = Math.max(0, player.hp - 15);
        }
        return {
          success: false,
          status: 400,
          message: `${npc.name} tertawa dingin meremehkan ancamanmu! Aura ranah tingkat tingginya menekanmu balik hingga memuntahkan darah (-15 HP)! (Afinitas -40)`,
          deltaAffinity,
          newAffinity: relation.affinity
        };
      }

      // Check attack threshold: playerAtk > npcAtk * 1.5
      if (playerAtk > npcAtk * 1.5) {
        const extorted = Math.min(npc.tradeCoins, 10 + Math.floor(rng() * 21)); // 10-30 copper
        npc.tradeCoins -= extorted;
        addCopper(player.currency, extorted);
        deltaAffinity = -15;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `${npc.name} gemetar ketakutan melihat kedigdayaanmu dan menyerahkan ${extorted} Koin Tembaga: "Jangan bunuh aku!" (Afinitas -15)`;
        resultData.extortedCopper = extorted;
      } else {
        deltaAffinity = -25;
        relation.affinity = Math.min(100, Math.max(-100, relation.affinity + deltaAffinity));
        message = `${npc.name} tertawa meremehkan: "Kekuatanmu seujung kuku tapi berani mengancamku?!" (Afinitas -25)`;
      }
      break;
    }

    case 'request_favor': {
      if (relation.affinity < 60) {
        return {
          success: false,
          status: 400,
          message: `Afinitas belum mencukupi untuk meminta bantuan (Butuh min 60, saat ini: ${relation.affinity}).`
        };
      }

      const availableIdx = (npc.inventory || []).findIndex(i => i.quantity > 0);
      if (availableIdx === -1) {
        return {
          success: false,
          status: 400,
          message: `${npc.name} menggeleng menyesal: "Maaf Rekan Dao, aku tidak memiliki apa pun untuk diberikan saat ini."`
        };
      }

      const transferredItem = npc.inventory[availableIdx];
      if (transferredItem.quantity > 1) {
        transferredItem.quantity -= 1;
      } else {
        npc.inventory.splice(availableIdx, 1);
      }

      player.inventory = player.inventory || [];
      const pInvSlot = player.inventory.find(i =>
        i.itemId?.toString() === (transferredItem.itemId || transferredItem._id)?.toString()
      );

      if (pInvSlot) {
        pInvSlot.quantity += 1;
      } else {
        player.inventory.push({
          itemId: transferredItem.itemId || new mongoose.Types.ObjectId(),
          quantity: 1,
          creatorName: npc.name
        });
      }

      message = `${npc.name} memberikan Anda sebuah ${transferredItem.name || 'barang berharga'}: "Pergunakanlah ini dengan bijak, Rekan Dao."`;
      resultData.receivedItem = transferredItem.name || 'Barang Berharga';
      break;
    }

    case 'break_relations': {
      relation.affinity = 0;
      relation.specialStatus.isDaoCompanion = false;
      relation.specialStatus.isSwornSibling = false;
      relation.specialStatus.isMaster = false;
      relation.specialStatus.isApprentice = false;
      message = `Hubungan khusus dengan ${npc.name} telah diputus. Kini kalian hanyalah orang asing.`;
      break;
    }

    default:
      return {
        success: false,
        status: 400,
        message: `Aksi interaksi '${action}' tidak dikenali.`
      };
  }

  // Record history
  relation.history = relation.history || [];
  relation.history.push({
    timestamp: new Date(),
    action,
    delta: deltaAffinity,
    note: message
  });

  return {
    success: true,
    status: 200,
    action,
    message,
    deltaAffinity,
    newAffinity: relation.affinity,
    resultData
  };
}

module.exports = {
  evaluateAction,
  getPlayerRealmIndex
};
