const Coupon = require('../models/Coupon');
const Event = require('../models/Event');

exports.CheckCoupons = async () => {
  try {
    const currentDate = new Date();
    const expiredCoupons = await Coupon.find({ expirey_date: { $lt: currentDate } }).lean();

    const eventIds = [];
    const couponIds = [];

    if (expiredCoupons.length > 0) {
      for (const coupon of expiredCoupons) {
        // Collect event IDs from each coupon
        if (coupon.events && coupon.events.length > 0) {
          eventIds.push(...coupon.events); // Spread the event IDs into the array
        }
        couponIds.push(coupon._id);
      }

      // Delete expired coupons
      await Coupon.deleteMany({ _id: { $in: couponIds } });

      // Remove coupon reference from associated events
      const updatePromises = eventIds.map(eventId =>
        Event.updateOne(
          { _id: eventId },
          { $unset: { coupon: "" } } // Use $unset to remove the field
        )
      );

      await Promise.all(updatePromises); // Wait for all updates to complete
      console.log(`Removed ${couponIds.length} expired coupons and updated events.`);
    } else {
      console.log('No expired coupons found.');
    }
  } catch (error) {
    console.error('Error in CheckCoupons:', error);
  }
};
