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
const moment = require("moment");
const firebaseadmin = require("firebase-admin");
const like = require("../models/like");
const Address = require("../models/Address");
const Faqs = require("../models/Faqs");
const Vehicle = require("../models/Vehicle");
const Order = require("../models/Order");
const Liabilties = require("../models/Liabilties");
const PriceKm = require("../models/PriceKm");
const Privacy = require("../models/Privacy");
const Terms = require("../models/Terms");
const Invites = require("../models/Invites");
const {
  generateRandomString,
  generateCode,
  convertLabels,
} = require("../controllers/generateCode");
const {
  sendNotification,
} = require("../controllers/notificationCreateService");
const Transaction = require("../models/Transaction");
const LoyalityPoint = require("../models/LoyalityPoint");
const Notification = require("../models/Notification");
const { sendEmail } = require("../controllers/emailservice");
const Footer = require("../models/Footer");
const WebSubCategories = require("../models/WebSubCategories");
const { Worker } = require("worker_threads");
const jobQueue = require("./jobQueue");

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password").lean();
  res.send({ success: true, user: user });
});

router.post("/forget-password", async (req, res) => {
  const { error } = emailApiBodyValidate(req.body);

  if (error) return res.status(400).send({ message: error.details[0].message });

  const { email, type } = req.body;

  const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

  const user = await User.findOne({ email: lowerCaseEmail, type: type });

  if (!user)
    return res.status(400).send({
      message: "User is not registered with that email",
    });

  if (user.status == "deleted")
    return res.status(400).send({
      message: "User has been deleted. Contact admin for further support.",
    });

  const verificationCode = generateCode();

  await sendEmail(email, verificationCode);
  await User.findOneAndUpdate(
    { email: lowerCaseEmail, type: type },
    { code: verificationCode }
  );

  const token = generateIdToken(user._id);

  res.send({
    success: true,
    message: "Verification code sent successfully",
    token,
  });
});

router.put("/update-password", passwordauth, async (req, res) => {
  const { error } = passwordApiBodyValidate(req.body);
  if (error)
    return res
      .status(400)
      .send({ success: false, message: error.details[0].message });

  const { password, code } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  if (Number(user.code) !== Number(code))
    return res.status(400).send({ success: false, message: "Incorrect code." });

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
    return res.status(400).send({
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

  const { email, type } = req.body;

  const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

  try {
    const existingUser = await User.findOne({ email: lowerCaseEmail, type });

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
    });
  } catch (error) {
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

    if (
      !verificationRecord ||
      Number(verificationRecord.code) !== Number(code)
    ) {
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
    if (error)
      return res
        .status(400)
        .send({ success: false, message: error.details[0].message });

    const { type } = req.params;

    const validTypes = ["customer", "rider"];

    if (!validTypes.includes(type))
      return res.status(400).send({ success: false, message: "Invalid type" });

    const {
      name,
      password,
      email,
      fcmtoken,
      code,
      dob,
      phone,
      gender,
      referral,
      image,
      docs,
      insurancetype,
      ride_type,
      address,
      lat,
      lng,
      police_record,
      insurance,
      account_info,
    } = req.body;

    const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

    const verificationRecord = await TempUser.findOne({
      email: lowerCaseEmail,
    });

    if (
      !verificationRecord ||
      Number(verificationRecord.code) !== Number(code)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Incorrect verification code" });
    }

    const user = await User.findOne({ email: lowerCaseEmail, type: type });

    if (user)
      return res
        .status(400)
        .send({ success: false, message: "Email already registered" });

    const phoneuser = await User.findOne({ phone: phone });

    if (phoneuser)
      return res
        .status(400)
        .send({ success: false, message: "Phone already registered" });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      password: hashedPassword,
      name,
      email: lowerCaseEmail,
      fcmtoken,
      type: type,
      dob: dob || "",
      phone,
      gender: gender || "",
      image: image || "",
      docs: docs || [],
      insurancetype: insurancetype || "",
      ride_type: ride_type || "ride",
      address: address || "",
      referral_code: generateRandomString(10),
      police_record: police_record || "",
      insurance: insurance || "",
    });

    if (lat && lng) {
      newUser.location = {
        type: "Point",
        coordinates: [Number(lng), Number(lat)],
      };
    }

    if (account_info) {
      newUser.account_info = account_info;
    }

    await newUser.save();
    await TempUser.deleteOne({ phone: phone });

    let updateUser = newUser;
    if (referral) {
      const findRefferal = await User.findOne({ referral_code: referral });
      if (findRefferal) {
        updateUser = await User.findByIdAndUpdate(
          newUser._id,
          { amount: 10 },
          { new: true }
        ).lean();

        await sendNotification({
          user: findRefferal._id.toString(),
          to_id: newUser._id.toString(),
          description: `You've earned $20 for a successfully using a referral code! Thank you!`,
          type: "referral",
          title: "Congratulations! You've Earned $20",
          fcmtoken: fcmtoken || "",
          usertype: newUser.type,
        });

        const logintransaction = new Transaction({
          user: newUser._id,
          amount: 20,
          type: "refferal",
        });

        await logintransaction.save();

        await sendNotification({
          user: newUser._id,
          to_id: findRefferal._id.toString(),
          description: `You've earned $20 for a successful referral! Thank you!`,
          type: "referral",
          title: "Congratulations! You've Earned $20",
          fcmtoken: findRefferal.fcmtoken,
          usertype: findRefferal.type,
        });

        const transaction = new Transaction({
          user: findRefferal._id,
          amount: 20,
          type: "refferal",
        });

        await transaction.save();

        findRefferal.amount = Number(findRefferal.amount) + 20;
        await findRefferal.save();
      }
    }

    const token = generateAuthToken(newUser._id, newUser.type);

    res.send({
      success: true,
      message: "Account created successfully",
      token: token,
      user: updateUser,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/verify-otp/forget-password", passwordauth, async (req, res) => {
  try {
    const { code } = req.body;

    const user = await User.findById(req.user._id);

    if (!user)
      return res.status(400).send({
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

  const { email, type } = req.body;
  const lowerCaseEmail = String(email).trim().toLocaleLowerCase();

  const user = await User.findOne({ email: lowerCaseEmail, type: type });
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
    name,
    image,
    interests,
    location,
    address,
    dob,
    gender,
    referral,
    fcmtoken,
    status,
    docs,
    phone,
    police_record,
    insurance,
    account_info,
    homeAddress,
  } = req.body;

  // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
    Object.entries({
      name,
      image,
      interests,
      location,
      address,
      dob,
      gender,
      referral,
      fcmtoken,
      status,
      docs,
      phone,
      police_record,
      insurance,
      account_info,
      homeAddress,
    }).filter(([key, value]) => value !== undefined)
  );

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).send({
      success: false,
      message: "No valid fields provided for update.",
    });
  }

  if (phone) {
    const phoneuser = await User.findOne({ phone: phone });

    if (phoneuser)
      return res
        .status(400)
        .send({ success: false, message: "Phone already existed" });
  }
  const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
  });

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  res.send({ success: true, message: "User updated successfully", user });
});

