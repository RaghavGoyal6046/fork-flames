const express = require('express');
const router = express.Router();
const { createBooking, getBookings, updateBookingStatus, getMyBookings } = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/auth');

router.route('/mybookings').get(protect, getMyBookings);

router.route('/')
  .post(protect, createBooking)
  .get(protect, authorize('owner', 'staff'), getBookings);

router.route('/:id/status')
  .put(protect, authorize('owner', 'staff'), updateBookingStatus);

module.exports = router;
