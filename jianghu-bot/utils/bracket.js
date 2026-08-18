// Logika murni sistem gugur (single elimination). Tidak menyimpan state sendiri -- semua state
// disimpan di dokumen Tournament (MongoDB), fungsi-fungsi di sini cuma menghitung & memodifikasi
// objek yang dioper, pemanggil yang bertanggung jawab .save().

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ROUND_LABELS_FROM_END = ['Final', 'Semifinal', 'Perempat Final'];

function labelForRound(roundNumber, totalRoundsGuess) {
  // totalRoundsGuess dihitung dari jumlah peserta babak ini; dipanggil ulang tiap generate babak
  const roundsLeft = totalRoundsGuess - roundNumber; // 0 = ini babak terakhir (final)
  if (roundsLeft >= 0 && roundsLeft < ROUND_LABELS_FROM_END.length) return ROUND_LABELS_FROM_END[roundsLeft];
  return `Babak ${roundNumber}`;
}

/** Hitung berapa banyak babak lagi dibutuhkan dari N pemain sampai tersisa 1 pemenang */
function totalRoundsNeeded(playerCount) {
  return Math.ceil(Math.log2(Math.max(playerCount, 1)));
}

/**
 * Buat babak pertama dari daftar peserta (di-acak). Kalau jumlah ganjil, satu peserta dapat BYE
 * (otomatis lolos tanpa lawan di babak ini).
 */
function generateFirstRound(participants) {
  const shuffled = shuffle(participants); // [{discordId, characterName}]
  const totalRounds = totalRoundsNeeded(shuffled.length);
  const matches = [];
  let matchNumber = 1;

  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1] || null; // ganjil -> peserta terakhir dapat bye

    matches.push({
      matchNumber: matchNumber++,
      player1Id: p1.discordId,
      player1Name: p1.characterName,
      player2Id: p2 ? p2.discordId : null,
      player2Name: p2 ? p2.characterName : null,
      winnerId: p2 ? null : p1.discordId, // bye = otomatis menang
      status: p2 ? 'pending' : 'completed',
    });
  }

  return {
    roundNumber: 1,
    roundLabel: labelForRound(1, totalRounds),
    matches,
  };
}

/**
 * Dari babak yang SEMUA match-nya sudah completed, buat babak berikutnya dari para pemenang.
 * Mengembalikan null kalau pemenangnya cuma tersisa 1 (berarti turnamen SELESAI).
 */
function generateNextRound(previousRound, nextRoundNumber, originalParticipantCount) {
  const winners = previousRound.matches.map((m) => ({
    discordId: m.winnerId,
    characterName: m.winnerId === m.player1Id ? m.player1Name : m.player2Name,
  }));

  if (winners.length <= 1) return null; // sudah ada juara tunggal

  const totalRounds = totalRoundsNeeded(originalParticipantCount);
  const shuffled = shuffle(winners); // acak ulang lawan tiap babak biar tidak selalu ketemu bracket-neighbor yang sama
  const matches = [];
  let matchNumber = 1;

  for (let i = 0; i < shuffled.length; i += 2) {
    const p1 = shuffled[i];
    const p2 = shuffled[i + 1] || null;

    matches.push({
      matchNumber: matchNumber++,
      player1Id: p1.discordId,
      player1Name: p1.characterName,
      player2Id: p2 ? p2.discordId : null,
      player2Name: p2 ? p2.characterName : null,
      winnerId: p2 ? null : p1.discordId,
      status: p2 ? 'pending' : 'completed',
    });
  }

  return {
    roundNumber: nextRoundNumber,
    roundLabel: labelForRound(nextRoundNumber, totalRounds),
    matches,
  };
}

function isRoundComplete(round) {
  return round.matches.every((m) => m.status === 'completed');
}

module.exports = { generateFirstRound, generateNextRound, isRoundComplete, totalRoundsNeeded };

