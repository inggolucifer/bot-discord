const { getCurrentStamina, getMaxStamina } = require('../utils/stamina');

class StaminaRegenService {
  /**
   * Menghitung dan menerapkan regenerasi stamina per tick
   */
  applyRegenTick(player, environment = {}) {
    if (!player) return null;

    const maxStamina = getMaxStamina(player);
    const currentStamina = getCurrentStamina(player);

    if (currentStamina >= maxStamina) {
      return { stamina: maxStamina, gained: 0, isMax: true };
    }

    // Cek kondisi Overweight (Kapasitas beban penuh -> stamina beku)
    let currentWeight = 0;
    let maxWeight = player.baseCarryCapacity || 50;
    if (Array.isArray(player.inventory)) {
      currentWeight = player.inventory.reduce((acc, it) => acc + (it.quantity || 1), 0);
    }
    if (currentWeight > maxWeight) {
      // Overweight -> tidak ada regenerasi stamina
      return { stamina: currentStamina, gained: 0, reason: 'encumbered' };
    }

    // Rate dasar per tick
    let regenRate = 1; // Default wilderness

    if (player.rest && player.rest.status === 'resting') {
      // Sedang istirahat aktif
      regenRate = player.rest.mode === 'tent' ? 8 : 4;
    } else if (environment.insideOwnResidence) {
      // Di dalam rumah kediaman milik sendiri
      regenRate = 5;
    } else if (environment.insideInn) {
      // Di dalam penginapan
      regenRate = 4;
    } else if (environment.inSettlement) {
      // Di dalam area pemukiman desa/kota
      regenRate = 2;
    }

    const newStamina = Math.min(maxStamina, currentStamina + regenRate);
    player.currentStamina = newStamina;

    return {
      stamina: newStamina,
      gained: newStamina - currentStamina,
      maxStamina,
      rate: regenRate
    };
  }
}

module.exports = new StaminaRegenService();
