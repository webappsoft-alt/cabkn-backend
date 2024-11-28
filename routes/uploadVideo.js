require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const mime = require('mime-types');
const fs = require('fs');
// const ffmpeg = require('fluent-ffmpeg');  // For video compression

const admin = require("firebase-admin");

const bucket = admin.storage().bucket();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, "/files"); // Adjust the path as needed
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const extension = mime.extension(file.mimetype);
    const filename = `${timestamp}.${extension}`;
    cb(null, filename);
  },
});

const upload = multer({ storage: storage });

router.post('/upload', upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
  try {
    // Read the uploaded video file
    const file = req.file;
    const destination = `uploads/${file.filename}`;
    
    // // Define the path for the compressed video file
    // const compressedFilePath = path.join(__dirname, 'files', `compressed-${file.filename}`);
    
    // // Compress the video using ffmpeg
    // await new Promise((resolve, reject) => {
    //   ffmpeg(file.path)
    //     .output(compressedFilePath)
    //     .videoCodec('libx264')       // Set the codec
    //     .size('1280x720')            // Resize to 720p (adjust as needed)
    //     .outputOptions('-crf 28')    // Compress using CRF (Constant Rate Factor)
    //     .on('end', resolve)
    //     .on('error', reject)
    //     .run();
    // });
    
    // Upload the compressed video to Firebase Storage
    await bucket.upload(file.path, {
      destination,
      metadata: {
        contentType: 'video/mp4',  // Adjust content type based on your video format
      },
    });
    
    // Make the file public
    const fileInBucket = bucket.file(destination);
    await fileInBucket.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    
    res.json({ video: publicUrl });
    
    // Delete the original and compressed video files after sending the response
    fs.unlink(file.path, (err) => {
      if (err) console.error('Failed to delete original video:', err);
    });
    // fs.unlink(compressedFilePath, (err) => {
    //   if (err) console.error('Failed to delete compressed video:', err);
    // });
  } catch (error) {
    console.log(error)
    res.status(400).json({ message: 'Error in uploading. Try again later.', error });
  }
});

module.exports = router;
