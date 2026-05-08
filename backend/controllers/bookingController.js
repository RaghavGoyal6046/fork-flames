const Booking = require('../models/Booking');

exports.createBooking = async (req, res) => {
  try {
    req.body.user = req.user.id;
    const booking = await Booking.create(req.body);
    res.status(201).json({ success: true, booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).sort('-createdAt');
    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().populate('user', 'name email').sort('-createdAt');
    res.status(200).json({ success: true, bookings });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true, runValidators: true }
    );
    if (!booking) return res.status(404).json({ success: false, error: 'Booking not found' });
    res.status(200).json({ success: true, booking });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
