const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { User } = require('../models/user');

exports.sendMessage = async (req, res) => {
  try {
    const { conversationId, message } = req.body;
    // Check if a conversation already exists
    const existingConversation = await Conversation.findById(conversationId);
    if (!existingConversation) {
     return res.status(500).json({ success:false,message: 'No conversation found against that Id' });
    }

    // Create and save the new message
    const newMessage = new Message({
      conversationId,
      sender: req.user_id,
      message,
    });
    await newMessage.save();

    res.status(201).json({ success:true, message: newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create conversation or message' });
  }
};

exports.getUserSearchConversations = async (req, res) => {
  try {
    const searchQuery = req.query.search || ""; // Get search query from request

    let query = {
      type: "message",
      participants: { $size: 2 }, // Ensure the conversation has exactly two participants
    };

    if (req.params.id) {
      query._id = { $lte: req.params.id };
    }

    const pageSize = 10;

    const conversations = await Conversation.aggregate([
      { $match: query },
      { $sort: { updateAt: -1 } }, // Sort by updateAt field in descending order
      {
        $lookup: {
          from: "users", // Name of the users collection
          localField: "participants",
          foreignField: "_id",
          as: "participantsDetails",
        },
      },
      {
        $project: {
          _id: 1,
          type: 1,
          participants: 1,
          admin: 1,
          participantsDetails: {
            _id: 1,
            name: 1,
            email: 1,
            phone: 1, // Include phone field for search
            image: 1,
            address: 1,
            gender: 1,
            status: 1,
            type: 1,
          },
          createdAt: 1,
        },
      },
      {
        $addFields: {
          // Include both participants in the response
          user1: {
            $arrayElemAt: ["$participantsDetails", 0], // First participant
          },
          user2: {
            $arrayElemAt: ["$participantsDetails", 1], // Second participant
          },
        },
      },
      {
        $match: {
          $or: [
            { "user1.name": { $regex: searchQuery, $options: "i" } }, // Search by name for user1
            { "user1.email": { $regex: searchQuery, $options: "i" } }, // Search by email for user1
            { "user1.phone": { $regex: searchQuery, $options: "i" } }, // Search by phone for user1
            { "user2.name": { $regex: searchQuery, $options: "i" } }, // Search by name for user2
            { "user2.email": { $regex: searchQuery, $options: "i" } }, // Search by email for user2
            { "user2.phone": { $regex: searchQuery, $options: "i" } }, // Search by phone for user2
          ],
        },
      },
      { $limit: pageSize },
    ]);

    // Fetch the latest message for each conversation
    for (let conversation of conversations) {
      const latestMessage = await Message.findOne({ conversationId: conversation._id })
        .sort({ createdAt: -1 }) // Get the latest message
        .limit(1);

      conversation.lastMsg = latestMessage || null; // Attach the latest message or null if no messages exist
      delete conversation.participantsDetails; // Remove unnecessary fields
      delete conversation.participants;
    }

    res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch conversations", error });
  }
};

exports.getAdminSideMessages = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const existingConversation = await Conversation.findById(conversationId);
    
    if (!existingConversation) {
     return res.status(500).json({ success:false,message: 'No conversation found against that Id' });
    }

    let query = {};

    if (req.params.id) {
      query._id = { $lt: req.params.id };
    }

    query.conversationId = existingConversation._id;

    const pageSize = 30;

    // Find conversations where the user is a participant
    const messages = await Message.find(query).sort({ _id: -1 }).limit(pageSize).lean();

    if (messages.length > 0) {
      // Respond with a success status and the list of conversations
      return res.status(200).json({ success: true, messages, });
    }
    return res.status(200).json({ success: false, messages: [], });

  } catch (error) {
    // If an error occurs during the execution, respond with a 500 Internal Server Error
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

exports.getUserConversations = async (req, res) => {
  try {
    // Extract the user ID from the request object
    const userId = req.user._id;

    let query = {};

    if (req.params.id) {
      query._id = { $lt: req.params.id };
    }

    query.participants = { $in: [userId] }

    const pageSize = 10;

    // const user = await User.findById(userId).select("messageCount")

    // Find conversations where the user is a participant
    const conversations = await Conversation.find(query).sort({ updateAt: -1 }).select('-messageId').populate("participants").populate("event").limit(pageSize).lean()

    // let seen=0

      for (let conversation of conversations) {
        const messages = await Message.find({ conversationId: conversation?._id }).sort({ _id: -1 }).limit(1);
        if (conversation.type!=='groupchat') { 
          const otherId = conversation.participants.filter(id => id?._id.toString() !== userId.toString())
          conversation.otherUser = otherId[0]
          delete conversation.participants
        }
        const unseenMessages = await Message.find({ conversationId: conversation?._id, seen: { $nin: [req.user._id] } })
        if (messages.length > 0) {
          conversation.lastMsg = messages[0]
          conversation.unseen = unseenMessages.length
          // seen=seen+unseenMessages.length
        }else{
          conversation.lastMsg = null
          conversation.unseen = 0
          // seen=seen
        }
      }
      // user.messageCount=seen
      // await user.save()
  
    // Respond with a success status and the list of conversations
    res.status(200).json({ success: true, conversations });
  } catch (error) {
    console.log(error)
    // If an error occurs during the execution, respond with a 500 Internal Server Error
    res.status(500).json({ message: 'Failed to fetch conversations', error });
  }
};
exports.getMessages = async (req, res) => {
  try {
    const to_id = req.params.userId;

    const userId = req.user._id;

    // Check if a conversation already exists
    const existingConversation = await Conversation.findOne({ participants: { $all: [userId, to_id] },type:'message' }).select('-messageId').populate("participants")

    if (!existingConversation) {
      const user = await User.findById(to_id).select('-password');

      return res.status(200).json({ success: true, messages: [], user });
    }

    let query = {};

    if (req.params.id) {
      query._id = { $lt: req.params.id };
    }
    query.conversationId = existingConversation._id;

    const pageSize = 30;

    // Find conversations where the user is a participant
    const messages = await Message.find(query).sort({ _id: -1 })
      .limit(pageSize)
      .lean();

    const otherId = existingConversation.participants.filter(id => id?._id.toString() !== userId)

    if (messages.length > 0) {
      await msgSeen(userId, to_id)
      // Respond with a success status and the list of conversations
      return res.status(200).json({ success: true, messages, user: otherId[0] });
    }
    return res.status(200).json({ success: false, messages: [], user: otherId[0] });

  } catch (error) {
    // If an error occurs during the execution, respond with a 500 Internal Server Error
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

exports.getGroupMessages = async (req, res) => {
  try {
    const conversationId = req.params.conversation;

    const userId = req.user._id;

    let query = {};

    if (req.params.id) {
      query._id = { $lt: req.params.id };
    }
    query.conversationId = conversationId;

    const pageSize = 20;

    const messages = await Message.find(query).populate("sender").sort({ _id: -1 })
      .limit(pageSize)
      .lean();

    const conversation = await Conversation.findById(conversationId).populate("participants").populate("event")

    if (messages.length > 0) {
      await conversationAllseen(userId, conversationId)
      // Respond with a success status and the list of conversations
      return res.status(200).json({ success: true, messages,conversation });
    }
    return res.status(200).json({ success: false, messages: [],conversation});

  } catch (error) {
    // If an error occurs during the execution, respond with a 500 Internal Server Error
    res.status(500).json({ message: 'Failed to fetch conversations',error });
  }
};

const conversationAllseen = async (senderId, conversationId) => {
  try {

    const message = await Message.updateMany(
        { conversationId: conversationId, seen:{$nin:[senderId]} },
        {$addToSet:{seen:senderId}}
      );
      // const user=await User.findById(senderId).select("messageCount")

      // if (message.modifiedCount>0) {
      //   const messageCount=Number(user.messageCount)-Number(message.modifiedCount);
      //   user.messageCount=messageCount>0?messageCount:0;

      //   await user.save()
      // }

  } catch (error) {
  }
};

const msgSeen = async (senderId, recipientId) => {
  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
       type:"message"
    });

    if (conversation) {
      const message=await Message.updateMany(
        { conversationId: conversation._id, seen:{$nin:[senderId]} },
        {$addToSet:{seen:senderId}}
      );
      // const user=await User.findById(senderId).select("messageCount")

      // if (message.modifiedCount>0) {
      //   const messageCount=Number(user.messageCount)-Number(message.modifiedCount);
      //   user.messageCount=messageCount>0?messageCount:0;

      //   await user.save()
      // }
    }
  } catch (error) {
  }
};


exports.allSeen = async (req, res) => {
  try {
    const otherUserId = req.params.userId;
    const userId = req.user._id;

    const conversation = await Conversation.findOne({
      participants: { $all: [otherUserId, userId] },
    });

    if (conversation) {
      const otherId = conversation.participants.filter(id => id.toString() !== userId)
      const updateResult = await Message.updateMany(
        { conversationId: conversation._id, sender: otherId[0], seen: false },
        { $set: { seen: true } }
      );
      // Respond with a success status and the list of conversations
      return res.status(200).json({ success: true, updateResult });
    }
    res.status(200).json({ success: false, });
  } catch (error) {
    // If an error occurs during the execution, respond with a 500 Internal Server Error
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};


exports.newMessage = async (req, res) => {
  try {
    const to_id = req.params.userId;

    const userId = req.user._id;

    // Check if a conversation already exists
    const existingConversation = await Conversation.findOne({ participants: { $all: [userId, to_id] } }).select('-messageId').populate("participants")

    if (!existingConversation) {
      const user = await User.findById(to_id).select('-password');

      return res.status(200).json({ success: true, messages: [], user });
    }

    let query = {};

    if (req.params.id) {
      query._id = { $gt: req.params.id };
    }
    query.conversationId = existingConversation._id;

    const pageSize = 30;

    // Find conversations where the user is a participant
    const messages = await Message.find(query)
      .sort({ _id: 1 }) // Change to ascending order to get recent messages
      .limit(pageSize)
      .lean();

    if (messages.length > 0) {
      // Respond with a success status and the list of conversations
      return res.status(200).json({ success: true, messages, });
    }
    return res.status(200).json({ success: false, messages: [], });

  } catch (error) {
    // If an error occurs during the execution, respond with a 500 Internal Server Error
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
};

