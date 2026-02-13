const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  to_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
  },
  vehicle:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  price:{
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'accepted',"rejected"]
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});


module.exports = mongoose.model('Request', requestSchema);