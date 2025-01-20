const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', "deactivated"]
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'WebCategories', },
  images: [String],
  about:String,
  address:String,
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

module.exports = mongoose.model('WebSubCategories', categorySchema);
