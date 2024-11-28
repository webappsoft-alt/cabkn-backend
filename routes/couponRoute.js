const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/couponController');
const auth = require('../middleware/auth');

router.post('/create', auth,categoriesController.create);
router.put('/edit/:id',auth,  categoriesController.editCategories);
router.get('/me/:id?',auth, categoriesController.getMyCoupons);
router.post('/check-validity',auth, categoriesController.checkValidatityCoupon);
router.delete('/:id',auth, categoriesController.deleteCoupons);

module.exports = router;
