import express from 'express';
import { getDB, ObjectId } from '../db.js';
import { verifyToken, verifyOwner, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to convert id to query filter
const idFilter = (id) => {
  try {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] };
  } catch {
    return { _id: id };
  }
};

// GET /api/equipment/categories - Category stats
router.get('/categories', async (req, res) => {
  try {
    const db = getDB();
    const categoriesList = [
      { id: 'construction', name: 'Construction Equipment', icon: 'Hammer', count: 0 },
      { id: 'photography', name: 'Photography Equipment', icon: 'Camera', count: 0 },
      { id: 'vehicles', name: 'Vehicles & Transportation', icon: 'Truck', count: 0 },
      { id: 'agriculture', name: 'Agriculture Equipment', icon: 'Tractor', count: 0 },
      { id: 'electronics', name: 'Electronics', icon: 'Cpu', count: 0 },
      { id: 'events', name: 'Event Equipment', icon: 'Speaker', count: 0 }
    ];

    const allApproved = await (await db.collection('equipment').find({ status: 'Approved' })).toArray();

    const counts = {};
    allApproved.forEach(item => {
      const cat = item.category?.toLowerCase() || '';
      for (const c of categoriesList) {
        if (cat.includes(c.id) || cat.includes(c.name.toLowerCase().split(' ')[0])) {
          counts[c.id] = (counts[c.id] || 0) + 1;
        }
      }
    });

    const result = categoriesList.map(c => ({
      ...c,
      count: counts[c.id] || allApproved.filter(item => item.category === c.name).length
    }));

    return res.json({ success: true, categories: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
});

// GET /api/equipment/featured - 6 approved items using MongoDB limit
router.get('/featured', async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('equipment').find({ status: 'Approved' });
    const items = await cursor.limit(6).toArray();
    return res.json({ success: true, equipment: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch featured equipment.' });
  }
});

// GET /api/equipment - Challenge 1: Server-side search, filter, sort & pagination
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const {
      search = '',
      category = '',
      rentalType = '',
      availability = '',
      minPrice,
      maxPrice,
      sort = 'recent',
      page = 1,
      limit = 9,
      status = 'Approved'
    } = req.query;

    const query = {};

    // By default, public API only returns Approved items unless specifically queried by admin
    if (status && status !== 'all') {
      query.status = status;
    }

    // Category filter
    if (category && category !== 'All' && category !== 'all') {
      query.category = { $regex: new RegExp(category, 'i') };
    }

    // Rental Type filter (Daily, Weekly, Monthly)
    if (rentalType && rentalType !== 'All' && rentalType !== 'all') {
      query.rentalType = { $regex: new RegExp(`^${rentalType}$`, 'i') };
    }

    // Availability filter
    if (availability === 'available') {
      query.availableQuantity = { $gte: 1 };
    } else if (availability === 'out_of_stock') {
      query.availableQuantity = { $lte: 0 };
    }

    // Price range filter
    const min = parseFloat(minPrice);
    const max = parseFloat(maxPrice);
    if (!isNaN(min) || !isNaN(max)) {
      query.rentalPrice = {};
      if (!isNaN(min)) query.rentalPrice.$gte = min;
      if (!isNaN(max)) query.rentalPrice.$lte = max;
    }

    // Search query (search equipment name or location)
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { location: searchRegex },
        { category: searchRegex },
        { brand: searchRegex }
      ];
    }

    // Sorting definition
    let sortObj = { createdAt: -1 }; // default recent
    if (sort === 'price_asc') {
      sortObj = { rentalPrice: 1 };
    } else if (sort === 'price_desc') {
      sortObj = { rentalPrice: -1 };
    } else if (sort === 'recent') {
      sortObj = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 9);
    const skipNum = (pageNum - 1) * limitNum;

    // Execute query with sort, skip, limit
    const totalCount = await db.collection('equipment').countDocuments(query);
    const cursor = await db.collection('equipment').find(query);
    const items = await cursor.sort(sortObj).skip(skipNum).limit(limitNum).toArray();

    const totalPages = Math.ceil(totalCount / limitNum);

    return res.json({
      success: true,
      equipment: items,
      pagination: {
        totalItems: totalCount,
        totalPages: totalPages || 1,
        currentPage: pageNum,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('Error fetching equipment:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving equipment.' });
  }
});

