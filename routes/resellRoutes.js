const express = require('express');
const router = express.Router();
const resellController = require('../controllers/resellController');
const authMiddleware = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

router.post('/create', authMiddleware,resellController.createPost);
// router.put('/edit/:id', authMiddleware,resellController.editResellTickets);
router.get('/me/all/:id', authMiddleware,resellController.getMyResellTickets);
router.get('/all/:id', optionalAuth,resellController.otherResellEvents);
router.put('/purchase/:id', authMiddleware,resellController.purchaseTicket);
router.delete('/:id', authMiddleware,resellController.deleteResellTicket);

module.exports = router;
