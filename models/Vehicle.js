const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  images:[String],
  name:String,
  max_power:String,
  max_fuel:String,
  max_speed:String,
  mph:String,
  modal:String,
  capacity:String,
  color:String,
  fueltype:String,
  geartype:String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Vehicle', ratingSchema);
