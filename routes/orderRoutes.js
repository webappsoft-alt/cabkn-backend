const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/rider/request/:id?', orderController.fetchrequestOrder);
router.get('/customer/offer/:orderId/:id?', orderController.fetchrequestOrderOffers);
router.get('/offer/detail/:id', orderController.getofferDetails);
router.get('/detail/:id', orderController.getOrderDetails);
router.post('/rider/:status/:id?', orderController.getAllEmployeeApplication);
router.post('/customer/:status/:id?', orderController.getAllSellerApplication);

module.exports = router;
