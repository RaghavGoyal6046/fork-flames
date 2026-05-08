const express = require('express');
const { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } = require('../controllers/menuController');
const { protect, authorize } = require('../middleware/auth');
const { storage } = require('../config/cloudinary');
const multer = require('multer');
const upload = multer({ storage: storage });

const router = express.Router();

router.route('/')
  .get(getMenuItems)
  .post(protect, authorize('owner', 'staff'), upload.single('image'), createMenuItem);

router.route('/:id')
  .put(protect, authorize('owner', 'staff'), upload.single('image'), updateMenuItem)
  .delete(protect, authorize('owner'), deleteMenuItem); // Only owner can delete

module.exports = router;
