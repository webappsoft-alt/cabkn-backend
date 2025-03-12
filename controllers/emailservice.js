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
            user: 'Support@ticketkn.com', // Your Outlook email
            pass: process.env.EMAIL_PASSWORD // Your Outlook email password or app password
          }
     });

     // Email data
     const mailOptions = {
          from: 'Support@ticketkn.com',
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
            user: 'Support@ticketkn.com', // Your Outlook email
            pass: process.env.EMAIL_PASSWORD // Your Outlook email password or app password
          }
     });

     const html=joiningEmailTemplat(eventName,eventDate,location,typeTicket)

     // Email data
     const mailOptions = {
          from: 'Support@ticketkn.com',
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
        user: 'Support@ticketkn.com', // Your Outlook email
        pass: process.env.EMAIL_PASSWORD // Your Outlook email password or app password
      }
 });

  const mailOptions = {
    from: 'Support@ticketkn.com',
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
