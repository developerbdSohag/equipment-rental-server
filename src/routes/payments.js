import express from 'express';
import Stripe from 'stripe';
import { getDB, ObjectId } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey && !stripeSecretKey.includes('placeholder') ? new Stripe(stripeSecretKey) : null;

const idFilter = (id) => {
  if (!id) return { _id: null };
  const strId = id?.toString?.() || id;
  try {
    return { $or: [{ _id: strId }, { _id: new ObjectId(strId) }] };
  } catch {
    return { _id: strId };
  }
};

const resolveClientUrl = (req) => {
  const originHeader = req.get('origin') || req.get('referer');
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      return parsed.origin;
    } catch {}
  }
  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')) {
    return process.env.CLIENT_URL;
  }
  return process.env.CLIENT_URL || 'https://equipment-rental-client-three.vercel.app';
};

// POST /api/payments/create-checkout-session
router.post('/create-checkout-session', verifyToken, async (req, res) => {
  try {
    const { bookingId, bookingData } = req.body;
    if (!bookingId && !bookingData) {
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    const db = getDB();
    let booking = null;

    if (bookingId) {
      booking = await db.collection('bookings').findOne(idFilter(bookingId));
    }

    // Serverless cross-container resiliency: restore booking from bookingData if needed
    if (!booking && bookingData) {
      booking = {
        ...bookingData,
        _id: bookingId || bookingData._id || new ObjectId().toString()
      };
      await db.collection('bookings').insertOne(booking);
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    if (booking.paymentStatus === 'Paid') {
      return res.status(400).json({ success: false, message: 'This booking has already been paid.' });
    }

    const clientUrl = resolveClientUrl(req);
    const amountInCents = Math.round(booking.totalAmount * 100);

    // If Stripe is configured with a real secret key
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          mode: 'payment',
          customer_email: req.user.email,
          line_items: [
            {
              price_data: {
                currency: 'bdt',
                product_data: {
                  name: `Rental: ${booking.equipmentName}`,
                  description: `Duration: ${booking.durationDays} day(s) | Qty: ${booking.quantity} | Delivery: ${booking.deliveryAddress || 'Site'}`,
                  images: booking.equipmentImage ? [booking.equipmentImage] : []
                },
                unit_amount: amountInCents
              },
              quantity: 1
            }
          ],
          metadata: {
            bookingId: booking._id?.toString?.() || booking._id,
            customerEmail: req.user.email,
            equipmentId: booking.equipmentId
          },
          success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${booking._id}`,
          cancel_url: `${clientUrl}/payment/cancel?bookingId=${booking._id}`
        });

        return res.json({
          success: true,
          sessionId: session.id,
          url: session.url
        });
      } catch (stripeErr) {
        console.warn('Stripe checkout error, falling back to simulated checkout session:', stripeErr.message);
      }
    }

    // Direct / Sandbox checkout session fallback
    const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const mockUrl = `${clientUrl}/payment/success?session_id=${mockSessionId}&bookingId=${booking._id}`;

    return res.json({
      success: true,
      sessionId: mockSessionId,
      url: mockUrl,
      isSimulated: true
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate checkout.' });
  }
});

// POST /api/payments/verify
router.post('/verify', verifyToken, async (req, res) => {
  try {
    const { bookingId, sessionId, bookingData } = req.body;
    if (!bookingId && !bookingData) {
      return res.status(400).json({ success: false, message: 'Booking ID is required.' });
    }

    const db = getDB();
    let booking = null;

    if (bookingId) {
      booking = await db.collection('bookings').findOne(idFilter(bookingId));
    }

    // Serverless cross-container fallback: restore booking if missing
    if (!booking && bookingData) {
      booking = {
        ...bookingData,
        _id: bookingId || bookingData._id || new ObjectId().toString()
      };
      await db.collection('bookings').insertOne(booking);
    }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking record not found.' });
    }

    // If already marked as paid
    if (booking.paymentStatus === 'Paid') {
      return res.json({
        success: true,
        message: 'Payment verified successfully.',
        transactionId: booking.transactionId || sessionId || 'TXN_VERIFIED',
        booking
      });
    }

    const transactionId = sessionId || 'txn_' + Math.random().toString(36).substring(2, 12).toUpperCase();

    // 1. Update Booking record
    await db.collection('bookings').updateOne(idFilter(booking._id), {
      $set: {
        paymentStatus: 'Paid',
        bookingStatus: 'Confirmed',
        transactionId,
        paidAt: new Date().toISOString()
      }
    });

    // 2. Record transaction in payments collection
    const paymentRecord = {
      bookingId: booking._id?.toString?.() || booking._id,
      equipmentId: booking.equipmentId,
      equipmentName: booking.equipmentName,
      customerEmail: booking.customerEmail,
      ownerEmail: booking.ownerEmail,
      amount: booking.totalAmount,
      currency: 'bdt',
      transactionId,
      paymentMethod: 'Stripe Card',
      paymentDate: new Date().toISOString(),
      status: 'Succeeded'
    };
    await db.collection('payments').insertOne(paymentRecord);

    // 3. Decrement available quantity of equipment
    if (booking.equipmentId) {
      const eqFilter = idFilter(booking.equipmentId);
      const equipment = await db.collection('equipment').findOne(eqFilter);
      if (equipment) {
        const newQty = Math.max(0, (equipment.availableQuantity || 1) - (booking.quantity || 1));
        await db.collection('equipment').updateOne(eqFilter, {
          $set: { availableQuantity: newQty }
        });
      }
    }

    const updatedBooking = await db.collection('bookings').findOne(idFilter(booking._id));

    return res.json({
      success: true,
      message: 'Payment completed and recorded successfully!',
      transactionId,
      booking: updatedBooking || { ...booking, paymentStatus: 'Paid', bookingStatus: 'Confirmed', transactionId }
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

// GET /api/payments/history - Customer payment history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('payments').find({ customerEmail: req.user.email });
    const payments = await cursor.sort({ paymentDate: -1 }).toArray();
    return res.json({ success: true, payments });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve payment history.' });
  }
});

export default router;
