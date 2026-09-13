module.exports = {
  // Comfort range in Celsius
  COMFORT_MIN: 10,
  COMFORT_MAX: 30,

  // Penalties applied when outside comfort zone (without sufficient resistance gear)
  QI_REGEN_PENALTY_OUTSIDE_COMFORT: 0.25,   // -25% qi regen rate multiplier (i.e. 1 - 0.25 = 0.75x)
  COMBAT_STAT_PENALTY_OUTSIDE_COMFORT: 0.10, // -10% atk/def multiplier (i.e. 1 - 0.10 = 0.90x)

  // 1 point of resistance reduces the effective distance from the comfort zone by 1 degree
  RESISTANCE_SCALE: 1.0,

  regions: {
    central_plains: {
      baseTemperature: 22,
      tempVariance: 5,
      label: 'Dataran Tengah'
    },
    azure_mountain_range: {
      baseTemperature: 8,
      tempVariance: 8,
      label: 'Pegunungan Azure'
    },
    southern_demon_domain: {
      baseTemperature: 34,
      tempVariance: 6,
      label: 'Domain Iblis Selatan'
    },
    eastern_sea_region: {
      baseTemperature: 26,
      tempVariance: 4,
      label: 'Laut Timur'
    },
    northern_desolate_territory: {
      baseTemperature: -5,
      tempVariance: 10,
      label: 'Tundra Utara'
    },
    western_sacred_deserts: {
      baseTemperature: 38,
      tempVariance: 8,
      label: 'Gurun Suci Barat'
    }
  },

  // Modifiers based on global WeatherConfig enum: ['Cerah', 'Hujan', 'Badai Beracun', 'Mendung']
  weatherModifiers: {
    'Cerah': 2,
    'Hujan': -3,
    'Badai Beracun': -6,
    'Mendung': -1
  },

  // Server time modifiers (hour)
  hourModifiers: [
    { fromHour: 0, toHour: 5, delta: -4 },
    { fromHour: 6, toHour: 8, delta: -1 },
    { fromHour: 9, toHour: 15, delta: 2 },
    { fromHour: 16, toHour: 18, delta: 0 },
    { fromHour: 19, toHour: 23, delta: -2 }
  ]
};
