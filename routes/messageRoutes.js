const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

router.post('/send', messageController.sendMessage);
router.get('/conversations/:id?', messageController.getUserConversations);
router.get('/messages/:userId/:id?', messageController.getMessages);
router.get('/groupMessages/:conversation/:id?', messageController.getGroupMessages);
router.put('/seen/:userId', messageController.allSeen);
router.get('/new-msg/:userId/:id', messageController.newMessage);

module.exports = router;
