require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const logger = require('./startup/logger'); // Adjust the path as needed
const cron = require('node-cron');
const moment = require('moment');

const admin = require("firebase-admin");
const { CheckCoupons } = require('./controllers/CheckCoupons');
const Event = require('./models/Event');

const config = {
  "type": process.env.TYPE,
  "project_id":process.env.PROJECTID,
  "private_key_id": process.env.PRIVATE_KEY_ID,
  "private_key":process.env.PRIVATE_KEY,
  "client_email":process.env.CLIENT_EMAIL,
  "client_id": process.env.CLIENTID,
  "auth_uri": process.env.AUTH_URI,
  "token_uri": process.env.TOKEN_URL,
  "auth_provider_x509_cert_url":process.env.AUTHPROVIDER,
  "client_x509_cert_url": process.env.CLIENT_CERT,
  "universe_domain": process.env.DOMAIN
  };


admin.initializeApp({
  credential: admin.credential.cert(config),
  storageBucket: "gs://eventshub-330f9.appspot.com"
});

app.use(cors());

require('./startup/config')();
require('./startup/logging')();
require('./startup/routes')(app);
require('./startup/db')();
require('./startup/validation')();

const port = process.env.PORT || 8080;
const server = app.listen(port, () => logger.info(`Listening on port  ${port}...`));

require('./startup/sockets')(server, app);

// Privacy Policy HTML
const privacyPolicyHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - TicketKn</title>
</head>
<body>
    <h1>Privacy Policy for TicketKn</h1>
    <p><strong>Effective Date:</strong> 1st November, 2024</p>
    <p>
        At TicketKn, we are committed to protecting your privacy and ensuring that your personal information 
        is handled in a safe and responsible manner. This Privacy Policy outlines the types of information 
        we collect, how we use it, and how we protect it when you use our platform to buy, sell, or transfer 
        event tickets.
    </p>
    <p>
        By using TicketKn, you agree to the terms of this Privacy Policy. If you do not agree with this 
        policy, please do not use our services.
    </p>
    <h2>1. Information We Collect</h2>
    <ul>
        <li><strong>Personal Information:</strong> When you register or create an account, we collect details such as your name, email address, phone number, and payment information.</li>
        <li><strong>Transaction Information:</strong> We collect details of your ticket purchases, sales, and transfers, including event details and payment history.</li>
        <li><strong>Device and Usage Information:</strong> We may collect information about your device (such as IP address, device type, browser type) and how you interact with our platform (such as pages viewed, transaction data, and usage statistics).</li>
    </ul>
    <h2>2. How We Use Your Information</h2>
    <ul>
        <li>Provide and maintain the services you request (buying, selling, and transferring tickets).</li>
        <li>Process transactions and payments securely.</li>
        <li>Communicate with you about your account, ticket orders, and promotions.</li>
        <li>Improve our app, services, and user experience.</li>
        <li>Comply with legal obligations and resolve disputes.</li>
    </ul>
    <h2>3. Data Sharing</h2>
    <ul>
        <li><strong>Service Providers:</strong> We may share your information with trusted third-party service providers who assist in operating our platform, processing payments, or providing customer support.</li>
        <li><strong>Legal Compliance:</strong> We may disclose your information if required by law, such as in response to a subpoena or other legal processes.</li>
        <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred to the new entity.</li>
    </ul>
    <h2>4. Data Security</h2>
    <p>
        We implement industry-standard security measures to protect your personal information, including encryption, secure servers, and access control. However, no system is completely secure, and we cannot guarantee the absolute security of your data.
    </p>
    <h2>5. Your Rights and Choices</h2>
    <ul>
        <li><strong>Access and Update Your Information:</strong> You can view and update your account information at any time.</li>
        <li><strong>Delete Your Account:</strong> You may request to delete your account by contacting us. Note that some information may be retained for legal or operational reasons.</li>
        <li><strong>Opt-Out of Marketing Communications:</strong> You can unsubscribe from marketing emails by clicking the "unsubscribe" link in any email we send you.</li>
    </ul>
    <h2>6. Children’s Privacy</h2>
    <p>
        TicketKn is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected personal information from a child under 18, we will take steps to delete that information.
    </p>
    <h2>7. Changes to This Privacy Policy</h2>
    <p>
        We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. Any updates will be posted on this page, and the "Effective Date" will be updated accordingly.
    </p>
    <h2>8. Contact Us</h2>
    <p>
        If you have any questions about this Privacy Policy or how we handle your data, please contact us at:
    </p>
    <ul>
        <li>Email: <a href="mailto:Support@ticketkn.com">Support@ticketkn.com</a></li>
        <li>Address: C15 Sands Complex</li>
    </ul>
