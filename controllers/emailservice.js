require('dotenv').config();

const nodemailer = require('nodemailer');
const logger = require('../startup/logger'); // Adjust the path as needed

exports.sendEmail = async (email, code) => {
     // Create a Nodemailer transporter object
     const transporter = nodemailer.createTransport({
          host: 'smtp.office365.com', // SMTP server address for Outlook
          port: 587, // SMTP port
          secure: false, // Set to true for port 465, false for others
          auth: {
            user: 'Support@cabkn.com', // Your Outlook email
            pass: process.env.EMAIL_PASSWORD // Your Outlook email password or app password
          }
     });

     // Email data
     const mailOptions = {
          from: 'Support@cabkn.com',
          to: email, // Replace with the recipient's email address
          subject: 'Cabkn app Verification',
          text: 'Your Cabkn app verification code is ' + code,
     };

     // Send the email
     transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
               logger.error('Error sending email: ', error);
          } else {
               logger.info('Email sent: ' + info.response);
          }
     });
}

const joiningEmailTemplat=(eventName,eventDate,location,typeTicket)=>{
     const template=`<!DOCTYPE html>
     <html lang="en">
     <head>
         <meta charset="UTF-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <style>
             body {
                 font-family: Arial, sans-serif;
                 margin: 0;
                 padding: 0;
                 background-color: #f4f4f4;
             }
     </head>
     <body>
     <div
  style="
    display: flex;
    font-family: Roboto, sans-serif;
    margin: 16px;
    border: 1px solid #ccc;
    position: relative;
  "
>
  <div
    style="position: relative; border-right: 1px dashed #ccc; padding: 24px"
  ></div>
  <div style="padding: 24px; flex: 1">
    <div style="display: flex; margin-bottom: 48px">
      <div style="flex: 1; width: 50%; box-sizing: border-box">
        <span
          style="
            color: #2196f3;
            text-transform: uppercase;
            line-height: 24px;
            font-size: 13px;
            font-weight: 500;
          "
          >Your ticket for</span>
        <strong
          style="font-size: 20px; font-weight: 400; text-transform: uppercase"
          >${eventName}</strong>
      </div>
    </div>
    <div style="display: flex; margin-bottom: 48px">
      <div style="flex: 1; width: 50%; box-sizing: border-box; padding-right: 16px" >
        <span
          style="
            text-transform: uppercase;
            color: #757575;
            font-size: 13px;
            line-height: 24px;
            font-weight: 600;
          "
          >Date and time</span>
        <span
          style="
            font-size: 16px;
            line-height: 24px;
            font-weight: 500;
            color: #2196f3;
          "
          >${eventDate}</span>
        <span style="font-size: 13px; line-height: 24px; font-weight: 500">7:00 am to 9:00 pm (GMT+1)</span>
      </div>
      <div style="flex: 1; width: 50%; box-sizing: border-box">
        <span
          style="
            text-transform: uppercase;
            color: #757575;
            font-size: 13px;
            line-height: 24px;
            font-weight: 600;
          "
          >Location</span
        >
        <span
          style="
            font-size: 16px;
            line-height: 24px;
            font-weight: 500;
            color: #2196f3;
          "
          >${location}</span
        >
      </div>
    </div>
    <div style="display: flex; margin-bottom: 48px">
      <div
        style="flex: 1; width: 50%; box-sizing: border-box; padding-right: 16px"
      >
        <span
          style="
            text-transform: uppercase;
            color: #757575;
            font-size: 13px;
            line-height: 24px;
            font-weight: 600;
          "
          >Ticket type</span
        >
        <span style="font-size: 13px; line-height: 24px; font-weight: 500"
          >${typeTicket}</span
        >
      </div>
    </div>
  </div>
  <div
    style="
      padding: 24px;
      background-color: #2196f3;
      display: flex;
      flex-direction: column;
      position: relative;
    "
  >
    <div style="flex: 1">
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/7/78/Qrcode_wikipedia_fr_v2clean.png"
        style="width: 128px; padding: 4px; background-color: #fff"
      />
    </div>
  </div>
</div>
     </body>
     </html>
     `
     
     return template;
}

