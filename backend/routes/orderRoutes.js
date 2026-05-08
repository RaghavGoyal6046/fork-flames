const express = require('express');
const { createOrder, getMyOrders, getOrders, updateOrderStatus } = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/')
  .post(protect, createOrder)
  .get(protect, authorize('owner', 'staff'), getOrders);

router.route('/myorders').get(protect, getMyOrders);

router.route('/:id/status').put(protect, authorize('owner', 'staff'), updateOrderStatus);

module.exports = router;
