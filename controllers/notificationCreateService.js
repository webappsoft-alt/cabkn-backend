const Notification = require("../models/Notification");

const admin = require("firebase-admin");

exports.sendNotification = async ({
     user = '',
     to_id = '',
     description = '',
     type = '',
     title = '',
     fcmtoken = '',
     event="",
     purchase=""
}) => {
     try {

          // Create an object to store the fields to be updated
  const updateFields = Object.fromEntries(
     Object.entries({
          user,
          to_id,
          type,
          description,
          title,
          event,
          purchase
     }).filter(([key, value]) => value !== "")
   );
 
          const notification = new Notification(updateFields);

          await notification.save();
          if (fcmtoken) {
               const message = {
                 token: fcmtoken, // replace with the user's device token
                 notification: {
                   title: title,
                   body: description,
                 },
                 android: {
                   notification: {
                     sound: "default",
                   },
                 },
                 apns: {
                   payload: {
                     aps: {
                       sound: "default",
                     },
                   },
                 },
               };
         
             await admin.messaging().send(message);

             }
     } catch (error) {
     }
}

