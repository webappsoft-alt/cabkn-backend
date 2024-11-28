const Food = require("../models/Food");

exports.createPost = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      mealtime,
      calories
    } = req.body;
    const userId = req.user._id;

    const program = new Food({
      user:userId,
      name,
      description,
      image,
      mealtime,
      calories
    });
    
    await program.save();
    res.status(200).json({success: true,message: "Food created successfully",food:program,});
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.editPost = async (req, res) => {
  try {
    const {
      name,
      description,
      image,
      mealtime,
      calories
    } = req.body;
    const productId = req.params.id;
    const userId = req.user._id;

    // Create an object to store the fields to be updated
    let updateFields = Object.fromEntries(
      Object.entries({
        name,
        description,
        image,
        mealtime,
        calories
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

    const program = await Food.findOneAndUpdate(
      { _id: productId,user:userId },
      updateFields,
      { new: true }
    )

    if (!program)
      return res
        .status(404)
        .send({
          success: false,
          message: "The Food with the given ID was not found.",
        });

    res.send({success: true,message: "Food updated successfully",food: program,});
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

exports.getPrograms = async (req, res) => {
 
  let query = {};
  const userId = req.user._id;

  const lastId = parseInt(req.params.id)||1;

  // Check if lastId is a valid number
  if (isNaN(lastId) || lastId < 0) {
    return res.status(400).json({ error: 'Invalid last_id' });
  }


  query.status='active';
  query.user=userId;

  const pageSize = 10;

  const skip = Math.max(0, (lastId - 1)) * pageSize;


  const programs = await Food.find(query).sort({ _id: -1 }).skip(skip).limit(pageSize).lean()

  const totalCount = await Food.countDocuments(query);
  const totalPages = Math.ceil(totalCount / pageSize);

  res.send({ success: programs.length==0? false : true, foods: programs,count: { totalPage: totalPages, currentPageSize: programs.length } });
};

exports.filterPrograms = async (req, res) => {
 
  let query = {};
  const userId = req.user._id;

  
  if (req.params.id) {
    query._id = { $lt: req.params.id };
  }

  const pageSize = 10;

  query.status='active';

  const programs = await Food.find(query).sort({ _id: -1 }).sort({ _id: -1 }).limit(pageSize).lean();

  res.send({ success: programs.length==0? false : true, foods: programs});
};

exports.deletePostById = async (req, res) => {
  try {
    const postId = req.params.id;

    const program = await Food.findOneAndUpdate({ _id: postId },{ status:"deleted" },{ new:true });

    if (!program) {
      return res
        .status(404)
        .json({
          message:
            "Food not found or user does not have permission to delete it",
        });
    }

    res.status(200).json({ message: "Food deleted successfully", food: program });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
