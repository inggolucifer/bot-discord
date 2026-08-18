// Menghitung pembagian profit sekte berdasarkan jabatan.
// Total dibagi: Ketua 30%, Wakil Ketua 25%, Tetua 25% (dibagi rata SEMUA tetua), Anggota 20% (dibagi rata SEMUA anggota).
// Kalau suatu jabatan kosong (mis. tidak ada Tetua), jatah jabatan itu HANGUS (tidak dialihkan ke jabatan lain) --
// supaya perhitungan simpel dan dapat diprediksi admin.

const ROLE_PERCENT = {
  leader: 0.30,
  viceLeader: 0.25,
  elder: 0.25,   // dibagi rata jumlah tetua
  member: 0.20,  // dibagi rata jumlah anggota
};

/**
 * @param {Sect} sect - dokumen sect (butuh leaderId, viceLeaderId, elderIds, memberIds)
 * @param {number} totalAmount - total profit yang mau dibagi
 * @returns {Array<{discordId, role, amount}>} daftar pembagian (amount sudah dibulatkan ke bawah)
 */
function splitSectProfit(sect, totalAmount) {
  const shares = [];

  if (sect.leaderId) {
    const amount = Math.floor(totalAmount * ROLE_PERCENT.leader);
    if (amount > 0) shares.push({ discordId: sect.leaderId, role: 'Ketua', amount });
  }

  if (sect.viceLeaderId) {
    const amount = Math.floor(totalAmount * ROLE_PERCENT.viceLeader);
    if (amount > 0) shares.push({ discordId: sect.viceLeaderId, role: 'Wakil Ketua', amount });
  }

  if (sect.elderIds?.length) {
    const pool = Math.floor(totalAmount * ROLE_PERCENT.elder);
    const perElder = Math.floor(pool / sect.elderIds.length);
    if (perElder > 0) {
      for (const id of sect.elderIds) shares.push({ discordId: id, role: 'Tetua', amount: perElder });
    }
  }

  if (sect.memberIds?.length) {
    const pool = Math.floor(totalAmount * ROLE_PERCENT.member);
    const perMember = Math.floor(pool / sect.memberIds.length);
    if (perMember > 0) {
      for (const id of sect.memberIds) shares.push({ discordId: id, role: 'Anggota', amount: perMember });
    }
  }

  return shares;
}

module.exports = { splitSectProfit, ROLE_PERCENT };

