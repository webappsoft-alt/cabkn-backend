const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  title:String,
  image:String,
  description:String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Terms', ratingSchema);
