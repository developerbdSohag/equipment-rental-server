import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDB, ObjectId } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gearflow_equipment_rental_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper to generate token
const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id?.toString?.() || user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      photoURL: user.photoURL
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// Password validator: uppercase, lowercase, >= 6 chars
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasMinLength = password.length >= 6;
  return hasUpperCase && hasLowerCase && hasMinLength;
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, photoURL, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and be at least 6 characters long.'
      });
    }

    const db = getDB();
    const existingUser = await db.collection('users').findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = role === 'Owner' ? 'Owner' : 'Customer';

    const newUser = {
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
      role: assignedRole,
      phone: req.body.phone || '',
      address: req.body.address || '',
      createdAt: new Date().toISOString()
    };

    const result = await db.collection('users').insertOne(newUser);
    newUser._id = result.insertedId;

    const token = generateToken(newUser);

    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to Equipment Rental Platform.',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during registration.'
    });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    const db = getDB();
    const user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      message: 'Login successful! Welcome back.',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred during login.'
    });
  }
});

// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { email, name, photoURL } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for Google authentication.'
      });
    }

    const db = getDB();
    let user = await db.collection('users').findOne({ email: email.toLowerCase() });

    if (!user) {
      // Default to Customer role per requirement
      const newUser = {
        name: name || 'Google User',
        email: email.toLowerCase(),
        password: '', // Social user
        photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
        role: 'Customer',
        phone: '',
        address: '',
        isGoogleUser: true,
        createdAt: new Date().toISOString()
      };
      const result = await db.collection('users').insertOne(newUser);
      newUser._id = result.insertedId;
      user = newUser;
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    return res.json({
      success: true,
      message: 'Google login successful!',
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Google authentication failed.'
    });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  try {
    const db = getDB();
    const user = await db.collection('users').findOne({ email: req.user.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const { password: _, ...userWithoutPassword } = user;
    return res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name, photoURL, phone, address } = req.body;
    const db = getDB();

    const updateFields = {};
    if (name) updateFields.name = name;
    if (photoURL) updateFields.photoURL = photoURL;
    if (phone !== undefined) updateFields.phone = phone;
    if (address !== undefined) updateFields.address = address;

    await db.collection('users').updateOne(
      { email: req.user.email },
      { $set: updateFields }
    );

    const updatedUser = await db.collection('users').findOne({ email: req.user.email });
    const { password: _, ...userWithoutPassword } = updatedUser;

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: userWithoutPassword
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

export default router;
