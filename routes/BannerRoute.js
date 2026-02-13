const express = require('express');
const router = express.Router();
const bannerController = require('../controllers/bannerController');
const admin = require('../middleware/admin');
const auth = require('../middleware/auth');

router.post('/create', [auth,admin],bannerController.create);
router.get('/all',auth, bannerController.getCategories);
router.put('/edit/:id',[auth,admin],  bannerController.editCategories);
router.delete('/:id',[auth,admin], bannerController.deleteCatrgoires);

module.exports = router;
