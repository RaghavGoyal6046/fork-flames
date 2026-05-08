const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

// Load env vars
dotenv.config();

// Connect to Database
const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;
    
    // If using localhost, try to connect, otherwise fallback to memory server
    if (mongoUri.includes('localhost') || mongoUri.includes('127.0.0.1')) {
      try {
        await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
        console.log(`MongoDB Connected (Local): ${mongoose.connection.host}`);
        return;
      } catch (err) {
        console.log('Local MongoDB not running. Starting In-Memory Database...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoServer = await MongoMemoryServer.create();
        mongoUri = mongoServer.getUri();
      }
    }

    const conn = await mongoose.connect(mongoUri);
    console.log(`MongoDB Connected (Atlas/Cloud): ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database Connection Error: ${error.message}`);
    process.exit(1);
  }
};
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
// Serve static assets from the root folder (CSS, JS, Images, etc.)
const rootDir = path.join(__dirname, '..');
app.use(express.static(rootDir));

// Specifically serve pages directory
app.use('/pages', express.static(path.join(rootDir, 'pages')));
app.use('/css', express.static(path.join(rootDir, 'css')));
app.use('/js', express.static(path.join(rootDir, 'js')));

// Serving uploads if any local ones still exist
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Route files
const auth = require('./routes/authRoutes');
const menu = require('./routes/menuRoutes');
const orders = require('./routes/orderRoutes');
const reviews = require('./routes/reviewRoutes');
const bookings = require('./routes/bookingRoutes');
const users = require('./routes/userRoutes');
const categories = require('./routes/categoryRoutes');

// Mount routers
app.use('/api/auth', auth);
app.use('/api/menu', menu);
app.use('/api/orders', orders);
app.use('/api/reviews', reviews);
app.use('/api/bookings', bookings);
app.use('/api/users', users);
app.use('/api/categories', categories);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
