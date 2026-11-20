import express from 'express';
import { getDB } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/reviews - Get reviews for home page
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('reviews').find({});
    const reviews = await cursor.sort({ date: -1 }).toArray();

    // If empty, return default high-quality reviews
    if (!reviews || reviews.length === 0) {
      const defaultReviews = [
        {
          _id: 'rev_1',
          customerName: 'Engr. Tanvir Ahmed',
          role: 'Project Director, Mirpur Flyover Subcontract',
          rating: 5,
          comment: 'Rented the 20-ton CAT excavator for our foundation earthwork. Delivered on-site at Tejgaon on time, zero hydraulic leaks, and verified documentation. Excellent platform.',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
          date: '2026-11-10'
        },
        {
          _id: 'rev_2',
          customerName: 'Rahim Chowdhury',
          role: 'Managing Partner, Bay Heavy Cargo Ltd, Chattogram',
          rating: 5,
          comment: 'We needed a 100-ton all-terrain mobile crane urgently for structural steel erection at Agrabad. Found certified equipment in Taka with transparent escrow payment within 2 hours.',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
          date: '2026-11-05'
        },
        {
          _id: 'rev_3',
          customerName: 'Nasrin Sultana',
          role: 'Operations Head, Shiddhirganj Industrial Hub',
          rating: 5,
          comment: 'Booked the Cummins 150kW silent generator during our factory substation upgrade in Narayanganj. Fuel efficiency was outstanding and the owner support was flawless.',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          date: '2026-10-28'
        },
        {
          _id: 'rev_4',
          customerName: 'Kazi Farhad Hossain',
          role: 'Civil Infrastructure Lead, Bogura Mega Project',
          rating: 5,
          comment: 'Rented heavy road rollers and wheel loaders for our regional highway construction. Saved substantial capital expenditure with daily Taka rates. Highly recommended!',
          avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
          date: '2026-10-18'
        }
      ];
      return res.json({ success: true, reviews: defaultReviews });
    }

    return res.json({ success: true, reviews });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

// POST /api/reviews - Add review
router.post('/', verifyToken, async (req, res) => {
  try {
    const { rating, comment, role } = req.body;
    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Rating and comment are required.' });
    }

    const db = getDB();
    const newReview = {
      customerName: req.user.name || 'Verified Renter',
      customerEmail: req.user.email,
      role: role || 'Verified Customer',
      rating: Math.min(5, Math.max(1, parseInt(rating, 10))),
      comment,
      avatar: req.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(req.user.name || 'User')}`,
      date: new Date().toISOString()
    };

    const result = await db.collection('reviews').insertOne(newReview);
    newReview._id = result.insertedId;

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully!',
      review: newReview
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

export default router;
