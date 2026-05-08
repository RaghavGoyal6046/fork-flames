const User = require('../models/User');

exports.getStaff = async (req, res) => {
  try {
    const staff = await User.find({ role: { $in: ['staff', 'owner'] } }).select('-password');
    res.status(200).json({ success: true, data: staff });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.createStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Only allow creating staff or owner through this protected route
    if (role !== 'staff' && role !== 'owner') {
      return res.status(400).json({ success: false, error: 'Invalid role' });
    }

    const user = await User.create({ name, email, password, role });
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.deleteStaff = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    
    if (user.role === 'customer') return res.status(400).json({ success: false, error: 'Cannot delete customers through staff management' });

    await user.deleteOne();
    res.status(200).json({ success: true, data: {} });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
};
