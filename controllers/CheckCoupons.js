const Coupon = require('../models/Coupon');

exports.CheckCoupons = async () => {
  try {
    const currentDate = new Date();
    const expiredCoupons = await Coupon.find({ expirey_date: { $lt: currentDate } }).lean();

    const couponIds = [];

    if (expiredCoupons.length > 0) {
      for (const coupon of expiredCoupons) {
        couponIds.push(coupon._id);
      }

      // Delete expired coupons
      await Coupon.deleteMany({ _id: { $in: couponIds } });
      console.log(`Removed ${couponIds.length} expired coupons and updated events.`);
    } else {
      console.log('No expired coupons found.');
    }
  } catch (error) {
    console.error('Error in CheckCoupons:', error);
  }
};
