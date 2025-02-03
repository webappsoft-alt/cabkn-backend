const mongoose = require('mongoose');

const timeSlot={
  // slot_date:Date,
  slots:[String]
}

const categorySchema = new mongoose.Schema({
  title:String,
  name: {
    type: String,
  },
  status: {
    type: String,
    default: 'active',
    enum: ['active', "deactivated"]
  },
  timeslots: [String],
  price_per_person:String,
  travelers:{
    type: Number,
    default: 0,
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
