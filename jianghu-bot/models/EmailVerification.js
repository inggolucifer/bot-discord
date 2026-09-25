const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  characterName: {
    type: String,
    required: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  gender: {
    type: String,
    enum: ['Laki-laki', 'Perempuan'],
    default: 'Laki-laki'
  },
  otp: {
    type: String,
    required: true
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 // Dokumen otomatis terhapus dari MongoDB setelah 10 menit (TTL Index)
  }
});

module.exports = mongoose.model('EmailVerification', emailVerificationSchema);
