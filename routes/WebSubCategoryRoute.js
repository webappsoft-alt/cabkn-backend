const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/webSubCategoriesController');
// const admin = require('../middleware/admin');
const auth = require('../middleware/auth');

router.post('/create', auth,categoriesController.create);
router.get('/admin-all/:category?',auth, categoriesController.getCategories);
router.get('/admin/:id/:category?', auth, categoriesController.getAllCategories);
router.put('/edit/:id',auth,  categoriesController.editCategories);
router.get('/all/:id/:category?', categoriesController.getAllCustomerCategories);
router.put('/:status/:id',auth, categoriesController.deactivateCategries);

module.exports = router;
