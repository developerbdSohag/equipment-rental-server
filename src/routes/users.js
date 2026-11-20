import express from 'express';
import { getDB, ObjectId } from '../db.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

const idFilter = (id) => {
  try {
    return { $or: [{ _id: id }, { _id: new ObjectId(id) }] };
  } catch {
    return { _id: id };
  }
};

// GET /api/users - All registered users (Admin only)
router.get('/', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const cursor = await db.collection('users').find({});
    const users = await cursor.sort({ createdAt: -1 }).toArray();

    // Sanitize passwords
    const sanitized = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });

    return res.json({ success: true, users: sanitized });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

// PUT /api/users/:id/role - Change user role (Admin only)
router.put('/:id/role', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    const validRoles = ['Customer', 'Owner', 'Admin'];

    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be Customer, Owner, or Admin.'
      });
    }

    const db = getDB();
    const filter = idFilter(req.params.id);
    const user = await db.collection('users').findOne(filter);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Prevent changing the main admin's own role if it would leave no admin
    if (user.email === req.user.email && role !== 'Admin') {
      return res.status(400).json({
        success: false,
        message: 'You cannot revoke your own Admin role.'
      });
    }

    await db.collection('users').updateOne(filter, { $set: { role } });

    return res.json({
      success: true,
      message: `Role for ${user.name || user.email} updated to ${role}.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
});

// DELETE /api/users/:id - Delete a user (Admin only)
router.delete('/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const db = getDB();
    const filter = idFilter(req.params.id);
    const user = await db.collection('users').findOne(filter);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.email === req.user.email) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }

    await db.collection('users').deleteOne(filter);

    return res.json({
      success: true,
      message: `User ${user.name || user.email} removed successfully.`
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

export default router;
