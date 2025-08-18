const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const shopOrderSchema = new Schema({
  cart_items: {
    type: [mongoose.Schema.Types.Mixed],
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  payment_method: {
    type: String,
    // enum: ["cash", "wallet", "paid"],
  },
  paymentId: String,
  total_price: String,
  status: {
    type: String,
    enum: ["pending", "way", "completed", "cancelled"],
    default: "pending",
  },
});

module.exports = mongoose.model("ShopOrder", shopOrderSchema);
