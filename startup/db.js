const mongoose = require('mongoose');
const logger = require('./logger'); // Adjust the path as needed

module.exports = function () {
  const db = 'mongodb+srv://mrmarlegrant:rm3h9TzsglLOTlcG@cluster0.ntmzq.mongodb.net/rider';
  mongoose.connect(db)
    .then(() => logger.info(`Connected to ${db}...`));
}