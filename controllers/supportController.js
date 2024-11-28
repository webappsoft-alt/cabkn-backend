const Support = require("../models/Support");
const { sendNotification } = require("./notificationCreateService");

exports.create = async (req, res) => {
  try {
    const { name, email, msg } = req.body;
    const userId = req.user._id;

    const support = new Support({
      user:userId,
      name, 
      email, 
      msg
    });

    await support.save();

    res.status(201).json({ success: true, message: 'Message has sent successfully', message: support });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

exports.getAdminnotifications = async (req, res) => {
  const lastId = parseInt(req.params.id);

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }

  let query={};
  if (req.params.search) {
    query.name = { $regex: new RegExp(req.params.search, 'i') };
  }

  const pageSize = 10;

  const skip = Math.max(0, (lastId - 1)) * pageSize;
  try {
    const categories = await Support.find(query)
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Support.find(query);
    const totalPages = Math.ceil(totalCount.length / pageSize);

    if (categories.length > 0) {
      res.status(200).json({ success: true, Messages: categories, count: { totalPage: totalPages, currentPageSize: categories.length } });
    } else {
      res.status(200).json({ success: false, message: 'No more Messages found', Messages: categories, count: { totalPage: totalPages, currentPageSize: 0 } });
    }
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


exports.attendTheSupport = async (req, res) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user._id;
    const { title, description } = req.body;

    const service = await Support.findOneAndUpdate(
      { _id: serviceId },
      {
        attended: true,
        updated_at: Date.now()
      },
      { new: true }
    ).populate("user")

    if (service == null) {
      return res.status(404).json({ message: 'Support not found' });
    }

    await sendNotification({
      user: userId,
      to_id: service.user._id,
      description: description,
      type: "support",
      title: title,
      fcmtoken: service.user.fcmtoken,
    });

    res.status(200).json({ message: `Support updated successfully`, service: service });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

