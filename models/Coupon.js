const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  events: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  }],
  title: String,
  code: String,
  expirey_date: Date, // Timestamp for post creation
  used_by: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  }],
  discount: {
    type:Number,
    default:0
  }, // Timestamp for post creation
  createdAt: { type: Date, default: Date.now, index: true }, // Timestamp for post creation
});

module.exports = mongoose.model('Coupon', productSchema);
