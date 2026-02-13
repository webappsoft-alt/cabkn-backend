const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  images:[String],
  name:String,
  model:String,
  brand:String,
  colour:String,
  license:String,
  num_passengers:String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Vehicle', ratingSchema);
