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
  quantity: {
    type: Number,
    default:0
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
  start_time:String,
  end_time:String,
  schedule:String,
  travelers:{
    type: Number,
    default: 0,
  },
  totalReviews:{
    type:Number,
    default:0
  },
  avgRating:{
    type:Number,
    default:0
  },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicesCategories', },
  images: [String],
  about:String,
  color:[String],
  size:[String],
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

module.exports = mongoose.model('ServicesSubCategories', categorySchema);
