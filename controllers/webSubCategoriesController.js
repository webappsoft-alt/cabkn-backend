const Transaction = require("../models/Transaction");
const { User } = require("../models/user");
const Category = require("../models/WebSubCategories");

exports.usercreate = async (req, res) => {
  try {
    const {
      name,
      images,
      about,
      address,
      lat,
      lng,
      category,
      title,
      timeslots,
      price_per_person,
      travelers,
      location_price,
      heighlights,
      start_time,
      end_time,
      schedule,
    } = req.body;

    const subcategory = new Category({
      user: req.user._id,
      name,
      images,
      about,
      address,
      lat,
      lng,
      category,
      title,
      timeslots,
      price_per_person,
      travelers,
      location_price,
      heighlights,
      upload_status: "pending",
      start_time: start_time || "",
      end_time: end_time || "",
      schedule: schedule || "",
    });
    await subcategory.save();

    res.status(201).json({
      success: true,
      message: "Data created successfully",
      subcategory: subcategory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      name,
      images,
      about,
      address,
      lat,
      lng,
      category,
      title,
      timeslots,
      price_per_person,
      travelers,
      location_price,
      heighlights,
      start_time,
      start_date,
      schedule,
    } = req.body;

    const subcategory = new Category({
      user: req.user._id,
      name,
      images,
      about,
      address,
      lat,
      lng,
      category,
      title,
      timeslots,
      price_per_person,
      travelers,
      location_price,
      heighlights,
      upload_status: "active",
      start_time: start_time || "",
      start_date: start_date || "",
      schedule: schedule || "",
    });
    await subcategory.save();

    res.status(201).json({
      success: true,
      message: "Data created successfully",
      subcategory: subcategory,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getCategories = async (req, res) => {
  let query = {};

  if (req.params.category) {
    query.$or = [
      { category: req.params.category },
      { "name.category": req.params.category },
    ];
  }
  query.status = "active";

  const { catId } = req.query;
  if (catId) {
    query.$and = [
      {
        $or: [
          { category: { $ne: catId } },
          { "name.category": { $ne: catId } },
        ],
      },
    ];
  }

  try {
    const categories = await Category.find(query)
      .populate("category")
      .sort({ _id: -1 })
      .lean();

    res.status(200).json({ success: true, categories: categories });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllCategories = async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;
  if (req.params.category) {
    query.$or = [
      { category: req.params.category },
      { "name.category": req.params.category },
    ];
  }

  const { catId, upload_status } = req.query;

  if (catId) {
    query.$and = [
      {
        $or: [
          { category: { $ne: catId } },
          { "name.category": { $ne: catId } },
        ],
      },
    ];
  }
  if (upload_status) {
    query.upload_status = upload_status;
  } else {
    query.upload_status = "active";
  }

  if (req.query.search) {
    const searchQuery = req.query.search;
    query.$or = [
      { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
      { title: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
      { address: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
    ];
  }

  query.status = "active";

  try {
    const categories = await Category.find(query)
      .populate("category")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res.status(200).json({
        success: true,
        categories: categories,
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    } else {
      res.status(200).json({
        success: false,
        categories: [],
        message: "No more categories found",
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getAllCustomerCategories = async (req, res) => {
  let query = {};
  const lastId = parseInt(req.params.id) || 1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: "Invalid last_id" });
  }

  const pageSize = 10;

  const skip = Math.max(0, lastId - 1) * pageSize;
  if (req.params.category) {
    query.$or = [
      { category: req.params.category },
      { "name.category": req.params.category },
    ];
  }

  const { catId, otherId } = req.query;
  if (catId) {
    query.$and = [
      {
        $or: [
          { category: { $ne: catId } },
          { "name.category": { $ne: catId } },
        ],
      },
    ];
  }

  query.status = "active";
  if (otherId) {
    query.user = otherId;
  } else {
    query.upload_status = "active";
  }

  try {
    const categories = await Category.find(query)
      .populate("category")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res.status(200).json({
        success: true,
        categories: categories,
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    } else {
      res.status(200).json({
        success: false,
        categories: [],
        message: "No more categories found",
        count: { totalPage: totalPages, currentPageSize: categories.length },
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.detailsSubCat = async (req, res) => {
  const catId = req.params.id;

  try {
    const category = await Category.findById(catId).populate("category").lean();

    if (category) {
      res.status(200).json({
        success: true,
        category: category,
      });
    } else {
      res.status(200).json({
        success: false,
        message: "No categories found",
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.editCategories = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const {
      name,
      images,
      about,
      address,
      lat,
      lng,
      category,
      title,
      timeslots,
      price_per_person,
      travelers,
      location_price,
      heighlights,
      start_time,
      start_date,
      schedule,
    } = req.body;

    // Create an object to store the fields to be updated
    const updateFields = Object.fromEntries(
      Object.entries({
        name,
        images,
        about,
        address,
        lat,
        lng,
        category,
        title,
        timeslots,
        price_per_person,
        travelers,
        location_price,
        heighlights,
        start_time,
        start_date,
        schedule,
      }).filter(([key, value]) => value !== undefined)
    );

    // Check if there are any fields to update
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).send({
        success: false,
        message: "No valid fields provided for update.",
      });
    }

    const service = await Category.findOneAndUpdate(
      { _id: serviceId },
      {
        ...updateFields,
        updated_at: Date.now(),
      },
      { new: true }
    ).populate("category");

    if (service == null) {
      return res.status(404).json({ message: "Category not found" });
    }

    res
      .status(200)
      .json({ message: `Category updated successfully`, Category: service });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deactivateCategries = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const service = await Category.findOneAndUpdate(
      { _id: serviceId },
      {
        status: req.params.status,
        updated_at: Date.now(),
      },
      { new: true }
    );

    if (service == null) {
      return res.status(404).json({ message: "Category not found" });
    }

    res
      .status(200)
      .json({ message: `Category updated successfully`, Category: service });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.acceptOrRejectpayment = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const { upload_status } = req.body;

    const service = await Category.findOneAndUpdate(
      { _id: serviceId, upload_status: "pending" },
      {
        upload_status: upload_status,
        updated_at: Date.now(),
      },
      { new: true }
    );

    if (service == null) {
      return res.status(404).json({ message: "Category not found" });
    }

    if (upload_status == "reject") {
      const user = await User.findById(service.user);

      if (!user) {
        return res.status(404).json({ message: "Category not found" });
      }

      user.amount = Number(user.amount) + Number(108);
      await user.save();
      const transaction = new Transaction({
        user: service.user,
        amount: Number(108),
        type: "listing-refund",
      });

      await transaction.save();
    }

    res
      .status(200)
      .json({ message: `Category updated successfully`, Category: service });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.deleteCatrgoires = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const service = await Category.findByIdAndDelete(serviceId);

    if (service == null) {
      return res.status(404).json({ message: "Category not found" });
    }

    res
      .status(200)
      .json({ message: `Category deleted successfully`, Category: service });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.getRecommendedCategories = async (req, res) => {
  try {
    const _id = req.query.id || "0"; // User ID from params
    const searchQuery = req.query.search || ''; // Optional search term
    const limit = Math.min(parseInt(req.query.limit) || 10, 10); // Max 10 results

    // Step 1: Get user's location if ID is provided
    let userLocation = null;
    if (_id !== "0") {
      const user = await User.findById(_id).select('location.lat location.lng').lean();
      if (user && user.location) {
        userLocation = {
          lat: parseFloat(user.location.lat),
          lng: parseFloat(user.location.lng)
        };
      }
    }

    // Step 2: Build the base query conditions
    const baseConditions = { status: "active" };
    
    // Step 3: Build the appropriate query based on location availability
    let categories, totalCount;

    if (userLocation) {
      // Location-based search with aggregation pipeline
      const geoNearStage = {
        $geoNear: {
          near: {
            type: "Point",
            coordinates: [userLocation.lng, userLocation.lat]
          },
          distanceField: "distance",
          maxDistance: 30000, // 30km in meters
          spherical: true,
          query: { status: "active" }
        }
      };

      // Add text search if provided
      if (searchQuery) {
        // console.log("Search query provided:", searchQuery);
        geoNearStage.$geoNear.query.$or = [
          { "name.title": { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ];
      }

      const aggregationPipeline = [
        geoNearStage,
        { $sort: { distance: 1 } }, // Sort by nearest first
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "category"
          }
        },
        { $unwind: "$category" }
      ];

      [categories, totalCount] = await Promise.all([
        Category.aggregate(aggregationPipeline),
        Category.countDocuments({
          ...baseConditions,
          ...(searchQuery && {
            $or: [
              { name: { $regex: searchQuery, $options: 'i' } },
              { description: { $regex: searchQuery, $options: 'i' } }
            ]
          }),
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [userLocation.lng, userLocation.lat]
              },
              $maxDistance: 30000
            }
          }
        })
      ]);
    } else {
      // Regular text search without location
      const findQuery = { ...baseConditions };
      
      if (searchQuery) {
        findQuery.$or = [
          { "name.title": { $regex: searchQuery, $options: 'i' } },
          { description: { $regex: searchQuery, $options: 'i' } }
        ];
      }
      
      [categories, totalCount] = await Promise.all([
        Category.find(findQuery)
          .sort({ createdAt: -1 })
          .limit(limit)
          .populate("category")
          .lean(),
        Category.countDocuments(findQuery)
      ]);
    }

    // Step 4: Format the response
    const response = {
      success: true,
      data: {
        categories: categories.map(cat => ({
          ...cat,
          distance: cat.distance ? parseFloat((cat.distance / 1000).toFixed(2)) : undefined
        })),
        pagination: {
          totalItems: totalCount,
          itemsPerPage: categories.length,
          maxDistance: userLocation ? "30km" : undefined,
          hasMore: totalCount > categories.length
        }
      },
      usingLocation: userLocation !== null,
      searchQuery: searchQuery || undefined
    };

    if (categories.length === 0) {
      response.success = false;
      response.message = searchQuery
        ? userLocation
          ? `No "${searchQuery}" found within 30km`
          : `No "${searchQuery}" found`
        : userLocation
          ? "No recommended categories found within 30km"
          : "No recommended categories found";
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getRecommendedCategories:', error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};