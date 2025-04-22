require('dotenv').config();
const logger = require('../startup/logger'); // Adjust the path as needed
const { Worker, isMainThread, parentPort } = require("worker_threads");
const mongoose = require('mongoose');
const admin = require("firebase-admin");

const db = "mongodb+srv://mrmarlegrant:rm3h9TzsglLOTlcG@cluster0.ntmzq.mongodb.net/rider";
mongoose.connect(db)
  .then(() => logger.info(`Connected to worker db...`));


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
    

if (!isMainThread) {
    parentPort.on("message", async (job) => {
        const uniqueStrings = [...new Set(job.data.fcmTokens.filter(item => typeof item === 'string'))];
        for (let fcmtoken of uniqueStrings) {
          try {
            let notiBody={
              title: job.data.title,
              body: job.data.description,
            }

            if (job.data.image) {
              notiBody={
                ...notiBody,
                imageUrl: job.data.image
              }
            }
            console.log("image====>>",notiBody)

            const message = {
              data:job.data?.data ? job.data?.data : job.data?.weburl?{weburl:job.data.weburl} : {}, 
              token: fcmtoken, // replace with the user's device token
              notification: notiBody,
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
                  
            const res=await admin.messaging().send(message);
            console.log("notii==",res)

          } catch (error) {
            
          }
        }

        parentPort.postMessage({ success: true });
    });
}