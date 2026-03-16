const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const {
  sendNotification,
} = require("../controllers/notificationCreateService");
const { io, connectedUsers } = require("../startup/sockets");
const LoyalityPoint = require("../models/LoyalityPoint");
const { User } = require("../models/user");
router.get("/:id", async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user coupon service liability ridertype")
      .populate({
        path: "to_id",
        populate: [{ path: "vehicle", model: "Vehicle" }],
      })
      .lean();
    if (!order || order.status === "completed") {
      return res.status(404).json({ message: "Order not found" });
    }
    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/anonymous/:id", async (req, res) => {
  try {
    console.log(req.params.id, "req.params.id");
    const order = await Order.findById(req.params.id)
      .populate("user")
      .populate("ridertype")
      .populate("liability");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Order has already been assigned to someone else." });
    }

    order.to_id = null;
    order.status = "order-start";
    order.isAnonymous = true;
    order.metadata = {
      ...req.body,
    };
    await order.save();

    const date = new Date(order.schedule_date);
    const admin = await User.findOne({ type: "admin" }).lean();
    await sendNotification({
      user: admin?._id.toString(),
      to_id: admin?._id.toString(),
      description:
        order.bookingtype == "live"
          ? `You have been assigned by admin to a ride and your ride has been started.`
          : `You have been assigned by admin to a ride and your ride has been scheduled for ${date.toLocaleDateString()}.`,
      type: "order",
      title: "Offer Accepted",
      fcmtoken: admin?.fcmtoken,
      order: order._id,
      usertype: admin?.type,
    });
    await sendNotification({
      user: order.user?._id.toString(),
      to_id: admin._id.toString(),
      description: `You have assigned an offer to admin and your ride has been started.`,
      type: "order",
      title: "Offer Accepted",
      fcmtoken: admin?.fcmtoken,
      order: order._id,
      usertype: admin?.type,
    });
    // Notify other riders to filter out the request
    const userIds = await User.find({
      type: "rider",
      status: { $in: ["online", "offline"] },
      _id: { $ne: admin._id.toString() },
    })
      .select("fcmtoken")
      .lean();

    // for (let user of userIds) {
    //   io.to(user._id.toString()).emit("filter-request-rider", {
    //     request: order._id,
    //     success: true,
    //   });
    // }
    res.status(200).json({ order });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.put("/anonymous/:id", async (req, res) => {
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: req.params.id,
        status: { $in: ["accepted", "order-start"] },
        to_id: null,
      },
      { status: "completed", completed_date: Date.now(), dropTime: Date.now() },
      { new: true },
    );
    const user = await User.findById(updatedOrder.user._id);
    const addresses = await LoyalityPoint.findOne({}).lean();
    user.points = Number(user.points) + (addresses?.points_per_ride || 10);
    await user.save();
    const admins = await User.find({
      type: "admin",
      fcmtoken: { $exists: true, $ne: "" },
    }).select("_id fcmtoken");

    // console.log("admins", admins);
    for (const admin of admins) {
      // console.log("admin", admin);
      await sendNotification({
        user: updatedOrder.user._id.toString(),
        to_id: admin._id,
        description: `Anonymous has completed the ride.`,
        type: "order",
        title: "Ride Completed",
        fcmtoken: admin.fcmtoken,
        order: updatedOrder._id,
        usertype: "admin",
      });
      // Notify the customer about the update
      await sendNotification({
        user: admin._id.toString(),
        to_id: updatedOrder.user._id.toString(),
        description: `Your Ride has been completed by ${
          updatedOrder?.to_id?.name
        } and you have successfully earned ${
          addresses?.points_per_ride || 10
        } points for this ride.`,
        type: "order",
        title: "Ride Update",
        fcmtoken: updatedOrder.user.fcmtoken,
        order: updatedOrder._id,
        noti: false,
        usertype: updatedOrder.user?.type,
      });
    }

    res.status(200).json({ updatedOrder });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});
router.post("/:id", auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user")
      .populate("ridertype")
      .populate("liability");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (order.status !== "pending") {
      return res
        .status(400)
        .json({ message: "Order has already been assigned to someone else." });
    }

    const to_user = await User.findById(req.user._id).lean();
    if (!to_user) {
      return res.status(404).json({ message: "User not found" });
    }
    order.to_id = req.user._id;
    order.status = "assigned";
    await order.save();

    const date = new Date(order.schedule_date);
    const admin = await User.findOne({ type: "admin" }).lean();
    await sendNotification({
      user: admin?._id.toString(),
      to_id: to_user?._id.toString(),
      description:
        order.bookingtype == "live"
          ? `You have been assigned by admin to a ride and your ride has been started.`
          : `You have been assigned by admin to a ride and your ride has been scheduled for ${date.toLocaleDateString()}.`,
      type: "order",
      title: "Offer Accepted",
      fcmtoken: to_user?.fcmtoken,
      order: order._id,
      usertype: to_user?.type,
    });
    await sendNotification({
      user: order.user?._id.toString(),
      to_id: admin._id.toString(),
      description: `You have assigned an offer to ${to_user?.name} and your ride has been started.`,
      type: "order",
      title: "Offer Accepted",
      fcmtoken: admin?.fcmtoken,
      order: order._id,
      usertype: admin?.type,
    });

    // Notify other riders to filter out the request
    const userIds = await User.find({
      type: "rider",
      status: { $in: ["online", "offline"] },
      _id: { $ne: to_user._id.toString() },
    })
      .select("fcmtoken")
      .lean();

    for (let user of userIds) {
      connectedUsers[user._id.toString()]?.forEach((socketId) => {
        io.to(socketId).emit("filter-request-rider", {
          request: order._id,
          success: true,
        });
      });
    }
    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