router.put("/add-amount", auth, async (req, res) => {
  const { amount, refId } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });
  const multiplyAmount = Number(amount) * 2.7;
  user.amount = Number(user.amount) + multiplyAmount;
  await user.save();

  const transaction = new Transaction({
    user: req.user._id,
    amount,
    refId,
    type: "deposit",
  });

  await transaction.save();

  res.send({
    success: true,
    message: "User payment added successfully",
    user,
    transaction,
  });
});

router.put("/convert-point", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user)
      return res.status(400).send({
        success: false,
        message: "The User with the given ID was not found.",
      });

    if (Number(user.points) < 10)
      return res.status(400).send({
        success: false,
        message:
          "The User doesn't have any suitable points to convert this into amount.",
      });

    const addresses = await LoyalityPoint.findOne({}).lean();

    user.amount =
      Number(user.amount) +
      Number(Number(user.points) / addresses.convert_rate_per_xcd);
    user.points = 0;
    await user.save();

    const transaction = new Transaction({
      user: req.user._id,
      amount:
        Number(user.amount) +
        Number(Number(user.points) / addresses?.convert_rate_per_xcd),
      type: "deposit-points",
    });

    await transaction.save();

    res.send({
      success: true,
      message: "Points have been converted successfully",
      user,
      transaction,
    });
  } catch (error) {
    res.status(500).send({ success: true, message: "Internal server error" });
  }
});

router.put("/order-wallet-payment", auth, async (req, res) => {
  const { amount } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  if (Number(user.amount) < Number(amount))
    return res.status(400).send({
      success: false,
      message:
        "You don't have enough amount in wallet. Please add amount in your wallet to complete your booking.",
      user,
    });

  user.amount = Number(user.amount) - Number(amount);
  await user.save();

  const transaction = new Transaction({
    user: req.user._id,
    amount,
    type: "purchase",
  });

  await transaction.save();

  res.send({
    success: true,
    message: "User payed successfully",
    user,
    transaction,
  });
});

router.put("/add-admin-wallet-payment", [auth, admin], async (req, res) => {
  const { amount, otherId, reason } = req.body;

  const user = await User.findById(otherId);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  user.amount = Number(user.amount) + Number(amount);
  await user.save();

  const transaction = new Transaction({
    user: otherId,
    amount,
    type: "admin-deposit",
    reason: reason || "",
  });

  await transaction.save();

  const io = req.app.get("socketio");
  io.to(user._id.toString()).emit("user_update", { success: true, user: user });

  res.send({
    success: true,
    message: "You have deposited amount successfully",
    user,
    transaction,
  });
});

router.put(
  "/withdrawl-admin-wallet-payment",
  [auth, admin],
  async (req, res) => {
    const { amount, otherId, reason } = req.body;

    const user = await User.findById(otherId);

    if (!user)
      return res.status(400).send({
        success: false,
        message: "The User with the given ID was not found.",
      });

    if (Number(user.amount) < Number(amount))
      return res.status(400).send({
        success: false,
        message: "User don't have enough amount in wallet.",
        user,
      });

    user.amount = Number(user.amount) - Number(amount);
    await user.save();

    const transaction = new Transaction({
      user: otherId,
      amount,
      type: "admin-withdrawl",
      reason: reason || "",
    });

    await transaction.save();

    const io = req.app.get("socketio");
    io.to(user._id.toString()).emit("user_update", {
      success: true,
      user: user,
    });

    res.send({
      success: true,
      message: "You have withdrawl amount successfully",
      user,
      transaction,
    });
  }
);

router.put("/order-card-payment", auth, async (req, res) => {
  const { amount, refId } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  const transaction = new Transaction({
    user: req.user._id,
    amount,
    type: "purchase",
    refId,
  });

  await transaction.save();

  res.send({ success: true, message: "User payed successfully", transaction });
});

router.put("/listing-wallet-payment", auth, async (req, res) => {
  const { amount } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  if (Number(user.amount) < Number(amount))
    return res.status(400).send({
      success: false,
      message:
        "You don't have enough amount in wallet. Please add amount in your wallet to complete your listing.",
      user,
    });

  user.amount = Number(user.amount) - Number(amount);
  await user.save();

  const transaction = new Transaction({
    user: req.user._id,
    amount,
    type: "listing",
  });

  await transaction.save();

  res.send({
    success: true,
    message: "User payed successfully",
    user,
    transaction,
  });
});

router.put("/listing-card-payment", auth, async (req, res) => {
  const { amount, refId } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  const transaction = new Transaction({
    user: req.user._id,
    amount,
    type: "listing",
    refId,
  });

  await transaction.save();

  res.send({ success: true, message: "User payed successfully", transaction });
});
router.put("/tip-wallet-payment", auth, async (req, res) => {
  const { amount } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  if (Number(user.amount) < Number(amount))
    return res.status(400).send({
      success: false,
      message:
        "You don't have enough amount in wallet. Please add amount in your wallet to complete your listing.",
      user,
    });

  user.amount = Number(user.amount) - Number(amount);
  await user.save();

  const transaction = new Transaction({
    user: req.user._id,
    amount,
    type: "tip",
  });

  await transaction.save();

  res.send({
    success: true,
    message: "User payed successfully",
    user,
    transaction,
  });
});

router.put("/tip-card-payment", auth, async (req, res) => {
  const { amount, refId } = req.body;

  const user = await User.findById(req.user._id);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  const transaction = new Transaction({
    user: req.user._id,
    amount,
    type: "tip",
    refId,
  });

  await transaction.save();

  res.send({ success: true, message: "User payed successfully", transaction });
});

