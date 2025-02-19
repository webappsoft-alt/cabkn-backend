const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/servicesSubCategoriesController');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.post('/create', [auth,admin],categoriesController.create);
router.get('/admin-all/:category?',[auth,admin], categoriesController.getCategories);
router.get('/admin/:id/:category?', auth, categoriesController.getAllCategories);
router.put('/edit/:id',[auth,admin],  categoriesController.editCategories);
router.get('/all/:id/:category?', categoriesController.getAllCustomerCategories);
router.get('/details/:id', categoriesController.detailsSubCat);
router.put('/:status/:id',[auth,admin], categoriesController.deactivateCategries);

module.exports = router;
