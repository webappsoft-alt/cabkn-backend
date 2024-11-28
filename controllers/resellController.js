const Event = require("../models/Event");
const Purchase = require("../models/Purchase");
const Resell = require("../models/Resell");
const Transaction = require("../models/Transaction");
const { User } = require("../models/user");
const { purchaseEmail } = require("./emailservice");
const { ticketCode } = require("./generateCode");
const { sendNotification } = require("./notificationCreateService");


function validateTicketArray(mainArray, secondaryArray) {
  // Step 1: Create a map from the main array for easy lookup
  const mainMap = {};
  for (const ticket of mainArray) {
    mainMap[ticket.type] = ticket.totalTicket;
  }

  // Step 2: Validate each object in the secondary array
  for (const ticket of secondaryArray) {
    // Check if the type exists in the main array and is allowed
    if (!(ticket.type in mainMap)) {
      return `Invalid type: ${ticket.type} is not allowed.`;
    }

    // Check if the totalTicket count does not exceed the count in the main array
    if (ticket.totalTicket > mainMap[ticket.type]) {
      return `Invalid totalTicket for type ${ticket.type}: exceeds limit of ${mainMap[ticket.type]}.`;
    }
  }

  return ""; // If no errors were found, validation passed
}

exports.createPost = async (req, res) => {
  try {
    const {
      purchase_ticketId,
      code,
      price,
      type
    } = req.body;

    const purchase=await Purchase.findOne({_id:purchase_ticketId,"tickets_type_sale.code": { $in: code } })

    if (!purchase) return res.status(400).json({success: true,message: "Tickets are not found."});

    const resell = new Resell({
      user:purchase.user,
      event:purchase.event,
      purchase_ticketId,
      price,
      type
    });
    
    await Purchase.findOneAndUpdate(
      { _id: purchase_ticketId },
      { $pull: { "tickets_type_sale.code": code }, remainig_ticket : Number(purchase.remainig_ticket) - 1 }
    );
    await resell.save();
    res.status(200).json({success: true,message: "Resell tickets created successfully",resell});
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getMyResellTickets = async (req, res) => {
  const userId = req.user._id
  const lastId = parseInt(req.params.id)||1;

    // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }
  let query={};

  const pageSize = 10;

  query.user = userId;
  // query.resellTickets={ $exists: false  }
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;
  try {
    const likedJobs = await Resell.find(query).populate({
      path: 'event',
      populate: [
        { path: 'user', model: 'user' },
        { path: 'category', model: 'Category' },
        { path: 'likes', model: 'Like' },
        { path: 'coupon', model: 'Coupon' },
        { path: 'purchase_by', model: 'Purchase',options: { limit: 3 }, populate: [{ path: 'user', model: 'user' },]},
      ]
    }).populate({
      path:"resellTickets",
      populate: [
        { path: 'user', model: 'user' },
      ]
    }).sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

    const totalCount = await Resell.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);
    

    if (likedJobs.length > 0) {
      for (let purchase of likedJobs) {
        purchase.event.TotalLikes=purchase.event.likes?.length
        purchase.event.likes=userId? Array.isArray(purchase.event.likes) && purchase.event.likes.some(like => like.user.toString() === userId.toString()):false
      }
      res.status(200).json({ success: true, posts: likedJobs,count: { totalPage: totalPages, currentPageSize: likedJobs.length }  });
    } else {
      res.status(200).json({ success: false, message: 'No more resell tickets found',posts:[] ,count: { totalPage: totalPages, currentPageSize: likedJobs.length } });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.otherResellEvents = async (req, res) => {
  const userId = req?.user?._id||""
  const lastId = parseInt(req.params.id)||1;

    // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }
  let query={};

  const pageSize = 10;
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;
  query.user = {$ne:userId};
  query.resellTickets={ $exists: false  }

  try {
    const likedJobs = await Resell.find(query).populate({
      path: 'event',
      populate: [
        { path: 'user', model: 'user' },
        { path: 'category', model: 'Category' },
        { path: 'likes', model: 'Like' },
        { path: 'coupon', model: 'Coupon' },
        { path: 'purchase_by', model: 'Purchase',options: { limit: 3 }, populate: [{ path: 'user', model: 'user' },]},
      ]
    }).sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

      const totalCount = await Resell.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);
    

    if (likedJobs.length > 0) {
      for (let purchase of likedJobs) {
        purchase.event.TotalLikes=purchase.event.likes?.length
        purchase.event.likes=userId? Array.isArray(purchase.event.likes) && purchase.event.likes.some(like => like.user.toString() === userId.toString()):false
      }
      res.status(200).json({ success: true, posts: likedJobs,count: { totalPage: totalPages, currentPageSize: likedJobs.length }  });
    } else {
      res.status(200).json({ success: false, message: 'No more resell tickets found',posts:[] ,count: { totalPage: totalPages, currentPageSize: likedJobs.length } });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

function convertToUKFormat(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}   

exports.purchaseTicket = async (req, res) => {
  const userId = req.user._id;
  const eventId=req.params.id;

  const { type }=req.body;

  try {
    const findEvent = await Resell.findOne({_id:eventId,resellTickets:{ $exists: false  }}).populate("user")

    if (!findEvent) return res.status(404).json({ message: "Resel ticket has already been booked by anyother user." });

    const post = new Purchase({
      user: userId,
      event:findEvent.event,
      tickets:1,
      totalPrice:Number(findEvent.price),
      remainig_ticket:1,
      tickets_type_sale:{
        type:findEvent.type,
        totalTicket:1,
        price:Number(findEvent.price),
        code:ticketCode(),
        scanned:[]
      },
      resel_by:findEvent.user._id,
      type
    })

    const event = await Event.findById(findEvent.event).populate("user category").lean()

    if (!event) return res.status(404).json({ message: 'Event not found.' });


    const logInuser=await User.findById(userId).select("email").lean()

    const ukFormattedDate = convertToUKFormat(event.start_Date);

   await purchaseEmail(logInuser.email,event.name,ukFormattedDate,event.category.name,findEvent.type,)

    findEvent.resellTickets=post._id

    const twentyPer = Number(findEvent.price) * 0.20
    
    await sendNotification({
      user : userId,
      to_id : findEvent.user._id,
      description :  `Someone has purchased your resell 1 tickets of your ${findEvent.event.name} booked event`,
      type :'purchase',
      title :"New Resell Ticket Purchase",
      fcmtoken : findEvent.user?.fcmtoken,
      event:eventId,
      purchase:post._id
    })

    const user = await User.findById(findEvent.user._id);

    const transaction = new Transaction({
      user: findEvent.user._id,
      ticket:findEvent.purchase_ticketId,
      total_price: Number(findEvent.price) - Number(twentyPer),
      type:"deposit",
      originalPrice:Number(findEvent.price)
    });
    await transaction.save();


    const balance = Number(user?.balance) || 0;
    const totalPrice = Number(findEvent.price) - Number(twentyPer) || 0;

    user.balance = balance + totalPrice;
    await user.save();
    await findEvent.save();
    
    await post.save();
    res.status(201).json({ success: true, message: 'Ticket purchase successfully', ticket:post });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.deleteResellTicket = async (req, res) => {
  const eventId=req.params.id;
  try {
    const findEvent = await Resell.findOneAndDelete({_id:eventId,resellTickets:{ $exists: false  }}).populate("user").lean()

    if (!findEvent) return res.status(404).json({ message: "Resell tickets not found with that Id" });

    const purchase=await Purchase.findById(findEvent.purchase_ticketId)

    if (!purchase) return res.status(404).json({ message: "Resell tickets not found with that Id" });
    
    await Purchase.findOneAndUpdate(
      { _id: findEvent.purchase_ticketId },
      { $pull: { "tickets_type_sale.code": ticketCode() }, remainig_ticket : Number(purchase.remainig_ticket) + 1 }
    );

    res.status(201).json({ success: true, message: 'Resel Ticket delete successfully', ticket:findEvent });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};