</body>
</html>
`;

// API Endpoint to Serve Privacy Policy
app.get('/.well-known/assetlinks.json', (req, res) => {
    res.json([
        {
          "relation": [
            "delegate_permission/common.handle_all_urls"
          ],
          "target": {
            "namespace": "android_app",
            "package_name": "com.ticketkn.app",
            "sha256_cert_fingerprints": [
              "5E:DE:CE:68:17:C0:BD:6B:72:E3:43:12:B5:13:44:A4:E0:9E:67:BF:35:38:A1:E3:81:41:3E:CE:30:A8:EB:F7"
            ]
          }
        }
      ]);
});

// API Endpoint to Serve Privacy Policy
app.get('/event', async(req, res) => {
    const {id}=req.query;
    const post = await Event.findById(id).populate({
        path: 'purchase_by',
        options: { limit: 3 }, // Limit to 3 users
        populate: [
          { path: 'user', model: 'user' },
        ]
      }).populate("user").populate("likes").populate("coupon").populate("category").lean();

      if (!post) return res.send('Event not found.');

    const html=`
    <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Event Details</title>
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: Arial, sans-serif;
      }

      .screen-wrapper {
        max-width: 800px;
        margin: 0 auto;
        position: relative;
      }

      .image-slider {
        height: 350px;
        position: relative;
        overflow: hidden;
      }

      .image-slider img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .back-icon {
        position: absolute;
        top: 50px;
        left: 20px;
        display: flex;
        justify-content: space-between;
        width: calc(100% - 40px);
        z-index: 10;
      }

      .icon-button {
        width: 30px;
        height: 30px;
        background: #eaeaea;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
      }

      .heart-icon {
        color: white;
        font-size: 25px;
        cursor: pointer;
      }

      .main-container {
        padding: 20px;
        background: #fff;
      }

      .data-card {
        background: #fff;
        border-radius: 10px;
        padding: 20px;
        margin-top: -20px;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .event-title {
        font-size: 18px;
        font-weight: 600;
        margin-bottom: 5px;
        max-width: 250px;
      }

      .event-date {
        font-size: 10px;
        color: #666;
      }

      .user-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 20px 0;
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .user-avatar {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        object-fit: cover;
      }

      .user-actions {
        display: flex;
        gap: 10px;
      }

      .map-container {
        height: 150px;
        border-radius: 10px;
        overflow: hidden;
        margin: 20px 0;
      }

      .map-container img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .going-container {
        display: flex;
        align-items: center;
        margin: 20px 0;
      }

      .going-avatars {
        display: flex;
        align-items: center;
      }

      .going-avatar {
        width: 30px;
        height: 30px;
        border-radius: 50%;
        margin-left: -10px;
        border: 2px solid white;
      }

      .going-count {
        background: #eaeaea;
        padding: 5px;
        border-radius: 50%;
        margin-left: 10px;
      }

      .buy-ticket-btn {
        background: transparent;
        border: 1px solid #007aff;
        color: #007aff;
        padding: 15px;
        border-radius: 8px;
        width: 100%;
        margin: 20px 0;
        cursor: pointer;
        font-weight: bold;
      }

      .section-title {
        font-size: 14px;
        font-weight: 600;
        margin: 20px 0 10px;
      }

      .section-content {
        font-size: 12px;
        color: #5a5a5a;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <div class="screen-wrapper">
      <div class="image-slider">
        <img src=${post.images[0]} alt="Event Image" />
      </div>

      <div class="main-container">
        <div class="data-card">
          <div>
            <h1 class="event-title">${post.name}</h1>
            <p class="event-date">${moment(
                post?.start_date
                  ? post?.start_date
                  : post?.event?.start_date
              ).format("DD MMM YYYY")}, ${moment(
                post?.start_time
                  ? post?.start_time
                  : post?.event?.start_time
              ).format("h:mm A")}</p>
          </div>
          <div class="ticket-count">${post?.remainig_ticket||0} Tickets</div>
        </div>

        <h2 class="section-title">Event By</h2>
        <div class="user-container">
          <div class="user-info">
            <img src=${post?.user?.image} alt="User" class="user-avatar" />
            <div>
              <p style="font-weight: 600">${post?.user?.name}</p>
              <p style="font-size: 10px; color: #666">${moment(post?.createdAt).format("DD MMM YYYY")}</p>
            </div>
          </div>
          <div class="user-actions">
          </div>
        </div>

        <h2 class="section-title">About</h2>
        <p class="section-content">${post?.description}
        </p>

        <h2 class="section-title">Refund Policy</h2>
        <p class="section-content">
         ${post?.refund_policy}
        </p>
      </div>
    </div>
  </body>
</html>
`

res.send(html)
});

// API Endpoint to Serve Privacy Policy
app.get('/privacy', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(privacyPolicyHTML);
});


// Schedule a cron job to run daily at midnight
cron.schedule('0 0 * * *', async () => {
    await CheckCoupons()
  }, {
    scheduled: true,
    timezone: "America/New_York" // Set your preferred timezone, e.g., "America/New_York"
});

module.exports = server;