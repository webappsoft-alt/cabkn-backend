const Banner = require('../models/Banner');

exports.create = async (req, res) => {
  try {
    const { name, image } = req.body;
    const category = new Banner({
      name,
      image,
    });
    await category.save();

    res.status(201).json({ success: true, message: 'Banner created successfully', banner:category });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};


exports.getCategories = async (req, res) => {

  let query = {};

  try {
    const categories = await Banner.find(query).sort({ _id: -1 }).lean();
    
    res.status(200).json({ success: true, banners: categories  });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.editCategories = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const { name, image } = req.body;


      // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
    Object.entries({
      name, image
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

    const service = await Banner.findOneAndUpdate(
      { _id: serviceId },
      {
       ...updateFields,
        updated_at: Date.now()
      },
      { new: true }
    );

    if (service == null) {
      return res.status(404).json({ message: 'banner not found' });
    }

    res.status(200).json({ message: `banner updated successfully`, banner: service });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.deleteCatrgoires = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const service = await Banner.findByIdAndDelete(serviceId);

    if (service == null) {
      return res.status(404).json({ message: 'Banner not found' });
    }

    res.status(200).json({ message: `Banner deleted successfully`, banner: service });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};

