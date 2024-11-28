const Rating = require('../models/Rating');
const { User } = require('../models/user');
const { sendNotification } = require('./notificationCreateService');
const Event = require("../models/Event");

function calculateAverage(initialValue, numberToAdd) {
  if (initialValue == 0) return Number(numberToAdd)

  const sum = Number(initialValue) + Number(numberToAdd);
  const average = sum / 2; // Divide by 2 since there are two values

  return Number(Math.min(average, 100)); // Cap the average at 5 using Math.min
}

exports.createRating = async (req, res) => {
  try {
    const { to_id, event, speed, passing,shooting,dribling,review } = req.body;
    const userId = req.user._id;
    const sumRating=Number(speed)+Number(passing)+Number(shooting)+Number(dribling)
    const avgRating=Number(sumRating) / 4

    const ratings = new Rating({
      user: userId,
      to_id, event, speed, passing,shooting,dribling,avgRating:avgRating,review
    });

    
    const user = await User.findById(to_id)
    const loginUser = await User.findById(userId)
    const events = await Event.findById(event)
    
    if (!user) return res.status(400).json({ message: 'User does not exist for that ID.' });
    
    if (!events) return res.status(400).json({ message: 'Event does not exist for that ID.' });

    user.rating.rat_status= avgRating > user.rating.avgRating ?"increase":"decrease"
    
    user.rating.dribling = calculateAverage(user.rating.dribling || 0, dribling)
    user.rating.speed = calculateAverage(user.rating.speed || 0, speed)
    user.rating.passing = calculateAverage(user.rating.passing || 0, passing)
    user.rating.shooting = calculateAverage(user.rating.shooting || 0, shooting)
    user.rating.avgRating = calculateAverage(user.rating.avgRating || 0, avgRating)
    user.rating.totalReviews = user.rating.totalReviews + 1
    
    await user.save()
    
    await sendNotification({
      user: userId,
      to_id: to_id,
      description: "You have got new rating from "+loginUser.fname+" "+loginUser.lname + " in "+events.name+" event.",
      type: "rating",
      title: "New Rating",
      fcmtoken:  user.fcmtoken||"",
      event:event
    });
    
    await ratings.save();

    res.status(201).json({ success: true, message: 'Rating created successfully', ratings });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

exports.getUserRatings = async (req, res) => {
  let query = {};
  query.to_id = req.params.userId

  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  const pageSize = 10;

  try {
    const user = await User.findById(req.params.userId)
    if (!user) return res.status(400).json({ message: 'User does not exist for that ID.' });

    const userRating = user.rating

    const rating = await Rating.find(query).sort({ _id: -1 }).populate("user")
      .limit(pageSize)
      .lean();

    if (rating.length > 0) {
      res.status(200).json({
        success: true,
        ratings: rating,
        userRating
      });
    } else {
      res.status(200).json({
        success: false, message: 'No more ratings found',
        ratings: [],
        userRating
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getServiceRatings = async (req, res) => {
  const userId = req.user._id;

  try {
    const event = await Event.findById(req.params.eventId).populate("joined").lean()

    if (!event) return res.status(400).json({ message: 'Event does not exist for that ID.' });

    let users=[...event.joined]

    for (let user of users) {
      user.givingRating = await Rating.findOne({event:req.params.eventId,to_id:user,user:userId }).lean()
    }

    res.status(200).json({success: true,users: users});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
