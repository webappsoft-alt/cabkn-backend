const express = require("express");
const mongoose = require("mongoose");
const ShopOrder = require("../models/shopOrders");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const router = express.Router();
const { User } = require("../models/user");

const product = require("../models/ServicesSubCategories");
const {
  sendNotification,
} = require("../controllers/notificationCreateService");
/**
 * CREATE Shop Order
 */
router.post("/", auth, async (req, res) => {
  const user = req.user._id; // Assuming user is set in middleware
  try {
    const {
      cart_items,
      payment_method,
      paymentId,
      total_price,
      drop_location,
    } = req.body;

    if (!cart_items || !user) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    for (const item of cart_items) {
      if (!item._id || !item.quantity) {
        return res.status(400).json({ message: "Invalid cart item format" });
      }

      console.log("Shop order Items:", item);
      const productExists = await product.findById(item._id);
      if (!productExists) {
        return res.status(404).json({ message: "Product not found" });
      }

      console.log("Shop order Items:", item.cartQuantity);
      if (item.cartQuantity <= 0) {
        return res
          .status(400)
          .json({ message: "Quantity must be greater than zero" });
      }
      const x = await product.updateOne(
        { _id: item._id },
        { $inc: { quantity: -item.cartQuantity } }
      );
      console.log("Product quantity updated:", x);
    }
    // console.log("Shop order created successfully:", savedOrder._id);

    const shopOrder = new ShopOrder({
      cart_items,
      user,
      payment_method,
      paymentId,
      total_price,
      drop_location,
      order_id: `ORD-${Date.now()}`, // Unique order ID
      // location,
    });
    const savedOrder = await shopOrder.save();
    const admins = await User.find({ type: "admin" })
      .select("_id fcmtoken")
      .lean();
    // Send notifications to all admins
    for (const admin of admins) {
      await sendNotification({
        user: user,
        to_id: admin._id,
        description: `Shop order created successfully`,
        type: "admin-message",
        title: "Customer Message",
        fcmtoken: admin.fcmtoken || "",
        usertype: "admin",
      });
    }
    console.log("Shop order created successfully:", savedOrder._id);
    res.status(201).json({
      success: true,
      message: "Order has been created successfully",
      data: savedOrder,
    });
  } catch (error) {
    console.error("Error creating shop order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * READ all orders with pagination
 */
router.get("/:status/:page?", async (req, res) => {
  try {
    const { status } = req.params;
    const page = parseInt(req.params.page) || 1;
    const pageSize = 10;

    const validStatuses = ["all", "pending", "way", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    let query = {};
    if (status !== "all") {
      query.status = status;
    }

    const skip = (page - 1) * pageSize;

    const orders = await ShopOrder.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .populate("user")
      .lean();
    // console.log("Orders fetched:", orders.length);
    const totalCount = await ShopOrder.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    res.status(200).json({
      success: true,
      data: orders,
      count: {
        totalPages,
        currentPage: page,
        currentPageSize: orders.length,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * READ single order
 */
router.get("/single/:id", async (req, res) => {
  try {
    const order = await ShopOrder.findById(req.params.id).populate("user");
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * UPDATE order
 */
router.put("/:id", async (req, res) => {
  try {
    const updatedOrder = await ShopOrder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({ success: true, data: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * DELETE order
 */
router.delete("/:id", async (req, res) => {
  try {
    const deletedOrder = await ShopOrder.findByIdAndDelete(req.params.id);
    if (!deletedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
