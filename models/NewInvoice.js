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
    token: {
      type: String,
      unique: true,
    },
    url: String,
    paymentId: {
      type: String,
      default: "",
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("NewInvoice", invoiceSchema);
