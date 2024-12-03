const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/customer/offer/:orderId/:id?', orderController.fetchrequestOrderOffers);
router.post('/rider/filter', orderController.getAllEmployeeApplication);
router.get('/customer/:status/:id?', orderController.getAllSellerApplication);

module.exports = router;
