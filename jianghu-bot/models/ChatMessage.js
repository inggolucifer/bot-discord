const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  user: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    avatar: { type: String, default: null }
  },
  message: { type: String, required: true, maxlength: 200 },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
