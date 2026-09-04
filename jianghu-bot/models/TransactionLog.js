// Log SEMUA pergerakan currency/item supaya bisa diaudit jika ada kecurigaan cheat
const mongoose = require('mongoose');

const transactionLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: [
      'daily_claim', 'convert', 'transfer',
      'shop_purchase', 'sell_to_system', 'asset_profit_claim',
      'admin_grant', 'admin_revoke', 'death_loot', 'loot_claim',
      'craft', 'player_listing_create', 'player_listing_sale', 'player_listing_cancel',
      'sect_deposit', 'sect_claim_profit', 'sect_craft', 'sect_admin_grant',
      'sect_donate', 'sect_war_loot', 'worker_claim', 'sect_worker_claim',
      'player_build_asset', 'player_build_asset_web', 'player_destroy_asset', 'player_repair_asset', 'player_guard_asset', 'sect_build_asset', 'hire_worker', 'worker_salary',
      'auction_bid', 'auction_refund', 'auction_win', 'auction_profit', 'auction_request', 'comprehend_manual', 'use_insight_pill', 'law_reset'
    ],
    required: true,
  },
  fromUserId: { type: String, default: null },   // null jika dari sistem (mis. daily)
  toUserId: { type: String, default: null },
  currency: { type: String, enum: ['copper', 'silver', 'gold', 'jade', 'spirit', null], default: null },
  amount: { type: Number, default: 0 },
  itemDescription: { type: String, default: null }, // untuk transaksi item/pet/asset
  balanceAfter: { type: mongoose.Schema.Types.Mixed, default: null }, // snapshot saldo setelah transaksi (anti-cheat)
  note: { type: String, default: null },
}, { timestamps: true });

transactionLogSchema.index({ guildId: 1, createdAt: -1 });

module.exports = mongoose.model('TransactionLog', transactionLogSchema);

