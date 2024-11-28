const auth = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const _ = require("lodash");
const {
  User,
  validate,
  generateAuthToken,
  passwordApiBodyValidate,
  generateIdToken,
  emailApiBodyValidate,
} = require("../models/user");
const express = require("express");
const { sendEmail } = require("../controllers/emailservice");
const passwordauth = require("../middleware/passwordauth");
const { generateCode } = require("../controllers/generateCode");
const router = express.Router();
const { TempUser } = require("../models/TempUser");
const admin = require("../middleware/admin");
const Event = require("../models/Event");
const Purchase = require("../models/Purchase");
const { sendNotification } = require("../controllers/notificationCreateService");
const moment = require('moment');
const firebaseadmin = require("firebase-admin");

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password").populate("interests").lean();
  res.send({ success: true, user: user });
});

router.post("/forget-password", async (req, res) => {
  const { error } = emailApiBodyValidate(req.body);

  if (error) return res.status(400).send({ message: error.details[0].message });

  const { email } = req.body;
  const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

  const user = await User.findOne({ email: lowerCaseEmail });

  if (!user)
    return res
      .status(400)
      .send({
        message: "User is not registered with that Phone number or email",
      });

  if (user.status == "deleted")
    return res
      .status(400)
      .send({
        message: "User has been deleted. Contact admin for further support.",
      });

  let verificationCode = generateCode();

  await sendEmail(email, verificationCode);
  await User.findOneAndUpdate(
    { email: lowerCaseEmail },
    { code: verificationCode }
  );

  const token = generateIdToken(user._id);

  res.send({
    success: true,
    message: "Verification code sent successfully",
    token,
    verificationCode,
  });
});

router.put("/update-password", passwordauth, async (req, res) => {
  const { error } = passwordApiBodyValidate(req.body);
  if (error)
    return res
      .status(400)
      .send({ success: false, message: error.details[0].message });

  const { password,code } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res
      .status(400)
      .send({
        success: false,
        message: "The User with the given ID was not found.",
      });

  if (Number(user.code) !== Number(code)) return res.status(400).send({ success: false, message: "Incorrect code." });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  user.password = hashedPassword;

  await user.save();

  res.send({ success: true, message: "Password updated successfully" });
});

router.put("/change-password", auth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res
      .status(400)
      .send({
        success: false,
        message: "The User with the given ID was not found.",
      });

  const validPassword = await bcrypt.compare(oldPassword, user.password);
  if (!validPassword)
    return res
      .status(400)
      .send({ success: false, message: "Your old password is incorrect." });

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.password = hashedPassword;

  await user.save();

  res.send({ success: true, message: "Password updated successfully" });
});

