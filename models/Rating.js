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
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  },
  review:String,
  speed: {
    type: Number,
    default: 0,
  },
  passing: {
    type: Number,
    default: 0,
  },
  shooting: {
    type: Number,
    default: 0,
  },
  dribling: {
    type: Number,
    default: 0,
  },
  avgRating:{
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
