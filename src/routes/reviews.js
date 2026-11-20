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
          customerName: 'Sarah Jenkins',
          role: 'Independent Filmmaker',
          rating: 5,
          comment: 'Rented the Sony FX3 cinema package for a 4-day commercial shoot. Equipment was in mint condition, clean sensors, and the owner was very cooperative.',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
          date: '2026-11-10'
        },
        {
          _id: 'rev_2',
          customerName: 'David Miller',
          role: 'General Contractor',
          rating: 5,
          comment: 'We needed a 20-ton excavator urgently when ours broke down on a bridge site. Found verified equipment on this platform within 2 hours. Seamless Stripe checkout!',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
          date: '2026-11-05'
        },
        {
          _id: 'rev_3',
          customerName: 'Elena Rostova',
          role: 'Event Producer',
          rating: 5,
          comment: 'Booked concert-grade line array sound systems and laser lights for our outdoor music festival. Clear rental terms and prompt delivery. Absolutely stellar platform.',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
          date: '2026-10-28'
        },
        {
          _id: 'rev_4',
          customerName: 'Marcus Vance',
          role: 'AgriTech Specialist',
          rating: 5,
          comment: 'Rented high-capacity John Deere harvesting equipment during peak season. Saved our farm thousands in downtime costs. Transparent owner communication.',
          avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
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