router.post("/send-code", async (req, res) => {
  const { error } = emailApiBodyValidate(req.body);
  if (error)
    return res
      .status(400)
      .send({ success: false, message: error.details[0].message });

  const { email } = req.body;
  const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

  try {
    const existingUser = await User.findOne({ email: lowerCaseEmail });

    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const verificationCode = generateCode();
    await sendEmail(email, verificationCode);

    const existingTempUser = await TempUser.findOne({ email: lowerCaseEmail });
    if (existingTempUser) {
      await TempUser.findByIdAndUpdate(existingTempUser._id, {
        code: verificationCode,
      });
    } else {
      const tempVerification = new TempUser({
        email: lowerCaseEmail,
        code: verificationCode,
      });
      await tempVerification.save();
    }
    return res.json({
      message: "Verification code sent successfully",
      verificationCode,
    });
  } catch (error) {
    console.error("Error sending verification code:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verify-otp/registration", async (req, res) => {
  try {
    const { email, code } = req.body;

    const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

    const verificationRecord = await TempUser.findOne({
      email: lowerCaseEmail,
    });

    if (!verificationRecord || Number(verificationRecord.code) !== Number(code)) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect verification code" });
    }

    return res.json({
      success: true,
      message: "Verification code match successfully",
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/signup/:type", async (req, res) => {
  try {
    const { error } = validate(req.body);
    if (error) return res.status(400).send({ success: false, message: error.details[0].message });

    const { type } = req.params;

    const validTypes = ['customer','owner'];

    if (!validTypes.includes(type)) return res.status(400).send({ success: false, message: "Invalid type" });

    const { name, password, email, fcmtoken,code } = req.body;

    const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

    const verificationRecord = await TempUser.findOne({
      email: lowerCaseEmail,
    });

    if (!verificationRecord || Number(verificationRecord.code) !== Number(code)) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect verification code" });
    }

    const user = await User.findOne({ email: lowerCaseEmail });

    if (user)
      return res
        .status(400)
        .send({ success: false, message: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      password: hashedPassword,
      name,
      email: lowerCaseEmail,
      fcmtoken,
      type: type
    });

    await newUser.save();
    await TempUser.deleteOne({ email: lowerCaseEmail });

    const token = generateAuthToken(newUser._id, newUser.type);

    res.send({
      success: true,
      message: "Account created successfully",
      token: token,
      user: newUser,
    });
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verify-otp/forget-password", passwordauth, async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.user._id);

    if (!user)
      return res
        .status(400)
        .send({
          success: false,
          message: "The User with the given ID was not found.",
        });

    if (Number(user.code) !== Number(code))
      return res
        .status(400)
        .send({ success: false, message: "Incorrect code." });

    return res.json({
      success: true,
      message: "Verification code match successfully",
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/check-email", async (req, res) => {
  const { error } = emailApiBodyValidate(req.body);
  if (error)
    return res
      .status(400)
      .send({ success: false, message: error.details[0].message });

  const { email } = req.body;
  const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

  const user = await User.findOne({ email: lowerCaseEmail });
  if (user)
    return res
      .status(400)
      .send({ success: false, message: "Email already existed" });

  res.send({ success: true, message: "Email doesn't existed" });
});

router.post("/conversion", async (req, res) => {

  const {amount}=req.body

  res.send({ success: true, convertedAmount:Number(amount)*0.37 });
});

router.put("/update-user", auth, async (req, res) => {
  const {
    name,image,interests,location,address
  } = req.body;

  // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
    Object.entries({
      name,image,interests,location,address
    }).filter(([key, value]) => value !== undefined)
  );

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    return res
      .status(400)
      .send({
        success: false,
        message: "No valid fields provided for update.",
      });
  }
  const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
  });

  if (!user)
    return res
      .status(400)
      .send({
        success: false,
        message: "The User with the given ID was not found.",
      });

  res.send({ success: true, message: "User updated successfully", user });
});

router.delete("/", auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { status: "deleted" },
    { new: true }
  );

  if (!user)
    return res
      .status(400)
      .send({
        success: false,
        message: "The User with the given ID was not found.",
      });

  res.send({ success: true, message: "User deleted successfully", user });
});

router.delete("/:id",[auth,admin], async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "deleted" },
    { new: true }
  );

  if (!user)
    return res
      .status(400)
      .send({
        success: false,
        message: "The User with the given ID was not found.",
      });

  res.send({ success: true, message: "User deleted successfully", user });
});

router.get('/admin/:type/:id',[auth,admin], async (req, res) => {
  const lastId = parseInt(req.params.id)||1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }

  let query={}

  if (req.params.type!=='all') {
    query.type=req.params.type;
  }

  const pageSize = 10;

  const skip = Math.max(0, (lastId - 1)) * pageSize;

  const users = await User.find(query).sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

  const totalCount = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCount / pageSize);

  res.send({ success: true, users: users,count: { totalPage: totalPages, currentPageSize: users.length } });
});

router.get('/search/:id/:search?', auth , async (req, res) => {
  const lastId = parseInt(req.params.id)||1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }

  let query={}

  query.type="customer";
  query._id={ $ne : req.user._id }

  if (req.params.search) {
    const searchQuery=req.params.search
    query.$or = [
      { name: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search
      { email: { $regex: searchQuery, $options: 'i' } }, // Case-insensitive search
    ];
  }

  const pageSize = 10;

  const skip = Math.max(0, (lastId - 1)) * pageSize;

  const users = await User.find(query).sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

  const totalCount = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCount / pageSize);

  res.send({ success: true, users: users,count: { totalPage: totalPages, currentPageSize: users.length } });
});

function findDateIndex(createdAt,dates) {
  for (let i = 0; i < dates.length - 1; i++) {
    if (moment(createdAt).isBetween(dates[i], dates[i + 1], null, '[)')) {
      return i + 1; // Increment y value of the next date
    }
  }
  // If the date is after the last date in the array
  if (moment(createdAt).isSameOrAfter(dates[dates.length - 1])) {
    return dates.length - 1;
  }
  return -1;
}


