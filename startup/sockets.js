const config = require('config');
const jwt = require('jsonwebtoken');

// Models
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { User } = require('../models/user');
const { sendNotification } = require('../controllers/notificationCreateService');

const connectedUsers = {};

module.exports = function (server) {

  const io = require("socket.io")(server)


  io.on('connection', (socket) => {

    // Handle user authentication
    socket.on('authenticate', (token) => {
      try {
        const decoded = jwt.verify(token, config.get('jwtPrivateKey'))
        const userId = decoded._id;

        connectedUsers[userId] = socket.id;

        // Notify the client about successful authentication
        socket.emit('authenticated', userId);

        // Join user to their unique room (socket.io room)
        socket.join(userId);
      } catch (error) {
        console.error('Authentication failed:', error.message);
        // Handle authentication failure
        socket.emit('authentication_failed', "Invalid token.");
      }
    });

    // Handle private messages
    socket.on('send-message', async ({ recipientId, messageText,name}) => {
      try {
        const senderId = Object.keys(connectedUsers).find(
          (key) => connectedUsers[key] === socket.id
        );

        const conversation = await Conversation.findOne({
          participants: { $all: [senderId, recipientId] },
          type:'message'
        });

        let conversationId = !conversation ? "" : conversation._id

        if (!conversation) {
          // Create a new conversation if it doesn't exist
          const newConversation = new Conversation({
            participants: [senderId, recipientId],
          });
          conversationId = newConversation._id

          await newConversation.save();
        }

        const newMessage = new Message({
          sender: senderId,
          conversationId: conversationId,
          message: messageText,
          seen:[senderId]
        });

        const savedMessage = await newMessage.save();
        
        // Emit the new message to the sender and recipient
        io.to(senderId).emit('send-message', savedMessage);
        io.to(recipientId).emit('send-message', savedMessage);
        
        const otherUser = await User.findById(recipientId).select("fcmtoken")
        
        await sendNotification({
          user : senderId,
          to_id : recipientId,
          description :  `@${name} sent you a message: ${messageText}`,
          type :'message',
          title :"New Message",
          fcmtoken :otherUser?.fcmtoken,
      })

      } catch (error) {
        console.error('Error sending private message:', error.message);
        // Handle error
        socket.emit('send_message_error', error.message);
      }
    });

    socket.on('send-group-message', async ({ conversationId, messageText,user}) => {
      try {
        const senderId = Object.keys(connectedUsers).find(
          (key) => connectedUsers[key] === socket.id
        );

        const conversation = await Conversation.findById(conversationId);


        const newMessage = new Message({
          sender: senderId,
          conversationId: conversationId,
          message: messageText,
          seen:[senderId]
        });

        const savedMessage = await newMessage.save();
                

        for (let userid of conversation.participants) {
          io.to(userid.toString()).emit('send-group-message', {...savedMessage.toJSON(),sender:user});

          if (userid.toString() === senderId) continue;

          // const otherUser = await User.findById(userid).select("messageCount")
          
          // const messageCount=Number(otherUser.messageCount)+1;
          // otherUser.messageCount=messageCount;
          // await otherUser.save()
  
        //   await sendNotification({
        //     user : senderId,
        //     to_id : userid,
        //     description :  `@${name} sent you a message: ${messageText}`,
        //     type :'message',
        //     title :"New Message",
        //     fcm_token :otherUser?.fcm_token,
        // })
      }

      } catch (error) {
        console.error('Error sending private message:', error.message);
        // Handle error
        socket.emit('send_message_error', error.message);
      }
    });

    // Handle disconnection
    socket.on('seen-msg', async ({ recipientId }) => {
      const senderId = Object.keys(connectedUsers).find(
        (key) => connectedUsers[key] === socket.id
      );
      // Remove user from connected users on disconnection
      await allSeen(senderId, recipientId)
      io.to(recipientId).emit('seen-msg', { seen: true, recipientId });
    });

    socket.on('seen-group-msg', async ({ conversationId }) => {
      const senderId = Object.keys(connectedUsers).find(
        (key) => connectedUsers[key] === socket.id
      );
      // Remove user from connected users on disconnection
      await conversationAllseen(senderId, conversationId)
      io.to(senderId).emit('seen-msg', { seen: true, conversationId });
    });
    socket.on('disconnect', () => {
      // Remove user from connected users on disconnection
      const userId = Object.keys(connectedUsers).find(
        (key) => connectedUsers[key] === socket.id
      );
      if (userId) {
        delete connectedUsers[userId];
        console.log(`User ${userId} disconnected`);
      }
    });
  });
}

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
const allSeen = async (senderId, recipientId) => {
  try {
    const conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
      type:"message"
    });

    if (conversation) {

      const message = await Message.updateMany(
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