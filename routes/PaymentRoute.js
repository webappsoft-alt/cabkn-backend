const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

router.post('/create',auth, paymentController.create);
router.get('/createAccount',auth, paymentController.createAccount);
router.get('/redirect/callback', paymentController.redirectUrl);

module.exports = router;