exports.purchaseEmail = async (email,eventName,eventDate,location,typeTicket) => {
      // Create a Nodemailer transporter object
      const transporter = nodemailer.createTransport({
          host: 'smtp.office365.com', // SMTP server address for Outlook
          port: 587, // SMTP port
          secure: false, // Set to true for port 465, false for others
          auth: {
            user: 'Support@cabkn.com', // Your Outlook email
            pass: process.env.EMAIL_PASSWORD // Your Outlook email password or app password
          }
     });

     const html=joiningEmailTemplat(eventName,eventDate,location,typeTicket)

     // Email data
     const mailOptions = {
          from: 'Support@cabkn.com',
          to: email, // Replace with the recipient's email address
          subject: "TicketKN ticekt purchase",
          html: html,
     };

     // Send the email
     transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
               logger.error('Error sending email: ', error);
          } else {
               logger.info('Email sent: ' + info.response);
          }
     });
}


exports.deleteUserEmail = async (email, deleteLink) => {
     // Create a Nodemailer transporter object
     const transporter = nodemailer.createTransport({
      host: 'smtp.office365.com', // SMTP server address for Outlook
      port: 587, // SMTP port
      secure: false, // Set to true for port 465, false for others
      auth: {
        user: 'Support@cabkn.com', // Your Outlook email
        pass: process.env.EMAIL_PASSWORD // Your Outlook email password or app password
      }
 });

  const mailOptions = {
    from: 'Support@cabkn.com',
    to: email,
       subject: 'Cabkn APP CORP - Confirm Your Account Deletion',
       text: `
            Dear Cabkn APP CORP User,
            
            We received a request to permanently delete your Cabkn APP CORP account. If you did not make this request, please ignore this email.
            
            To proceed with the deletion of your account and all associated data, please click the link below:
            
            Delete My Account: ${deleteLink}
            
            Please note that once you confirm the deletion, this action cannot be undone, and all your data will be permanently removed from our system.
            
            If you have any questions or concerns, feel free to contact our support team.
            
            Thank you for using Cabkn APP CORP.
            
            Best regards,
            The Cabkn APP CORP Team
       `
   };
   

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
       if (error) {
            logger.error('Error sending email: ', error);
       } else {
            logger.info('Email sent: ' + info.response);
       }
  });
}


