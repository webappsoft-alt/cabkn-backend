const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  title:String,
  price:{
    type: Number,
    default:0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Liabilties', ratingSchema);
