const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
  program: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Program',
    required: true,
  },
  day: {
    type: String,
    default: 'Mon',
    enum: ['Mon', 'Tue', "Wed",'Thu','Fri','Sat','Sun']
  },
  videourl: String,
  name: String,
  repetations: String,
  createdAt: { type: Date, default: Date.now, index: true }, // Timestamp for post creation
});

module.exports = mongoose.model('Exercise', productSchema);
