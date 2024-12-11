const Coupon = require("../models/Coupon");
const Order = require("../models/Order");
const Request = require("../models/Request");
const { User } = require("../models/user");
const { sendNotification } = require("./notificationCreateService");

exports.fetchrequestOrder = async (req, res) => {
  let query = {};
  const userId = req.user._id;

  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  const user = await User.findById(req.user._id).lean();

  if (user.status !== 'online') {
    return res.status(200).json({ success: false,requests:[], message: "No more requests found" });
  }

  if (user.isRiding==true) {
    return res.status(200).json({ success: false,requests:[], message: "No more requests found" });
  }

  query.status = "pending";
  query.rejected_by = {$nin:userId};
  query.accepted_by = {$nin:userId};
  const pageSize = 10;

  try {
    const applications = await Order.find(query).sort({ _id: -1 }).populate("ridertype").populate("coupon").populate("liability").populate("user").populate("vehicle").limit(pageSize).lean();

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
    const applications = await Request.find(query).sort({ _id: -1 }).populate("user").populate("order").populate("vehicle").limit(pageSize).lean();

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

  const validStatuses = ["all", 'accepted',"order-start", "completed",'cancelled']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  if (req.body.bookingtype) {
    query.bookingtype = req.body.bookingtype;
  }
  query.to_id = userId;

  if (status == "all") {
    query.status = {$in:["accepted",'completed']};
  }else if (status == "accepted"){
    query.status = {$in:["accepted",'order-start']};
  }else{
    query.status = status;
  }

  const pageSize = 10;

  try {
    const applications = await Order.find(query).sort({ schedule_date: 1 }).populate("coupon").populate("user").populate("vehicle").populate("ridertype").populate("liability").limit(pageSize).lean();

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

exports.getOrderDetails = async (req, res) => {
  
  try {
    const user = await User.findById(req.user._id).populate("likes").lean();

    const applications = await Order.findById(req.params.id).populate("user").populate("coupon").populate("vehicle").populate("ridertype").populate("liability").populate("to_id").lean();

    if (!applications) return res.status(200).json({ success: false,message: "No more Orders found"  });

    const likes= Array.isArray(user.likes) && user.likes.some((like) => like.otherUser.toString() === applications.to_id._id.toString());
    
    res.status(200).json({ success: true, order:{...applications,likes:likes} });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getofferDetails = async (req, res) => {
  
  try {
    const applications = await Request.findById(req.params.id).populate("user").populate("order").populate("vehicle").populate("to_id").lean();

    if (!applications) return res.status(200).json({ success: false,message: "No more offers found"  });
    
    res.status(200).json({ success: true, offers:applications });
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.getAllSellerApplication = async (req, res) => {
  let query = {};
  const userId = req.user._id;
  const { status } = req.params;

  const validStatuses = ["all", "pending",'accepted', "order-start","completed",'cancelled']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

   if (req.params.id) {
    query._id = { $lt: req.params.id };
  }
  
  if (req.body.bookingtype) {
    query.bookingtype = req.body.bookingtype;
  }

  query.user = userId;

  if (status == "all") {
    query.status = {$in:["accepted",'completed']};
  }else if (status == "accepted"){
    query.status = {$in:["accepted",'order-start']};
  }else{
    query.status = status;
  }

  const pageSize = 10;

  try {
    const applications = await Order.find(query).sort({ schedule_date: 1 }).populate("coupon").populate("to_id").populate("ridertype").populate("liability").populate("vehicle").limit(pageSize).lean();

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

exports.AdminRides = async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id) || 1;

  // Validate lastId
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  const { status } = req.params;
  const validStatuses = ["all", "pending", "accepted","order-start", "completed", "cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  if (status !== "all") {
    query.status = status;
  }

  if (req.body.bookingtype) {
    query.bookingtype = req.body.bookingtype;
  }
  

  if (req.body.paymentDone) {
    query.paymentDone = req.body.paymentDone;
  }

  const pageSize = 10;
  const skip = Math.max(0, (lastId - 1)) * pageSize;

  try {
    const matchStage = { $match: query };

    const searchStage =  {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        }

    const filterStage = req.body.search
      ? {
          $match: {
            $or: [
              { "user.name": { $regex: req.body.search, $options: "i" } },
              { "user.email": { $regex: req.body.search, $options: "i" } },
            ],
          },
        }
      : null;

    const applications = await Order.aggregate([
      matchStage,
      ...(searchStage ? [searchStage] : []),
      ...(filterStage ? [filterStage] : []),
      { $skip: skip },
      { $limit: pageSize },
      { $sort: { schedule_date: 1 } },
      {
        $lookup: {
          from: "users",
          localField: "to_id",
          foreignField: "_id",
          as: "to_id",
        },
      },
      {
        $lookup: {
          from: "ratings",
          localField: "customer_rating",
          foreignField: "_id",
          as: "customer_rating",
        },
      },
      {
        $lookup: {
          from: "ratings",
          localField: "driver_rating",
          foreignField: "_id",
          as: "driver_rating",
        },
      },
      {
        $lookup: {
          from: "vehicles",
          localField: "vehicle",
          foreignField: "_id",
          as: "vehicle",
        },
      },
      {
        $lookup: {
          from: "coupons",
          localField: "coupon",
          foreignField: "_id",
          as: "coupon",
        },
      },
    ]);

    const totalCount = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (applications.length > 0) {
      res.status(200).json({
        success: true,
        orders: applications,
        count: { totalPage: totalPages, currentPageSize: applications.length },
      });
    } else {
      res.status(200).json({
        success: false,
        orders: [],
        message: "No more Orders found",
        count: { totalPage: totalPages, currentPageSize: applications.length },
      });
    }
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.updatePurchasePaymentByAdmin = async (req, res) => {
  try {
    const postId = req.params.id;

    const {paymentDone,payment}=req.body;
    const payemntObject={amount:payment,date:Date.now()}

    const post = await Order.findOneAndUpdate({_id:postId}, {paymentDone:paymentDone,$push:{payment:payemntObject}}, {new: true});

    if (!post) return res.status(404).send({ success: false, message: 'The Purchase with the given ID was not found.' });

    res.send({ success: true, message: 'Purchase payed successfully', purchase:post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updatePurchasePaymentByCustomer = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;
    const { paymentId,tip,couponId }=req.body;

    let query={
      paymentId:paymentId,tip:tip||0 ,
      payment_status:"completed"
    }
    if (couponId) {
      await Coupon.findByIdAndUpdate(couponId,{$addToSet:{used_by:userId}}).lean();
      query={
        ...query,
        coupon:couponId
      }
    }

    const post = await Order.findOneAndUpdate({ _id:postId, user: userId },query, {new: true}).populate("to_id").lean();

    if (!post) return res.status(404).send({ success: false, message: 'The Order with the given ID was not found.' });

     // Notify the customer about the update
     await sendNotification({
      user: userId,
      to_id: post.to_id._id.toString(),
      description: `Customer have paid your order amount.`,
      type: "order",
      title: "Order Update",
      fcmtoken: post.to_id.fcmtoken,
      order: postId,
    });

    res.send({ success: true, message: 'Payment payed successfully', order:post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updateApproveByRider = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const post = await Order.findOneAndUpdate({ _id:postId,to_id:userId},{payment_status:"recieved"}, {new: true}).populate("user").lean();

    if (!post) return res.status(404).send({ success: false, message: 'The Order with the given ID was not found.' });

      // Notify the customer about the update
      await sendNotification({
        user: userId,
        to_id: post.user._id.toString(),
        description: `Rider have approved the amount of your order.`,
        type: "order",
        title: "Order Update",
        fcmtoken: post.user.fcmtoken,
        order: postId,
      });
  

    res.send({ success: true, message: 'Payment approved successfully', order:post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};