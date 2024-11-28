const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  name: String,
  description: String,
  image: String,
  mealtime: String,
  calories: String,
  createdAt: { type: Date, default: Date.now, index: true }, // Timestamp for post creation
  status: {
    type: String,
    default: 'active',
    enum: ['active', 'deleted']
  }
});

module.exports = mongoose.model('Food', productSchema);
