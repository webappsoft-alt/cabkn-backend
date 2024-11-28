const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const auth = require('../middleware/auth');

router.post('/create', auth, ratingController.createRating);
router.get('/all/:userId/:id?',auth, ratingController.getUserRatings);
router.get('/event/:eventId',auth, ratingController.getServiceRatings);

module.exports = router;
