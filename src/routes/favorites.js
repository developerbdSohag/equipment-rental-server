import express from 'express';
import { getDB, ObjectId } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const idFilter = (id) => {
  try {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] };
  } catch {
    return { _id: id };
  }
};

// GET /api/favorites - List customer favorites
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('favorites').find({ customerEmail: req.user.email });
    const favorites = await cursor.sort({ addedAt: -1 }).toArray();

    // Populate equipment details for each favorite
    const populated = await Promise.all(
      favorites.map(async (fav) => {
        const equipment = await db.collection('equipment').findOne(idFilter(fav.equipmentId));
        return {
          ...fav,
          equipment: equipment || null
        };
      })
    );

    // Filter out any equipment that might have been deleted
    const validFavorites = populated.filter(f => f.equipment !== null);

    return res.json({ success: true, favorites: validFavorites });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve favorites.' });
  }
});

// GET /api/favorites/check/:equipmentId - Check if an item is favorited
router.get('/check/:equipmentId', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const existing = await db.collection('favorites').findOne({
      customerEmail: req.user.email,
      equipmentId: req.params.equipmentId
    });

    return res.json({ success: true, isFavorite: !!existing });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to check favorite status.' });
  }
});

// POST /api/favorites/:equipmentId - Add to favorites
router.post('/:equipmentId', verifyToken, async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const db = getDB();

    const equipment = await db.collection('equipment').findOne(idFilter(equipmentId));
    if (!equipment) {
      return res.status(404).json({ success: false, message: 'Equipment not found.' });
    }

    const existing = await db.collection('favorites').findOne({
      customerEmail: req.user.email,
      equipmentId
    });

    if (existing) {
      return res.json({ success: true, message: 'Equipment is already in your favorites.' });
    }

    const newFav = {
      customerEmail: req.user.email,
      equipmentId,
      addedAt: new Date().toISOString()
    };

    await db.collection('favorites').insertOne(newFav);

    return res.status(201).json({
      success: true,
      message: 'Equipment added to favorites!'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add to favorites.' });
  }
});

// DELETE /api/favorites/:equipmentId - Remove from favorites
router.delete('/:equipmentId', verifyToken, async (req, res) => {
  try {
    const { equipmentId } = req.params;
    const db = getDB();

    await db.collection('favorites').deleteOne({
      customerEmail: req.user.email,
      equipmentId
    });

    return res.json({ success: true, message: 'Equipment removed from favorites.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to remove from favorites.' });
  }
});

export default router;
