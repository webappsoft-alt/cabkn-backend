const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  ticket:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
  },
  total_price:{
    type: Number,
    default: 0,
  },
  originalPrice:{
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    default: 'deposit',
    enum: ["deposit","purchase"]
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
