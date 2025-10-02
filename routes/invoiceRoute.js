const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const bcrypt = require("bcryptjs");
function tokengenrater() {
  // Generate a unique token using a combination of timestamp and random number
  // Convert to base 36 to ensure only alphanumeric characters (0-9, a-z) are used,
  // avoiding special characters like '/' or '\'.
  const timestampPart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2); // Remove "0." prefix
  return timestampPart + randomPart;
}
router.post("/create", [auth, admin], async (req, res) => {
  const { name, note, amount } = req.body;
  try {
    const token = tokengenrater();
    const invoice = new Invoice({ name, note, amount });
    invoice.status = "pending";
    invoice.token = token;
    invoice.url = `https://payment.cabkn.com/?token=${token}`;
    await invoice.save();
    res.status(200).json({
      message: "Invoice created successfully",
      response: invoice,
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ message: "Error creating invoice", error: error.message });
  }
});

router.get("/", [auth, admin], async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  try {
    const invoices = await Invoice.find().skip(skip).limit(limit).sort({ createdAt: -1 });

    const totalInvoices = await Invoice.countDocuments();

    res.status(200).json({
      message: "Invoices fetched successfully",
      response: invoices,
      currentPage: page,
      totalPages: Math.ceil(totalInvoices / limit),
      totalItems: totalInvoices,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching invoices", error: error.message });
  }
});

router.get("/:id/admin", [auth, admin], async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) {
    return res.status(404).json({ message: "Invoice not found" });
  }
  res
    .status(200)
    .json({ message: "Invoice fetched successfully", response: invoice });
});

router.get("/:id", async (req, res) => {
  const invoice = await Invoice.findOne({ token: req.params.id });
  if (!invoice) {
    return res.status(404).json({ message: "Payment not found" });
  }
  if (invoice.status === "paid") {
    return res.status(400).json({ message: "Payment already paid", response: invoice });
  }
  res
    .status(200)
    .json({ message: "Payment fetched successfully", response: invoice });
});

router.put("/:id", async (req, res) => {
  const { status, paymentId } = req.body;
  if (status !== "paid") {
    return res.status(400).json({ message: "Invalid status" });
  }
  try {
    const invoice = await Invoice.findOne({ token: req.params.id });
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }
    if (invoice.status === "paid") {
      return res.status(400).json({ message: "Invoice already paid" });
    }
    invoice.status = status;
    invoice.paymentId = paymentId;
    await invoice.save();
    res
      .status(200)
      .json({ message: "Invoice updated successfully", response: invoice });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating invoice", error: error.message });
  }
});
module.exports = router;
