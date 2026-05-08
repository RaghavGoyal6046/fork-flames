const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  items: [
    {
      menuItem: {
        type: mongoose.Schema.ObjectId,
        ref: 'MenuItem',
        required: true,
      },
      name: String,
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
      },
    },
  ],
  orderType: {
    type: String,
    enum: ['delivery', 'dine_in'],
    default: 'delivery',
  },
  tableName: {
    type: String,
    default: null,
  },
  status: {
    type: String,
    enum: ['placed', 'confirmed', 'preparing', 'prepared', 'out_for_delivery', 'delivered', 'served', 'cancelled'],
    default: 'placed',
  },
  subtotal: {
    type: Number,
    required: true,
  },
  tax: {
    type: Number,
    required: true,
  },
  deliveryFee: {
    type: Number,
    default: 4.99,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  couponApplied: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', OrderSchema);
