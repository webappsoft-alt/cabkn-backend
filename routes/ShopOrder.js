const express = require("express");
const mongoose = require("mongoose");
const ShopOrder = require("../models/shopOrders");

const router = express.Router();

/**
 * CREATE Shop Order
 */
router.post("/", async (req, res) => {
  try {
    const { cart_items, user, location } = req.body;

    if (!cart_items || !user || !location?.coordinates) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const shopOrder = new ShopOrder({
      cart_items,
      user,
      location,
    });

    const savedOrder = await shopOrder.save();
    res.status(201).json({ success: true, data: savedOrder });

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
      return res.status(400).json({ success: false, message: "Invalid status" });
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
    res.status(200).json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("Error deleting order:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
