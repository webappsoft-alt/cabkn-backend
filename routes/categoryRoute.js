const express = require('express');
const router = express.Router();
const categoriesController = require('../controllers/categoriesController');
const admin = require('../middleware/admin');
const auth = require('../middleware/auth');

router.post('/create', [auth,admin],categoriesController.create);
router.get('/admin-all',[auth,admin], categoriesController.getCategories);
router.get('/admin/:id', [auth,admin], categoriesController.getAllCategories);
router.put('/edit/:id',[auth,admin],  categoriesController.editCategories);
router.get('/all/:id?', categoriesController.getAllCustomerCategories);
router.put('/:status/:id',[auth,admin], categoriesController.deactivateCategries);

module.exports = router;
