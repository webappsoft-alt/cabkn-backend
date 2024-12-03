const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/customer/offer/:orderId/:id?', orderController.fetchrequestOrderOffers);
router.get('/rider/:status/:id?', orderController.getAllEmployeeApplication);
router.get('/customer/:status/:id?', orderController.getAllSellerApplication);

module.exports = router;
