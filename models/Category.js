const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', "deactivated"]
  },
  image: {
    type: String,
  },
  lat:String,
  lng:String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updated_at: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Category', categorySchema);
