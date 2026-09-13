const climateConfig = require('../config/regionClimate');

/**
 * Calculates current temperature based on region, weather, and time.
 * @param {string} regionSlug
 * @param {Object} options
 * @param {string} options.guildId (optional) for fetching weather
 * @param {Object} options.weatherConfig (optional) predefined WeatherConfig object
 * @param {Date} options.now (optional) current time
 * @returns {Object} { temperature, comfortMin, comfortMax, inComfort, regionSlug, weather, breakdown }
 */
function getCurrentTemperature(regionSlug, options = {}) {
  const region = climateConfig.regions[regionSlug] || climateConfig.regions['central_plains'];
  const now = options.now || new Date();
  const currentHour = now.getHours();

  let base = region.baseTemperature;

  // Add random variance based on day of year (determinisitc for the day) to not require storing state
  // We'll use a simple pseudo-random approach based on date and region name length
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const seed = dayOfYear + regionSlug.length;
  // A pseudo-random value between -tempVariance and +tempVariance
  const varianceNote = Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * (region.tempVariance * 2 + 1)) - region.tempVariance;

  let hourDelta = 0;
  for (const mod of climateConfig.hourModifiers) {
    if (currentHour >= mod.fromHour && currentHour <= mod.toHour) {
      hourDelta = mod.delta;
      break;
    }
  }

  let weatherDelta = 0;
  let weather = null;
  if (options.weatherConfig) {
    weather = options.weatherConfig.currentWeather;
    weatherDelta = climateConfig.weatherModifiers[weather] || 0;
  }

  const temperature = base + varianceNote + hourDelta + weatherDelta;

  const inComfort = temperature >= climateConfig.COMFORT_MIN && temperature <= climateConfig.COMFORT_MAX;

  return {
    temperature,
    comfortMin: climateConfig.COMFORT_MIN,
    comfortMax: climateConfig.COMFORT_MAX,
    inComfort,
    regionSlug,
    weather,
    breakdown: { base, hourDelta, weatherDelta, varianceNote }
  };
}

/**
 * Calculates effective temperature considering player resistances.
 * @param {number} rawTemp
 * @param {Object} resistance { coldResistance, heatResistance }
 */
function getEffectiveTemperature(rawTemp, resistance = { coldResistance: 0, heatResistance: 0 }) {
  let effTemp = rawTemp;
  const coldRes = (resistance.coldResistance || 0) * climateConfig.RESISTANCE_SCALE;
  const heatRes = (resistance.heatResistance || 0) * climateConfig.RESISTANCE_SCALE;

  if (rawTemp < climateConfig.COMFORT_MIN) {
    // If cold, cold resistance increases effective temp (up to comfort min)
    effTemp = Math.min(climateConfig.COMFORT_MIN, rawTemp + coldRes);
  } else if (rawTemp > climateConfig.COMFORT_MAX) {
    // If hot, heat resistance decreases effective temp (down to comfort max)
    effTemp = Math.max(climateConfig.COMFORT_MAX, rawTemp - heatRes);
  }

  return effTemp;
}

/**
 * Calculates penalties if player is outside of comfort zone after resistances.
 * @param {string} regionSlug
 * @param {Object} resistance { coldResistance, heatResistance }
 * @param {Object} options (same as getCurrentTemperature)
 * @returns {Object} { inComfort, qiRegenMultiplier, combatStatMultiplier, reason }
 */
function getClimatePenalties(regionSlug, resistance = { coldResistance: 0, heatResistance: 0 }, options = {}) {
  const current = getCurrentTemperature(regionSlug, options);
  const effectiveTemp = getEffectiveTemperature(current.temperature, resistance);

  const inComfort = effectiveTemp >= climateConfig.COMFORT_MIN && effectiveTemp <= climateConfig.COMFORT_MAX;

  let qiRegenMultiplier = 1.0;
  let combatStatMultiplier = 1.0;
  let reason = null;

  if (!inComfort) {
    qiRegenMultiplier = 1.0 - climateConfig.QI_REGEN_PENALTY_OUTSIDE_COMFORT;
    combatStatMultiplier = 1.0 - climateConfig.COMBAT_STAT_PENALTY_OUTSIDE_COMFORT;

    if (effectiveTemp < climateConfig.COMFORT_MIN) {
       reason = `Kedinginan ekstrem. Suhu dirasakan: ${effectiveTemp}°C`;
    } else {
       reason = `Kepanasan ekstrem. Suhu dirasakan: ${effectiveTemp}°C`;
    }
  }

  return {
    inComfort,
    qiRegenMultiplier,
    combatStatMultiplier,
    reason,
    effectiveTemp,
    rawTemp: current.temperature
  };
}

/**
 * Helpers to get player resistance sum
 */
async function getPlayerClimateResistance(player) {
  let coldResistance = 0;
  let heatResistance = 0;

  if (player.equipment && player.inventory) {
      // Find equipped items in the inventory
      const equipmentSlotValues = Object.values(player.equipment).filter(v => v !== null).map(v => v.toString());

      const Item = require('../models/Item');

      for (const invItem of player.inventory) {
          const isActuallyEquipped = invItem.isEquipped || (invItem._id && equipmentSlotValues.includes(invItem._id.toString()));

          if (isActuallyEquipped && invItem.itemId) {
              // We need to fetch the item definition if it's not populated,
              // but we can assume itemId might just be an ObjectId or populated object.
              let itemDef = invItem.itemId;
              if (itemDef instanceof require('mongoose').Types.ObjectId || typeof itemDef === 'string') {
                  itemDef = await Item.findById(itemDef);
              }

              if (itemDef) {
                  coldResistance += itemDef.coldResistance || 0;
                  heatResistance += itemDef.heatResistance || 0;
              }
          }
      }
  }

  return { coldResistance, heatResistance };
}

module.exports = {
  getCurrentTemperature,
  getEffectiveTemperature,
  getClimatePenalties,
  getPlayerClimateResistance
};
