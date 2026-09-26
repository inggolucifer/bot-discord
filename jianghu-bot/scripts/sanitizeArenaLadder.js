require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const ArenaLadderEntry = require('../models/ArenaLadderEntry');

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Sanitizing ArenaLadderEntry...');

    // Find all active players
    const activePlayers = await Player.find({});
    const activeDiscordIds = new Set(activePlayers.map(p => p.discordId));
    console.log('Active Discord IDs in Player:', Array.from(activeDiscordIds));

    // Remove entries that do not belong to active players
    const allEntries = await ArenaLadderEntry.find({});
    for (const entry of allEntries) {
      if (!activeDiscordIds.has(entry.discordId)) {
        console.log('Deleting orphan arena entry:', entry.characterName, entry.discordId, 'Rank:', entry.rank);
        await ArenaLadderEntry.deleteOne({ _id: entry._id });
      }
    }

    // Re-index remaining entries
    const remaining = await ArenaLadderEntry.find({}).sort({ rank: 1, createdAt: 1 });
    for (let i = 0; i < remaining.length; i++) {
      const entry = remaining[i];
      const newRank = i + 1;
      if (entry.rank !== newRank) {
        console.log(`Updating ${entry.characterName} (${entry.discordId}) from Rank ${entry.rank} to ${newRank}`);
        entry.rank = newRank;
        if (!entry.peakRank || entry.peakRank > newRank) entry.peakRank = newRank;
        await entry.save();
      }
    }

    const finalEntries = await ArenaLadderEntry.find({}).sort({ rank: 1 });
    console.log('--- Current Arena Ladder ---');
    finalEntries.forEach(e => console.log(`Rank #${e.rank}: ${e.characterName} (${e.discordId}) CP: ${e.combatPower}`));
  } catch (err) {
    console.error('Error during sanitization:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
