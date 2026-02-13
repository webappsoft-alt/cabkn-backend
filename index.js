require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();
const cron = require("node-cron");
const logger = require('./startup/logger'); // Adjust the path as needed

const admin = require("firebase-admin");
const { CheckCoupons } = require('./controllers/CheckCoupons');
const { User } = require('./models/user');
const { deleteUserEmail } = require('./controllers/emailservice');

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
  storageBucket: "gs://cabkn-63397.firebasestorage.app"
});

app.use(cors());

require('./startup/config')();
require('./startup/logging')();
require('./startup/routes')(app);
require('./startup/db')();
require('./startup/validation')();
require('./startup/redisClient')

const port = process.env.PORT || 5400;
const server = app.listen(port, () => logger.info(`Listening on port  ${port}...`));

require('./startup/sockets')(server, app);

// Schedule a cron job to run daily at midnight
cron.schedule('0 0 * * *', async () => {
    await CheckCoupons()
  }, {
    scheduled: true,
    timezone: "America/New_York" // Set your preferred timezone, e.g., "America/New_York"
});

const updateDate = async () => {
  const currentDate = new Date();
  const futureDate = new Date(currentDate);
  futureDate.setDate(futureDate.getDate() + 7);

  await User.findOneAndUpdate(
    { type: 'admin' },
    { $set: { payoutDate: futureDate } }
  );
};
// Schedule the job to run every 7 days
cron.schedule('0 0 */7 * *', () => {
  updateDate()
});



// Serve the HTML page
app.get('/delete/users', (req, res) => {
  res.send(`
     <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cabkn APP CORP - Email Deletion Request</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 50px auto; padding: 20px; border: 1px solid #ccc; border-radius: 10px; background-color: #f9f9f9; }
        h1 { color: #4CAF50; }
        p { margin-bottom: 20px; }
        form { margin-top: 30px; }
        input[type="text"] { width: 100%; padding: 10px; margin-bottom: 10px; border-radius: 5px; border: 1px solid #ccc; }
        input[type="submit"] { width: 100%; padding: 10px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
        input[type="submit"]:hover { background-color: #45a049; }
        .error { color: red; font-weight: bold; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Cabkn APP CORP - Account Data Deletion</h1>
        <p>
            Welcome to Cabkn APP CORP. If you wish to permanently delete your account and all associated data, please enter your email address below. 
            After submitting, you will receive an email with a link to confirm the deletion. Once you click the link, all data associated 
            with your email will be permanently removed from our system.
        </p>
        <p>
            Please note that this action cannot be undone. If you have any questions or concerns, feel free to reach out to our support team.
        </p>
        
        <form action="/submit-email" method="post">
            <label for="email">Email:</label>
            <input type="text" id="email" name="email" required pattern="^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$" title="Please enter a valid email address">
            <input type="submit" value="Submit">
            ${req.query.error ? `<p class="error">Invalid email, please try again.</p>` : ''}
        </form>
    </div>
</body>
</html>
  `);
});

// Handle form submission
app.post('/submit-email',async (req, res) => {
  const email = req.body.email;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const lowerCaseEmail=String(email).toLocaleLowerCase().trim()

  if (email && emailRegex.test(lowerCaseEmail)) {
    const findUser=await User.findOne({email:lowerCaseEmail})

    if (!findUser) return res.send(`<p>User with that Email <strong>${lowerCaseEmail}</strong> doesn't exist in our system.</p>`);

    if (findUser.status == 'deleted') return res.send(`<p>User has been deleted. Contact admin for further support.</p>`);
    if (findUser.status == 'deactivated') return res.send(`<p>User has been deactivated. Contact admin for further support.</p>`);
  
    findUser.delete_request=true;
    await findUser.save();
    const deleteLink=`https://api.cabkn.com/user/delete/${findUser._id}`

    await deleteUserEmail(lowerCaseEmail,deleteLink)
    // Assuming the email is valid and another API call is successful
    res.send(`<p>Email <strong>${email}</strong> delete request is submitted successfully!</p>`);
  } else {
    res.redirect('/delete/users?error=1'); // Redirect to the form with an error query parameter
  }
});
// Handle form submission
app.get('/user/delete/:id?',async (req, res) => {
  try {

    const findUser=await User.findOne({_id:req.params.id,delete_request:true})
    
    if (!findUser) return res.send(`<p>User doesn't exist in our system.</p>`);
    
    if (findUser.status == 'deleted') return res.send(`<p>User doesn't exist in our system. It has already been deleted.</p>`);
    if (findUser.status == 'deactivated') return res.send(`<p>User doesn't exist in our system. It has already been deleted.</p>`);

    findUser.status='deleted'
    await findUser.save()
  
    // Assuming the email is valid and another API call is successful
    res.send(`<p>User <strong>deleted</strong> successfully!</p>`);
  } catch (error) {
    res.send(`<p>An Error occured during user delete. Try again later.</p>`);
  }
});

module.exports = server;
