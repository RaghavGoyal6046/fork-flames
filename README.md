# Fork & Flames 🍴🔥

A beautiful, modern, full-stack restaurant management and online ordering web application. Fork & Flames offers seamless food ordering, real-time table reservations, customer order tracking, and a feature-rich admin dashboard for menu & order management.

🌐 **Live Demo:** [https://fork-flames.onrender.com](https://fork-flames.onrender.com)

---

## ✨ Features

### 👤 Customer Experience
* **Responsive Landing Page**: Sleek and modern design featuring dynamic customer testimonials fetched from the database.
* **Interactive Menu**: Browse dishes organized by category with smooth ScrollSpy navigation, real-time cart addition, and price calculations.
* **Online Ordering**: Seamless cart system that calculates subtotals, taxes, and delivery fees.
* **Table Reservations**: Book a table for specific dates, times, and guests.
* **User Dashboard**: Track order history, delivery status, and active table bookings.

### 🛡️ Admin & Staff Dashboard
* **Menu Management**: Create, update, and delete menu items, including uploading dish images via Cloudinary.
* **Category Control**: Organize dishes by adding or removing food categories with icons.
* **Order Monitoring**: View and update order statuses (e.g., pending, cooking, out for delivery) in real-time.

---

## 🛠️ Tech Stack

### Frontend
* **Markup & Layout**: HTML5, Semantic Structure
* **Styling**: Vanilla CSS3 (Custom Design Tokens, Glassmorphism, Responsive Grid Systems, Smooth Animations)
* **Logic**: Vanilla JavaScript (Async API Fetching, state storage in `localStorage`)
* **Icons**: FontAwesome v6.4.0

### Backend & Database
* **Runtime**: Node.js
* **Framework**: Express (REST API)
* **Database**: MongoDB (using Mongoose ODM) with fallback to **mongodb-memory-server** for zero-configuration local runs
* **Auth**: JWT (JSON Web Tokens) & bcryptjs for password hashing
* **File Uploads**: Multer & Cloudinary integration for cloud-based media storage

---

## 📁 Project Structure

```
├── backend/
│   ├── config/             # Cloudinary configuration
│   ├── controllers/        # Business logic for API endpoints
│   ├── middleware/         # Authentication and file upload middlewares
│   ├── models/             # Mongoose schemas (User, Booking, Order, MenuItem, etc.)
│   ├── routes/             # Express route definitions
│   ├── package.json        # Backend dependencies & npm scripts
│   ├── server.js           # Server entry point & DB connection setup
│   └── test_endpoints.js   # API automated test script
├── css/
│   ├── global.css          # Design system, tokens, reset styles, and utility classes
│   ├── landing.css         # Styling for the homepage/landing page
│   ├── restaurants.css     # Styling for the menu catalog
│   ├── cart.css            # Cart and checkout page styling
│   ├── auth.css            # Login/Register styling
│   └── dashboard.css       # Admin/Staff panel styling
├── js/
│   ├── app.js              # Global scripts (auth state, navbar scroll, cart count)
│   ├── landing.js          # Homepage logic (reviews fetching)
│   ├── menu.js             # Menu fetching, scroll spy, categories sidebar
│   ├── cart.js             # Cart management, orders submission
│   ├── booking.js          # Table reservation form handler
│   ├── auth.js             # Login/Sign-up API flow
│   └── admin-dashboard.js  # Admin actions (category/item CRUD, order status)
├── pages/
│   ├── menu.html           # Menu browser
│   ├── booking.html        # Table booking page
│   ├── cart.html           # Cart & Checkout page
│   ├── login.html          # Authentication page (Login/Sign-up toggle)
│   ├── my-orders.html      # Customer's order history
│   ├── my-bookings.html    # Customer's reservations history
│   └── admin-dashboard.html# Restaurant owner/staff management console
├── index.html              # Main Landing page
├── Dockerfile              # Docker container definition
├── docker-compose.yml      # Multi-container orchestration (App & MongoDB)
└── README.md               # Documentation (This file)
```

---

## 🚀 Getting Started

### Option 1: Quick Start with Docker (Recommended)
This runs the entire app (Node.js backend + MongoDB instance) in containers.

1. Ensure you have [Docker](https://docs.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
2. Initialize environment variables:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Run the app:
   ```bash
   docker compose up --build -d
   ```
4. Open your browser and navigate to **http://localhost:5001**.

---

### Option 2: Local Development (Without Docker)

#### Prerequisites
* [Node.js](https://nodejs.org/) (v18+)
* MongoDB installed locally (Optional - the app automatically spins up an In-Memory Database fallback if a local MongoDB server is not running).

#### Steps
1. Navigate to the backend directory and install dependencies:
   ```bash
   cd backend
   ```
   ```bash
   npm install
   ```
2. Create and configure your environment file (`backend/.env`):
   ```bash
   cp .env.example .env
   ```
   *Modify `.env` to supply your custom `JWT_SECRET`, or Cloudinary configurations if uploading images.*

3. Spin up the development server:
   ```bash
   npm run dev
   ```
   The backend will start on port `5001` (or whichever port is defined in your `.env`) and automatically serve the static frontend from the root directories. 
   Go to **http://localhost:5001** in your browser.

---

## 🔌 API Endpoints Reference

| Route | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public | Register a new user |
| `/api/auth/login` | `POST` | Public | Log in user and receive token |
| `/api/menu` | `GET` | Public | Fetch all menu items |
| `/api/menu` | `POST` | Admin | Create a new menu item (with image upload) |
| `/api/menu/:id` | `PUT`/`DELETE`| Admin | Update or delete a menu item |
| `/api/categories` | `GET` | Public | Fetch food categories |
| `/api/categories` | `POST`/`DELETE`| Admin | Create or delete food categories |
| `/api/orders` | `POST` | Customer | Place a food order |
| `/api/orders` | `GET` | Admin/Staff| Fetch all customer orders |
| `/api/bookings` | `POST` | Customer | Create a table reservation |
| `/api/reviews` | `GET`/`POST` | Public | Get testimonials or leave a review |

---

## 🧪 Testing the APIs

You can execute the built-in end-to-end endpoint verification script to test registration, booking, and order placements. 

1. Ensure the server is running (`npm run dev`).
2. Run the test script in a separate terminal:
   ```bash
   node backend/test_endpoints.js
   ```
   *This script simulates actual payload requests and logs response statuses to the console.*

---

## 📄 License
This project is licensed under the ISC License.
