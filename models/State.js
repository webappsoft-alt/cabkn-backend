const mongoose = require('mongoose');

const ticketObj={
  type:{
    type: String,
    default: 'general',
    enum: ['general', 'vip','vvip','earlybird']
  },
  totalTicket:{
    type: Number,
    default: 0,
  }
}


const joinUserSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  tickets: {
    type:Number,
    default:0
  },
  tickets_type_sale:[ticketObj],
  totalPrice: {
    type:Number,
    default:0
  },
  resellticket: {
    type:Number,
    default:0
  },
  paymentDone:{
    type:Boolean,
    default:false
  },
  resellpurchases:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
  }],
  ResellTickets:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resell',
  },
  createdAt: { type: Date, default: Date.now, index: true }, // Timestamp for post creation
});

module.exports = mongoose.model('Purchase', joinUserSchema);