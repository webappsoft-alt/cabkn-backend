const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  }],
  admin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
  },
  messageId: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
  }],
  type: {
    type: String,
    default: 'message',
    enum: ['message','groupchat']
  },
  title:String,
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
});

module.exports = mongoose.model('Conversation', conversationSchema);
