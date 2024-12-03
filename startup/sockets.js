const config = require('config');
const jwt = require('jsonwebtoken');
const admin = require("firebase-admin");

// Models
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { User } = require('../models/user');
const { sendNotification } = require('../controllers/notificationCreateService');
const { updateUserLocation, getUsersInRadius } = require('../controllers/UserLocation');
const Order = require('../models/Order');
const Request = require('../models/Request');

const connectedUsers = {};

module.exports = function (server,app) {

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

    // socket.on('location-update', async ({ longitude, latitude, address,fcmToken }) => {
    //   const senderId = Object.keys(connectedUsers).find((key) => connectedUsers[key] === socket.id);

    //   await updateUserLocation(senderId,longitude,latitude,address,fcmToken);
  
    //   io.to(senderId).emit('location-update', { message : "Location Update successfully!" });
    // });

    // Handle private messages
    socket.on('send-request-customer', async ({ address,start_lat,start_lng, start_address,end_lat,end_lng,end_address,price,type }) => {
     try {
       const senderId = Object.keys(connectedUsers).find(
         (key) => connectedUsers[key] === socket.id
       );
 
       let userIds=await User.find({type:"customer",status:"online"}).select("name fcmtoken").lean()
      //  const users = await getUsersInRadius(start_lng, start_lat, 5, address)
 
 
       if (userIds.length == 0 ) {
           return io.to(senderId).emit('send-request-customer', { success:false , title: 'Request Error',message:"No users found in that area."});
       }
       const fcmTokens = [...new Set(userIds.map(item => item.fcmtoken).filter(item=>item!==undefined||item!==""))];
       userIds = [...new Set(userIds.map(item => item._id).filter(item=>item!==undefined||item!==""))];
 
       const newRequest = new Order({
         user: senderId,
         price,
         start_location:{
           type:"Point",
           coordinates: [Number(start_lng),Number(start_lat)],
         },
         end_location:{
           type:"Point",
           coordinates: [Number(end_lng),Number(end_lat)],
         },
         start_address,
         end_address,
         type
       });
 
       await newRequest.save()
       const request=await Order.findById(newRequest._id).populate("user")
       io.to(senderId).emit('send-request-customer', {request,success:true, title: 'Request sent',message:"You have successfully sent a request to all nearby users!"});
        
       for (let user of userIds) {
         io.to(user.toString()).emit('recieve-request-rider', {request,success:true, title: 'New Request',message:"You have received a new request."});
       }
 
       // Ensure all values in data are strings
     const messageData = {
       messageType: "request",
       ...Object.fromEntries(
         Object.entries(request).map(([key, value]) => [key, String(value)])
       ) // Ensure all fields in newUpdateFields are strings
     };
       // Create an array of message objects for each token
     const messages = fcmTokens.map(token => ({
       token: token,
       data: messageData || {}, 
       notification: {
           title: 'New Request',
           body: 'You have received a new request.',
       },
       android: {
           notification: {
               sound: 'default',
           },
       },
       apns: {
           payload: {
               aps: {
                   sound: 'default',
               },
           },
       },
     }));
     try { 
      await admin.messaging().sendEach(messages) 
    } catch (error) {}
 
 
     } catch (error) {
       console.error('Error sending private message:', error.message);
       // Handle error
       socket.emit('receive_request_error', error.message);
     }
    });

    // Handle private messages
    socket.on('update-request-rider', async ({ requestId,price,status }) => {
      try {
        const senderId = Object.keys(connectedUsers).find(
          (key) => connectedUsers[key] === socket.id
        );

        const order=await Order.findById(requestId).populate("user")
        if (order.status !== 'pending') {
           io.to(senderId).emit('update-request-ride', {success:false,request:order,title: 'Request Update',message:"This request has already been booked."});
          return;
        }

        if (status=='rejected') {
          io.to(senderId).emit('update-request-ride', {success:true,request:order,title: 'Request Update',message:"Request rejected successfully!"});
        }else{

           const newRequest = new Request({
             user: senderId,
             order:requestId, 
             to_id:order.user._id,
             price:price,
            });

            await newRequest.save()

            io.to(senderId).emit('update-request-ride', {success:true,request:newRequest,title: 'Request Update',message:"Request sent successfully!"});
            
            const user=await User.findById(senderId).select("name").lean()

            await sendNotification({
              user: senderId,
              to_id: order.user._id.toString(),
              description:`You have a received a new offer by `+user?.name,
              type: "offer",
              title: "New Offer",
              fcmtoken:  order.user.fcmtoken,
              order: requestId,
              request:newRequest._id
            });
            const request = await Request.findById(newRequest._id).populate("user").lean();

            io.to(order.user._id.toString()).emit('receive-request-customer', {success:true,request:request,title: 'New Offer',message:`You have a received a new offer by `+user?.name,});
        }
      } catch (error) {
        socket.emit('receive_request_error', error.message);
      }
    });

     // Handle private messages
    socket.on('update-request-customer', async ({ requestId,status,orderId,paymentId }) => {
     try {
       const senderId = Object.keys(connectedUsers).find(
         (key) => connectedUsers[key] === socket.id
       );
       const order=await Order.findById(orderId).populate("user")
       if (order.status !== 'pending') {
          io.to(senderId).emit('update-request-customer', {success:false,request:order,title: 'Order Update',message:"You have already assign that order to someone else."});
         return;
       }
       if (status=='rejected') {
         await Request.findByIdAndUpdate(requestId,{status:"rejected"}).populate("user")
        io.to(senderId).emit('update-request-customer', {success:true,title: 'Request Update',message:"Request rejected successfully!"});
       }else{
         const request= await Request.findByIdAndUpdate(requestId,{status:"accepted"},{new:true}).populate("user")
         order.status='accepted'
         order.to_id=request.user._id
         order.paymentId=paymentId
         await order.save()

         await sendNotification({
           user: senderId,
           to_id: request.user?._id.toString(),
           description:`Your offer have been accepted by `+order?.user?.name+" and your order has been started.",
           type: "order",
           title: "Offer accepted",
           fcmtoken: request?.user?.fcmtoken,
           order: orderId,
           request:requestId
         });
         await sendNotification({
           user: request.user?._id.toString(),
           to_id: senderId,
           description:`You have accepted an offer from `+request.user?.name+" and your order has been started.",
           type: "order",
           title: "Offer accepted",
           fcmtoken: order?.user?.fcmtoken,
           order: orderId,
           request:requestId
         });
         io.to(senderId).emit('update-request-customer', {success:true,title: 'Offer accepted',message:`Your order has been started.`});
         io.to(request.user._id.toString()).emit('update-request-rider', {success:true,title: 'Offer accepted',message:`Your offer have been accepted by `+order?.user?.name+" and your order has been started."});
       }
     } catch (error) {
       socket.emit('receive_request_error', error.message);
     }
    });

     // Handle private messages
     socket.on('update-order-rider', async ({ orderId,status }) => {
      try {
        const senderId = Object.keys(connectedUsers).find(
          (key) => connectedUsers[key] === socket.id
        );

        const validStatuses = ["completed",'cancelled']
  
        if (!validStatuses.includes(status)) {
          return io.to(senderId).emit('update-order-rider', {success:false,title: 'Order Update',message:"Status is invalid"});
        }

        const updatedSession = await Order.findOneAndUpdate(
          { _id: orderId,status:"accepted",to_id:senderId },
          {
            status: status,
          },
          { new: true }
        ).populate("to_id").populate("user").lean()
        if (updatedSession == null) {
          return io.to(senderId).emit('update-order-rider', {success:false,title: 'Order Update',message:"Order not found."});
        }
  
        if (status=='cancelled') {
          // const fiftyPer=Number(updatedSession.price) * 0.50
          // const refund= await refundPayment(updatedSession.paymentId,fiftyPer)
          // if (!['pending','failed','canceled'].includes(refund.status)) {
          //  await Order.findOneAndUpdate({ _id: orderId,to_id:senderId },{ refunded: true})
          // }
        }

  
        await sendNotification({
          user: senderId,
          to_id: updatedSession.user._id.toString(),
          description:`Your Order has been ${status} by `+ updatedSession?.to_id?.name,
          type: "order",
          title: "Order update",
          fcmtoken:  updatedSession.user.fcmtoken,
          order: orderId,
          noti:false
        });
        if (status == 'cancelled') {
          io.to(senderId).emit('cancel-order-customer', {success:true,order:updatedSession,title: 'Order Update',message:`Your order has been ${status} by `+updatedSession?.to_id?.name,});
          io.to(updatedSession.user._id.toString()).emit('cancel-order-rider', {success:true,order:updatedSession,title: 'Order Update',message:`Your order has been cancelled`});
        }else{
          io.to(senderId).emit('update-order-customer', {success:true,order:updatedSession,title: 'Order Update',message:`Your order has been ${status} by `+updatedSession?.to_id?.name,});
          io.to(updatedSession.user._id.toString()).emit('update-order-rider', {success:true,order:updatedSession,title: 'Order Update',message:`You have successfully ${status} an order!`});
        }
      } catch (error) {
        socket.emit('receive_request_error', error.message);
      }
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

    app.set('socketio', io);
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