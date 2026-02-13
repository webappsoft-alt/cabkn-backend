const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  phone: String,
  createdAt: { type: Date, default: Date.now, index: true }, // Timestamp for post creation
});

module.exports = mongoose.model('Invites', productSchema);
