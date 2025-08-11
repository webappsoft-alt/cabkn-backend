const { default: mongoose } = require("mongoose");
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
    query.$and = [
      {
        $or: [
          { title: { $regex: searchQuery, $options: "i" } }, // Search in title
          { address: { $regex: searchQuery, $options: "i" } }, // Search in address
        ],
      },
    ];
  }

  query.status = "active"; // Apply active status filter
  console.log("Final Query:", query);
  try {
    const categories = await Category.find(query)
      .populate("category")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();
    console.log("Categories:", categories);
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
    console.log("Error fetching categories:", error);
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
  if (req.query.search) {
    const searchQuery = req.query.search;
    query.$or = [
      { name: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
      { title: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
      { address: { $regex: searchQuery, $options: "i" } }, // Case-insensitive search
    ];
  }
  console.log("Query for categories:", query);
  try {
    const categories = await Category.find(query)
      .populate("category")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();
    console.log("Categories:", categories);
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
    console.log("Error fetching categories:", error);
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
    const searchQuery = req.body.search || "";
    const limit = Math.min(parseInt(req.body.limit) || 10, 10);
    const location = req.body.location || {};

    // Step 1: Get user's location if provided
    let userLocation = null;
    const { lat, lng } = location;
    if (lat && lng) {
      userLocation = {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      };
    }

    // Step 2: Build the base query conditions
    const baseConditions = {
      status: "active",
      upload_status: "active",
    };

    // Step 3: Build the search query
    const findQuery = { ...baseConditions };
    if (searchQuery) {
      findQuery.$or = [
        { "name.title": { $regex: searchQuery, $options: "i" } },
        { about: { $regex: searchQuery, $options: "i" } },
        { address: { $regex: searchQuery, $options: "i" } },
      ];
    }

    // Step 4: Fetch all potential categories
    let categories = await mongoose
      .model("WebSubCategories")
      .find(findQuery)
      .populate("category")
      .lean();

    // Step 5: Filter by distance if location is provided
    if (userLocation) {
      categories = categories.filter((cat) => {
        if (!cat.lat || !cat.lng) return false;

        const catLat = parseFloat(cat.lat);
        const catLng = parseFloat(cat.lng);

        // Calculate distance using Haversine formula
        const distance = getDistanceFromLatLonInKm(
          userLocation.lat,
          userLocation.lng,
          catLat,
          catLng
        );

        cat.distance = distance; // Add distance to the category object
        return distance <= 30; // Filter within 30km
      });

      // Sort by distance
      categories.sort((a, b) => a.distance - b.distance);
    } else {
      // Default sort by creation date if no location
      categories.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Apply limit after filtering
    categories = categories.slice(0, limit);

    // Step 6: Format the response
    const response = {
      success: true,
      data: {
        categories: categories.map((cat) => ({
          ...cat,
          distance: cat.distance
            ? parseFloat(cat.distance.toFixed(2))
            : undefined,
        })),
        pagination: {
          totalItems: categories.length,
          itemsPerPage: categories.length,
          maxDistance: userLocation ? "30km" : undefined,
          hasMore: false, // Since we're filtering client-side, we can't know if there are more
        },
      },
      usingLocation: userLocation !== null,
      searchQuery: searchQuery || undefined,
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
    console.error("Error in getRecommendedCategories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Helper function to calculate distance between two coordinates in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
