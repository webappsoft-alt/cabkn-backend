const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  price:{
    type: Number,
    default:0
  },
  km:{
    type: Number,
    default:0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('PriceKm', ratingSchema);
