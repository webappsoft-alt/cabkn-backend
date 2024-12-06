const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  to_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  userIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  }],
  rejected_by: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  }],
  accepted_by: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  }],
  price:{
    type: Number,
    default: 0,
  },
  distance:{
    type: Number,
    default: 0,
  },
  start_location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
  },
  start_address: String,
  end_address: String,
  schedule_date: {
    type: Date,
    default: Date.now,
    index: true
  },
  schedule_time: {
    type: Date,
    default: Date.now,
    index: true
  },
  end_location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
    },
  },
  paymentId:String,
  customer_rating:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rating',
  },
  liability:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Liabilties',
  },
  ridertype:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RideType',
  },
  vehicle:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
  },
  driver_rating:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rating',
  },
  paymentDone:{
    type:Boolean,
    default:false
  },
  payment:[{
    amount:Number,
    date:Date
  }],
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'accepted',"completed",'cancelled']
  },
  type: {
    type: String,
    default: 'parcel',
    enum: ['parcel', 'driver']
  },
  bookingtype: {
    type: String,
    default: 'live',
    enum: ['live', 'schedule']
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

// orderSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Order', orderSchema);