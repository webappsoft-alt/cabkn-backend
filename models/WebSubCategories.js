const mongoose = require('mongoose');

const timeSlot={
  // slot_date:Date,
  slots:[String]
}

const categorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', },
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
  heighlights: [String],
  price_per_person:String,
  location_price:String,
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
  totalReviews:{
    type:Number,
    default:0
  },
  avgRating:{
    type:Number,
    default:0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  upload_status: {
    type: String,
    default: 'active',
    enum: ['pending', "active",'reject']
  },
  updated_at: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('WebSubCategories', categorySchema);
