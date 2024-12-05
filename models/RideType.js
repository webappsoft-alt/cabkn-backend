const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  title:String,
  image:String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('RideType', ratingSchema);
