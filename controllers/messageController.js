const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { User } = require('../models/user');

exports.sendMessage = async (req, res) => {
  try {
    const { to_id, message } = req.body;
    const userId = req.user._id;

    let conversationId = ''
    // Check if a conversation already exists
    const existingConversation = await Conversation.findOne({ participants: { $all: [userId, to_id] } });
    if (existingConversation) {
      conversationId = existingConversation._id
    } else {
      // Create a new conversation if it doesn't exist
      const conversation = new Conversation({ participants: [to_id, userId] });
      await conversation.save();
      conversationId = conversation._id
    }

    // Create and save the new message
    const newMessage = new Message({
      conversationId,
      sender: userId,
      message,
    });
    await newMessage.save();

    // Save the conversation (if new)
    if (!existingConversation) {
      await Conversation.findByIdAndUpdate(
        conversationId,
        { $addToSet: { messageId: newMessage._id } },
        { new: true }
      )
    }

    res.status(201).json({ message: newMessage });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create conversation or message' });
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
    const conversations = await Conversation.find(query).sort({ _id: -1 }).select('-messageId').populate("participants").populate("event").limit(pageSize).lean()

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

