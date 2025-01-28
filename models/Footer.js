const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  short_title:String,
  phone :String,
  tel :String,
  location:String,
  emails:String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model("Footer", schema);
