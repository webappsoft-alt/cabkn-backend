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
  },
  price:{
    type: Number,
    default: 0,
  },
  code:[Number],
  scanned:[Number],
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
  tickets_type_sale:ticketObj,
  totalPrice: {
    type:Number,
    default:0
  },
  ownerPrice: {
    type:Number,
    default:0
  },
  resellticket: {
    type:Number,
    default:0
  },
  remainig_ticket: {
    type:Number,
    default:0
  },
  paymentDone:{
    type:Boolean,
    default:false
  },
  scanner:{
    type:Boolean,
    default:false
  },
  code:{
    type:Number,
    default:0
  },
  resellpurchases:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Purchase',
  }],
  ResellTickets:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resell',
  },
  resel_by:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  createdAt: { type: Date, default: Date.now, index: true }, // Timestamp for post creation
  type:{
    type: String,
    default: 'show',
    enum: ['show', 'unshow']
  }
});

module.exports = mongoose.model('Purchase', joinUserSchema);