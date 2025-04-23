const config = require('config');
const jwt = require('jsonwebtoken');
const admin = require("firebase-admin");
const moment = require("moment");

// Models
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { User } = require('../models/user');
const { sendNotification } = require('../controllers/notificationCreateService');
const Order = require('../models/Order');
const Request = require('../models/Request');
const Coupon = require('../models/Coupon');
const Transaction = require('../models/Transaction');
const LoyalityPoint = require('../models/LoyalityPoint');
const Vehicle = require('../models/Vehicle');
const WebSubCategories = require('../models/WebSubCategories');
const { sendCompleteOrderEmail, cancelOrderCustomer } = require('../controllers/emailservice');
const { Worker } = require("worker_threads");
const jobQueue = require("../routes/jobsecondQueue");

const connectedUsers = {};

module.exports = function (server,app) {
  const io = require("socket.io")(server, {
    cors: { origin: '*' },
    pingTimeout: 60000, 
    pingInterval: 25000, 
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    perMessageDeflate: {
      threshold: 1024 
    }
  });
  
  app.set('socketio', io);

  io.on('connection', (socket) => {

    socket.on('authenticate', async(token) => {
      try {
        const decoded = jwt.verify(token, config.get('jwtPrivateKey'))
        const userId = decoded._id;

        if (!connectedUsers[userId]) {
          connectedUsers[userId] = new Set();
        }
    
        connectedUsers[userId].add(socket.id);

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
    socket.on('send-message', async ({ recipientId, messageText,name},callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
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
        }else{
          conversation.updateAt=Date.now()
          await conversation.save()
        }

        const newMessage = new Message({
          sender: senderId,
          conversationId: conversationId,
          message: messageText,
          seen:[senderId]
        });

        const savedMessage = await newMessage.save();

        connectedUsers[recipientId]?.forEach(socketId => {
          io.to(socketId).emit('recieved-message', savedMessage);
        });
        
        const otherUser = await User.findById(recipientId).select("fcmtoken type").lean()
        
        await sendNotification({
          user : senderId,
          to_id : recipientId,
          description :  `@${name} sent you a message: ${messageText}`,
          type :'message',
          title :"New Message",
          fcmtoken :otherUser.fcmtoken||"",
          usertype:otherUser.type
      })

      return callback(savedMessage);
      } catch (error) {
        console.error('Error sending private message:', error.message);
        // Handle error
        socket.emit('send_message_error', error.message);
      }
    });

    socket.on('send-group-message', async ({ conversationId, messageText,user}) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
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
          connectedUsers[userid.toString()]?.forEach(socketId => {
            io.to(socketId).emit('send-group-message', {...savedMessage.toJSON(),sender:user});
          });

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
      const senderId = Object.keys(connectedUsers).find(userId =>
        connectedUsers[userId].has(socket.id)
      );
      // Remove user from connected users on disconnection
      await allSeen(senderId, recipientId)
      connectedUsers[recipientId]?.forEach(socketId => {
        io.to(socketId).emit('seen-msg',  { seen: true, recipientId });
      });
    });

    socket.on('location-sent', async (data,callback) => {
      const senderId = Object.keys(connectedUsers).find(userId =>
        connectedUsers[userId].has(socket.id)
      );

      if (!senderId) {
        return callback({
          success: false,
          title: 'Authentication Error',
          message: 'Sender ID not found.',
        });
      }
      const {lat,lng,to_id,order} = data
      // await updateUserLocation(senderId,longitude,latitude,address,fcmToken);
  
      connectedUsers[to_id]?.forEach(socketId => {
        io.to(socketId).emit('location-recieved', { lat,lng,to_id,order,senderId });
      });
      callback(data)
    });

    // Handle private messages
    socket.on('send-request-customer', async (data, callback) => {
     try {
      const {
        start_lat,
        start_lng,
        start_address,
        end_lat,
        end_lng,
        end_address,
        price,
        type,
        bookingtype,
        schedule_date,
        schedule_time,
        distance,
        liability,
        ridertype,
        stops,
        paymentId,
        couponId,
        note,
        favUserId,
        order_id,
        travelers,
        subcatId,
        pincode,
        passengerCount,
        paymentType,
        service,
        quantity,
        color,
        size
      } = data;
       const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );

       if (!senderId) {
        return callback({
          success: false,
          title: 'Authentication Error',
          message: 'Sender ID not found.',
        });
      }

      // const findOrder=await Order.findOne({user:senderId,status:"pending"}).lean()

      // if (findOrder) {
      //   return callback({
      //     success: false,
      //     title: 'Request Error',
      //     message: 'You have already created an request.',
      //     request:findOrder
      //   });
      // }


      let query = {};
      if (type === 'parcel') {
        query = { ride_type: { $in: ["parcel", "both"] } };
      } else {
        query = { ride_type: { $in: ["ride", "both"] } };
      }
      query={
        type:"rider",status:"online",...query,isVehicle:true,isRiding:false
      }

      if (favUserId) {
        query={
          _id:favUserId
        }
      }
       
       let userIds=await User.find(query).select("name fcmtoken").lean()
      //  const users = await getUsersInRadius(start_lng, start_lat, 5, address)
 
      if (subcatId) {
        const subCat = await WebSubCategories.findById(subcatId)
        
        if (subCat == null) {
          return callback({
            success: false,
            title: 'Request Error',
            message: "No subCatId found in that area.",
          });
        }
        if (Number(subCat.travelers) - Number(travelers) < 0) {
          return callback({
            success: false,
            title: 'Travelers Error',
            message: "Place is already booked.",
          });
        }
        subCat.travelers=Number(subCat.travelers)-Number(travelers)

        await subCat.save()
      }
 
      //  if (userIds.length == 0 ) {
      //     return callback({
      //       success: false,
      //       title: 'Request Error',
      //       message: "No users found in that area.",
      //     });
      //  }
       const fcmTokens = [...new Set(userIds.map(item => item.fcmtoken).filter(item=>item!==undefined||item!==""))];
       userIds = [...new Set(userIds.map(item => item._id).filter(item=>item!==undefined||item!==""))];
 
       const newRequest = new Order({
         user: senderId,
         price:Number(price).toFixed(2),
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
         type,
         userIds:userIds,
         bookingtype,
         liability,
         ridertype,
         pincode,
         adminprice:(Number(price) * 0.20).toFixed(2),
         paymentId : paymentId||"",
         payment_status : "completed",
         order_id:order_id||"",
         passengerCount:passengerCount||0,
         quantity:quantity||0,
         paymentType:paymentType||"paid",
         color:color||"",
         size:size||"",
         paymentDone: paymentType=='cash' ? true : false
       });

       if (couponId) {
        await Coupon.findByIdAndUpdate(couponId,{$addToSet:{used_by:senderId}}).lean();
        newRequest.coupon = couponId;
      }

       if (bookingtype=='schedule') {
        newRequest.schedule_date=schedule_date
        newRequest.schedule_time=schedule_time
       }
       if (distance) {
        newRequest.distance=distance
       }
       if (note) {
        newRequest.note=note
       }
       if (stops) {
        newRequest.stops=stops
       }
       if (service) {
        newRequest.service=service
       }
 
       await newRequest.save()
       const request=await Order.findById(newRequest._id).populate("user ridertype service liability")
       callback({request,success:true, title: 'Request sent',message:"You have successfully sent a request to all nearby users!"});
        
       for (let user of userIds) {
        connectedUsers[user.toString()]?.forEach(socketId => {
          io.to(socketId).emit('recieve-request-rider', {request,userType:request.user.type,success:true, title: 'New Request',message:"You have received a new request."});
        });
       }
 
       // Ensure all values in data are strings
     const messageData = {
       notiId:"request",
       messageType: "request",
       userType:request.user.type,
       ...Object.fromEntries(
         Object.entries(request).map(([key, value]) => [key, String(value)])
       ) // Ensure all fields in newUpdateFields are strings
     };
     
      const valueData={fcmTokens:fcmTokens,title:"'CabKN: New Request'",description:"You have received a new request.",image:"",weburl:"",data: messageData || {}, }
    
      jobQueue.addJob({ data:valueData });
     
       // Create an array of message objects for each token
    //  const messages = fcmTokens.map(token => ({
    //    token: token,
    //    data: messageData || {}, 
    //    notification: {
    //        title: 'CabKN: New Request',
    //        body: 'You have received a new request.',
    //    },
    //    android: {
    //     notification: {
    //        sound: 'ride', // Exclude the file extension
    //        defaultSound:false,
    //        channelId:"sound_ride",
    //        priority:"high"
    //     },
    //     },
    //     apns: {
    //         payload: {
    //             aps: {
    //                 sound: 'ride.mp3',
    //             },
    //         },
    //     },
    //  }));
    //  try { 
    //   await admin.messaging().sendEach(messages) 
    // } catch (error) {}
 
 
     } catch (error) {
      console.log("error====>>",error)
       callback({
        success: false,
        title: 'Request Error',
        message: error.message,
      });
     }
    });

    socket.on('delete-request-customer', async ({ requestId }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        // Fetch the order
        const order = await Order.findOne({ _id: requestId, user: senderId });
    
        if (!order) {
          return callback({
            success: false,
            title: 'Order Delete',
            message: 'Request ID is invalid.',
          });
        }

        if (order.status !== 'pending') {
          return callback({
            success: false,
            title: 'Order Delete',
            message: "You can't delete this request as it has already been assigned as an order to someone else.",
          });
        }
    
        // Delete the order
        await Order.findByIdAndDelete(requestId);
        if (order.paymentType=='paid') {
        
          const user = await User.findById(senderId);
  
          if (!user) {
            return callback({
              success: false,
              title: 'Order Delete',
              message: "The User with the given ID was not found.",
            });
          }

            user.amount=Number(user.amount) + Number(Number(order.price) - Number(order.adminprice));
            await user.save()
            const transaction=new Transaction({
              user:senderId,
              amount:Number(Number(order.price) - Number(order.adminprice)),
              type:'refunded'
            })
          
            await transaction.save()
            
          }
        
        
        
        // Notify riders to filter the request
        const userIds = await User.find({ type: "rider", status: {$in:["online","offline"]} })
          .select("fcmtoken")
          .lean();
    
        for (let user of userIds) {
          connectedUsers[user._id.toString()]?.forEach(socketId => {
            io.to(socketId).emit('filter-request-rider', {
              request: requestId,
              success: true,
            });
          });
        }
    
        // Callback success
        callback({
          success: true,
          request: order,
          title: 'Order Deleted',
          message: 'The request was successfully deleted and riders notified.',
        });
      } catch (error) {
        console.error('Error deleting request:', error.message);
    
        // Emit error to client and return error in callback
        socket.emit('receive_request_error', error.message);
        callback({
          success: false,
          title: 'Error',
          message: error?.message,
        });
      }
    });    

    socket.on('update-request-rider', async ({ requestId, status }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }

        const user = await User.findById(senderId).lean()

        if (user.status !== 'online') {
          return callback({
            success: false,
            user,
            title: 'Request Update',
            message: "You are not online yet.",
          });
        }
      
        if (user.isVehicle!==true) {
          return callback({
            success: false,
            user,
            title: 'Request Update',
            message: "Your's vehicle is not added yet.",
          });
        }
    
        const order = await Order.findById(requestId).populate("user").populate("ridertype service").populate("liability");
    
        if (!order) {
          return callback({
            success: false,
            title: 'Request Update',
            message: 'Invalid request ID.',
          });
        }
    
        if (order.status !== 'pending') {
          return callback({
            success: false,
            title: 'Request Update',
            message: 'This request has already been booked.',
          });
        }
    
        if (status === 'rejected') { 
          const findorder = await Order.findOne({_id:requestId,rejected_by:{$in:senderId}}).lean();

          if (findorder) {
            return callback({
              success: false,
              request: order,
              title: 'Request Update',
              message: 'The request has already been rejected.',
            });
          }
          // Update order as rejected by this rider
          await Order.findByIdAndUpdate(requestId, { $addToSet: { rejected_by: senderId } });
    
          return callback({
            success: true,
            request: order,
            title: 'Request Rejected',
            message: 'The request was successfully rejected.',
          });
        } else {

          await Order.findByIdAndUpdate(requestId, { $addToSet: { accepted_by: senderId } });

          // Update the order status
          order.status = 'accepted';
          order.vehicle = user.vehicle;

          order.to_id = senderId;
          await order.save();
    
          const date=new Date(order.schedule_date)

          // Send notifications
          await sendNotification({
            user: senderId,
            to_id: order.user._id,
            description:order.bookingtype=='live'? `Your request has been accepted by ${user?.name} and your ride has been started.`:`Your request has been accepted by ${user?.name} and your ride has been scheduled for ${date.toLocaleDateString()}.`,
            type: "order",
            title: "Ride accepted",
            fcmtoken: order?.user?.fcmtoken,
            order: requestId,
            usertype:order?.user?.type
          });
    
          // await sendNotification({
          //   user: request.user?._id.toString(),
          //   to_id: senderId,
          //   description: `You have accepted an offer from ${request.user?.name} and your ride has been started.`,
          //   type: "order",
          //   title: "Offer Accepted",
          //   fcmtoken: order?.user?.fcmtoken,
          //   order: orderId,
          //   request: requestId,
          // });

          connectedUsers[order.user._id.toString()]?.forEach(socketId => {
            io.to(socketId).emit('update-request-customer',  {
              success: true,
              title: 'Offer Accepted',
              type:order.bookingtype,
              message: order.bookingtype=='live'?`Your offer has been accepted by ${order?.user?.name} and your order has been started.`:`Your offer has been accepted by ${order?.user?.name} and your order has been scheduled for ${date.toLocaleDateString()}.`,
            });
          });
        
          // Notify other riders to filter out the request
          const userIds = await User.find({
            type: "rider",
            status: {$in:["online","offline"]},
            _id: { $ne: senderId.toString() },
          }).select("fcmtoken").lean();
    
          for (let user of userIds) {
            io.to(user._id.toString()).emit('filter-request-rider', {
              request: requestId,
              success: true,
            });
          }
    
          return callback({
            success: true,
            title: 'Offer Accepted',
            message: 'The order has been started and notifications sent.',
          });
        }
      } catch (error) {
        console.error('Error updating request:', error.message);
    
        // Emit error to client and invoke callback with error
        socket.emit('receive_request_error', error.message);
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });

    socket.on('send-alert-rider', async ({ orderId }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        const order = await Order.findById(orderId).populate("user");
    
        if (!order) {
          return callback({
            success: false,
            title: 'Order',
            message: 'Invalid order ID.',
          });
        }
    
        if (order.status == 'pending') {
          return callback({
            success: false,
            title: 'Order',
            message: 'This Order is not booked yet.',
          });
        }

          // Notify the customer
          const user = await User.findById(senderId).select("name").lean();
    
          await sendNotification({
            user: senderId,
            to_id: order.user._id.toString(),
            description: `${user?.name} has arrived your destination.`,
            type: "order",
            title: "Ride update",
            fcmtoken: order.user?.fcmtoken,
            order: orderId,
            usertype:order?.user?.type
          });

          connectedUsers[order.user._id.toString()]?.forEach(socketId => {
            io.to(socketId).emit('receive-alert-customer',  {
              success: true,
              order,
              title: "Order update",
              message: `${user?.name} has arrived your destination.`,
            });
          });
    
          return callback({
            success: true,
            order,
            title: "Order update",
            message: 'Alert has been sent to the customer.',
          });
      } catch (error) {
        console.error('Error updating request:', error.message);
    
        // Emit error to client and invoke callback with error
        socket.emit('receive_request_error', error.message);
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });

    socket.on('reminder-alert-rider', async ({ orderId }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        const order = await Order.findById(orderId).populate("user to_id");
    
        if (!order) {
          return callback({
            success: false,
            title: 'Order',
            message: 'Invalid order ID.',
          });
        }
    
        if (order.status == 'pending') {
          return callback({
            success: false,
            title: 'Order',
            message: 'This Order is not booked yet.',
          });
        }
    
          await sendNotification({
            user: senderId,
            to_id: order.user._id.toString(),
            description: `Your upcoming ride is on ${moment(order.schedule_date).format('MM/DD/YYYY')} from ${order.start_address} to ${order.end_address}`,
            type: "order",
            title: "Ride Reminder",
            fcmtoken: order.user.fcmtoken,
            order: orderId,
            usertype:order?.user?.type
          });

          await sendNotification({
            user: senderId,
            to_id: order.to_id._id.toString(),
            description: `Your upcoming ride is on ${moment(order.schedule_date).format('MM/DD/YYYY')} from ${order.start_address} to ${order.end_address}`,
            type: "order",
            title: "Ride Reminder",
            fcmtoken: order.to_id.fcmtoken,
            order: orderId,
            usertype:order?.to_id?.type
          });
    
          return callback({
            success: true,
            order,
            title: "Order update",
            message: 'Reminder has been sent to both users.',
          });
      } catch (error) {
        console.error('Error updating request:', error.message);
    
        // Emit error to client and invoke callback with error
        socket.emit('receive_request_error', error.message);
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });

    socket.on('send-payment-alert-rider', async ({ orderId }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        const order = await Order.findById(orderId).populate("user").populate("to_id service").lean();
    
        if (!order) {
          return callback({
            success: false,
            title: 'Order',
            message: 'Invalid order ID.',
          });
        }
    
        if (order.status !== 'completed') {
          return callback({
            success: false,
            title: 'Order',
            message: 'This Order is not completed yet.',
          });
        }
    
          await sendNotification({
            user: senderId,
            to_id: order?.user?._id.toString(),
            description: `${order.to_id?.name} has requested you to pay his order payment.`,
            type: "order-payment",
            title: "Ride update",
            fcmtoken: order?.user?.fcmtoken,
            order: orderId,
            usertype:order?.user?.type
          });

          connectedUsers[order.user._id.toString()]?.forEach(socketId => {
            io.to(socketId).emit('receive-payment-alert-customer', {
              success: true,
              order,
              title: "Order update",
              message: `${order.to_id?.name} has requested you to pay his order payment.`,
            });
          });
    
          return callback({
            success: true,
            order,
            title: "Order update",
            message: 'Alert has been sent to the customer.',
          });
      } catch (error) {
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });

    socket.on('update-request-customer', async ({ requestId, status, orderId }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        const order = await Order.findById(orderId).populate("user").populate("ridertype").populate("liability");
    
        if (!order) {
          return callback({
            success: false,
            title: 'Order Update',
            message: 'Invalid order ID.',
          });
        }
    
        if (order.status !== 'pending') {
          return callback({
            success: false,
            title: 'Order Update',
            message: 'You have already assigned that order to someone else.',
          });
        }
    
        if (status === 'rejected') {
          // Reject the request
          await Request.findByIdAndUpdate(requestId, { status: "rejected" }).populate("user");
    
          return callback({
            success: true,
            title: 'Request Rejected',
            message: 'The request was successfully rejected.',
          });
        } else {

          const findOrder=await Order.findOne({user:senderId,status:{$in:['accepted',"order-start"]},bookingtype:"live"}).lean()

          if (findOrder) {
            return callback({
              success: false,
              title: 'Request Error',
              message: 'You are already in a ride. Please complete this before starting another one.',
              order:findOrder
            });
          }
          // Accept the request
          const request = await Request.findById(requestId).populate("user");
    
          if (!request) {
            return callback({
              success: false,
              title: 'Request Update',
              message: 'Invalid request ID.',
            });
          }

          if (request.user.status !== 'online') {
            return callback({
              success: false,
              title: 'Request Update',
              message: "Rider is not online yet.",
            });
          }

          const vehicle= await Vehicle.findOneAndDelete({ user : request.user._id });
        
          if (!vehicle) {
            return callback({
              success: false,
              title: 'Request Update',
              message: "Rider's vehicle is not available yet.",
            });
          }
        
          if (request.user.isRiding==true) {
            return callback({
              success: false,
              title: 'Request Update',
              message: "Rider is not available yet.",
            });
          }
    
          request.status= "accepted";

          await request.save()
          // Update the order status
          order.status = 'accepted';
          order.vehicle = vehicle._id;

          order.to_id = request.user._id;
          await order.save();

          // if (order.bookingtype=='live') {
          //   await User.findByIdAndUpdate(request.user._id,{ isRiding : true },{new:true})
          // }

    
          const date=new Date(order.schedule_date)

          // Send notifications
          await sendNotification({
            user: senderId,
            to_id: request.user?._id.toString(),
            description:order.bookingtype=='live'? `Your offer has been accepted by ${order?.user?.name} and your ride has been started.`:`Your offer has been accepted by ${order?.user?.name} and your ride has been scheduled for ${date.toLocaleDateString()}.`,
            type: "order",
            title: "Offer Accepted",
            fcmtoken: request?.user?.fcmtoken,
            order: orderId,
            request: requestId,
            usertype:request?.user?.type
          });
    
          // await sendNotification({
          //   user: request.user?._id.toString(),
          //   to_id: senderId,
          //   description: `You have accepted an offer from ${request.user?.name} and your ride has been started.`,
          //   type: "order",
          //   title: "Offer Accepted",
          //   fcmtoken: order?.user?.fcmtoken,
          //   order: orderId,
          //   request: requestId,
          // });

          connectedUsers[request.user._id.toString()]?.forEach(socketId => {
            io.to(socketId).emit('update-request-rider', {
              success: true,
              title: 'Offer Accepted',
              type:order.bookingtype,
              message: order.bookingtype=='live'?`Your offer has been accepted by ${order?.user?.name} and your order has been started.`:`Your offer has been accepted by ${order?.user?.name} and your ride has been scheduled for ${date.toLocaleDateString()}.`,
            });
          });
          // Notify other riders to filter out the request
          const userIds = await User.find({
            type: "rider",
            status: {$in:["online","offline"]},
            _id: { $ne: request.user._id.toString() },
          })
            .select("fcmtoken")
            .lean();
    
          for (let user of userIds) {
            io.to(user._id.toString()).emit('filter-request-rider', {
              request: orderId,
              success: true,
            });
          }
    
          return callback({
            success: true,
            title: 'Offer Accepted',
            message: 'The ride has been started and notifications sent.',
          });
        }
      } catch (error) {
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });

    socket.on('update-order-admin', async ({ to_id, orderId }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        const order = await Order.findById(orderId).populate("user").populate("ridertype").populate("liability");
    
        if (!order) {
          return callback({
            success: false,
            title: 'Order Update',
            message: 'Invalid order ID.',
          });
        }

    
        if (order.status !== 'pending') {
          return callback({
            success: false,
            title: 'Order Update',
            message: 'Order has already been assigned to someone else.',
          });
        }

          const to_user = await User.findById(to_id).lean()

          if (!to_user) {
            return callback({
              success: false,
              title: 'Request Error',
              message: 'You are already in a ride. Please complete this before starting another one.',
            });
          }

          // Update the order status
          order.status = 'accepted';
          order.vehicle = to_user.vehicle;

          order.to_id = to_user._id;
          await order.save();

          // if (order.bookingtype=='live') {
          //   await User.findByIdAndUpdate(request.user._id,{ isRiding : true },{new:true})
          // }

    
          const date=new Date(order.schedule_date)

          // Send notifications
          await sendNotification({
            user: senderId,
            to_id: to_user?._id.toString(),
            description:order.bookingtype=='live'? `You have been assigned by admin to a ride and your ride has been started.`:`You have been assigned by admin to a ride and your ride has been scheduled for ${date.toLocaleDateString()}.`,
            type: "order",
            title: "Offer Accepted",
            fcmtoken: to_user?.fcmtoken,
            order: orderId,
            usertype:to_user?.type
          });
    
          // await sendNotification({
          //   user: request.user?._id.toString(),
          //   to_id: senderId,
          //   description: `You have accepted an offer from ${request.user?.name} and your ride has been started.`,
          //   type: "order",
          //   title: "Offer Accepted",
          //   fcmtoken: order?.user?.fcmtoken,
          //   order: orderId,
          //   request: requestId,
          // });

          connectedUsers[to_user._id.toString()]?.forEach(socketId => {
            io.to(socketId).emit('update-request-rider',{
              success: true,
              title: 'Offer Accepted',
              type:order.bookingtype,
              message: order.bookingtype=='live'? `You have been assigned by admin to a ride and your ride has been started.`:`You have been assigned by admin to a ride and your ride has been scheduled for ${date.toLocaleDateString()}.`,
            });
          });
        
          // Notify other riders to filter out the request
          const userIds = await User.find({
            type: "rider",
            status: {$in:["online","offline"]},
            _id: { $ne: to_user._id.toString() },
          })
            .select("fcmtoken")
            .lean();
    
          for (let user of userIds) {
            connectedUsers[user._id.toString()]?.forEach(socketId => {
              io.to(socketId).emit('filter-request-rider', {
                request: orderId,
                success: true,
              });
            });
          }
    
          return callback({
            success: true,
            title: 'Offer Accepted',
            message: 'The ride has been started and notifications sent.',
          });
        
      } catch (error) {
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });

    socket.on('pick-rider', async ({ orderId }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        const order = await Order.findByIdAndUpdate(orderId,{status:"order-start",pickTime:Date.now()} ,{new:true}).populate("user");
    
        if (!order) {
          return callback({
            success: false,
            title: 'Order',
            message: 'Invalid order ID.',
          });
        }
    
        if (order.status == 'pending') {
          return callback({
            success: false,
            title: 'Ride',
            message: 'This Ride is not booked yet.',
          });
        }

          // Notify the customer
          const user = await User.findById(senderId).select("name").lean();
    
          await sendNotification({
            user: senderId,
            to_id: order.user._id.toString(),
            description: `${user?.name} has started your order.`,
            type: "order",
            title: "Ride update",
            fcmtoken: order.user.fcmtoken,
            order: orderId,
            usertype:order.user?.type
          });

          connectedUsers[order.user._id.toString()]?.forEach(socketId => {
            io.to(socketId).emit('pick-customer', {
              success: true,
              order,
              title: "Ride update",
              message: `${user?.name} has started your ride.`,
            });
          });
    
          return callback({
            success: true,
            order,
            title: "Ride update",
            message: 'Alert has been sent to the customer.',
          });
      } catch (error) {
        console.error('Error updating request:', error.message);
    
        // Emit error to client and invoke callback with error
        socket.emit('receive_request_error', error.message);
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });

    socket.on('update-order-rider', async ({ orderId, status }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        const validStatuses = ["completed",'cancelled' ];
        if (!validStatuses.includes(status)) {
          return callback({
            success: false,
            title: 'Ride Update',
            message: 'Status is invalid.',
          });
        }
    
        // Find and update the order
        const updatedOrder = await Order.findOneAndUpdate(
          { _id: orderId, status: {$in:["accepted","order-start"]}, to_id: senderId },
          { status: status,completed_date:Date.now() },
          { new: true }
        ).populate("to_id").populate("user").populate("ridertype").populate("liability").populate("vehicle").lean();
    
        if (!updatedOrder) {
          return callback({
            success: false,
            title: 'Ride Update',
            message: 'Ride not found or cannot be updated.',
          });
        }
        const user = await User.findById(updatedOrder.user._id);
        const addresses = await LoyalityPoint.findOne({}).lean();
    
        if (status === 'cancelled') {
          await Order.findOneAndUpdate({ _id: orderId, to_id: senderId }, { refunded: true });
          if (updatedOrder.paymentType=='paid') {
             if (!user) {
               return callback({
                 success: false,
                 title: 'Ride Delete',
                 message: "The User with the given ID was not found.",
               });
             }
           
             user.amount=Number(user.amount) + Number(updatedOrder.price);
             await user.save()

             connectedUsers[user._id.toString()]?.forEach(socketId => {
              io.to(socketId).emit('user_update', {success:true,user:user});
            });
           
             const transaction=new Transaction({
               user:updatedOrder.user._id,
               amount:Number(updatedOrder.price),
               type:'refunded',
               order:orderId
             });
           
             await transaction.save();
         }
        }else{
          await sendCompleteOrderEmail(updatedOrder.user.email,updatedOrder.order_id,updatedOrder.user.name,updatedOrder.start_address,updatedOrder.end_address,updatedOrder.to_id.name,updatedOrder.vehicle?.license||updatedOrder.vehicle?.name||"",updatedOrder.price,updatedOrder.price)
          await Order.findOneAndUpdate({ _id: orderId,},{ dropTime: Date.now() })
          const transaction=new Transaction({
            user:updatedOrder.user._id,
            amount:(addresses?.points_per_ride||10),
            type:'points',
            order:orderId
          })
        
          await transaction.save();

          user.points=Number(user.points) + (addresses?.points_per_ride||10);
          await user.save()
        }
        if (updatedOrder.bookingtype=='live') {
          await User.findByIdAndUpdate(senderId,{ isRiding : false },{new:true})
        }
    
        // Notify the customer about the update
        await sendNotification({
          user: senderId,
          to_id: updatedOrder.user._id.toString(),
          description: `Your Ride has been ${status} by ${updatedOrder?.to_id?.name} and you have successfully earned ${addresses?.points_per_ride||10} points for this ride.`,
          type: "order",
          title: "Ride Update",
          fcmtoken: updatedOrder.user.fcmtoken,
          order: orderId,
          noti: false,
          usertype:updatedOrder.user?.type
        });
    
        // Emit relevant messages based on the order status
        if (status === 'cancelled') {
          io.to(updatedOrder.user._id.toString()).emit('cancel-order-customer', {
            success: true,
            order: updatedOrder,
            title: 'Ride Update',
            message: 'Your Ride has been cancelled.',
          });
        } else {
    
          io.to(updatedOrder.user._id.toString()).emit('update-order-customer', {
            success: true,
            order: updatedOrder,
            title: 'Ride Update',
            message: `Your Ride have been successfully ${status}.`,
          });
        }
    
        // Callback success response
        return callback({
          success: true,
          order: updatedOrder,
          title: 'Ride Updated',
          message: `The Ride has been ${status} successfully.`,
        });
      } catch (error) {
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });
    
    socket.on('tip-order-customer', async ({ orderId,amount }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }
    
        // Find and update the order
        const updatedOrder = await Order.findOne({ _id: orderId, user: senderId }).populate("to_id").populate("user").populate("ridertype").populate("liability").lean();
    
        if (!updatedOrder) {
          return callback({
            success: false,
            title: 'Ride Update',
            message: 'Ride not found.',
          });
        }

          const user = await User.findById(updatedOrder.to_id._id);
  
          if (!user) {
            return callback({
              success: false,
              title: 'Ride Update',
              message: "The User with the given ID was not found.",
            });
          }

          await Order.findOneAndUpdate({ _id: orderId, user: senderId },{ tip:Number(amount) },{new:true})

            user.amount=Number(user.amount) + Number(amount);
            await user.save()
          
            const transaction=new Transaction({
              user:senderId,
              amount:Number(amount),
              type:'tip',
              order:orderId
            })
        
          await transaction.save()
    
        // Notify the customer about the update
        await sendNotification({
          user: senderId,
          to_id: updatedOrder.to_id._id.toString(),
          description: `Congratulations you have got ${amount} tip from ${updatedOrder?.user?.name}.`,
          type: "order",
          title: "Ride update",
          fcmtoken: updatedOrder.to_id.fcmtoken,
          order: orderId,
          noti: false,
          usertype:updatedOrder.to_id?.type
        });

        connectedUsers[updatedOrder.to_id._id.toString()]?.forEach(socketId => {
          io.to(socketId).emit('tip-order-rider', {
            success: true,
            order: updatedOrder,
            title: 'Ride Update',
            message: `Congratulations you have got ${amount} tip from ${updatedOrder?.user?.name}.`,
          });
        });
    
        // Callback success response
        return callback({
          success: true,
          order: updatedOrder,
          title: 'Ride Updated',
          message: `You have successfully given ${amount} as a tip`,
        });
      } catch (error) {
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });
    socket.on('cancel-order-customer', async ({ orderId,reason }, callback) => {
      try {
        const senderId = Object.keys(connectedUsers).find(userId =>
          connectedUsers[userId].has(socket.id)
        );
    
        if (!senderId) {
          return callback({
            success: false,
            title: 'Authentication Error',
            message: 'Sender ID not found.',
          });
        }

        const status='cancelled'
    
        // Find and update the order
        const updatedOrder = await Order.findOne({ _id: orderId, user: senderId }).populate("to_id").populate("user").populate("ridertype").populate("liability").lean();
    
        if (!updatedOrder) {
          return callback({
            success: false,
            title: 'Ride Update',
            message: 'Ride not found or cannot be cancelled.',
          });
        }

        if (["completed",'cancelled','pending'].includes(updatedOrder.status)) {
          return callback({
            success: false,
            title: 'Ride Update',
            message: 'Ride not found or cannot be cancelled.',
          });
        }

        if (['accepted'].includes(updatedOrder.status)) {
          const user = await User.findById(senderId);
  
          if (!user) {
            return callback({
              success: false,
              title: 'Ride Update',
              message: "The User with the given ID was not found.",
            });
          }

          await Order.findOneAndUpdate({ _id: orderId, user: senderId },{status:status,refunded:true,completed_date:Date.now()},{new:true})

          if (updatedOrder.paymentType=='paid') {
        
            user.amount=Number(user.amount) + Number(Number(updatedOrder.price) - Number(updatedOrder.adminprice));
            await user.save()

            connectedUsers[user._id.toString()]?.forEach(socketId => {
              io.to(socketId).emit('user_update',   {success:true,user:user});
            });
          
            const transaction=new Transaction({
              user:senderId,
              amount:Number(Number(updatedOrder.price) - Number(updatedOrder.adminprice)),
              type:'refunded',
              order:orderId
            })
        
          await transaction.save()
        }
        }

        if (['order-start'].includes(updatedOrder.status)) {
          await Order.findOneAndUpdate({ _id: orderId, user: senderId },{status:status,refunded:false},{new:true})
        }

    
        if (updatedOrder.bookingtype=='live') {
          if (updatedOrder.to_id._id) {
            await User.findByIdAndUpdate(updatedOrder.to_id._id,{ isRiding : false },{new:true})
          }
        }

        await cancelOrderCustomer(updatedOrder.order_id, updatedOrder?.user?.name, updatedOrder?.user?.email, updatedOrder.start_address, updatedOrder.end_address, updatedOrder.price, updatedOrder.distance, moment(updatedOrder.schedule_date).format('MM/DD/YYYY'), reason)
    
        // Notify the customer about the update
        await sendNotification({
          user: senderId,
          to_id: updatedOrder.to_id._id.toString(),
          description: `Your Ride has been ${status} by ${updatedOrder?.user?.name}.`,
          type: "order",
          title: "Ride cancelled",
          fcmtoken: updatedOrder.to_id.fcmtoken,
          order: orderId,
          noti: false,
          usertype:updatedOrder.to_id?.type
        });
        const order=await Order.findOneAndUpdate({ _id: orderId, user: senderId },{status:status},{new:true}).populate("to_id").populate("user").populate("ridertype").populate("liability").lean();
        
        connectedUsers[updatedOrder.to_id._id.toString()]?.forEach(socketId => {
          io.to(socketId).emit('cancel-order-rider', {
            success: true,
            order: order,
            title: 'Ride Update',
            message: 'Your Ride has been cancelled.',
          });
        });
    
        // Callback success response
        return callback({
          success: true,
          order: order,
          title: 'Ride Updated',
          message: `The Ride has been ${status} successfully.`,
        });
      } catch (error) {
        return callback({
          success: false,
          title: 'Error',
          message: error.message,
        });
      }
    });

    socket.on('seen-group-msg', async ({ conversationId }) => {
      const senderId = Object.keys(connectedUsers).find(userId =>
        connectedUsers[userId].has(socket.id)
      );
      // Remove user from connected users on disconnection
      await conversationAllseen(senderId, conversationId)
      connectedUsers[senderId]?.forEach(socketId => {
        io.to(socketId).emit('seen-msg',  { seen: true, conversationId });
      });
    });

    // Handle user disconnection
    socket.on('disconnect', () => {
      for (const userId in connectedUsers) {
        if (connectedUsers[userId].has(socket.id)) {
          connectedUsers[userId].delete(socket.id);
    
          // Clean up if no more active sockets for user
          if (connectedUsers[userId].size === 0) {
            delete connectedUsers[userId];
          }
    
          break;
        }
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
// Start worker thread
const worker = new Worker("./routes/notificationsecondProcessor.js");
jobQueue.processJobs((job) => new Promise((resolve) => {
    worker.postMessage(job);
    worker.once("message", resolve);
}));
