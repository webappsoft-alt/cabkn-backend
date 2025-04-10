const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  to_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  type: {
    type: String,
    default: 'message',
    enum: ['message','support','offer','order','rating','order-payment','referral','noti']
  },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, 
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' }, 
  support: { type: mongoose.Schema.Types.ObjectId, ref: 'Support' }, 
  description: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  image:String,
  weburl:String,
  seen: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
