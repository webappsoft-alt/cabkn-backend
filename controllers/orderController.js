const Dustbin = require("../models/Dustbin");
const Order = require("../models/Order");
const Request = require("../models/Request");
const Support = require("../models/Support");
const { sendNotification } = require("./notificationCreateService");

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
    const applications = await Order.find(query).sort({ _id: -1 }).populate("user").populate('dumbster').limit(pageSize).lean();

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
    const applications = await Request.find(query).sort({ _id: -1 }).populate("user").populate({
      path: "dustbin",
      populate: [
        { path: "dumbster", model: "Dumbster" },
      ],
    }).populate('').populate("order").limit(pageSize).lean();

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
  const { status } = req.body;

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
    const applications = await Order.find(query).sort({ _id: -1 }).populate("user").populate('dumbster').populate("dustbin").limit(pageSize).lean();

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

exports.renterStats = async (req, res) => {
  let query = {};
  const userId = req.user._id;

  query.to_id = userId;

  try {
    const applications = await Order.find(query).select("price status").lean();
    
    const pendingOrder=applications.filter(item=>item.status=='pending').length
    const acceptedOrder=applications.filter(item=>item.status=='accepted').length
    const completeOrder=applications.filter(item=>item.status=="completed")
    const totalEarning=completeOrder.reduce((a,b)=>a+Number(b.price),0)

    res.status(200).json({ success: true, completeOrder:completeOrder.length,acceptedOrder,pendingOrder,totalEarning });
  } catch (error) {
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
    const applications = await Order.find(query).sort({ _id: -1 }).populate("to_id").populate('dumbster').populate("dustbin").limit(pageSize).lean();

    if (applications.length > 0) {
      for (let order of applications) {
        order.totalOffers=order.accepted_by.length;
        delete order.accepted_by;
      }
      res.status(200).json({ success: true, orders: applications });
    } else {
      res.status(200).json({ success: false,orders:[], message: "No more Orders found" });
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Internal server error" });
  }
};


exports.UpdateOrder = async (req, res) => {
  try {
    const applicationId = req.params.id;
    const userId = req.user._id;
    const { status } = req.params;

    const validStatuses = ["completed"]
  
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
      const updatedSession = await Order.findOneAndUpdate(
        { _id: applicationId,status:"accepted",to_id:userId },
        {
          status: status,
        },
        { new: true }
      ).populate("to_id").populate("user")
      if (updatedSession == null) {
        return res.status(200).json({ success:false,message: "Order not found" });
      }
      const dustbin = await Dustbin.findById(updatedSession.dustbin);
      if (!dustbin) {
        return res.status(404).json({ message: 'Dustbin not found' });
      }


       // Find and remove the booking
      dustbin.bookings = dustbin.bookings.filter(booking => {
        return !(new Date(booking.startDate).getTime() === new Date(updatedSession.start_date).getTime() && 
                 new Date(booking.endDate).getTime() === new Date(updatedSession.end_date).getTime());
      });

      await dustbin.save();

      await sendNotification({
        user: userId,
        to_id: updatedSession.user._id,
        description:`Your Offer has been completed by `+updatedSession?.to_id?.name,
        type: "order",
        title: "Offer completed",
        fcmtoken:  updatedSession.user.fcmtoken,
        order: applicationId,
        noti:false
      });
  
     return res.status(200).json({success:true,message: `Order updated successfully`, order: updatedSession });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};
exports.checkRate = async (req, res) => {
  try {
    const userId = req.user._id;
    const findOrder=await Order.findOne({user:userId,renteeRate:false,status:"completed"}).populate("to_id").populate("user").populate("dumbster").populate("dustbin").lean()

    if (!findOrder) {
      return res.status(200).json({success:false, message: "No order found." });
    }

    await Order.findByIdAndUpdate(findOrder._id,{renteeRate:true},{new:true})
  
    return res.status(200).json({success:true, order: findOrder });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.adminSideGigs = async (req, res) => {
  let query = {};

  const lastId = parseInt(req.params.id)||1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }
  const pageSize = 10;

  
  const validStatuses = ["all",'pending', 'accepted', "completed"]

  if (!validStatuses.includes(req.params.status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }
  
  if (req.params.status !== "all") {
    query.status = req.params.status;
  }

  const skip = Math.max(0, (lastId - 1)) * pageSize;

  try {
    const posts = await Order.find(query).populate("user").populate('dumbster').populate("to_id").populate("dustbin")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize).lean();    

    const totalCount = await Order.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (posts.length > 0) {
      res.status(200).json({ success: true, orders: posts,count: { totalPage: totalPages, currentPageSize: posts.length }  });
    } else {
      res.status(200).json({ success: false, orders:[],message: 'No more orders found',count: { totalPage: totalPages, currentPageSize: posts.length }  });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
