const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  order:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  amount:{
    type: Number,
    default: 0,
  },
  refId:String,
  type: {
    type: String,
    default: 'deposit',
    enum: ["deposit","purchase",'refferal']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Transaction', transactionSchema);
