const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  to_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  review:String,
  rating:{
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Rating', ratingSchema);
