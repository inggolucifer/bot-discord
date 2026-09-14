module.exports = {
  PROPOSAL_EXPIRY_HOURS: 48,
  // Biaya upacara (copper equivalent) — sesuaikan ekonomi server; mulai konservatif
  CEREMONY_FEE_COPPER: 500,
  // Mahar minimum (0 = boleh tanpa mahar)
  MIN_DOWRY_COPPER: 0,
  // Biaya cerai (dibayar initiator)
  DIVORCE_FEE_COPPER: 1000,
  // Cooldown setelah cerai sebelum bisa dilamar lagi (jam) — enforce lazy saat propose
  REMARRY_COOLDOWN_HOURS: 24,
  // Buff: MATIKAN numerik. Kalau mau flavor saja:
  ENABLE_COSMETIC_TITLE: true,  // misal title "Dao Companion" di response API/UI
  ENABLE_STAT_BUFF: false       // HARUS false di fase ini
};