router.get('/dashboard',[auth, admin],async (req, res) => {
  const totalUsers = await User.countDocuments({type:"customer"});

   // Get users registered yesterday
   const today = new Date();
   const yesterday = new Date(today);
   yesterday.setDate(today.getDate() - 1);
   const yesterdayUsers = await User.countDocuments({
    createdAt: { $gte: yesterday, $lt: today },
       type:"customer"
   });
   // Get the number of users until yesterday
   const totalUsersYesterday = totalUsers - yesterdayUsers;
   // Calculate growth percentage
   let growth = 0;
   if (totalUsersYesterday > 0) {
       growth = ((totalUsers - totalUsersYesterday) / totalUsersYesterday) * 100;
   }

  const totalownerUsers = await User.countDocuments({type:"owner"});

   const yesterdayownerUsers = await User.countDocuments({
    createdAt: { $gte: yesterday, $lt: today },
       type:"owner"
   });
   // Get the number of users until yesterday
   const totalownerUsersYesterday = totalownerUsers - yesterdayownerUsers;
   // Calculate growth percentage
   let growthowner = 0;
   if (totalownerUsersYesterday > 0) {
      growthowner = ((totalownerUsers - totalownerUsersYesterday) / totalownerUsersYesterday) * 100;
   }


   const totalOrder = await Event.countDocuments({status:"active"});

   const yesterdayOrder = await Event.countDocuments({
    createdAt: { $gte: yesterday, $lt: today },
    status:"active"
   });
   // Get the number of users until yesterday
   const totalOrderYesterday = totalOrder - yesterdayOrder;
   // Calculate growth percentage
   let growthOrder = 0;
   if (totalOrderYesterday > 0) {
      growthOrder = ((totalOrder - totalOrderYesterday) / totalOrderYesterday) * 100;
   }

   const purchases = await Purchase.find({resel_by: { $exists: false },}).select("totalPrice createdAt").sort({ _id: -1 }).lean();
   const totalPurchase = await Purchase.find({resel_by: { $exists: true },}).select("totalPrice createdAt").sort({ _id: -1 }).lean();
 
 
   const totalPayments=purchases.reduce((a,b)=>a + Number(b.totalPrice),0)
   const totalOtherPayments=totalPurchase.reduce((a,b)=>a + Number(b.totalPrice),0)
 
   const eightPerc=Number(totalPayments) * 0.08
  //  const twoPerc=Number(totalPayments) * 0.02
   const twentPerc=Number(totalOtherPayments) * 0.20
   const eightResel=Number(totalOtherPayments) * 0.08

   const now = new Date();
   let dates = [];
   for (let i = 0; i < 12; i++) {
    let date = new Date(now);
    date.setMonth(now.getMonth() - i);
    dates.unshift(date.toISOString());
  }
  const startDate = moment().startOf('year');
  const todayEnd = moment().endOf('day');
 
  const orders = await Purchase.find({createdAt: { $gte: startDate, $lte: todayEnd }}).select("totalPrice createdAt resel_by").lean()
 
   // Initialize the graph array
   let graph = dates.map(date => ({ x: date, earnings:0 }));
  
   // Increment the y value for the correct date ranges
   orders.forEach(order => {
     const index = findDateIndex(order.createdAt,dates);
     if (index !== -1 && index < graph.length) {
       let earnings=0
       if (order.resel_by==undefined) {
        earnings=Number(order.totalPrice) * 0.10
      }else{
        earnings=Number(order.totalPrice) * 0.28
      }
      graph[index].earnings = graph[index].earnings+earnings;
     }
   });
 
   let newGraph = graph.map(obj => {
     return { ["x"]: moment(obj.x).format('MMM'), ["y"]: obj.earnings};
   });
 
  
  res.send({ success: true, 
    totalEarnings:eightPerc+twentPerc+eightResel,
    totalPayments:totalPayments,
    graph:newGraph,
    rentee:{
      totalUsers,
      growth: growth.toFixed(2),
      status: growth >= 0 ? 'positive' : 'negative'
    },
    owner:{
      totalUsers:totalownerUsers,
      growth: growthowner.toFixed(2),
      status: growthowner >= 0 ? 'positive' : 'negative'
    },
    events:{
      totalEvents:totalOrder,
      growth: growthOrder.toFixed(2),
      status: growthOrder >= 0 ? 'positive' : 'negative'
    },
   });
});

