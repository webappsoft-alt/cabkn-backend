const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const admin = require('../middleware/admin');

router.get('/renter/request/:id?', orderController.fetchrequestOrder);
router.get('/renter/stats', orderController.renterStats);
router.get('/rentee/offer/:orderId/:id?', orderController.fetchrequestOrderOffers);
router.post('/renter/filter', orderController.getAllEmployeeApplication);
router.get('/rentee/checkRate', orderController.checkRate);
router.get('/rentee/:status/:id?', orderController.getAllSellerApplication);
router.put('/renter/update/:status/:id', orderController.UpdateOrder);
router.get('/admin/:id/:status', admin, orderController.adminSideGigs);

module.exports = router;