// GET /api/equipment/owner/my-equipment - Owner's listed equipment
router.get('/owner/my-equipment', verifyToken, verifyOwner, async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('equipment').find({ ownerEmail: req.user.email });
    const items = await cursor.sort({ createdAt: -1 }).toArray();
    return res.json({ success: true, equipment: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch owner equipment.' });
  }
});

// GET /api/equipment/admin/all - Admin view of all equipment
router.get('/admin/all', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('equipment').find({});
    const items = await cursor.sort({ createdAt: -1 }).toArray();
    return res.json({ success: true, equipment: items });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch all equipment.' });
  }
});

// GET /api/equipment/:id - Single item details
router.get('/:id', async (req, res) => {
  try {
    const db = getDB();
    const item = await db.collection('equipment').findOne(idFilter(req.params.id));
    if (!item) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }
    return res.json({ success: true, equipment: item });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch equipment details.' });
  }
});

// POST /api/equipment - Add new equipment (Owner)
router.post('/', verifyToken, verifyOwner, async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      location,
      rentalPrice,
      rentalType,
      availableQuantity,
      condition,
      brand,
      model,
      image,
      terms
    } = req.body;

    if (!name || !category || !rentalPrice || !location) {
      return res.status(400).json({
        success: false,
        message: 'Name, category, location, and rental price are required.'
      });
    }

    const db = getDB();
    const newEquipment = {
      name,
      description: description || '',
      category,
      location,
      rentalPrice: parseFloat(rentalPrice) || 0,
      rentalType: rentalType || 'Daily',
      availableQuantity: parseInt(availableQuantity, 10) || 1,
      condition: condition || 'Excellent',
      brand: brand || '',
      model: model || '',
      image: image || 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
      terms: terms || 'Standard rental contract applies. Deposit may be required on delivery.',
      status: 'Pending', // default pending per requirements
      ownerEmail: req.user.email,
      ownerName: req.user.name || 'Owner',
      createdAt: new Date().toISOString()
    };

    const result = await db.collection('equipment').insertOne(newEquipment);
    newEquipment._id = result.insertedId;

    return res.status(201).json({
      success: true,
      message: 'Equipment listed successfully! It will be live once approved by an Admin.',
      equipment: newEquipment
    });
  } catch (error) {
    console.error('Error adding equipment:', error);
    return res.status(500).json({ success: false, message: 'Failed to add equipment.' });
  }
});

// PUT /api/equipment/:id - Update equipment
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const filter = idFilter(req.params.id);
    const existing = await db.collection('equipment').findOne(filter);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    // Ensure only the owner or an admin can update
    const isAdmin = req.user.role?.toLowerCase() === 'admin';
    const isOwner = existing.ownerEmail === req.user.email;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Forbidden. You do not own this equipment.' });
    }

    const allowedUpdates = [
      'name', 'description', 'category', 'location', 'rentalPrice',
      'rentalType', 'availableQuantity', 'condition', 'brand', 'model',
      'image', 'terms'
    ];

    // Admin can also update status directly
    if (isAdmin && req.body.status) {
      allowedUpdates.push('status');
    }

    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === 'rentalPrice') updates[key] = parseFloat(req.body[key]);
        else if (key === 'availableQuantity') updates[key] = parseInt(req.body[key], 10);
        else updates[key] = req.body[key];
      }
    }

    await db.collection('equipment').updateOne(filter, { $set: updates });
    const updated = await db.collection('equipment').findOne(filter);

    return res.json({
      success: true,
      message: 'Equipment updated successfully.',
      equipment: updated
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update equipment.' });
  }
});

// PUT /api/equipment/:id/status - Admin approve / reject
router.put('/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const db = getDB();
    const filter = idFilter(req.params.id);
    const result = await db.collection('equipment').updateOne(filter, { $set: { status } });

    if (result.matchedCount === 0) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    return res.json({
      success: true,
      message: `Equipment status updated to ${status}.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

// DELETE /api/equipment/:id - Delete equipment
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const filter = idFilter(req.params.id);
    const existing = await db.collection('equipment').findOne(filter);

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    const isAdmin = req.user.role?.toLowerCase() === 'admin';
    const isOwner = existing.ownerEmail === req.user.email;
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this equipment.' });
    }

    await db.collection('equipment').deleteOne(filter);
    return res.json({ success: true, message: 'Equipment removed successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete equipment.' });
  }
});

export default router;
