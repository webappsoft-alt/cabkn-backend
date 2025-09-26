const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    name: String,
    note: String,
    amount: Number,
    status: {
      type: String,
      default: "pending",
      enum: ["pending", "paid", "cancelled"],
    },
    token: String,
    url: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
