const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const admin = require('../middleware/admin');

router.get('/rider/request/:id?', orderController.fetchrequestOrder);
router.get('/customer/offer/:orderId/:id?', orderController.fetchrequestOrderOffers);
router.get('/offer/detail/:id', orderController.getofferDetails);
router.get('/detail/:id', orderController.getOrderDetails);
router.post('/rider/:status/:id?', orderController.getAllEmployeeApplication);
router.post('/customer/:status/:id?', orderController.getAllSellerApplication);
router.post('/admin/:status/:id',admin, orderController.AdminRides);
router.put('/admin/update-purchases/:id',admin, orderController.updatePurchasePaymentByAdmin);
router.put('/admin/update-payment/:id',admin, orderController.updatePaymentByAdmin);
router.put('/customer/pay/:id', orderController.updatePurchasePaymentByCustomer);
router.put('/rider/approve/:id', orderController.updateApproveByRider);
router.put('/rider/creditDone/:id', orderController.creditDoneAdmin);
router.delete('/admin/delete/:id', admin, orderController.deleteOrder);

module.exports = router;
