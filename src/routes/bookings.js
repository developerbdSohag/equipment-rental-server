import express from 'express';
import { getDB, ObjectId } from '../db.js';
import { verifyToken, verifyOwner, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

const idFilter = (id) => {
  try {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] };
  } catch {
    return { _id: id };
  }
};

// Calculate duration in days
const calculateDays = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e - s);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays); // minimum 1 day
};

// POST /api/bookings - Create a booking reservation
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      equipmentId,
      startDate,
      endDate,
      quantity,
      contactNumber,
      deliveryAddress,
      additionalNotes
    } = req.body;

    if (!equipmentId || !startDate || !endDate || !quantity || !contactNumber || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required booking details.'
      });
    }

    const requestedQty = parseInt(quantity, 10);
    if (requestedQty <= 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be at least 1.' });
    }

    const db = getDB();
    const equipment = await db.collection('equipment').findOne(idFilter(equipmentId));

    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    // Availability check
    if (equipment.availableQuantity < requestedQty) {
      return res.status(400).json({
        success: false,
        message: `Only ${equipment.availableQuantity} item(s) currently available.`
      });
    }

    // Calculate total rental amount
    const durationDays = calculateDays(startDate, endDate);
    let unitRate = equipment.rentalPrice;

    if (equipment.rentalType === 'Weekly') {
      unitRate = unitRate / 7;
    } else if (equipment.rentalType === 'Monthly') {
      unitRate = unitRate / 30;
    }

    const totalAmount = Math.round(unitRate * durationDays * requestedQty * 100) / 100;

    const newBooking = {
      equipmentId: equipment._id?.toString?.() || equipment._id,
      equipmentName: equipment.name,
      equipmentImage: equipment.image,
      category: equipment.category,
      rentalPrice: equipment.rentalPrice,
      rentalType: equipment.rentalType,
      ownerEmail: equipment.ownerEmail,
      ownerName: equipment.ownerName || 'Owner',
      customerEmail: req.user.email,
      customerName: req.user.name || 'Customer',
      contactNumber,
      deliveryAddress,
      additionalNotes: additionalNotes || '',
      startDate,
      endDate,
      durationDays,
      quantity: requestedQty,
      totalAmount,
      paymentStatus: 'Unpaid',
      bookingStatus: 'Pending',
      createdAt: new Date().toISOString()
    };

    const result = await db.collection('bookings').insertOne(newBooking);
    newBooking._id = result.insertedId;

    return res.status(201).json({
      success: true,
      message: 'Booking initiated successfully. Please proceed to payment.',
      booking: newBooking
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate booking.' });
  }
});

// GET /api/bookings/my-rentals - Customer dashboard rentals
router.get('/my-rentals', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('bookings').find({ customerEmail: req.user.email });
    const rentals = await cursor.sort({ createdAt: -1 }).toArray();
    return res.json({ success: true, rentals });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer rentals.' });
  }
});

// GET /api/bookings/owner-rentals - Owner dashboard rentals
router.get('/owner-rentals', verifyToken, verifyOwner, async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('bookings').find({ ownerEmail: req.user.email });
    const rentals = await cursor.sort({ createdAt: -1 }).toArray();
    return res.json({ success: true, rentals });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch owner rentals.' });
  }
});

// GET /api/bookings/all - Admin dashboard all rentals
router.get('/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('bookings').find({});
    const rentals = await cursor.sort({ createdAt: -1 }).toArray();
    return res.json({ success: true, rentals });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch all rentals.' });
  }
});

// GET /api/bookings/:id - Single booking details
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const booking = await db.collection('bookings').findOne(idFilter(req.params.id));
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isAdmin = req.user.role?.toLowerCase() === 'admin';
    const isOwner = booking.ownerEmail === req.user.email;
    const isCustomer = booking.customerEmail === req.user.email;

    if (!isAdmin && !isOwner && !isCustomer) {
      return res.status(403).json({ success: false, message: 'Unauthorized to view this booking.' });
    }

    return res.json({ success: true, booking });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve booking.' });
  }
});

// PUT /api/bookings/:id/status - Update booking status
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Active', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid booking status.' });
    }

    const db = getDB();
    const filter = idFilter(req.params.id);
    const booking = await db.collection('bookings').findOne(filter);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const isAdmin = req.user.role?.toLowerCase() === 'admin';
    const isOwner = booking.ownerEmail === req.user.email;
    const isCustomer = booking.customerEmail === req.user.email;

    // Customer can cancel if still pending/unpaid
    if (isCustomer && status === 'Cancelled') {
      // allow customer cancellation
    } else if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    await db.collection('bookings').updateOne(filter, { $set: { bookingStatus: status } });

    // If cancelled, restore equipment quantity if it was previously confirmed
    if (status === 'Cancelled' && booking.paymentStatus === 'Paid') {
      const eqFilter = idFilter(booking.equipmentId);
      const eq = await db.collection('equipment').findOne(eqFilter);
      if (eq) {
        await db.collection('equipment').updateOne(eqFilter, {
          $set: { availableQuantity: eq.availableQuantity + booking.quantity }
        });
      }
    }

    return res.json({ success: true, message: `Booking status updated to ${status}.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

export default router;
