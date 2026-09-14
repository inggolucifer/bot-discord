const express = require('express');
const router = express.Router();
const Player = require('../../models/Player');
const Travel = require('../../models/Travel');
const Marriage = require('../../models/Marriage');
const { authenticateToken } = require('../middlewares/auth');
const { withTransaction } = require('../utils/dbTransaction');
const lockManager = require('../utils/lockManager');
const { hasEnoughCurrency, payCurrency, getTotalCopper } = require('../../utils/currency');
const config = require('../../config/marriageConfig');
const TransactionLog = require('../../models/TransactionLog');

async function isPlayerBusy(discordId, guildId) {
  const travelStatus = await Travel.findOne({ discordId, guildId, status: { $in: ['traveling', 'ambushed'] } });
  return !!travelStatus;
}

// Reusable function to log transactions
async function logMarriageTransaction(req, type, fromUserId, toUserId, amountCopper, description, guildId) {
  try {
    const client = req.app.get('client');
    await TransactionLog.create({
      guildId,
      type,
      fromUserId,
      toUserId,
      currency: 'copper',
      amount: amountCopper,
      itemDescription: description,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to log marriage transaction:', error);
  }
}

// 1. Me - Get my marriage status & proposals
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { discordId, guildId } = req.user;
    const player = await Player.findOne({ discordId, guildId });
    if (!player) return res.status(404).json({ message: 'Player tidak ditemukan' });

    // Lazy check for expired proposals I am involved in
    const now = new Date();
    const expiredProposals = await Marriage.find({
      guildId,
      $or: [{ partnerA: discordId }, { partnerB: discordId }],
      status: 'proposed',
      expiresAt: { $lt: now }
    });

    if (expiredProposals.length > 0) {
      await withTransaction(async (session) => {
        for (const p of expiredProposals) {
          p.status = 'expired';
          await p.save({ session });
          await Player.updateMany(
            { discordId: { $in: [p.partnerA, p.partnerB] }, guildId },
            { $set: { 'marriage.status': 'single', 'marriage.spouseId': null, 'marriage.marriageId': null } },
            { session }
          );
        }
      });
      // Refresh player state
      const reloadedPlayer = await Player.findOne({ discordId, guildId });
      player.marriage = reloadedPlayer.marriage;
    }

    // Fetch active marriage
    let marriage = null;
    if (player.marriage.marriageId) {
      marriage = await Marriage.findById(player.marriage.marriageId).lean();
    }

    // Fetch pending outgoing
    const outgoing = await Marriage.findOne({ proposedBy: discordId, guildId, status: 'proposed' }).lean();
    // Fetch pending incoming
    const incoming = await Marriage.findOne({ partnerB: discordId, proposedBy: { $ne: discordId }, guildId, status: 'proposed' }).lean();

    res.json({
      playerMarriage: player.marriage,
      marriage,
      outgoingProposal: outgoing,
      incomingProposal: incoming
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 2. Eligible Nearby - Get list of single players in the same location
router.get('/eligible-nearby', authenticateToken, async (req, res) => {
  try {
    const { discordId, guildId } = req.user;
    const player = await Player.findOne({ discordId, guildId }).lean();
    if (!player) return res.status(404).json({ message: 'Player tidak ditemukan' });

    if (await isPlayerBusy(discordId, guildId)) {
      return res.status(400).json({ message: 'Anda sedang dalam perjalanan atau disergap.' });
    }

    const { regionSlug, settlementName } = player.currentLocation;

    // Find players in same location
    const nearbyPlayers = await Player.find({
      guildId,
      discordId: { $ne: discordId },
      'currentLocation.regionSlug': regionSlug,
      'currentLocation.settlementName': settlementName,
      'marriage.status': 'single'
    }).select('discordId name legacyRealm legacyStage').lean();

    // Filter out busy players (traveling/ambushed)
    const eligible = [];
    for (const p of nearbyPlayers) {
      if (!(await isPlayerBusy(p.discordId, guildId))) {
        eligible.push(p);
      }
    }

    res.json(eligible);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// 3. Propose
router.post('/propose', authenticateToken, async (req, res) => {
  const { toUserId, dowry } = req.body;
  const { discordId: fromUserId, guildId } = req.user;

  if (fromUserId === toUserId) return res.status(400).json({ message: 'Tidak bisa melamar diri sendiri.' });

  const lockKeyFrom = `marriage_${guildId}_${fromUserId}`;
  const lockKeyTo = `marriage_${guildId}_${toUserId}`;

  if (!lockManager.acquire(lockKeyFrom)) return res.status(429).json({ message: 'Transaksi sedang diproses.' });
  if (!lockManager.acquire(lockKeyTo)) {
    lockManager.release(lockKeyFrom);
    return res.status(429).json({ message: 'Target sedang sibuk.' });
  }

  try {
    const playerA = await Player.findOne({ discordId: fromUserId, guildId });
    const playerB = await Player.findOne({ discordId: toUserId, guildId });

    if (!playerA || !playerB) return res.status(404).json({ message: 'Player tidak ditemukan.' });

    if (playerA.marriage.status !== 'single') return res.status(400).json({ message: 'Anda tidak sedang lajang.' });
    if (playerB.marriage.status !== 'single') return res.status(400).json({ message: 'Target tidak sedang lajang.' });

    if (playerA.currentLocation.regionSlug !== playerB.currentLocation.regionSlug ||
        playerA.currentLocation.settlementName !== playerB.currentLocation.settlementName) {
      return res.status(400).json({ message: 'Kalian tidak berada di lokasi yang sama.' });
    }

    if (await isPlayerBusy(fromUserId, guildId) || await isPlayerBusy(toUserId, guildId)) {
      return res.status(400).json({ message: 'Salah satu pihak sedang bepergian atau disergap.' });
    }

    // validate cooldown
    if (playerA.cooldowns && playerA.cooldowns.remarry && playerA.cooldowns.remarry > new Date()) {
      return res.status(400).json({ message: 'Anda masih dalam masa tenang setelah bercerai.' });
    }

    // check active outgoing
    const existing = await Marriage.findOne({ proposedBy: fromUserId, status: 'proposed' });
    if (existing) return res.status(400).json({ message: 'Anda masih memiliki lamaran yang pending.' });

    // validate dowry & ceremony fee capability
    const proposedDowry = {
      copper: dowry?.copper || 0,
      silver: dowry?.silver || 0,
      gold: dowry?.gold || 0
    };

    const dowryCopperEquivalent = getTotalCopper({
      copper: proposedDowry.copper,
      silver: proposedDowry.silver,
      gold: proposedDowry.gold,
      jade: 0, spirit: 0
    });

    if (dowryCopperEquivalent < config.MIN_DOWRY_COPPER) {
      return res.status(400).json({ message: `Mahar minimum adalah ${config.MIN_DOWRY_COPPER} Copper.` });
    }

    const totalRequiredCopper = dowryCopperEquivalent + config.CEREMONY_FEE_COPPER;

    // We only check if they HAVE it now. It is deducted on ACCEPT.
    const hasEnough = hasEnoughCurrency(playerA.currency, totalRequiredCopper, 'copper');
    if (!hasEnough) {
      return res.status(400).json({ message: 'Currency Anda tidak cukup untuk membayar Mahar dan Biaya Upacara.' });
    }


    await withTransaction(async (session) => {
      const expiresAt = new Date(Date.now() + config.PROPOSAL_EXPIRY_HOURS * 3600000);

      const newMarriage = new Marriage({
        guildId,
        partnerA: fromUserId,
        partnerB: toUserId,
        status: 'proposed',
        proposedBy: fromUserId,
        dowry: proposedDowry,
        locationKey: `${playerA.currentLocation.regionSlug}_${playerA.currentLocation.settlementName}`,
        expiresAt,
        ceremonyFeeCopper: config.CEREMONY_FEE_COPPER
      });

      await newMarriage.save({ session });

      playerA.marriage.status = 'proposed';
      playerB.marriage.status = 'proposed';

      await playerA.save({ session });
      await playerB.save({ session });
    });

    res.json({ message: 'Lamaran berhasil dikirim.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    lockManager.release(lockKeyFrom);
    lockManager.release(lockKeyTo);
  }
});


// 4. Accept Proposal
router.post('/proposals/:id/accept', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { discordId, guildId } = req.user;

  // We only lock the acceptor initially, then lock the proposer
  const lockKeyAcceptor = `marriage_${guildId}_${discordId}`;
  if (!lockManager.acquire(lockKeyAcceptor)) return res.status(429).json({ message: 'Sedang memproses transaksi...' });

  try {
    const proposal = await Marriage.findById(id);
    if (!proposal) {
      lockManager.release(lockKeyAcceptor);
      return res.status(404).json({ message: 'Lamaran tidak ditemukan.' });
    }

    if (proposal.status !== 'proposed') {
      lockManager.release(lockKeyAcceptor);
      return res.status(400).json({ message: 'Lamaran ini sudah tidak aktif.' });
    }

    if (proposal.partnerB !== discordId || proposal.proposedBy === discordId) {
      lockManager.release(lockKeyAcceptor);
      return res.status(403).json({ message: 'Hanya pihak yang dilamar yang bisa menerima.' });
    }

    const proposerId = proposal.proposedBy;
    const lockKeyProposer = `marriage_${guildId}_${proposerId}`;
    if (!lockManager.acquire(lockKeyProposer)) {
      lockManager.release(lockKeyAcceptor);
      return res.status(429).json({ message: 'Pelamar sedang sibuk.' });
    }

    try {
      // Lazy expiry check on accept
      if (new Date() > proposal.expiresAt) {
        await withTransaction(async (session) => {
           proposal.status = 'expired';
           await proposal.save({ session });
           await Player.updateMany(
            { discordId: { $in: [proposal.partnerA, proposal.partnerB] }, guildId },
            { $set: { 'marriage.status': 'single', 'marriage.spouseId': null, 'marriage.marriageId': null } },
            { session }
           );
        });
        return res.status(400).json({ message: 'Lamaran ini sudah kadaluarsa.' });
      }

      const playerA = await Player.findOne({ discordId: proposerId, guildId });
      const playerB = await Player.findOne({ discordId: discordId, guildId });

      if (playerA.currentLocation.regionSlug !== playerB.currentLocation.regionSlug ||
          playerA.currentLocation.settlementName !== playerB.currentLocation.settlementName) {
        return res.status(400).json({ message: 'Kalian harus berada di lokasi yang sama untuk melangsungkan upacara.' });
      }

      if (await isPlayerBusy(proposerId, guildId) || await isPlayerBusy(discordId, guildId)) {
        return res.status(400).json({ message: 'Salah satu pihak sedang bepergian atau disergap.' });
      }

      // Re-validate cost
      const dowryCopperEquivalent = getTotalCopper({
        copper: proposal.dowry.copper,
        silver: proposal.dowry.silver,
        gold: proposal.dowry.gold,
        jade: 0, spirit: 0
      });
      const totalRequiredCopper = dowryCopperEquivalent + proposal.ceremonyFeeCopper;

      if (!hasEnoughCurrency(playerA.currency, totalRequiredCopper, 'copper')) {
         return res.status(400).json({ message: 'Pelamar tidak memiliki cukup mata uang untuk membayar mahar dan biaya upacara saat ini.' });
      }

      await withTransaction(async (session) => {
        // Deduct from A
        payCurrency(playerA.currency, totalRequiredCopper, 'copper');
        // Give dowry to B (normalized via helper ideally, but direct conversion is safer here for simplicity)
        // Since payCurrency handles internal conversion for deduction, we just add the exact denominations back to B
        playerB.currency.copper += proposal.dowry.copper;
        playerB.currency.silver += proposal.dowry.silver;
        playerB.currency.gold += proposal.dowry.gold;

        proposal.status = 'married';
        proposal.marriedAt = new Date();
        await proposal.save({ session });

        playerA.marriage = { status: 'married', spouseId: playerB.discordId, marriageId: proposal._id };
        playerB.marriage = { status: 'married', spouseId: playerA.discordId, marriageId: proposal._id };

        await playerA.save({ session });
        await playerB.save({ session });
      });

      // Log transactions
      await logMarriageTransaction(req, 'marriage_dowry', proposerId, discordId, dowryCopperEquivalent, 'Mahar pernikahan', guildId);
      await logMarriageTransaction(req, 'marriage_ceremony_fee', proposerId, 'SYSTEM', proposal.ceremonyFeeCopper, 'Biaya upacara pernikahan', guildId);

      res.json({ message: 'Pernikahan berhasil dilangsungkan!' });
    } finally {
      lockManager.release(lockKeyProposer);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    lockManager.release(lockKeyAcceptor);
  }
});

// 5. Reject Proposal
router.post('/proposals/:id/reject', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { discordId, guildId } = req.user;

  try {
    const proposal = await Marriage.findById(id);
    if (!proposal || proposal.status !== 'proposed') return res.status(400).json({ message: 'Lamaran tidak valid.' });
    if (proposal.partnerB !== discordId) return res.status(403).json({ message: 'Hanya pihak yang dilamar yang bisa menolak.' });

    await withTransaction(async (session) => {
      proposal.status = 'cancelled';
      await proposal.save({ session });

      await Player.updateMany(
        { discordId: { $in: [proposal.partnerA, proposal.partnerB] }, guildId },
        { $set: { 'marriage.status': 'single', 'marriage.spouseId': null, 'marriage.marriageId': null } },
        { session }
      );
    });

    res.json({ message: 'Lamaran ditolak.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 6. Cancel Proposal (by proposer)
router.post('/proposals/:id/cancel', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { discordId, guildId } = req.user;

  try {
    const proposal = await Marriage.findById(id);
    if (!proposal || proposal.status !== 'proposed') return res.status(400).json({ message: 'Lamaran tidak valid.' });
    if (proposal.proposedBy !== discordId) return res.status(403).json({ message: 'Hanya pelamar yang bisa membatalkan.' });

    await withTransaction(async (session) => {
      proposal.status = 'cancelled';
      await proposal.save({ session });

      await Player.updateMany(
        { discordId: { $in: [proposal.partnerA, proposal.partnerB] }, guildId },
        { $set: { 'marriage.status': 'single', 'marriage.spouseId': null, 'marriage.marriageId': null } },
        { session }
      );
    });

    res.json({ message: 'Lamaran dibatalkan.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// 7. Divorce
router.post('/divorce', authenticateToken, async (req, res) => {
  const { discordId, guildId } = req.user;

  const lockKey = `marriage_divorce_${guildId}_${discordId}`;
  if (!lockManager.acquire(lockKey)) return res.status(429).json({ message: 'Sedang memproses.' });

  try {
    const player = await Player.findOne({ discordId, guildId });
    if (!player.marriage || player.marriage.status !== 'married' || !player.marriage.marriageId) {
      return res.status(400).json({ message: 'Anda tidak sedang menikah.' });
    }

    if (!hasEnoughCurrency(player.currency, config.DIVORCE_FEE_COPPER, 'copper')) {
      return res.status(400).json({ message: `Anda butuh ${config.DIVORCE_FEE_COPPER} Copper untuk biaya perceraian.` });
    }

    const marriage = await Marriage.findById(player.marriage.marriageId);
    if (!marriage) return res.status(404).json({ message: 'Data pernikahan tidak ditemukan.' });

    const spouseId = player.marriage.spouseId;

    await withTransaction(async (session) => {
      payCurrency(player.currency, config.DIVORCE_FEE_COPPER, 'copper');

      marriage.status = 'divorced';
      marriage.divorcedAt = new Date();
      marriage.divorceInitiatedBy = discordId;
      await marriage.save({ session });

      player.marriage = { status: 'single', spouseId: null, marriageId: null };
      if (!player.cooldowns) player.cooldowns = {};
      player.cooldowns.remarry = new Date(Date.now() + config.REMARRY_COOLDOWN_HOURS * 3600000);
      await player.save({ session });

      const spouse = await Player.findOne({ discordId: spouseId, guildId });
      if (spouse) {
        spouse.marriage = { status: 'single', spouseId: null, marriageId: null };
        if (!spouse.cooldowns) spouse.cooldowns = {};
        spouse.cooldowns.remarry = new Date(Date.now() + config.REMARRY_COOLDOWN_HOURS * 3600000);
        await spouse.save({ session });
      }
    });

    await logMarriageTransaction(req, 'marriage_divorce_fee', discordId, 'SYSTEM', config.DIVORCE_FEE_COPPER, 'Biaya perceraian', guildId);

    res.json({ message: 'Anda telah resmi bercerai.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    lockManager.release(lockKey);
  }
});

module.exports = router;
