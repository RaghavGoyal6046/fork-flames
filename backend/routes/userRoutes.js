const express = require('express');
const router = express.Router();
const { getStaff, createStaff, deleteStaff } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.route('/staff')
  .get(protect, authorize('owner'), getStaff)
  .post(protect, authorize('owner'), createStaff);

router.route('/staff/:id')
  .delete(protect, authorize('owner'), deleteStaff);

module.exports = router;
