const Order = require("../models/Order");
const Request = require("../models/Request");

exports.fetchrequestOrder = async (req, res) => {
  let query = {};
  const userId = req.user._id;

  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  query.status = "pending";
  query.rejected_by = {$nin:userId};
  query.accepted_by = {$nin:userId};
  query.userIds = {$in:userId};
  const pageSize = 10;

  try {
    const applications = await Order.find(query).sort({ _id: -1 }).populate("user").limit(pageSize).lean();

    if (applications.length > 0) {
      res.status(200).json({ success: true, requests: applications });
    } else {
      res.status(200).json({ success: false,requests:[], message: "No more requests found" });
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.fetchrequestOrderOffers = async (req, res) => {
  let query = {};
  const userId = req.user._id;
  const orderId = req.params.orderId;

  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  query.status = "pending";
  query.to_id = userId;
  query.order = orderId;
  const pageSize = 10;

  try {
    const applications = await Request.find(query).sort({ _id: -1 }).populate("user").populate("order").limit(pageSize).lean();

    if (applications.length > 0) {
      res.status(200).json({ success: true, offers: applications });
    } else {
      res.status(200).json({ success: false,offers:[], message: "No more offers found" });
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllEmployeeApplication = async (req, res) => {
  let query = {};
  const userId = req.user._id;
  const { status } = req.params;

  const validStatuses = ["all", 'accepted', "completed",'cancelled']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (req.body.id) {
    query._id = { $lt: req.body.id };
  }
  query.to_id = userId;

  if (status == "all") {
    query.status = {$in:["accepted",'completed']};
  }else{
    query.status = status;
  }

  const pageSize = 10;

  try {
    const applications = await Order.find(query).sort({ schedule_date: 1 }).populate("user").limit(pageSize).lean();

    if (applications.length > 0) {
      res.status(200).json({ success: true, orders: applications });
    } else {
      res.status(200).json({ success: false,orders:[], message: "No more Orders found" });
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllSellerApplication = async (req, res) => {
  let query = {};
  const userId = req.user._id;
  const { status } = req.params;

  const validStatuses = ["all", "pending",'accepted', "completed",'cancelled']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  query.user = userId;

  if (status == "all") {
    query.status = {$in:["accepted",'completed']};
  }else{
    query.status = status;
  }

  const pageSize = 10;

  try {
    const applications = await Order.find(query).sort({ schedule_date: 1 }).populate("to_id").limit(pageSize).lean();

    if (applications.length > 0) {
      res.status(200).json({ success: true, orders: applications });
    } else {
      res.status(200).json({ success: false,orders:[], message: "No more Orders found" });
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error" });
  }
};
