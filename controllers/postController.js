const { default: axios } = require('axios');
const Post = require('../models/Event');
const like = require('../models/like');
const Purchase = require('../models/Purchase');
const { sendNotification } = require('./notificationCreateService');
const { User } = require('../models/user');
const admin = require("firebase-admin");
const Coupon = require('../models/Coupon');
const Category = require('../models/Category');
const { ticketCode } = require('./generateCode');
const { purchaseEmail } = require('./emailservice');

exports.createPost = async (req, res) => {
  try {
    const { 
      images,
      name,
      event_type,
      start_Date,
      start_Time,
      address,
      country,
      city,
      state,
      description,
      join_people,
      ticket_plans,
      refund_policy,
      category,
      type,
      location
     } = req.body;
    const userId = req.user._id;

    const post = new Post({
      user: userId,
      images,
      name,
      event_type,
      start_Date,
      start_Time,
      address,
      country,
      city,
      state,
      description,
      join_people,
      ticket_plans,
      refund_policy,
      category,
      tickets_sale:[{ type:"general", totalTicket:0},{type: 'vip',totalTicket:0},{type:'vvip',totalTicket:0},{type:"earlybird",totalTicket:0}],
      type,
      location
    })

    const users=await User.find({ type:"customer",status:"online" }).select("fcmtoken").lean();
    const cat=await Category.findById(category).select("name").lean();


    const fcmTokens = [...new Set(users.map(item => item.fcmtoken).filter(item=>item!==undefined||item!==""))];
    if (fcmTokens.length > 0) {
      // Create an array of message objects for each token
      const messages = fcmTokens.map(token => ({
        token: token,
        notification: {
            title: 'New Event',
            body: `A new Event "${name}" has been created in ${cat.name} area.`,
        },
        android: {
            notification: {
                sound: 'default',
            },
        },
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                },
            },
        },
      }));
      try {
        await admin.messaging().sendEach(messages)
      } catch (error) {}
    }

      
    await post.save();
    res.status(201).json({ success: true, message: 'Event created successfully', post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.editPost = async (req, res) => {
  try {
    const userId = req.user._id;

    const { 
      images,
      name,
      event_type,
      start_Date,
      start_Time,
      address,
      country,
      city,
      state,
      description,
      join_people,
      ticket_plans,
      refund_policy,
      location
    } = req.body;
    const postId = req.params.id;

    // Create an object to store the fields to be updated
  let updateFields = Object.fromEntries(
    Object.entries({
      images,
      name,
      event_type,
      start_Date,
      start_Time,
      address,
      country,
      city,
      state,
      description,
      join_people,
      ticket_plans,
      refund_policy,
      location
    }).filter(([key, value]) => value !== undefined)
  );

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).send({ success: false, message: 'No valid fields provided for update.' });
  }
    const post = await Post.findOneAndUpdate({_id:postId}, updateFields, {
      new: true
    });

    if (!post) return res.status(404).send({ success: false, message: 'The Event with the given ID was not found.' });

    res.send({ success: true, message: 'Event updated successfully', post:post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.makePopularEvent = async (req, res) => {
  try {
    const { popular } = req.body;
    const postId = req.params.id;

    // Create an object to store the fields to be updated
  let updateFields = Object.fromEntries(
    Object.entries({
      popular
    }).filter(([key, value]) => value !== undefined)
  );

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).send({ success: false, message: 'No valid fields provided for update.' });
  }
    const post = await Post.findOneAndUpdate({_id:postId}, updateFields, {
      new: true
    });

    if (!post) return res.status(404).send({ success: false, message: 'The Event with the given ID was not found.' });

    res.send({ success: true, message: 'Event updated successfully', post:post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getMyPosts = async (req, res) => {
  const lastId = parseInt(req.params.id)||1;
  const userId = req?.user?._id||""

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }

  const pageSize = 10;
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;
  let query = {};
  query.status='active'
  query.user=userId


  const users = await Post.find(query).populate("user").populate("likes").populate({
    path: 'purchase_by',
    options: { limit: 3 }, // Limit to 3 users
    populate: [
      { path: 'user', model: 'user' },
    ]
  }).populate("coupon").populate("category").sort({ start_Date : 1 }).skip(skip).limit(pageSize).lean();
  for (let posts of users) {
    posts.TotalLikes = posts?.likes?.length || 0
    posts.likes = Array.isArray(posts.likes) && posts.likes.some(like => like.user.toString() === userId.toString());
  }
  
  const totalCount = await Post.find(query);
  const totalPages = Math.ceil(totalCount.length / pageSize);
  
  res.send({ success: true, posts: users,count: { totalPage: totalPages, currentPageSize: users.length } });
};

exports.updatePurchasePaymentByAdmin = async (req, res) => {
  try {
    const postId = req.params.id;

    const {paymentDone,payment}=req.body;
    const payemntObject={amount:payment,date:Date.now()}

    const post = await Post.findOneAndUpdate({_id:postId}, {paymentDone:paymentDone,$push:{payment:payemntObject}}, {new: true});

    if (!post) return res.status(404).send({ success: false, message: 'The Purchase with the given ID was not found.' });

    res.send({ success: true, message: 'Purchase payed successfully', purchase:post });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAdminPurchases = async (req, res) => {
  const users = await Purchase.find({event:req.params.id,resel_by: { $exists: false },}).sort({ _id: -1 }).lean();
  const totalPurchase = await Purchase.find({event:req.params.id,resel_by: { $exists: true },}).sort({ _id: -1 }).lean();


  const totalPayments=users.reduce((a,b)=>a + Number(b.totalPrice),0)
  const totalOtherPayments=totalPurchase.reduce((a,b)=>a + Number(b.totalPrice),0)
  const totalOwnerTax=users.reduce((a,b)=>a + Number(b.ownerPrice),0)

  const eightPerc = Number(totalPayments) * 0.08
  // const twoPerc = Number(totalPayments) * 0.02
  const twentPerc = Number(totalOtherPayments) * 0.20
  const eightResel = Number(totalOtherPayments) * 0.08

    
  res.send({ success: true, totalPayments, totalOwnerTax,adminEarning:eightPerc+twentPerc+eightResel });
};

exports.latestEvent = async (req, res) => {
  const userId = req?.user?._id||""
  
  let query = {};
  query.status='active'
  query.user=userId

  // Get the current date and time (now)
  const now = new Date();
    
  // Only retrieve upcoming events (those with start_Date in the future)
  query.start_Date = { $gte: now };


  const users = await Post.find(query).populate("user").populate({
    path: 'purchase_by',
    options: { limit: 3 }, // Limit to 3 users
    populate: [
      { path: 'user', model: 'user' },
    ]
  }).populate("category").populate("coupon").sort({ start_Date: 1 }).limit(2).lean();
  for (let posts of users) {
    posts.TotalLikes = posts?.likes?.length || 0
    posts.likes = Array.isArray(posts.likes) && posts.likes.some(like => like.user.toString() === userId.toString());
  }
    
  res.send({ success: true, posts: users});
};

exports.getAdminPost = async (req, res) => {
  const lastId = parseInt(req.params.id)||1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }

  const pageSize = 10;
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;
  let query = {};
  query.status='active'

  if (req.params.type!=='all') {
    query.category = req.params.type; 
  }

  if (req.body.search) {
    query.name= { $regex: new RegExp(req.body.search, 'i') };
  }

  if (req.body.today=="false"||req.body.today==false) {
    // Get the current date and time (now)
    const now = new Date();
    
    // Only retrieve upcoming events (those with start_Date in the future)
    query.start_Date = { $lte: now };
  }
  
  if (req.body.today=="true"||req.body.today==true) {
    // Get the current date and time (now)
    const now = new Date();
    
    // Only retrieve upcoming events (those with start_Date in the future)
    query.start_Date = { $gte: now };
  }
  if (req.body.paymentDone) {
    query.paymentDone = (req.body.paymentDone=="true"||req.body.paymentDone==true) ? true : false
  }


  const users = await Post.find(query).populate("user").populate({
    path: 'purchase_by',
    options: { limit: 3 }, // Limit to 3 users
    populate: [
      { path: 'user', model: 'user' },
    ]
  }).populate("category").populate("coupon").sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

  for (let post of users) {
    const purchases = await Purchase.find({event:post._id,resel_by: { $exists: false },}).select("totalPrice").lean();  
    const totalPayments = purchases.reduce((a,b)=>a + Number(b.totalPrice),0)
    post.totalPayments = totalPayments;
    post.paidAmount = post.payment.reduce((a,b)=>a+Number(b.amount),0);
  }
  
  const totalCount = await Post.find(query);
  const totalPages = Math.ceil(totalCount.length / pageSize);
  
  res.send({ success: true, posts: users,count: { totalPage: totalPages, currentPageSize: users.length } });
};

exports.noCouponEvent = async (req, res) => {
  const userId = req?.user?._id||""
  let query = {};
   // Get the current date and time (now)
   const now = new Date();
    
   // Only retrieve upcoming events (those with start_Date in the future)
   query.start_Date = { $gte: now };
   query.status= "active";
   query.coupon= null;
   query.user= userId;

  const users = await Post.find(query).populate("user").populate({
    path: 'purchase_by',
    options: { limit: 3 }, // Limit to 3 users
    populate: [
      { path: 'user', model: 'user' },
    ]
  }).populate("category").sort({ _id: -1 }).limit(15).lean();
    
  res.send({ success: true, posts: users});
};

exports.filterPosts = async (req, res) => {
  const lastId = parseInt(req.body.last_id)||1;
  const userId = req?.user?._id||""

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }

  const pageSize = 10;
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;
  let query = {};

  query.status='active'

  if (req.body.search) {
    query.name= { $regex: new RegExp(req.body.search, 'i') };
  }

  if (req.body.today=="true"||req.body.today==true) {
    // Get the current date and time (now)
    const now = new Date();
    
    // Only retrieve upcoming events (those with start_Date in the future)
    query.start_Date = { $gte: now };
  }

  if (req.body.otherId) {
    query.user = req.body.otherId; 
  }
  if (req.body.category) {
    query.category = req.body.category; 
  }

  if (req.body.address) {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(404).send({ message: 'Latitude and Longitude are required',posts:[] });
    }

    const radiusInMiles = 20;
    const radiusInMeters = radiusInMiles * 1609.34; // Convert miles to meters
  
    const users = await Post.find({
      ...query,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radiusInMeters
        }
      }
    }).sort({ start_Date : 1 }).populate("user").populate("likes").populate("coupon").populate("category").skip(skip).limit(pageSize).lean();

    for (const post of users) {
      post.TotalLikes = post?.likes?.length || 0
      post.likes = userId? Array.isArray(post.likes) && post.likes.some(like => like.user.toString() === userId.toString()):false;
      post.purchase_by = userId? Array.isArray(post.purchase_by) && post.purchase_by.some(like => like.toString() === userId.toString()):false;
    }
    
    const totalCount = await Post.countDocuments({...query,
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: radiusInMeters
        }
      }
  });
    const totalPages = Math.ceil(totalCount / pageSize);
    
    res.send({ success: true, posts: users,count: { totalPage: totalPages, currentPageSize: users.length } });
  }else if (req.body.popular) {

    const popularEvents = await Post.find({...query,popular:true}).populate({
      path: 'purchase_by',
      options: { limit: 3 }, // Limit to 3 users
      populate: [
        { path: 'user', model: 'user' },
      ]
    }).populate("user").populate("likes").populate("coupon").populate("category").sort({ total_tickets_sale: -1 }).limit(pageSize).lean();

    // const users = await Post.find(query).populate({
    //   path: 'purchase_by',
    //   options: { limit: 3 }, // Limit to 3 users
    //   populate: [
    //     { path: 'user', model: 'user' },
    //   ]
    // }).populate("user").populate("likes").populate("coupon").populate("category").sort({ total_tickets_sale: -1 }).limit(pageSize-popularEvents.length).lean();

    for (const post of popularEvents) {
      post.TotalLikes = post?.likes?.length || 0
      post.likes =userId? Array.isArray(post.likes) && post.likes.some(like => like.user.toString() === userId.toString()):false;
    }
        
   return res.send({ success: true, posts: popularEvents });
} {

  const users = await Post.find(query).populate({
    path: 'purchase_by',
    options: { limit: 3 }, // Limit to 3 users
    populate: [
      { path: 'user', model: 'user' },
    ]
  }).populate("user").populate("likes").populate("coupon").populate("category").sort({ _id: -1 }).skip(skip).limit(pageSize).lean();
  for (const post of users) {
    post.TotalLikes = post?.likes?.length || 0
    post.likes =userId? Array.isArray(post.likes) && post.likes.some(like => like.user.toString() === userId.toString()):false;
  }
  
  const totalCount = await Post.find(query);
  const totalPages = Math.ceil(totalCount.length / pageSize);
  
  res.send({ success: true, posts: users,count: { totalPage: totalPages, currentPageSize: users.length } });
}};