router.get("/transactions/:id", auth, async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;
  query.user = req.user._id;

  if (req.query.type) {
    query.type = req.query.type;
  }

  if (req.query.type == "withdrawdeposit") {
    query.type = { $in: ["admin-deposit", "admin-withdrawl"] };
  }

  try {
    const categories = await Transaction.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res.status(200).json({
        success: true,
        transactions: categories,
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    } else {
      res.status(200).json({
        success: false,
        transactions: [],
        message: "No more transactions found",
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/admin-transactions/:otherId/:id", auth, async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;
  query.user = req.params.otherId;

  if (req.query.type) {
    query.type = req.query.type;
  }

  if (req.query.type == "withdrawdeposit") {
    query.type = { $in: ["admin-deposit", "admin-withdrawl"] };
  }

  try {
    const categories = await Transaction.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Transaction.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res.status(200).json({
        success: true,
        transactions: categories,
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    } else {
      res.status(200).json({
        success: false,
        transactions: [],
        message: "No more transactions found",
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/update-location", auth, async (req, res) => {
  const { location } = req.body;

  // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
    Object.entries({
      location,
    }).filter(([key, value]) => value !== undefined)
  );

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).send({
      success: false,
      message: "No valid fields provided for update.",
    });
  }

  const user = await User.findByIdAndUpdate(req.user._id, updateFields, {
    new: true,
  });

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  const orders = await Order.find({
    to_id: req.user._id,
    status: { $in: ["accepted", "order-start"] },
    bookingtype: "live",
  })
    .select("user")
    .lean();

  const adminUser = await User.findOne({ type: "admin" }).select("type");
  const io = req.app.get("socketio");
  for (let order of orders) {
    io.to(order.user.toString()).emit("location-update", {
      order: order._id,
      location,
    });
    io.to(adminUser._id.toString()).emit("location-update-admin", {
      order: order._id,
      location,
      user: user._id,
    });
  }

  res.send({ success: true, message: "User updated successfully", user });
});

router.post("/nearby/:id", auth, async (req, res) => {
  const lastId = parseInt(req.params.id) || 1;
  const { lat, lng } = req.body;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  let query = {};

  if (lat && lng) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusInMeters = 16093.4; // 10 miles in meters (1 mile = 1609.34 meters)

    query = {
      ...query,
      location: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusInMeters / 6371000],
        },
      },
    };
  }

  query.type = "rider";
  query.status = "online";

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;

  const users = await User.find(query)
    .sort({ _id: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  const totalCount = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCount / pageSize);

  res.send({
    success: true,
    users: users,
    count: { totalPage: totalPages, currentPageSize: users.length },
  });
});

router.delete("/", auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { status: "deleted" },
    { new: true }
  );

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  res.send({ success: true, message: "User deleted successfully", user });
});

router.delete("/:id", [auth, admin], async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { status: "deleted" },
    { new: true }
  );

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  res.send({ success: true, message: "User deleted successfully", user });
});

router.put("/update-user/:id", [auth, admin], async (req, res) => {
  const { status } = req.body;

  // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
    Object.entries({
      status,
    }).filter(([key, value]) => value !== undefined)
  );

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).send({
      success: false,
      message: "No valid fields provided for update.",
    });
  }
  const user = await User.findByIdAndUpdate(req.params.id, updateFields, {
    new: true,
  });

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  res.send({ success: true, message: "User updated successfully", user });
});

