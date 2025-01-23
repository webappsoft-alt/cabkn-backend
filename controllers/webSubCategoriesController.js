const Category = require("../models/WebSubCategories");

exports.create = async (req, res) => {
  try {
    const { name, images, about, address, lat, lng, category,title } = req.body;

    const subcategory = new Category({
      name,
      images,
      about,
      address,
      lat,
      lng,
      category,
      title
    });
    await subcategory.save();

    res
      .status(201)
      .json({
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
    query.category = req.params.category;
  }
  query.status='active'
  
  try {
    const categories = await Category.find(query).populate("category").sort({ _id: -1 }).lean();

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
    query.category = req.params.category;
  }

  query.status='active'

  try {
    const categories = await Category.find(query).populate("category")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res
        .status(200)
        .json({
          success: true,
          categories: categories,
          count: { totalPage: totalPages, currentPageSize: categories.length },
        });
    } else {
      res
        .status(200)
        .json({
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
    query.category = req.params.category;
  }
  query.status='active'

  try {
    const categories = await Category.find(query).populate("category").sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const totalCount = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCount / pageSize);

    if (categories.length > 0) {
      res
        .status(200)
        .json({
          success: true,
          categories: categories,
          count: { totalPage: totalPages, currentPageSize: categories.length },
        });
    } else {
      res
        .status(200)
        .json({
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

exports.editCategories = async (req, res) => {
  try {
    const serviceId = req.params.id;

    const { name, images, about, address, lat, lng, category,title } = req.body;

    const service = await Category.findOneAndUpdate(
      { _id: serviceId },
      {
        name,
        images,
        about,
        address,
        lat,
        lng,
        category,
        title,
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
