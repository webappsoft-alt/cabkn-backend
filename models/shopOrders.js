const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const shopOrderSchema = new Schema({
  cart_items: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: [Number],
  },
  status: {
    type: String,
    enum: ["pending", "way", "completed", "cancelled"],
    default: "pending",
  },
});

module.exports = mongoose.model("ShopOrder", shopOrderSchema);
