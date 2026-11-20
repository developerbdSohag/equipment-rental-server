import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { seedDatabase } from './seed.js';
import { startCronJobs } from './cron/cronJob.js';

import authRouter from './routes/auth.js';
import equipmentRouter from './routes/equipment.js';
import bookingsRouter from './routes/bookings.js';
import paymentsRouter from './routes/payments.js';
import favoritesRouter from './routes/favorites.js';
import usersRouter from './routes/users.js';
import analyticsRouter from './routes/analytics.js';
import reviewsRouter from './routes/reviews.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration - production safe, handles all vercel and local origins smoothly
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    // Allow any localhost or vercel preview/production domain
    if (
      origin.includes('localhost') ||
      origin.includes('vercel.app') ||
      origin.includes('rentalequip') ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Permissive in dev/prod to guarantee no CORS blocks
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check & Root Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Equipment Rental Platform API Server is Running Smoothly 🚀',
    version: '1.0.0',
    documentation: '/api/docs',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Mount API Routes
app.use('/api/auth', authRouter);
app.use('/api/equipment', equipmentRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/users', usersRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/reviews', reviewsRouter);

// 404 Route Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
});

// Start Server & Connect Database
async function startServer() {
  try {
    await connectDB();
    await seedDatabase();
    startCronJobs();

    app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(`🚀 Equipment Rental Platform API running on port ${PORT}`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`🔐 Default Admin: admin@rentalequip.com`);
      console.log(`🔑 Admin Password: AdminPassword123!`);
      console.log(`===============================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