exports.getDetailsEvent = async (req, res) => {
  const userId = req?.user?._id||""
  const postId = req?.params?.id||""

  const post = await Post.findById(postId).populate({
    path: 'purchase_by',
    options: { limit: 3 }, // Limit to 3 users
    populate: [
      { path: 'user', model: 'user' },
    ]
  }).populate("user").populate("likes").populate("coupon").populate("category").lean();

  if (!post) {
    return res.status(404).json({ message: 'Event not found.' });
  }

  const TotalLikes = post?.likes?.length || 0
  const likes = userId? Array.isArray(post.likes) && post.likes.some(like => like.user.toString() === userId.toString()):false;
    
  res.send({ success: true, post: {...post,TotalLikes,likes} });
};


exports.deletePostById = async (req, res) => {
  try {
    const postId = req.params.id;

    const deletedPost = await Post.findById(postId);

    if (!deletedPost) {
      return res.status(404).json({ message: 'Event not found or user does not have permission to delete it' });
    }

    const findPurcahse=await Purchase.findOne({event:postId})

    if (findPurcahse) return res.status(404).json({ message: "Event cann't deleted as someone has purchased a ticket of it." });

    deletedPost.status='deleted';
    await deletedPost.save()

    await like.deleteMany({ event: postId, });

    res.status(200).json({ message: 'Event deleted successfully', post: deletedPost });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.likePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    const existingLike = await like.findOne({ user: userId, event: postId });

    if (existingLike) {
      return await dislike(postId, res, userId);
    }
    const likePost = new like({
      user: userId,
      event: postId
    });


    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $push: { likes: likePost._id } },
      { new: true }
    ).populate("user")

    if (!updatedPost) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await likePost.save()

    res.status(200).json({ message: 'Like added successfully', post: updatedPost });
  } catch (error) {

    console.log(error)
    res.status(500).json({ message: 'Internal server error' });
  }
};

