const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  order_id: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  to_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ServicesSubCategories",
  },
  userIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  rejected_by: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  accepted_by: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  price: {
    type: Number,
    default: 0,
  },
  refunded: {
    type: Boolean,
    default: false,
  },
  adminprice: {
    type: Number,
    default: 0,
  },
  distance: {
    type: Number,
    default: 0,
  },
  start_location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: [Number],
  },
  start_address: String,
  end_address: String,
  schedule_date: {
    type: Date,
    default: Date.now,
    index: true,
  },
  schedule_time: {
    type: Date,
    default: Date.now,
    index: true,
  },
  end_location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: [Number],
  },
  stops: [{ latitude: String, longitude: String, address: String }],
  paymentId: String,
  pincode: String,
  tip: {
    type: Number,
    default: 0,
  },
  customer_rating: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rating",
  },
  liability: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Liabilties",
  },
  ridertype: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "RideType",
  },
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Coupon",
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
  },
  driver_rating: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Rating",
  },
  paymentDone: {
    type: Boolean,
    default: false,
  },
  creditDone: {
    type: Boolean,
    default: false,
  },
  adminPayment: {
    type: Boolean,
    default: false,
  },
  note: String,
  color: String,
  size: String,
  passengerCount: {
    type: Number,
    default: 0,
  },
  quantity: {
    type: Number,
    default: 0,
  },
  payment: [
    {
      amount: Number,
      date: Date,
    },
  ],
  status: {
    type: String,
    default: "pending",
    enum: ["pending", "accepted", "order-start", "completed", "cancelled"],
  },
  payment_status: {
    type: String,
    default: "pending",
    enum: ["pending", "completed", "received"],
  },
  type: {
    type: String,
    default: "parcel",
    enum: ["parcel", "driver"],
  },
  bookingtype: {
    type: String,
    default: "live",
    enum: ["live", "schedule"],
  },
  paymentType: {
    type: String,
    default: "cash",
    enum: ["cash", "paid", "wallet"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  completed_date: Date,
  pickTime: {
    type: Date,
  },
  dropTime: {
    type: Date,
  },
  reason: String,
  cancelled_time: {
    type: Date,
  },
  title: String,
  image: String,
  cart_items: String,
  isShop: Boolean,
  reassigning:{
    type: Boolean,
    default: false,
  },
  isAssigned: {
    type: Boolean,
    default: false,
  },
  to_id_assigned: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
  deleted: {
    type: Boolean,
    default: false,
  },

});

// // Explicitly define geospatial indexes
// orderSchema.index({ start_location: '2dsphere' });
// orderSchema.index({ end_location: '2dsphere' });
orderSchema.index({ schedule_date: -1 });
module.exports = mongoose.model("Order", orderSchema);
