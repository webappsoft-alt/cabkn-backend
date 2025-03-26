const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  webSubCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WebSubCategories'
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

module.exports = mongoose.model('SubWebCatRating', ratingSchema);
