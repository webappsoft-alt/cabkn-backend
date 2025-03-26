const express = require('express');
const router = express.Router();
const ratingController = require('../controllers/ratingController');
const auth = require('../middleware/auth');

router.post('/create', auth, ratingController.createRating);
router.post('/websubcat', auth, ratingController.websubcreateRating);
router.get('/websubcat/:subcat/:id?',auth, ratingController.getSubCatRatings);
router.get('/all/:userId/:id?',auth, ratingController.getUserRatings);

module.exports = router;