exports.sendCompleteOrderEmail = async (email,order_id,customerName,PICKUP_ADDRESS,DROPOFF_ADDRESS,DRIVER_NAME,VEHICLE_REGISTRATION,Subtotal,TOTAL_AMOUNT,review_link="") => {
  // Create a Nodemailer transporter object
  const transporter = nodemailer.createTransport({
       host: 'smtp.office365.com', // SMTP server address for Outlook
       port: 587, // SMTP port
       secure: false, // Set to true for port 465, false for others
       auth: {
         user: 'Support@cabkn.com', // Your Outlook email
         pass: process.env.EMAIL_PASSWORD // Your Outlook email password or app password
       }
  });

  const template=`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ride Completion Email</title>
    <style>
        body {
            font-family: 'Poppins', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #121212;
            color: #ffffff;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #1E1E1E;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
            text-align: left;
        }
        .header {
            text-align: center;
            font-size: 22px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #ffffff;
        }
        .section {
            background: #2A2A2A;
            padding: 15px;
            border-radius: 10px;
            margin-top: 15px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 10px;
            color: #0EBE3C;
        }
        .info {
            font-size: 16px;
            line-height: 1.1;
            color: #ffffff;
        }
        .info strong {
            color: #ffffff;
        }
        .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 14px;
            opacity: 0.8;
            color: #ffffff;
        }
        .app-badges {
            display: flex;
            justify-content: center;
            align-self:center;
            gap: 15px;
            margin: 20px 25px;
        }
        .app-badge {
            max-width: 150px;
            height: auto;
        }
        .cta-section {
            text-align: center;
            margin: 25px 0;
        }
        .cta-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #0EBE3C;
        }
        .cta-text {
            font-size: 16px;
            margin-bottom: 20px;
            line-height: 1.5;
            color: #ffffff;
        }
        .review-button {
            display: inline-block;
            background-color: #0EBE3C;
            color: white;
            padding: 12px 25px;
            text-align: center;
            text-decoration: none;
            font-weight: bold;
            border-radius: 8px;
            margin: 20px 0;
            font-size: 16px;
            transition: background-color 0.3s;
        }
        .review-button:hover {
            background-color: #0ca835;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="image" style="text-align: center;">
            <img src="https://api.cabkn.com/api/image/cabkIcon.png" alt="Ride Image" style="max-width: 100%; border-radius: 10px; height:150px;">
        </div>

           <!-- New CTA Section for App Installation -->
        <div class="cta-section">
            <div class="cta-title">Enjoy a Seamless Ride Experience</div>
            <div class="cta-text">
                Download the CabKN app for faster bookings, real-time tracking, exclusive offers, and easier payments.
            </div>
            <div class="app-badges">
                <a href="https://play.google.com/store/apps/details?id=com.cabkn.app" target="_blank">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/Google_Play_Store_badge_EN.svg/2560px-Google_Play_Store_badge_EN.svg.png" alt="Get on Google Play" class="app-badge">
                </a>
                <a href="https://apps.apple.com/pk/app/cabkn/id6740235227" target="_blank">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Download_on_the_App_Store_Badge.svg/2560px-Download_on_the_App_Store_Badge.svg.png" alt="Download on the App Store" class="app-badge">
                </a>
            </div>
            <div class="footer">
                Rate your ride and share your experience to help us serve you better!
            </div>
        </div>

        <div class="header">Dear ${customerName},<br>Your ride has been completed</div>
        <div class="section">
            <div class="section-title">Trip Detail</div>
            <div class="info">
                <p><strong>OrderId:</strong> ${order_id}</p>
                <p><strong>Pickup Address:</strong> ${PICKUP_ADDRESS}</p>
                <p><strong>Drop-off Address:</strong> ${DROPOFF_ADDRESS}</p>
            </div>
        </div>
        <div class="section">
            <div class="section-title">Driver Detail</div>
            <div class="info">
                <p><strong>Name:</strong> ${DRIVER_NAME}</p>
                <p><strong>Vehicle Registration Number:</strong> ${VEHICLE_REGISTRATION}</p>
            </div>
        </div>
        <div class="section">
            <div class="section-title">Fare Detail</div>
            <div class="info">
                <p><strong>Sub Total:</strong> ${Subtotal}</p>
                <p><strong>Total Amount:</strong> <span style="font-size: 20px; font-weight: bold;">${TOTAL_AMOUNT}</span></p>
            </div>
        </div>

      <!-- Conditional Review Button Section -->
        ${review_link ?
          `<div style="text-align: center; margin-top: 25px;">
            <a href="${review_link}" class="review-button">Leave a Review</a>
          </div>` : `<div></div>`
        }
          
        <div class="footer">&copy; 2025 CabKN. All rights reserved.</div>
    </div>
</body>
</html>
`

  // Email data
  const mailOptions = {
       from: 'Support@cabkn.com',
       to: email, // Replace with the recipient's email address
       subject: 'Ride complete',
       html: template,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
       if (error) {
            logger.error('Error sending email: ', error);
       } else {
            logger.info('Email sent: ' + info.response);
       }
  });
}

exports.cancelOrderCustomer = async ( order_id, userName, userEmail, startLocation, endLocation, price, distance, rideDate, reason ) => {
  // Create a Nodemailer transporter object
  const transporter = nodemailer.createTransport({
       host: 'smtp.office365.com', // SMTP server address for Outlook
       port: 587, // SMTP port
       secure: false, // Set to true for port 465, false for others
       auth: {
         user: 'Support@cabkn.com', // Your Outlook email
         pass: process.env.EMAIL_PASSWORD // Your Outlook email password or app password
       }
  });

  const htmlContent = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <h2 style="color: #e63946;">🚫 Ride Cancelled</h2>
    <p><strong>Order Number:</strong> ${order_id}</p>
    <p><strong>User Name:</strong> ${userName}</p>
    <p><strong>User Email:</strong> ${userEmail}</p>
    <p><strong>Start Location:</strong> ${startLocation}</p>
    <p><strong>End Location:</strong> ${endLocation}</p>
    <p><strong>Distance:</strong> ${distance} km</p>
    <p><strong>Price:</strong> $${price}</p>
    <p><strong>Ride Date:</strong> ${rideDate}</p>
    <p><strong>Reason for Cancellation:</strong> ${reason || "Not specified"}</p>
  </div>
`;

  // Email data
  const mailOptions = {
       from: 'Support@cabkn.com',
       to: "Mrmarlegrant@gmail.com", // Replace with the recipient's email address
       subject: `Ride Cancelled: Order #${order_id}`,
       html: htmlContent,
  };

  // Send the email
  transporter.sendMail(mailOptions, (error, info) => {
       if (error) {
            logger.error('Error sending email: ', error);
       } else {
            logger.info('Email sent: ' + info.response);
       }
  });
}