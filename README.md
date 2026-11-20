# Equipment Rental Platform - Backend API Server

**Project Name**: Equipment Rental Platform API (GearUp Rentals Backend)  
**Live API URL**: [https://rental-equipment-server.vercel.app](https://rental-equipment-server.vercel.app) (or your deployment URL)  
**Author**: developerbdSohag  

---

## 📌 Project Purpose
The backend API server provides a secure, robust, and scalable foundation for the Equipment Rental Platform. It connects equipment owners and renters, managing user authentication, role-based access control (RBAC), equipment inventory with server-side search and filtering, real-time booking management, Stripe payment processing, and dynamic dashboard analytics.

---

## 🔑 Default Credentials

- **Admin Account**:
  - **Email**: `admin@rentalequip.com`
  - **Password**: `AdminPassword123!`
  - **Role**: `Admin`
- **Owner Account**:
  - **Email**: `owner@rentalequip.com`
  - **Password**: `OwnerPassword123!`
  - **Role**: `Owner`
- **Customer Account**:
  - **Email**: `customer@rentalequip.com`
  - **Password**: `CustomerPassword123!`
  - **Role**: `Customer`

---

## 🚀 Key Features

1. **Authentication & Authorization (JWT & RBAC)**:
   - Email and password registration with strict complexity validation (uppercase, lowercase, min 6 characters).
   - Secure password hashing using `bcryptjs`.
   - JWT token generation and verification middleware (`verifyToken`).
   - Role-Based Access Control middlewares: `verifyRenter` (or `verifyCustomer`), `verifyOwner`, `verifyAdmin`.
   - Google Social Login integration (assigns `Customer` role by default).

2. **Server-Side Equipment Search, Filter, Sort & Pagination (Challenge 1)**:
   - Keyword search across equipment title, description, category, and location.
   - Filtering by category (Construction, Photography, Vehicles, Agriculture, Electronics, Event Equipment), rental type (Daily, Weekly, Monthly), price range, and availability status.
   - Dynamic sorting: Price Low to High, Price High to Low, and Recently Added.
   - Server-side pagination with `limit` and `page` parameters.
   - Featured equipment endpoint with MongoDB `limit(6)` aggregation.

3. **Equipment Management**:
   - Owners can list new equipment with status `Pending`.
   - Owners can update, delete, and view their listed equipment.
   - Admins can review all equipment and approve or reject submissions.

4. **Booking & Rental System**:
   - Dynamic calculation of rental amount based on duration (days) and required quantity.
   - Real-time availability check before reservation.
   - Customer booking history (`My Rentals`).
   - Owner rental bookings monitoring (`My Equipment Rental`).
   - Admin master view of all rental transactions across the platform.

5. **Stripe Payment Integration**:
   - Secure checkout session creation with itemized line items and customer email.
   - Automatic booking status and payment status updates upon successful transaction.
   - Transaction logging in dedicated `payments` collection.
   - Automatic decrement of equipment available quantity upon payment completion.

6. **Dashboard Analytics (Challenge 3)**:
   - **Admin Analytics**: Total registered users, total listed equipment, total bookings, pending approvals, completed rentals, total platform revenue, and 6-month monthly revenue & booking trends.
   - **Owner Analytics**: Total listed equipment, active and completed rentals, total earnings, and monthly earnings breakdown.

7. **Automated Cron Job (Bonus 3)**:
   - Automated hourly job powered by `node-cron` to automatically update rental booking status to `Completed` once the rental end date has passed.

8. **Favorites & Reviews**:
   - Customers can add and remove equipment from their favorites list.
   - Verified review submission with ratings and testimonials.

---

## 📦 NPM Packages Used

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `express` | ^4.21.2 | Fast, unopinionated web framework for Node.js |
| `mongodb` | ^6.12.0 | Official MongoDB Node.js driver for database operations |
| `jsonwebtoken` | ^9.0.2 | Secure JSON Web Token generation and validation |
| `bcryptjs` | ^2.4.3 | Secure password hashing algorithm |
| `cors` | ^2.8.5 | Cross-Origin Resource Sharing configuration |
| `dotenv` | ^16.4.7 | Loads environment variables from `.env` file |
| `stripe` | ^17.5.0 | Stripe payment gateway SDK for Node.js |
| `node-cron` | ^3.0.3 | Task scheduler for automated booking status updates |
| `nodemailer` | ^6.9.16 | Email delivery service integration |

---

## 🛠️ Environment Variables Configuration

Create a `.env` file in the root of the `server` directory with the following variables:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority
DB_NAME=equipment_rental_db
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key_here
CLIENT_URL=http://localhost:3000
```

---

## 🏃‍♂️ How to Run Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Seed the database** (optional, runs automatically on startup):
   ```bash
   npm run seed
   ```

3. **Start in development mode**:
   ```bash
   npm run dev
   ```

4. **Start in production mode**:
   ```bash
   npm start
   ```

The server will start listening at `http://localhost:5000`.
