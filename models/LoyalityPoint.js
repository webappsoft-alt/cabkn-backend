const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  points_per_ride: {
    type: Number,
    default:0
  },
  convert_rate_per_xcd: {
    type: Number,
    default:0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('LoyalityPoint', categorySchema);