const dislike = async (postId, res, userId) => {
  try {

    const deletedLike = await like.findOneAndDelete({ event: postId,user: userId, });

    if (!deletedLike) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { $pull: { likes: deletedLike._id } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({ message: 'Like deleted successfully', post: updatedPost });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.getMyFavPosts = async (req, res) => {
  const userId = req.user._id
  const lastId = parseInt(req.params.id)||1;

    // Check if lastId is a valid number
    if (isNaN(lastId) || lastId < 0) {
      return res.status(400).json({ error: 'Invalid last_id' });
    }
    let query={};
  
    const pageSize = 10;
    
    const skip = Math.max(0, (lastId - 1)) * pageSize;

  query.user = userId;
  try {
    const likedJobs = await like.find(query)
      .populate({
        path: 'event',
        populate: [
          { path: 'user', model: 'user' },
          { path: 'category', model: 'Category' },
          { path: 'coupon', model: 'Coupon' },
          { path: 'purchase_by', model: 'Purchase',options: { limit: 3 }, populate: [{ path: 'user', model: 'user' },]},
        ]
      }).sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

      const totalCount = await like.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);
    

    const jobs = likedJobs.map((like) => like.event);
    if (jobs.length > 0) {
      const UpdateFav = jobs.map(order => {
        return {
          ...order,       // Spread operator to copy existing properties
          likes: true // Adding new key with a value
        };
      });
      res.status(200).json({ success: true, posts: UpdateFav,count: { totalPage: totalPages, currentPageSize: jobs.length }  });
    } else {
      res.status(200).json({ success: false, message: 'No more favorite Events found',posts:[] ,count: { totalPage: totalPages, currentPageSize: jobs.length } });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


const updateTicketAndTotal = (tickets_sale,type,count) => {
  const typeSale = tickets_sale;
  let updatedTickets = [...typeSale];
  for (let i = 0; i < updatedTickets.length; i++) {
    if (updatedTickets[i].type === type) {
      updatedTickets[i].totalTicket = Number(updatedTickets[i].totalTicket) + Number(count);
    }
  }
  return updatedTickets;
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

  try {
    const {totalPrice,tickets,tickets_type_sale,couponId,type}=req.body;

    const findEvent = await Post.findById(eventId).lean()

    if (Number(findEvent.total_tickets_sale+Number(tickets))>Number(findEvent.join_people)) {
      return res.status(404).json({ message: "Event's tickets are fully sold" });
    }

    const eightPerc=Number(totalPrice) * 0.08

    const totalPriceValue=Number(totalPrice) - Number(eightPerc)
    const twoPer=Number(totalPriceValue) * 0.02

    let codeArray=[]

    for (let index = 0; index < Number(tickets_type_sale[0].totalTicket); index++) {
      codeArray.push(ticketCode())
    }

    const post = new Purchase({
      user: userId,
      event:eventId,
      tickets:tickets,
      totalPrice:totalPriceValue,
      ownerPrice:Number(totalPriceValue),
      tickets_type_sale:{
        ...tickets_type_sale[0],
        code:codeArray,
        scanned:[]
      },
      remainig_ticket:tickets,
      type
    })

    const event = await Post.findByIdAndUpdate(eventId, { $addToSet : { purchase_by : post._id },total_tickets_sale:Number(findEvent.total_tickets_sale)+Number(tickets),tickets_sale:updateTicketAndTotal(findEvent.tickets_sale,tickets_type_sale[0].type,Number(tickets)) },{new:true}).populate("user category").lean()

    if (!event) return res.status(404).json({ message: 'Event not found.' });

    if (couponId) {
      await Coupon.findByIdAndUpdate(couponId,{$addToSet:{used_by:userId}}).lean();
    }


    await sendNotification({
      user : userId,
      to_id : event.user._id,
      description :  `Someone has purchased ${tickets} tickets of your ${event.name}`,
      type :'purchase',
      title :"New Ticket Purchase",
      fcmtoken : event.user?.fcmtoken,
      event:eventId,
      purchase:post._id
    }) 

    const logInuser=await User.findById(userId).select("email").lean()

    const ukFormattedDate = convertToUKFormat(event.start_Date);

   await purchaseEmail(logInuser.email,event.name,ukFormattedDate,event.category.name,tickets_type_sale[0].type)
    
    await post.save();
    res.status(201).json({ success: true, message: 'Ticket purchase successfully', ticket:post });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.transferTickets = async (req, res) => {
  const ownerUser = req?.user?._id||""
  const userId = req.params.userId;
  const purchaseId = req.params.purchaseId;
  const purchaseCode = req.params.code;

  try {
    const purchase = await Purchase.findOneAndUpdate({
      user: ownerUser,
      _id:purchaseId,
      "tickets_type_sale.code": { $in: purchaseCode } ,
      "tickets_type_sale.scanned": { $ne: purchaseCode } 
     },{$addToSet:{"tickets_type_sale.scanned":purchaseCode}},{new:true}).populate("user")

     if (!purchase) return res.status(404).json({ message: 'Ticket did not found or has already been scanned.' });

    const post = new Purchase({
      user: userId,
      event:purchase.event,
      tickets:1,
      totalPrice:Number(purchase.totalPrice),
      remainig_ticket:1,
      tickets_type_sale:{
        type:purchase.tickets_type_sale.type,
        totalTicket:1,
        price:Number(purchase.tickets_type_sale.price),
        code:ticketCode(),
        scanned:[]
      },
      resel_by:ownerUser
    })

    await Purchase.findOneAndUpdate(
      { _id: purchaseId },
      { $pull: { "tickets_type_sale.code": purchaseCode }, remainig_ticket : Number(purchase.remainig_ticket) - 1 }
    );

    const event = await Post.findById(purchase.event).lean()
    
    if (!event) return res.status(404).json({ message: 'Event not found.' });
    
    const to_User = await User.findById(userId).select("fcmtoken").lean()
 
    await sendNotification({
      user : ownerUser,
      to_id : userId,
      description : `${purchase.user?.name} has transfer 1 ticket of ${event.name} event to you.`,
      type :'transfer',
      title :"Ticket transfer",
      fcmtoken : to_User?.fcmtoken,
      event:purchase.event,
      purchase:post._id
    })
    
    await post.save();
    res.status(201).json({ success: true, message: 'Ticket purchase successfully', ticket:post });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.paymentDone = async (req, res) => {

  try {
    const body={ 
      "live": 0,
      "timestamp": "20240726190607",
      "refnum": "123123123123",
      "jadnumber": "101310573865",
      "amount": "277.99",
      "cardnumber": "4444111122223333",
      "cardexpmonth": "09",
      "cardexpyear": "2045",
      "cardcvv": "123",
      "cardfirstname": "Naee1m",
      "cardlastname": "Junejo",
      "address": "wqewds ",
      "city": "sdssa",
      "state": "KNK",
      "postalcode": "123123",
      "country": "KN",
      "email": "alrandw@gmail.com",
      "phone": ""
    }
     const clientId="0FGR7.1720815360"
     const apiSecret="6EF4CAFCD82E689DECA28EDFDE15ADB35D12BF5982B182E468758A9F8DD072DF"

     const response=await axios.get(`https://jad.cash/HAPI/token?apikey=${clientId}&secret=${apiSecret}&grant_type=credentials`)
     const result=await axios.post("https://jad.cash/HAPI/cardpayment",{
      token:response.data.data.token,
      paydata:body
     },{
      headers:{
        "Content-Type":"application/json"
      }
     })
      res.status(201).json({ success: true, response:result.data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.updatePurchaseScan = async (req, res) => {
  try {
    const ownerUser = req?.user?._id||""
    const userId = req.params.userId;
    const eventId = req.params.eventId;
    const purchaseId = req.params.purchaseId;
    const purchaseCode = req.params.code;

    const event=await Post.findOne({_id:eventId,user:ownerUser})

    if (!event) return res.status(404).json({ message: 'Event not found.' });

    const purchase = await Purchase.findOneAndUpdate({
      user: userId,
      _id:purchaseId,
      "tickets_type_sale.code": { $in: purchaseCode } ,
      "tickets_type_sale.scanned": { $ne: purchaseCode } 
     },{$addToSet:{"tickets_type_sale.scanned":purchaseCode}},{new:true}).populate("ResellTickets").populate("resellpurchases").populate("user").populate({
      path: 'event',
      populate: [
        { path: 'user', model: 'user' },
        { path: 'category', model: 'Category' },
        { path: 'coupon', model: 'Coupon' },
        { path: 'purchase_by', model: 'Purchase',options: { limit: 3 }, populate: [{ path: 'user', model: 'user' },]},
      ]
    });

    if (!purchase) return res.status(404).json({ message: 'Ticket did not found or has already been scanned.' });

    res.status(200).json({ success:true, post: purchase });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getPurchaseTicket = async (req, res) => {
  try {
    const userId = req.params.userId;
    const purchaseId = req.params.purchaseId;
    const purchaseCode = req.params.code;

    const event = await Purchase.findOne({ 
      user: userId,
      _id:purchaseId,
      "tickets_type_sale.code": { $in: purchaseCode } ,
      "tickets_type_sale.scanned": { $ne: purchaseCode } 
     }).populate("ResellTickets").populate("resellpurchases").populate("user").populate({
      path: 'event',
      populate: [
        { path: 'user', model: 'user' },
        { path: 'category', model: 'Category' },
        { path: 'coupon', model: 'Coupon' },
        { path: 'purchase_by', model: 'Purchase',options: { limit: 3 }, populate: [{ path: 'user', model: 'user' },]},
      ]
    });

    if (!event) return res.status(404).json({ message: 'Ticket did not found or has already been scanned.' });

    if (event.resellticket >= event.tickets) return res.status(404).json({ message: "You have resell all of your tickets already." });
    
    res.status(200).json({ success:true, post: event });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};



exports.getPurchase = async (req, res) => {
  const userId = req.user._id
  const lastId = parseInt(req.params.id)||1;

    // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }
  let query={};

  const pageSize = 10;
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;
  query.user = userId;

  query.remainig_ticket={ $gt: 0 }
  try {
    const likedJobs = await Purchase.find(query).populate({
      path: 'event',
      populate: [
        { path: 'user', model: 'user' },
        { path: 'category', model: 'Category' },
        { path: 'likes', model: 'Like' },
        { path: 'coupon', model: 'Coupon' },
        { path: 'purchase_by', model: 'Purchase',options: { limit: 3 }, populate: [{ path: 'user', model: 'user' },]},
      ]
    }).populate("ResellTickets").populate("resellpurchases").sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

      const totalCount = await Purchase.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);
    

    if (likedJobs.length > 0) {
      for (let purchase of likedJobs) {
        purchase.event.TotalLikes=purchase.event.likes?.length
        purchase.event.likes=userId? Array.isArray(purchase.event.likes) && purchase.event.likes.some(like => like.user.toString() === userId.toString()):false
      }
      res.status(200).json({ success: true, posts: likedJobs,count: { totalPage: totalPages, currentPageSize: likedJobs.length }  });
    } else {
      res.status(200).json({ success: false, message: 'No more purchase events found',posts:[] ,count: { totalPage: totalPages, currentPageSize: likedJobs.length } });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};
exports.eventsPurchases = async (req, res) => {
  const event = req.params.eventId
  const lastId = parseInt(req.params.id)||1;

    // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }
  let query={};

  const pageSize = 10;
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;
  query.event = event;
  if (req.params.status!=="all") {
    query.scanner = Boolean(req.params.status)
  }
  query.remainig_ticket={ $gt: 0 }
  query.resel_by = { $exists: false }

  try {
    const likedJobs = await Purchase.find(query).populate({
      path: 'event',
      populate: [
        { path: 'user', model: 'user' },
        { path: 'category', model: 'Category' },
        { path: 'coupon', model: 'Coupon' },
        { path: 'purchase_by', model: 'Purchase',options: { limit: 3 }, populate: [{ path: 'user', model: 'user' },]},
      ]
    }).populate("user").populate("ResellTickets").populate("resellpurchases").sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

      const totalCount = await Purchase.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);
    if (likedJobs.length > 0) {
      res.status(200).json({ success: true, purchases: likedJobs,count: { totalPage: totalPages, currentPageSize: likedJobs.length }  });
    } else {
      res.status(200).json({ success: false, message: 'No more purchase purchases found',purchases:[] ,count: { totalPage: totalPages, currentPageSize: likedJobs.length } });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getMyPurchases = async (req, res) => {
  const userId = req.user._id
  const lastId = parseInt(req.params.id)||1;

    // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }

  const pageSize = 10;
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;

  const events = await Post.find({user:userId,status:"active"}).select("status")

  const totalEvents=events.map(item=>item._id)

  try {
    const likedJobs = await Purchase.find({ event:{$in:totalEvents}, resel_by: { $exists: false }, remainig_ticket: { $gt: 0 } }).populate({
      path: 'event',
      populate: [
        { path: 'user', model: 'user' },
        { path: 'category', model: 'Category' },
        { path: 'coupon', model: 'Coupon' },
        { path: 'purchase_by', model: 'Purchase',options: { limit: 3 }, populate: [{ path: 'user', model: 'user' },]},
      ]
    }).populate("user").populate("ResellTickets").populate("resellpurchases").sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

      const totalCount = await Purchase.countDocuments({event:{$in:totalEvents},resel_by: { $exists: false }});
      const totalPages = Math.ceil(totalCount / pageSize);
    if (likedJobs.length > 0) {
      res.status(200).json({ success: true, purchases: likedJobs,count: { totalPage: totalPages, currentPageSize: likedJobs.length }  });
    } else {
      res.status(200).json({ success: false, message: 'No more purchase purchases found',purchases:[] ,count: { totalPage: totalPages, currentPageSize: likedJobs.length } });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};