router.get("/admin/:type/:id", [auth, admin], async (req, res) => {
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  let query = {};

  if (req.params.type !== "all") {
    query.type = req.params.type;
  } else {
    query.type = { $ne: "admin" };
  }

  const { status, isVehicle } = req.query;

  if (status) {
    query.status = status;
  }

  if (isVehicle) {
    query.isVehicle = isVehicle;
  }

  if (req.query.search) {
    const searchQuery = req.query.search;
    query.$or = [
      { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
      { email: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
    ];
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;

  const users = await User.find(query)
    .sort({ _id: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();
  if (req.params.type == "rider") {
    for (let user of users) {
      const earnings = await Order.find({
        to_id: user._id,
        status: "completed",
        payment_status: "completed",
      })
        .select("price adminprice paymentType payment adminPayment")
        .lean();
      const cancelearnings = await Order.find({
        to_id: user._id,
        status: "cancelled",
        payment_status: "completed",
        refunded: false,
        paymentType: { $ne: "cash" },
      })
        .select("price adminprice paymentType payment adminPayment")
        .lean();
      const totalEarnings = [...earnings, ...cancelearnings].reduce(
        (a, b) => a + Number(Number(b.price) - Number(b.adminprice)),
        0
      );

      // Calculate the total amount received
      const totalAmountReceived = earnings.reduce((total, order) => {
        if (order.paymentType !== "cash") {
          // Sum up the payment amounts for each order
          const orderTotal = order.payment.reduce(
            (sum, payment) => sum + payment.amount,
            0
          );
          return total + orderTotal;
        } else {
          return total;
        }
      }, 0);

      const totalEarningPaidToAdmin = earnings.reduce((total, order) => {
        if (order.adminPayment == false && order.paymentType == "cash") {
          return total + order.adminprice;
        } else {
          return total;
        }
      }, 0);

      const totalPaidEarnings = [...earnings, ...cancelearnings].reduce(
        (total, order) => {
          if (order.paymentType !== "cash") {
            return (
              total + Number(Number(order.price) - Number(order.adminprice))
            );
          } else {
            return total;
          }
        },
        0
      );

      user.totalEarnings = totalEarnings;
      user.totalPaidEarnings = totalPaidEarnings;
      user.totalAmountReceived = totalAmountReceived;
      user.totalEarningPaidToAdmin = totalEarningPaidToAdmin;
    }
  }

  const totalCount = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCount / pageSize);

  res.send({
    success: true,
    users: users,
    count: { totalPage: totalPages, currentPageSize: users.length },
  });
});

router.get("/search/rider/:id/:search?", auth, async (req, res) => {
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  let query = {};

  query.type = "rider";
  query._id = { $ne: req.user._id };

  if (req.params.search) {
    const searchQuery = req.params.search;
    query.$or = [
      { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
      { email: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
    ];
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;

  const users = await User.find(query)
    .sort({ _id: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  const totalCount = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCount / pageSize);

  res.send({
    success: true,
    users: users,
    count: { totalPage: totalPages, currentPageSize: users.length },
  });
});

router.get("/search/:id/:search?", auth, async (req, res) => {
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  let query = {};

  query.type = "customer";
  query._id = { $ne: req.user._id };

  if (req.params.search) {
    const searchQuery = req.params.search;
    query.$or = [
      { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
      { email: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
    ];
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;

  const users = await User.find(query)
    .sort({ _id: -1 })
    .skip(skip)
    .limit(pageSize)
    .lean();

  const totalCount = await User.countDocuments(query);
  const totalPages = Math.ceil(totalCount / pageSize);

  res.send({
    success: true,
    users: users,
    count: { totalPage: totalPages, currentPageSize: users.length },
  });
});

router.put("/like/:userId", auth, async (req, res) => {
  try {
    const otherUser = req.params.userId;
    const userId = req.user._id;

    const existingLike = await like.findOne({
      user: userId,
      otherUser: otherUser,
    });

    if (existingLike) {
      return await dislike(otherUser, res, userId);
    }
    const likePost = new like({
      user: userId,
      otherUser: otherUser,
    });

    const updatedPost = await User.findByIdAndUpdate(
      userId,
      { $push: { likes: likePost._id } },
      { new: true }
    ).select("-password");

    if (!updatedPost) {
      return res.status(404).json({ message: "User not found" });
    }

    await likePost.save();

    res
      .status(200)
      .json({ message: "Like added successfully", user: updatedPost });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

const dislike = async (otherUser, res, userId) => {
  try {
    const deletedLike = await like.findOneAndDelete({
      otherUser: otherUser,
      user: userId,
    });

    if (!deletedLike) {
      return res.status(404).json({ message: "Event not found" });
    }

    const updatedPost = await User.findByIdAndUpdate(
      userId,
      { $pull: { likes: deletedLike._id } },
      { new: true }
    ).select("-password");

    if (!updatedPost) {
      return res.status(404).json({ message: "User not found" });
    }

    res
      .status(200)
      .json({ message: "Like deleted successfully", user: updatedPost });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

router.get("/favorite/:id", auth, async (req, res) => {
  const userId = req.user._id;
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  let query = {};

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;

  query.user = userId;

  try {
    const likedJobs = await like
      .find(query)
      .populate("otherUser")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await like.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    const jobs = likedJobs.map((like) => like.otherUser);
    if (jobs.length > 0) {
      const UpdateFav = jobs.map((order) => {
        return {
          ...order, // Spread operator to copy existing properties
          likes: true, // Adding new key with a value
        };
      });
      res.status(200).json({
        success: true,
        users: UpdateFav,
        count: { totalPage: totalPages, currentPageSize: jobs.length },
      });
    } else {
      res.status(200).json({
        success: false,
        message: "No more favorite users found",
        users: [],
        count: { totalPage: totalPages, currentPageSize: jobs.length },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/vehicle", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, model, brand, colour, license, num_passengers, images } =
      req.body;

    await Vehicle.findOneAndDelete({ user: userId });

    const addresses = new Vehicle({
      user: userId,
      name,
      model,
      brand,
      colour,
      license,
      num_passengers,
      images,
    });
    await addresses.save();

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isVehicle: true, vehicle: addresses._id },
      { new: true }
    );

    res.status(201).json({
      success: true,
      message: "Vehicle created successfully",
      vehicle: addresses,
      user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/vehicle/:id", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, model, brand, colour, license, num_passengers, images } =
      req.body;
    // Create an object to store the fields to be updated
    const updateFields = Object.fromEntries(
      Object.entries({
        name,
        model,
        brand,
        colour,
        license,
        num_passengers,
        images,
      }).filter(([key, value]) => value !== undefined)
    );

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid fields provided for update.",
      });
    }
    const user = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      updateFields,
      {
        new: true,
      }
    );

    if (!user)
      return res.status(400).send({
        success: false,
        message: "The Vehicle with the given ID was not found.",
      });

    await User.findByIdAndUpdate(
      userId,
      { isVehicle: true, vehicle: req.params.id },
      { new: true }
    );

    res.send({
      success: true,
      message: "Vehicle updated successfully",
      vehicle: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/vehicle", auth, async (req, res) => {
  let query = {};

  const userId = req.user._id;

  query.user = userId;

  try {
    const categories = await Vehicle.findOne(query).lean();

    res.status(200).json({ success: true, vehicles: categories });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/vehicle/:id", auth, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user._id;
    const service = await Vehicle.findOneAndDelete({
      _id: serviceId,
      user: userId,
    });

    if (service == null) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isVehicle: false, $unset: { vehicle: "" } },
      { new: true }
    );

    res.status(200).json({
      message: `Vehicle deleted successfully`,
      vehicle: service,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/address", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { address, lat, lng, city } = req.body;
    const addresses = new Address({
      user: userId,
      address,
      lat,
      lng,
      city,
    });
    await addresses.save();

    res.status(201).json({
      success: true,
      message: "Address created successfully",
      address: addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/address/:id", auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { address, lat, lng, city } = req.body;
    // Create an object to store the fields to be updated
    const updateFields = Object.fromEntries(
      Object.entries({
        address,
        lat,
        lng,
        city,
      }).filter(([key, value]) => value !== undefined)
    );

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid fields provided for update.",
      });
    }
    const user = await Address.findOneAndUpdate(
      { _id: req.params.id, user: userId },
      updateFields,
      {
        new: true,
      }
    );

    if (!user)
      return res.status(400).send({
        success: false,
        message: "The Address with the given ID was not found.",
      });

    res.send({
      success: true,
      message: "Address updated successfully",
      address: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/address/:id?", auth, async (req, res) => {
  let query = {};

  const userId = req.user._id;
  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  query.user = userId;
  try {
    const categories = await Address.find(query).sort({ _id: -1 }).lean();

    if (categories.length > 0) {
      res.status(200).json({ success: true, address: categories });
    } else {
      res.status(200).json({
        success: false,
        address: [],
        message: "No more address found",
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/address/:id", auth, async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user._id;
    const service = await Address.findOneAndDelete({
      _id: serviceId,
      user: userId,
    });

    if (service == null) {
      return res.status(404).json({ message: "Address not found" });
    }

    res
      .status(200)
      .json({ message: `Address deleted successfully`, address: service });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/faqs", [auth, admin], async (req, res) => {
  try {
    const { subtile, title } = req.body;
    const addresses = new Faqs({
      subtile,
      title,
    });
    await addresses.save();

    res.status(201).json({
      success: true,
      message: "Faqs created successfully",
      faqs: addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/faqs/:id", [auth, admin], async (req, res) => {
  try {
    const { subtile, title } = req.body;
    // Create an object to store the fields to be updated
    const updateFields = Object.fromEntries(
      Object.entries({
        subtile,
        title,
      }).filter(([key, value]) => value !== undefined)
    );

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid fields provided for update.",
      });
    }
    const user = await Faqs.findOneAndUpdate(
      { _id: req.params.id },
      updateFields,
      {
        new: true,
      }
    );

    if (!user)
      return res.status(400).send({
        success: false,
        message: "The Faqs with the given ID was not found.",
      });

    res.send({
      success: true,
      message: "Faqs updated successfully",
      faqs: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/faqs/:id", async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;

  try {
    const categories = await Faqs.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Faqs.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res.status(200).json({
        success: true,
        faqs: categories,
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    } else {
      res.status(200).json({
        success: false,
        faqs: [],
        message: "No more faqs found",
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/adminuser", async (req, res) => {
  try {
    const user = await User.findOne({ type: "admin" }).lean();

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/faqs/:id", [auth, admin], async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Faqs.findOneAndDelete({ _id: serviceId });

    if (service == null) {
      return res.status(404).json({ message: "Faqs not found" });
    }

    res
      .status(200)
      .json({ message: `Faqs deleted successfully`, faqs: service });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

function findDateIndex(createdAt, dates) {
  for (let i = 0; i < dates.length - 1; i++) {
    if (moment(createdAt).isBetween(dates[i], dates[i + 1], null, "[)")) {
      return i + 1; // Increment y value of the next date
    }
  }
  // If the date is after the last date in the array
  if (moment(createdAt).isSameOrAfter(dates[dates.length - 1])) {
    return dates.length - 1;
  }
  return -1;
}

router.post("/rider/dashboard", auth, async (req, res) => {
  const userId = req.user._id;
  const totalCashAmountOrderCount = await Order.countDocuments({
    to_id: userId,
    status: "completed",
    payment_status: "completed",
    paymentType: "cash",
  });

  const earnings = await Order.find({
    to_id: userId,
    status: "completed",
    payment_status: "completed",
  })
    .select(
      "status schedule_date price distance payment adminprice createdAt adminPayment paymentType"
    )
    .lean();
  const cancelearnings = await Order.find({
    to_id: userId,
    status: "cancelled",
    payment_status: "completed",
    refunded: false,
    paymentType: { $ne: "cash" },
  })
    .select("status schedule_date price distance payment adminprice createdAt")
    .lean();
  const totalEarnings = [...earnings, ...cancelearnings].reduce(
    (a, b) => a + Number(Number(b.price) - Number(b.adminprice)),
    0
  );

  const totaldistance = earnings.reduce((a, b) => a + b.distance, 0);

  // Calculate the total amount received
  const totalAmountReceived = earnings.reduce((total, order) => {
    if (order.paymentType !== "cash") {
      // Sum up the payment amounts for each order
      const orderTotal = order.payment.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );
      return total + orderTotal;
    } else {
      return total;
    }
  }, 0);

  const totalEarningPaidToAdmin = earnings.reduce((total, order) => {
    if (order.adminPayment == false && order.paymentType == "cash") {
      return total + order.adminprice;
    } else {
      return total;
    }
  }, 0);

  const totalPaidEarnings = [...earnings, ...cancelearnings].reduce(
    (total, order) => {
      if (order.paymentType !== "cash") {
        return total + Number(Number(order.price) - Number(order.adminprice));
      } else {
        return total;
      }
    },
    0
  );
  const totalCashPaidEarnings = [...earnings, ...cancelearnings].reduce(
    (total, order) => {
      if (order.paymentType == "cash") {
        return total + Number(Number(order.price) - Number(order.adminprice));
      } else {
        return total;
      }
    },
    0
  );

  const totalRemainigAmount =
    Number(totalPaidEarnings) - Number(totalAmountReceived);

  let dates = [];

  const now = new Date();

  let startDate = moment().startOf("day");
  switch (req.query.date) {
    case "daily":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setHours(now.getHours() - i * 2);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("day");
      break;
    case "weekly":
      for (let i = 0; i < 7; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("week");
      break;
    case "monthly":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i * 2);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("month");
      break;
    case "quarterly":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i * 5);
        dates.unshift(date.toISOString());
      }
      startDate = moment().subtract(3, "months");
      break;
    case "sixmonth":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i * 10);
        dates.unshift(date.toISOString());
      }
      startDate = moment().subtract(6, "months");
      break;
    case "yearly":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setMonth(now.getMonth() - i);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("year");
      break;

    default:
      for (let i = 0; i < 7; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("week");
      break;
  }
  const todayEnd = moment().endOf("day");

  const graphorders = await Order.find({
    to_id: userId,
    schedule_date: { $gte: startDate, $lte: todayEnd },
    status: "completed",
    payment_status: "completed",
  })
    .select("status schedule_date price adminprice createdAt")
    .lean();
  const graphcancelorders = await Order.find({
    to_id: userId,
    schedule_date: { $gte: startDate, $lte: todayEnd },
    status: "cancelled",
    payment_status: "completed",
    refunded: false,
    paymentType: { $ne: "cash" },
  })
    .select("status schedule_date price adminprice createdAt")
    .lean();

  const graphstartDate = moment().startOf("week");

  const weekOrder = await Order.find({
    to_id: userId,
    schedule_date: { $gte: graphstartDate, $lte: todayEnd },
    status: "completed",
    payment_status: "completed",
  })
    .select("status schedule_date price adminprice createdAt")
    .lean();
  const weekcancelorders = await Order.find({
    to_id: userId,
    schedule_date: { $gte: graphstartDate, $lte: todayEnd },
    status: "cancelled",
    payment_status: "completed",
    refunded: false,
    paymentType: { $ne: "cash" },
  })
    .select("status schedule_date price adminprice createdAt")
    .lean();

  const totalWeekEarnings = [...weekOrder, ...weekcancelorders].reduce(
    (a, b) => a + Number(Number(b.price) - Number(b.adminprice)),
    0
  );

  // Initialize the graph array
  let graph = dates.map((date) => ({ x: date, price: 0 }));

  // Increment the y value for the correct date ranges
  [...graphorders, ...graphcancelorders].forEach((order) => {
    const index = findDateIndex(order.createdAt, dates);
    if (index !== -1 && index < graph.length) {
      graph[index].price =
        Number(graph[index].price) +
        Number(Number(order.price) - Number(order.adminprice));
    }
  });

  let newGraph = graph.map((obj) => {
    return { ["x"]: convertLabels(req.query.date, obj.x), ["y"]: obj.price };
  });

  const user = await User.findById(userId);

  if (!user)
    return res.status(400).send({
      success: false,
      message: "The User with the given ID was not found.",
    });

  const transaction = await Transaction.find({
    user: userId,
    type: "admin-deposit",
  })
    .select("amount")
    .lean();
  const withdrawltransaction = await Transaction.find({
    user: userId,
    type: "admin-withdrawl",
  })
    .select("amount")
    .lean();

  const totaladminDepositAmount = transaction.reduce((a, b) => a + b.amount, 0);
  const totaladminWithdrawlAmount = withdrawltransaction.reduce(
    (a, b) => a + b.amount,
    0
  );

  const totalEarningsRider = Number(totalEarnings) + totaladminDepositAmount;

  const totalPaidAmount =
    totalAmountReceived + totaladminWithdrawlAmount + totalCashPaidEarnings;

  const totalUnPaidAmount = Number(totalEarningsRider) - totalPaidAmount;

  const adminPayout = await User.findOne({ type: "admin" })
    .select("payoutDate")
    .lean();

  res.send({
    success: true,
    totaldistance,
    graph: newGraph,
    totalEarnings: totalEarningsRider.toFixed(2),
    totalPaidAmount: totalPaidAmount.toFixed(2),
    totalUnPaidAmount: totalUnPaidAmount.toFixed(2),
    totalWeekEarnings: totalWeekEarnings.toFixed(2),
    totalAmountReceived,
    totalEarningPaidToAdmin: totalEarningPaidToAdmin.toFixed(2),
    totalCashAmountOrderCount,
    totalRemainigAmount,
    totaladminDepositAmount,
    totaladminWithdrawlAmount,
    adminPayout: adminPayout.payoutDate,
  });
});

router.get("/customer/earnings", auth, async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  let dates = [];
  for (let i = 0; i < 7; i++) {
    let date = new Date(now);
    date.setDate(now.getDate() - i);
    dates.unshift(date.toISOString());
  }
  const startDate = moment().startOf("week");
  const todayEnd = moment().endOf("day");

  const earnings = await Order.find({
    user: userId,
    status: "completed",
    payment_status: "completed",
  })
    .select("status schedule_date price distance")
    .lean();
  const cancelEarnings = await Order.find({
    user: userId,
    status: "cancelled",
    payment_status: "completed",
    refunded: false,
    paymentType: { $ne: "cash" },
  })
    .select("status schedule_date price distance")
    .lean();
  const totalEarnings = [...earnings, ...cancelEarnings].reduce(
    (a, b) => a + b.price,
    0
  );
  const totaldistance = earnings.reduce((a, b) => a + b.distance, 0);

  const orders = await Order.find({
    user: userId,
    schedule_date: { $gte: startDate, $lte: todayEnd },
    status: "completed",
    payment_status: "completed",
  })
    .select("status schedule_date price createdAt")
    .lean();
  const cancelorders = await Order.find({
    user: userId,
    schedule_date: { $gte: startDate, $lte: todayEnd },
    status: "cancelled",
    payment_status: "completed",
    refunded: false,
    paymentType: { $ne: "cash" },
  })
    .select("status schedule_date price createdAt")
    .lean();

  // Initialize the graph array
  let graph = dates.map((date) => ({ x: date, price: 0 }));

  // Increment the y value for the correct date ranges
  [...orders, ...cancelorders].forEach((order) => {
    const index = findDateIndex(order.createdAt, dates);
    if (index !== -1 && index < graph.length) {
      graph[index].price += 1;
    }
  });

  let newGraph = graph.map((obj) => {
    return { ["x"]: moment(obj.x).format("ddd"), ["price"]: obj.price };
  });

  res.send({ success: true, graph: newGraph, totalEarnings, totaldistance });
});

router.post("/customer/dashboard/:id?", auth, async (req, res) => {
  const userId = req.user._id;

  let query = {};
  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }
  const { startDate, endDate } = req.body;

  const earnings = await Order.find({
    user: userId,
    status: "completed",
    payment_status: "completed",
  })
    .select("status schedule_date price distance")
    .lean();
  const cancelEarnings = await Order.find({
    user: userId,
    status: "cancelled",
    payment_status: "completed",
    refunded: false,
    paymentType: { $ne: "cash" },
  })
    .select("status schedule_date price distance")
    .lean();
  const totalEarnings = earnings.reduce((a, b) => a + b.price, 0);
  const totalcancelEarnings = cancelEarnings.reduce((a, b) => a + b.price, 0);
  const totaldistance = earnings.reduce((a, b) => a + b.distance, 0);

  const orders = await Order.find({
    ...query,
    user: userId,
    schedule_date: { $gte: startDate, $lte: endDate },
    status: "completed",
    payment_status: "completed",
  })
    .sort({ schedule_date: 1 })
    .limit(10)
    .lean();
  const cancelorders = await Order.find({
    ...query,
    user: userId,
    schedule_date: { $gte: startDate, $lte: endDate },
    tatus: "cancelled",
    payment_status: "completed",
    refunded: false,
    paymentType: { $ne: "cash" },
  })
    .sort({ schedule_date: 1 })
    .limit(10)
    .lean();

  const totalFilterEarnings = orders.reduce((a, b) => a + b.price, 0);
  const totalFiltercancelordersEarnings = cancelorders.reduce(
    (a, b) => a + b.price,
    0
  );
  const totalFilterdistance = orders.reduce((a, b) => a + b.distance, 0);

  res.send({
    success: true,
    totalEarnings: totalEarnings + totalcancelEarnings,
    totalFilterEarnings: totalFilterEarnings + totalFiltercancelordersEarnings,
    orders: orders,
    totaldistance,
    totalFilterdistance,
  });
});

router.get("/dashboard", [auth, admin], async (req, res) => {
  const totalUsers = await User.countDocuments({
    type: "customer",
    status: { $in: ["online", "offline"] },
  });

  // Get users registered yesterday
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayUsers = await User.countDocuments({
    createdAt: { $gte: yesterday, $lt: today },
    type: "customer",
    status: { $in: ["online", "offline"] },
  });
  // Get the number of users until yesterday
  const totalUsersYesterday = totalUsers - yesterdayUsers;
  // Calculate growth percentage
  let growth = 0;
  if (totalUsersYesterday > 0) {
    growth = ((totalUsers - totalUsersYesterday) / totalUsersYesterday) * 100;
  }

  const totalownerUsers = await User.countDocuments({
    type: "rider",
    status: { $in: ["online", "offline"] },
  });

  const yesterdayownerUsers = await User.countDocuments({
    createdAt: { $gte: yesterday, $lt: today },
    type: "rider",
    status: { $in: ["online", "offline"] },
  });
  // Get the number of users until yesterday
  const totalownerUsersYesterday = totalownerUsers - yesterdayownerUsers;
  // Calculate growth percentage
  let growthowner = 0;
  if (totalownerUsersYesterday > 0) {
    growthowner =
      ((totalownerUsers - totalownerUsersYesterday) /
        totalownerUsersYesterday) *
      100;
  }

  const totalWebCategories = await WebSubCategories.countDocuments({
    user: { $ne: req.user._id },
    upload_status: "active",
  });

  const totalOrder = await Order.countDocuments({ status: "completed" });

  const totalRiderOrders = await Order.find({
    status: "completed",
    payment_status: "completed",
  })
    .select("adminprice paymentDone")
    .lean();

  const yesterdayOrder = await Order.countDocuments({
    createdAt: { $gte: yesterday, $lt: today },
    status: "completed",
  });
  // Get the number of users until yesterday
  const totalOrderYesterday = totalOrder - yesterdayOrder;
  // Calculate growth percentage
  let growthOrder = 0;
  if (totalOrderYesterday > 0) {
    growthOrder =
      ((totalOrder - totalOrderYesterday) / totalOrderYesterday) * 100;
  }

  const now = new Date();
  let dates = [];
  //  for (let i = 0; i < 12; i++) {
  //   let date = new Date(now);
  //   date.setMonth(now.getMonth() - i);
  //   dates.unshift(date.toISOString());
  // }
  // const startDate = moment().startOf('year');
  // const todayEnd = moment().endOf('day');

  let startDate = moment().startOf("day");
  switch (req.query.date) {
    case "daily":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setHours(now.getHours() - i * 2);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("day");
      break;
    case "weekly":
      for (let i = 0; i < 7; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("week");
      break;
    case "monthly":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i * 2);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("month");
      break;
    case "quarterly":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i * 5);
        dates.unshift(date.toISOString());
      }
      startDate = moment().subtract(3, "months");
      break;
    case "sixmonth":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i * 10);
        dates.unshift(date.toISOString());
      }
      startDate = moment().subtract(6, "months");
      break;
    case "yearly":
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setMonth(now.getMonth() - i);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("year");
      break;

    default:
      for (let i = 0; i < 12; i++) {
        let date = new Date(now);
        date.setDate(now.getDate() - i * 2);
        dates.unshift(date.toISOString());
      }
      startDate = moment().startOf("month");
      break;
  }
  const todayEnd = moment().endOf("day");

  const orders = await Order.find({
    createdAt: { $gte: startDate, $lte: todayEnd },
    status: "completed",
  })
    .select("price createdAt adminprice")
    .lean();

  // Initialize the graph array
  let graph = dates.map((date) => ({ x: date, price: 0, adminprice: 0 }));

  // Increment the y value for the correct date ranges
  orders.forEach((order) => {
    const index = findDateIndex(order.createdAt, dates);
    if (index !== -1 && index < graph.length) {
      graph[index].price = Number(graph[index].price) + Number(order.price);
      graph[index].adminprice =
        Number(graph[index].adminprice) + Number(order.adminprice);
    }
  });

  let newGraph = graph.map((obj) => {
    return {
      ["x"]: convertLabels(req.query.date, obj.x),
      ["y"]: obj.price,
      z: obj.adminprice,
    };
  });

  const totalEarnings = totalRiderOrders.reduce((a, b) => a + b.adminprice, 0);

  // Aggregate completed rides grouped by to_id (rider)
  const stats = await Order.aggregate([
    { $match: { status: "completed", to_id: { $ne: null } } }, // Only completed rides with a valid to_id
    {
      $group: {
        _id: "$to_id",
        totalRides: { $sum: 1 },
        totalEarnings: { $sum: "$price" },
      },
    },
    { $sort: { totalRides: -1, totalEarnings: -1 } }, // Sort by most rides, then highest earnings
    { $limit: 1 }, // Get the top rider
  ]);

  let topRider = null;
  if (stats.length !== 0) {
    topRider = await User.findById(stats[0]._id).select("name");

    topRider = {
      name: topRider ? topRider.name : "Unknown",
      totalRides: stats[0].totalRides,
      totalEarnings: stats[0].totalEarnings,
    };
  }

  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0); // Set time to beginning of the day

  const tomorrow = new Date();
  tomorrow.setDate(todayDate.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0); // Set time to beginning of next day

  const todayWebCategories = await WebSubCategories.countDocuments({
    user: { $ne: req.user._id },
    upload_status: "active",
    createdAt: {
      $gte: todayDate, // Greater than or equal to today
      $lt: tomorrow, // Less than tomorrow
    },
  });
  const todayOrders = await Order.find({
    status: "completed",
    createdAt: {
      $gte: todayDate, // Greater than or equal to today
      $lt: tomorrow, // Less than tomorrow
    },
  }).select("price createdAt adminprice");

  const todaywebEarnings = todayWebCategories * Number(108);
  const totalwebEarnings = totalWebCategories * Number(108);

  const todayCommision = todayOrders.reduce((a, b) => a + b.adminprice, 0);
  const todayRidesPrice = todayOrders.reduce((a, b) => a + b.price, 0);

  res.send({
    success: true,
    graph: newGraph,
    totalEarnings: (totalwebEarnings + Number(totalEarnings)).toFixed(2),
    totalCommision: totalEarnings.toFixed(2),
    topRider,
    customer: {
      totalUsers,
      growth: growth.toFixed(2),
      status: growth >= 0 ? "positive" : "negative",
    },
    rider: {
      totalUsers: totalownerUsers,
      growth: growthowner.toFixed(2),
      status: growthowner >= 0 ? "positive" : "negative",
    },
    order: {
      totalEvents: totalOrder,
      growth: growthOrder.toFixed(2),
      status: growthOrder >= 0 ? "positive" : "negative",
    },
    todayEarning: (todaywebEarnings + Number(todayCommision)).toFixed(2),
    todayCommision: todayCommision.toFixed(2),
    todayRidesPrice: todayRidesPrice.toFixed(2),
  });
});

router.post("/rideType", [auth, admin], async (req, res) => {
  try {
    const { title, image } = req.body;
    const addresses = new RideType({
      title,
      image,
    });
    await addresses.save();

    res.status(201).json({
      success: true,
      message: "RideType created successfully",
      ridetype: addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/ridetype/:id", [auth, admin], async (req, res) => {
  try {
    const { title, image } = req.body;
    // Create an object to store the fields to be updated
    const updateFields = Object.fromEntries(
      Object.entries({
        title,
        image,
      }).filter(([key, value]) => value !== undefined)
    );

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid fields provided for update.",
      });
    }
    const user = await RideType.findOneAndUpdate(
      { _id: req.params.id },
      updateFields,
      {
        new: true,
      }
    );

    if (!user)
      return res.status(400).send({
        success: false,
        message: "The ridetype with the given ID was not found.",
      });

    res.send({
      success: true,
      message: "Ridetype updated successfully",
      ridetype: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/ridetype/:id", async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;

  try {
    const categories = await RideType.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await RideType.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res.status(200).json({
        success: true,
        ridetypes: categories,
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    } else {
      res.status(200).json({
        success: false,
        ridetypes: [],
        message: "No more ridetypes found",
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/ridetype/:id", [auth, admin], async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await RideType.findOneAndDelete({ _id: serviceId });

    if (service == null) {
      return res.status(404).json({ message: "RideType not found" });
    }

    res
      .status(200)
      .json({ message: `RideType deleted successfully`, ridetype: service });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/liabilty", [auth, admin], async (req, res) => {
  try {
    const { title, price, distance, image, tooltip, passenger } = req.body;
    const addresses = new Liabilties({
      title,
      price,
      distance,
      image,
      tooltip,
      passenger,
    });
    await addresses.save();

    res.status(201).json({
      success: true,
      message: "Liabilty created successfully",
      Liabilty: addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.put("/liabilty/:id", [auth, admin], async (req, res) => {
  try {
    const { title, price, distance, image, tooltip, passenger } = req.body;
    // Create an object to store the fields to be updated
    const updateFields = Object.fromEntries(
      Object.entries({
        title,
        price,
        distance,
        image,
        tooltip,
        passenger,
      }).filter(([key, value]) => value !== undefined)
    );

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid fields provided for update.",
      });
    }
    const user = await Liabilties.findOneAndUpdate(
      { _id: req.params.id },
      updateFields,
      {
        new: true,
      }
    );

    if (!user)
      return res.status(400).send({
        success: false,
        message: "The liabilty with the given ID was not found.",
      });

    res.send({
      success: true,
      message: "Liabilty updated successfully",
      liabilty: user,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/liabilty/:id", async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;

  try {
    const categories = await Liabilties.find(query)
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Liabilties.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res.status(200).json({
        success: true,
        liabilties: categories,
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    } else {
      res.status(200).json({
        success: false,
        liabilties: [],
        message: "No more liabilties found",
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/liabilty/:id", [auth, admin], async (req, res) => {
  try {
    const serviceId = req.params.id;
    const service = await Liabilties.findOneAndDelete({ _id: serviceId });

    if (service == null) {
      return res.status(404).json({ message: "Liabilty not found" });
    }

    res
      .status(200)
      .json({ message: `Liabilty deleted successfully`, liabilty: service });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/set-price", [auth, admin], async (req, res) => {
  try {
    const { price, km } = req.body;
    await PriceKm.findOneAndDelete({}).lean();

    const addresses = new PriceKm({
      price,
      km,
    });
    await addresses.save();

    res.status(201).json({
      success: true,
      message: "PriceKm created successfully",
      priceKm: addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/price", async (req, res) => {
  try {
    const prickm = await PriceKm.findOne({}).lean();

    res.status(201).json({ success: true, priceKm: prickm });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.post("/privacy", [auth, admin], async (req, res) => {
  try {
    const { title, image, description } = req.body;
    await Privacy.findOneAndDelete({}).lean();

    const addresses = new Privacy({
      title,
      image,
      description,
    });
    await addresses.save();

    res.status(201).json({
      success: true,
      message: "Privacy created successfully",
      privacy: addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/privacy", async (req, res) => {
  try {
    const prickm = await Privacy.findOne({}).lean();

    res.status(201).json({ success: true, privacy: prickm });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});
router.post("/terms", [auth, admin], async (req, res) => {
  try {
    const { title, image, description } = req.body;
    await Terms.findOneAndDelete({}).lean();

    const addresses = new Terms({
      title,
      image,
      description,
    });
    await addresses.save();

    res.status(201).json({
      success: true,
      message: "Terms created successfully",
      terms: addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/terms", async (req, res) => {
  try {
    const prickm = await Terms.findOne({}).lean();

    res.status(201).json({ success: true, terms: prickm });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/loyalitypoint", [auth, admin], async (req, res) => {
  try {
    const { points_per_ride, convert_rate_per_xcd } = req.body;
    await LoyalityPoint.findOneAndDelete({}).lean();

    const addresses = new LoyalityPoint({
      points_per_ride,
      convert_rate_per_xcd,
    });
    await addresses.save();

    res.status(201).json({
      success: true,
      message: "LoyalityPoint created successfully",
      loyalitypoint: addresses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.get("/loyalitypoint", [auth, admin], async (req, res) => {
  try {
    const addresses = await LoyalityPoint.findOne({}).lean();

    res.status(201).json({ success: true, loyalitypoint: addresses });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

router.post("/send-notifications/:type", [auth, admin], async (req, res) => {
  const { type } = req.params;
  const validTypes = ["all", "customer", "rider"];
  if (!validTypes.includes(type)) {
    return res
      .status(404)
      .send({ success: false, message: "User Type is not valid" });
  }
  const { title, description, imageUrl, weburl } = req.body;

  let image = imageUrl || "";

  let query = {};

  if (type !== "all") {
    query.type = type;
  } else {
    query.type = { $ne: "admin" };
  }
  query.status = "online";

  const users = await User.find(query).select("fcmtoken").lean();

  const notifications = users.map((item) => ({
    user: req.user._id,
    to_id: item._id,
    type: "noti",
    description,
    title,
    image: image,
    weburl: weburl || "",
  }));
  await Notification.insertMany(notifications);

  const fcmTokens = [
    ...new Set(
      users
        .map((item) => item.fcmtoken)
        .filter((item) => item !== undefined || item !== "")
    ),
  ];

  const data = {
    fcmTokens: fcmTokens,
    title: title,
    description,
    image: image || "",
    weburl: weburl || "",
  };

  jobQueue.addJob({ data });

  res.send({ success: true, message: "notification sent successfully" });
});

// Start worker thread
const worker = new Worker("./routes/notificationProcessor.js");
jobQueue.processJobs(
  (job) =>
    new Promise((resolve) => {
      worker.postMessage(job);
      worker.once("message", resolve);
    })
);

router.post("/footer", [auth, admin], async (req, res) => {
  const { short_title, phone, tel, location, emails, videourl } = req.body;

  // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
    Object.entries({
      short_title,
      phone,
      tel,
      location,
      emails,
      videourl,
    }).filter(([key, value]) => value !== undefined)
  );

  // Check if there are any fields to update
  if (Object.keys(updateFields).length === 0) {
    return res.status(400).send({
      success: false,
      message: "No valid fields provided for update.",
    });
  }
  let footer = await Footer.findOne({});
  if (footer) {
    footer = await Footer.findByIdAndUpdate(footer._id, updateFields, {
      new: true,
    });
  } else {
    footer = new Footer(updateFields);
  }
  await footer.save();
  res.send({ success: true, footer });
});

router.get("/footer", async (req, res) => {
  let footer = await Footer.findOne({});
  if (footer) return res.status(200).send({ success: false, footer });

  const lifooter = new Footer({
    short_title: "",
    phone: "",
    tel: "",
    location: "",
    emails: "",
  });
  res.send({ success: true, footer: lifooter });
});

module.exports = router;
