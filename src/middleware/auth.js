import jwt from 'jsonwebtoken';
import { getDB } from '../db.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'gearflow_equipment_rental_jwt_secret_key_2026';

    jwt.verify(token, secret, async (err, decoded) => {
      if (err) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden access. Invalid or expired token.'
        });
      }

      req.user = decoded;

      // Optionally refresh user role from DB if needed
      try {
        const db = getDB();
        const user = await db.collection('users').findOne({ email: decoded.email });
        if (user) {
          req.user.role = user.role;
          req.user.name = user.name;
          req.user._id = user._id;
        }
      } catch (dbErr) {
        // Fallback to decoded payload
      }

      next();
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during token verification.'
    });
  }
};

// Renter / Customer middleware
export const verifyRenter = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const role = req.user.role?.toLowerCase();
  if (role === 'customer' || role === 'renter' || role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden. Customer/Renter privileges required.'
  });
};

export const verifyCustomer = verifyRenter;

// Owner middleware
export const verifyOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const role = req.user.role?.toLowerCase();
  if (role === 'owner' || role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden. Equipment Owner privileges required.'
  });
};

// Admin middleware
export const verifyAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const role = req.user.role?.toLowerCase();
  if (role === 'admin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Forbidden. Admin privileges required.'
  });
};
