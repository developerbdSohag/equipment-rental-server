import express from 'express';
import { getDB } from '../db.js';
import { verifyToken, verifyAdmin, verifyOwner } from '../middleware/auth.js';

const router = express.Router();

// Helper to generate last 6 months buckets
const getLast6Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    months.push({
      key: `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${monthName} ${year}`,
      bookings: 0,
      revenue: 0
    });
  }
  return months;
};

// GET /api/analytics/admin - Challenge 3: Admin Dashboard Analytics
router.get('/admin', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();

    const [users, equipment, bookings, payments] = await Promise.all([
      (await db.collection('users').find({})).toArray(),
      (await db.collection('equipment').find({})).toArray(),
      (await db.collection('bookings').find({})).toArray(),
      (await db.collection('payments').find({})).toArray()
    ]);

    const totalUsers = users.length;
    const totalEquipment = equipment.length;
    const totalBookings = bookings.length;
    const pendingApprovals = equipment.filter(e => e.status === 'Pending').length;
    const completedRentals = bookings.filter(b => b.bookingStatus === 'Completed').length;
    const activeRentals = bookings.filter(b => b.bookingStatus === 'Active' || b.bookingStatus === 'Confirmed').length;

    // Total revenue from payments
    const totalRevenue = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Monthly stats calculation
    const monthlyStats = getLast6Months();
    payments.forEach(p => {
      const dateStr = p.paymentDate || p.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthlyStats.find(m => m.key === key);
        if (bucket) {
          bucket.revenue += Number(p.amount) || 0;
        }
      }
    });

    bookings.forEach(b => {
      const dateStr = b.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthlyStats.find(m => m.key === key);
        if (bucket) {
          bucket.bookings += 1;
        }
      }
    });

    // Category distribution
    const categoryCounts = {};
    equipment.forEach(e => {
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    });

    return res.json({
      success: true,
      analytics: {
        totalUsers,
        totalEquipment,
        totalBookings,
        pendingApprovals,
        completedRentals,
        activeRentals,
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        monthlyStats,
        categoryDistribution: Object.entries(categoryCounts).map(([name, count]) => ({ name, count }))
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate admin analytics.' });
  }
});

// GET /api/analytics/owner - Challenge 3: Owner Dashboard Analytics
router.get('/owner', verifyToken, verifyOwner, async (req, res) => {
  try {
    const db = getDB();
    const ownerEmail = req.user.email;

    const [equipment, bookings, payments] = await Promise.all([
      (await db.collection('equipment').find({ ownerEmail })).toArray(),
      (await db.collection('bookings').find({ ownerEmail })).toArray(),
      (await db.collection('payments').find({ ownerEmail })).toArray()
    ]);

    const totalListed = equipment.length;
    const completedRentals = bookings.filter(b => b.bookingStatus === 'Completed').length;
    const activeRentals = bookings.filter(b => b.bookingStatus === 'Active' || b.bookingStatus === 'Confirmed').length;
    const totalEarnings = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const monthlyStats = getLast6Months();
    payments.forEach(p => {
      const dateStr = p.paymentDate || p.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthlyStats.find(m => m.key === key);
        if (bucket) {
          bucket.revenue += Number(p.amount) || 0;
        }
      }
    });

    bookings.forEach(b => {
      const dateStr = b.createdAt;
      if (dateStr) {
        const d = new Date(dateStr);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = monthlyStats.find(m => m.key === key);
        if (bucket) {
          bucket.bookings += 1;
        }
      }
    });

    return res.json({
      success: true,
      analytics: {
        totalListedEquipment: totalListed,
        completedRentals,
        activeRentals,
        totalBookings: bookings.length,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        monthlyStats
      }
    });
  } catch (error) {
    console.error('Owner analytics error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate owner analytics.' });
  }
});

export default router;
