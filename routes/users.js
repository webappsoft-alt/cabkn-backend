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
  phoneApiBodyValidate,
} = require("../models/user");
const express = require("express");
const passwordauth = require("../middleware/passwordauth");
const router = express.Router();
const { TempUser } = require("../models/TempUser");
const admin = require("../middleware/admin");
const moment = require('moment');
const firebaseadmin = require("firebase-admin");
const like = require("../models/like");

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password").lean();
  res.send({ success: true, user: user });
});

router.post("/forget-password", async (req, res) => {
  const { error } = phoneApiBodyValidate(req.body);

  if (error) return res.status(400).send({ message: error.details[0].message });

  const { phone } = req.body;

  const user = await User.findOne({ phone: phone });

  if (!user)
    return res
      .status(400)
      .send({
        message: "User is not registered with that Phone number",
      });

  if (user.status == "deleted")
    return res
      .status(400)
      .send({
        message: "User has been deleted. Contact admin for further support.",
      });

  // let verificationCode = generateCode();
  let verificationCode = 1234;

  // await sendEmail(email, verificationCode);
  await User.findOneAndUpdate(
    { phone: phone },
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
  const { error } = phoneApiBodyValidate(req.body);
  if (error)
    return res
      .status(400)
      .send({ success: false, message: error.details[0].message });

  const { phone } = req.body;

  try {
    const existingUser = await User.findOne({ phone: phone });

    if (existingUser) {
      return res.status(400).json({ message: "Phone already registered" });
    }

    // const verificationCode = generateCode();
    const verificationCode = 1234;
    // await sendEmail(email, verificationCode);

    const existingTempUser = await TempUser.findOne({ phone: phone });
    if (existingTempUser) {
      await TempUser.findByIdAndUpdate(existingTempUser._id, {
        code: verificationCode,
      });
    } else {
      const tempVerification = new TempUser({
        phone: phone,
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
    const { phone, code } = req.body;

    const verificationRecord = await TempUser.findOne({
      phone: phone,
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

    const validTypes = ['customer',"rider"];

    if (!validTypes.includes(type)) return res.status(400).send({ success: false, message: "Invalid type" });

    const { name, password, email, fcmtoken,code,dob,phone,gender,referral,image,docs,insurancetype,ride_type } = req.body;

    const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

    const verificationRecord = await TempUser.findOne({
      phone: phone,
    });

    if (!verificationRecord || Number(verificationRecord.code) !== Number(code)) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect verification code" });
    }

    const user = await User.findOne({ email: lowerCaseEmail });

    if (user) return res.status(400).send({ success: false, message: "Email already registered" });

    const phoneuser = await User.findOne({ phone: phone });

    if (phoneuser) return res.status(400).send({ success: false, message: "Phone already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      password: hashedPassword,
      name,
      email: lowerCaseEmail,
      fcmtoken,
      type: type,
      dob:dob||"",
      phone,
      gender:gender||"",
      referral:referral||"",
      image:image||"",
      docs:docs||[],
      insurancetype:insurancetype||"",
      ride_type:ride_type||"ride"
    });

    await newUser.save();
    await TempUser.deleteOne({ phone: phone });

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

router.post("/check-phone", async (req, res) => {
  const { phone } = req.body;

  const user = await User.findOne({ phone: phone });
  if (user)
    return res
      .status(400)
      .send({ success: false, message: "Phone already existed" });

  res.send({ success: true, message: "Phone doesn't existed" });
});

router.put("/update-user", auth, async (req, res) => {
  const {
    name,image,interests,location,address,dob,gender,referral,fcmtoken
  } = req.body;

  // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
    Object.entries({
      name,image,interests,location,address,dob,gender,referral,fcmtoken
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

router.post('/like/:userId', auth,  async (req, res) => {
  try {
    const otherUser = req.params.userId;
    const userId = req.user._id;

    const existingLike = await like.findOne({ user: userId, otherUser: otherUser });

    if (existingLike) {
      return await dislike(otherUser, res, userId);
    }
    const likePost = new like({
      user: userId,
      otherUser: otherUser
    });


    const updatedPost = await User.findByIdAndUpdate(
      userId,
      { $push: { likes: likePost._id } },
      { new: true }
    ).populate("user")

    if (!updatedPost) {
      return res.status(404).json({ message: 'User not found' });
    }

    await likePost.save()

    res.status(200).json({ message: 'Like added successfully', user: updatedPost });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});

const dislike = async (otherUser, res, userId) => {
  try {

    const deletedLike = await like.findOneAndDelete({ otherUser: otherUser,user: userId, });

    if (!deletedLike) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const updatedPost = await User.findByIdAndUpdate(
      userId,
      { $pull: { likes: deletedLike._id } },
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Like deleted successfully', user: updatedPost });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


router.post('/favorite/:id', [auth, admin], async (req, res) => {
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
    const likedJobs = await like.find(query).populate("otherUser").sort({ _id: -1 }).skip(skip).limit(pageSize).lean();

      const totalCount = await like.countDocuments(query);
      const totalPages = Math.ceil(totalCount / pageSize);
    

    const jobs = likedJobs.map((like) => like.otherUser);
    if (jobs.length > 0) {
      const UpdateFav = jobs.map(order => {
        return {
          ...order,       // Spread operator to copy existing properties
          likes: true // Adding new key with a value
        };
      });
      res.status(200).json({ success: true, users: UpdateFav,count: { totalPage: totalPages, currentPageSize: jobs.length }  });
    } else {
      res.status(200).json({ success: false, message: 'No more favorite users found',users:[] ,count: { totalPage: totalPages, currentPageSize: jobs.length } });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
});



module.exports = router;
