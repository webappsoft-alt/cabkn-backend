const express = require('express');
const router = express.Router();
const foodController = require('../controllers/foodController');
const authMiddleware = require('../middleware/auth');

router.post('/create', authMiddleware,foodController.createPost);
router.put('/edit/:id',authMiddleware, foodController.editPost);
router.get('/me/:id',authMiddleware, foodController.getPrograms);
router.post('/all/:id?',authMiddleware, foodController.filterPrograms);
router.delete('/:id', authMiddleware, foodController.deletePostById);

module.exports = router;
