const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  serviceSubCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ServicesSubCategories'
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

module.exports = mongoose.model('ServiceSubCatRating', ratingSchema);
