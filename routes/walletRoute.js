const express = require('express');
const { User } = require('../models/user');
const Transaction = require('../models/Transaction');
const router = express.Router();;

router.put('/purchase', async (req, res) => {
  const userId=req.user._id;
  const {balance,ticketId}=req.body
  const user=await User.findById(userId);
  
  if (!user) {
    return res.status(400).send({success:false,message:"No User found"});
  }
  
  if (Number(balance)>Number(user.balance)) {
    return res.status(400).send({success:false,message:"You don't have enough balance in your account"});
  }

  const eightPer = Number(balance) * 0.08
  
  const transaction = new Transaction({
    user: userId,
    ticket:ticketId,
    total_price:Number(balance),
    type:"purchase",
    originalPrice:Number(balance)+eightPer
  });
  
  await transaction.save();

  const userbalance = Number(user?.balance) || 0;
  const totalPrice = Number(balance);

  user.balance = userbalance - totalPrice;
  await user.save();

  res.send({ success:true, message:"Balance dedduct successfully", });
});

router.get('/transactions/:type/:id?', async (req, res) => {
  const userId=req.user._id;
  let query = {};

  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }
  if (req.params.type!=='all') { 
    query.type=req.params.type
  }
  query.user = userId;

  const transactions=await Transaction.find(query).populate({
    path: 'ticket',
    populate: [
      { path: 'event', model: 'Event' },
    ]
  }).sort({ _id: -1 }).limit(10).lean();

  if (transactions.length > 0) {
    res.send({ success:true, transactions:transactions });
  }else{
    res.send({ success:false, transactions:[] });
  }

});

module.exports = router; 
