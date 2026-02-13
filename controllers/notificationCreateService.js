const Notification = require("../models/Notification");

const admin = require("firebase-admin");
const { User } = require("../models/user");

exports.sendNotification = async ({
  user = "",
  to_id = "",
  description = "",
  type = "",
  title = "",
  fcmtoken = "",
  order = "",
  request = "",
  support = "",
  usertype = "rider",
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
        request,
        order,
        support,
      }).filter(([key, value]) => value !== "")
    );
    // console.log("user", user, "to_id", to_id);
    const notification = new Notification(updateFields);
    console.log("hit", notification);
    await notification.save();
    console.log("hit hit after save", notification);

    const recipient = await User.findOne({ _id: user })
      .select("-password -fcmtoken -code -likes")
      .lean();

    const newUpdateFields = Object.fromEntries(
      Object.entries({
        request,
        order,
        support,
      }).filter(([key, value]) => value !== "")
    );

    // Ensure all values in data are strings
    const messageData = {
      notiId: "normal_noti",
      recipient: JSON.stringify(recipient), // Convert recipient to a string
      messageType: type,
      ...Object.fromEntries(
        Object.entries(newUpdateFields).map(([key, value]) => [
          key,
          String(value),
        ])
      ), // Ensure all fields in newUpdateFields are strings
    };
    if (fcmtoken) {
      const message = {
        data: messageData || {},
        token: fcmtoken, // replace with the user's device token
        notification: {
          title:
            usertype == "rider" ? "CabKN Driver: " + title : "CabKN: " + title,
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

      const res = await admin.messaging().send(message);
      console.log("notii==", res);
    }
  } catch (error) {
    console.log("errorrr====>", error?.message || "ad", error);
  }
};
