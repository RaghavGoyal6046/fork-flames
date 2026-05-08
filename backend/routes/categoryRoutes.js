const express = require('express');
const { getCategories, createCategory, deleteCategory } = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .get(getCategories)
  .post(protect, authorize('owner'), createCategory);

router.route('/:id')
  .delete(protect, authorize('owner'), deleteCategory);

module.exports = router;
