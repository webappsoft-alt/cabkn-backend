const express = require('express');
const router = express.Router();
const controller_ = require('../controllers/jadePaymentController');
const authMiddleware = require('../middleware/auth');

router.post('/create', authMiddleware, controller_.create);

module.exports = router;
