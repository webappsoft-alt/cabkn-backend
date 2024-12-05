const Order = require('../models/Order');
const Rating = require('../models/Rating');
const { User } = require('../models/user');
const { sendNotification } = require('./notificationCreateService');

function calculateAverage(initialValue, numberToAdd) {
  if (initialValue == 0) return Number(numberToAdd)

  const sum = Number(initialValue) + Number(numberToAdd);
  const average = sum / 2; // Divide by 2 since there are two values

  return Number(Math.min(average, 100)); // Cap the average at 5 using Math.min
}

exports.createRating = async (req, res) => {
  try {
    const { to_id, order, rating,review,type } = req.body;
    const userId = req.user._id;

    const ratings = new Rating({
      user: userId,
      to_id, order, rating,review
    });

    
    const user = await User.findById(to_id)
    const loginUser = await User.findById(userId).lean()
    const events = await Order.findById(order)
    
    if (!user) return res.status(400).json({ message: 'User does not exist for that ID.' });
    
    if (!events) return res.status(400).json({ message: 'Order does not exist for that ID.' });
    
    user.rating = calculateAverage(user.rating || 0, rating )
    user.totalReviews = user.totalReviews + 1

    if (type=='rider') {
      events.driver_rating=ratings._id
    }else{
      events.customer_rating=ratings._id
    }
    
    await sendNotification({
      user: userId,
      to_id: to_id,
      description: "You have got new rating from "+loginUser.name+" in an order.",
      type: "rating",
      title: "New Rating",
      fcmtoken:  user.fcmtoken||"",
      order:order
    });
    
    await ratings.save();
    await user.save()
    await events.save()

    res.status(201).json({ success: true, message: 'Rating created successfully', ratings });
  } catch (error) {
    console.log(error)
    res.status(500).json({ success: false, message: 'Internal server error', error });
  }
};

exports.getUserRatings = async (req, res) => {
  let query = {};
  const userId=req.params.userId
  query.to_id = userId

  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  const pageSize = 10;

  try {
    const user = await User.findById(userId)
    if (!user) return res.status(500).json({ message:"No user found!"});

    const rating = await Rating.find(query).sort({ _id: -1 }).populate("user")
      .limit(pageSize)
      .lean();

    const totalLength = await Rating.countDocuments({ to_id: userId, });
    const rating1 = await Rating.countDocuments({ to_id: userId, rating: 1 });
    const rating2 = await Rating.countDocuments({ to_id: userId, rating: 2 });
    const rating3 = await Rating.countDocuments({ to_id: userId, rating: 3 });
    const rating4 = await Rating.countDocuments({ to_id: userId, rating: 4 });
    const rating5 = await Rating.countDocuments({ to_id: userId, rating: 5 });

    const numbers = [(rating1*1), (rating2*2), (rating3*3),(rating4*4),(rating5*5)];
    const average = numbers.reduce((a, b) => a + b, 0) / totalLength;
    if (rating.length > 0) {
      res.status(200).json({
        success: true,
        ratings: rating,
        totalLength: totalLength,
        totalsRating: {
          1: rating1,
          2: rating2,
          3: rating3,
          4: rating4,
          5: rating5,
        },
        avg_rating:average||0
      });
    } else {
      res.status(200).json({
        success: false, message:"No more rating found!",
        ratings: [],
        totalLength: totalLength,
        totalsRating: {
          1: rating1,
          2: rating2,
          3: rating3,
          4: rating4,
          5: rating5,
        },
        avg_rating:average||0
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error"});
  }
};