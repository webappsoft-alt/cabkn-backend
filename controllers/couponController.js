const Coupon = require('../models/Coupon');

exports.create = async (req, res) => {
  try {
    const userId=req.user._id
    const { title,code,expirey_date,discount } = req.body;
    const category = new Coupon({
      user:userId,
      title,code,expirey_date,discount
    });
    await category.save();

    res.status(201).json({ success: true, message: 'Coupon created successfully', coupon:category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.editCategories = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const { title,code,expirey_date,discount } = req.body;


    // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
    Object.entries({
      title,code,expirey_date,discount 
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

  
  const service = await Coupon.findOneAndUpdate(
    { _id: serviceId },
    updateFields,
    { new: true }
  );
  
  if (service == null) {
    return res.status(404).json({ message: 'Coupon not found' });
  }

  res.status(200).json({ message: `Coupon updated successfully`, coupon: service });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getMyCoupons = async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id)||1;

   // Check if lastId is a valid number
   if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }

  const pageSize = 10;
  
  const skip = Math.max(0, (lastId - 1)) * pageSize;

  try {
    const categories = await Coupon.find(query).sort({ _id: -1 }).skip(skip)
    .limit(pageSize).lean();

    const totalCount = await Coupon.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res.status(200).json({ success: true, coupons: categories,count: { totalPage: totalPages, currentPageSize: categories.length }  });
    } else {
      res.status(200).json({ success: false,coupons:[], message: 'No more coupones found',count: { totalPage: totalPages, currentPageSize: categories.length }  });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.checkValidatityCoupon = async (req, res) => {
  let query = {};
  const userId=req.user._id

  const { code }=req.body

  const currentDate = new Date();
 
  query.code = code
  query.used_by = {$nin:userId}
  query.expirey_date= { $gt: currentDate }

  try {
    const categories = await Coupon.findOne(query).lean();

    if (categories) {
      res.status(200).json({ success: true, coupon: categories,message: 'Coupon is valid' });
    } else {
      res.status(200).json({ success: false, message: 'Coupon is not valid'  });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteCoupons = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId=req.user._id

    const service = await Coupon.findOneAndDelete({ _id: serviceId,user:userId })

    if (service == null) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.status(200).json({ message: `Coupon deleted successfully`, coupon: service });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};