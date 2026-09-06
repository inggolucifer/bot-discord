const mongoose = require('mongoose');

const weatherConfigSchema = new mongoose.Schema({
  configId: { type: String, default: 'global', unique: true },
  currentWeather: { type: String, enum: ['Cerah', 'Hujan', 'Badai Beracun', 'Mendung'], default: 'Cerah' },
  nextChangeAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('WeatherConfig', weatherConfigSchema);