router.get('/owner-dashboard',auth, async (req, res) => {
  const userId=req.user._id
  const totalActiveEvents = await Event.countDocuments({user:userId,status:"active"});

  const events = await Event.find({user:userId,status:"active"}).select("status")

  const totalEvents=events.map(item=>item._id)

   // Get users registered yesterday
   const today = new Date();
   const yesterday = new Date(today);
   yesterday.setDate(today.getDate() - 1);

   const yesterdayActiveEvents = await Event.countDocuments({
    createdAt: { $gte: yesterday, $lt: today },
    user:userId,status:"active"
   });

   const totalActiveEventsYesterday = totalActiveEvents - yesterdayActiveEvents;
   // Calculate growth percentage
   let growth = 0;
   if (totalActiveEventsYesterday > 0) {
       growth = ((totalActiveEvents - totalActiveEventsYesterday) / totalActiveEventsYesterday) * 100;
   }



  const totalPurchases = await Purchase.find({event:{$in:totalEvents},resel_by: { $exists: false }}).select("ownerPrice");

   const yesterdayPurchases = await Purchase.find({
    createdAt: { $gte: yesterday, $lt: today },
    event:{$in:totalEvents},
    resel_by: { $exists: false }
   }).select("ownerPrice")
   // Get the number of users until yesterday
   const totalPurchasesYesterday = totalPurchases.length - yesterdayPurchases.length;
   // Calculate growth percentage
   let growthowner = 0;
   if (totalPurchasesYesterday > 0) {
      growthowner = ((totalPurchases.length - totalPurchasesYesterday) / totalPurchasesYesterday) * 100;
   }

   const toalEarnings=totalPurchases.reduce((a,b)=>a+Number(b.ownerPrice),0)
   // Get the number of users until yesterday
   const totalEarningsYesterday = toalEarnings - yesterdayPurchases.reduce((a,b)=>a+Number(b.ownerPrice),0);
   // Calculate growth percentage
   let growthEarnings = 0;
   if (totalPurchasesYesterday > 0) {
     growthEarnings = ((toalEarnings - totalEarningsYesterday) / totalEarningsYesterday) * 100;
   }


   const totalUpcomingEvents = await Event.countDocuments({user:userId,status:"active"});

   const yesterdayUpcomingEvents = await Event.countDocuments({
    createdAt: { $gte: yesterday, $lt: today },
    user:userId,status:"active"
   });

   const totalUpcomingEventsYesterday = totalUpcomingEvents - yesterdayUpcomingEvents;
   // Calculate growth percentage
   let growthUpcoming = 0;
   if (totalUpcomingEventsYesterday > 0) {
    growthUpcoming = ((totalUpcomingEvents - totalUpcomingEventsYesterday) / totalUpcomingEventsYesterday) * 100;
   }

  res.send({ success: true, 
    events:{
      total:totalActiveEvents,
      growth: growth.toFixed(2),
      status: growth >= 0 ? 'positive' : 'negative'
    },
    purchase:{
      total:totalPurchases.length,
      growth: growthowner.toFixed(2),
      status: growthowner >= 0 ? 'positive' : 'negative'
    },
    earnings:{
      total:toalEarnings,
      growth: growthEarnings.toFixed(2),
      status: growthEarnings >= 0 ? 'positive' : 'negative'
    },

    upcomingevents:{
      total:totalUpcomingEvents,
      growth: growthUpcoming.toFixed(2),
      status: growthUpcoming >= 0 ? 'positive' : 'negative'
    },
   });
});

router.post('/send-notifications/:type', [auth, admin], async (req, res) => {

  const {type}=req.params;
  const validTypes=["all","customer", "owner"]
  if (!validTypes.includes(type)) {
    return res.status(404).send({ success: false, message: 'User Type is not valid' });
  }
  const { title, description } = req.body;

  const users = await User.find({type:type,status:"online"}).select("fcmtoken").lean()
  const fcmTokens = [...new Set(users.map(item => item.fcmtoken).filter(item=>item!==undefined||item!==""))];
  if (fcmTokens.length > 0) {
    // Create an array of message objects for each token
    const messages = fcmTokens.map(token => ({
      token: token,
      notification: {
          title: title,
          body: description,
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
      await firebaseadmin.messaging().sendEach(messages)
    } catch (error) {}
  }

  res.send({ success: true, message: 'notification sent successfully', });
});


module.exports = router;
