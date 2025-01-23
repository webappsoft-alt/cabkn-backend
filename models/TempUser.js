const mongoose = require('mongoose');

const tempVerificationSchema = new mongoose.Schema({
  email: String,
  code: String,
});

const TempVerification = mongoose.model('TempVerification', tempVerificationSchema);

exports.TempUser = TempVerification;
