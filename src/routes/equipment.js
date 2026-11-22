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

// GET /api/equipment/categories - All Category stats
router.get('/categories', async (req, res) => {
  try {
    const db = getDB();
    const categoriesList = [
      { id: 'excavators', name: 'Excavators', count: 0, image: 'https://images.unsplash.com/photo-1503708928676-1cb796a0891e?auto=format&fit=crop&w=600&q=80' },
      { id: 'cranes', name: 'Cranes', count: 0, image: 'https://images.unsplash.com/photo-1575538633395-c773c6ea252d?auto=format&fit=crop&w=600&q=80' },
      { id: 'generators', name: 'Generators', count: 0, image: 'https://upload.wikimedia.org/wikipedia/commons/b/bb/Dieselgenerator.jpg' },
      { id: 'forklifts', name: 'Forklifts', count: 0, image: 'https://images.unsplash.com/photo-1645736315000-6f788915923b?auto=format&fit=crop&w=600&q=80' },
      { id: 'bulldozers', name: 'Bulldozers', count: 0, image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80' },
      { id: 'loaders', name: 'Loaders', count: 0, image: 'https://upload.wikimedia.org/wikipedia/commons/1/18/Caterpillar_950k_Wheel_Loader.jpg' },
      { id: 'concrete-mixers', name: 'Concrete Mixers', count: 0, image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80' },
      { id: 'trucks', name: 'Trucks', count: 0, image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80' },
      { id: 'lifting-equipment', name: 'Lifting Equipment', count: 0, image: 'https://images.unsplash.com/photo-1579487785973-74d2ca7abdd5?auto=format&fit=crop&w=600&q=80' },
      { id: 'other-machinery', name: 'Other Machinery', count: 0, image: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Roadroller.jpg' }
    ];

    const allApproved = await (await db.collection('equipment').find({ status: 'Approved' })).toArray();

    // Dynamically find all distinct categories in the database
    const dbCategories = [...new Set(allApproved.map(e => e.category).filter(Boolean))];

    const result = categoriesList.map(c => {
      const matchingCount = allApproved.filter(item => {
        const itemCat = (item.category || '').toLowerCase();
        return itemCat.includes(c.name.toLowerCase()) || itemCat.includes(c.id.replace('-', ' '));
      }).length;
      return {
        ...c,
        count: matchingCount > 0 ? matchingCount : 1
      };
    });

    // Add any categories from DB not in predefined list
    for (const catName of dbCategories) {
      if (!categoriesList.some(c => c.name.toLowerCase() === catName.toLowerCase())) {
        const count = allApproved.filter(e => (e.category || '').toLowerCase() === catName.toLowerCase()).length;
        result.push({
          id: catName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          name: catName,
          count: count || 1,
          image: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80'
        });
      }
    }

    return res.json({ success: true, categories: result, allCategoryNames: ['All', ...result.map(r => r.name)] });
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

// GET /api/equipment - Server-side search, filter, sort & pagination
router.get('/', async (req, res) => {
  try {
    const db = getDB();
    const {
      search = '',
      category = '',
      rentalType = '',
      availability = '',
      condition = '',
      verifiedOnly = '',
      minPrice,
      maxPrice,
      sort = 'recent',
      page = 1,
      limit = 9,
      status = 'Approved'
    } = req.query;

    const query = {};

    // Public API returns Approved items
    if (status && status !== 'all') {
      query.status = status;
    }

    // Category filter
    if (category && category !== 'All' && category !== 'all') {
      const cleanCat = category.trim().replace(/-/g, ' ');
      query.category = { $regex: cleanCat, $options: 'i' };
    }

    // Rental Type filter (Daily, Weekly, Monthly)
    if (rentalType && rentalType !== 'All' && rentalType !== 'all') {
      query.rentalType = { $regex: `^${rentalType.trim()}$`, $options: 'i' };
    }

    // Condition filter
    if (condition && condition !== 'All' && condition !== 'all') {
      query.condition = { $regex: condition.trim(), $options: 'i' };
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

    // Search query across fields
    if (search.trim()) {
      const s = search.trim();
      query.$or = [
        { name: { $regex: s, $options: 'i' } },
        { location: { $regex: s, $options: 'i' } },
        { category: { $regex: s, $options: 'i' } },
        { brand: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } }
      ];
    }

    // Sorting definition
    let sortObj = { createdAt: -1 };
    if (sort === 'price_asc') {
      sortObj = { rentalPrice: 1 };
    } else if (sort === 'price_desc') {
      sortObj = { rentalPrice: -1 };
    } else if (sort === 'rating' || sort === 'popularity') {
      sortObj = { rating: -1, reviewCount: -1 };
    } else if (sort === 'recent') {
      sortObj = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 9);
    const skipNum = (pageNum - 1) * limitNum;

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
      status: 'Pending',
      rating: 5.0,
      reviewCount: 1,
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
