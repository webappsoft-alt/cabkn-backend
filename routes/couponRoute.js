const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/couponController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.post('/create', [auth,admin],categoriesController.create);
router.put('/edit/:id',[auth,admin],  categoriesController.editCategories);
router.get('/me/:id?',auth, categoriesController.getMyCoupons);
router.post('/check-validity',auth, categoriesController.checkValidatityCoupon);
router.delete('/:id',[auth,admin], categoriesController.deleteCoupons);

module.exports = router;
