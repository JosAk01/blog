const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../models/User');
const { isAuthenticated, authorize } = require('../middlewares/auth');

// Home Page
router.get('/', (req, res) => {
  res.render('index', { name: 'John', age: 899 });
});

// Login Page
router.get('/login', (req, res) => {
  res.render('login');
});

// Signup Page
router.get('/signup', (req, res) => {
  res.render('signup');
});

// Admin Page
router.get('/admin', isAuthenticated, authorize('admin'), (req, res) => {
  res.render('admin');
});

// Editor Page
router.get('/editor', isAuthenticated, authorize('editor'), (req, res) => {
  res.render('editor');
});

// User Page (accessible to all logged-in users)
router.get('/user', isAuthenticated, (req, res) => {
  res.render('user', { name: req.session.user.name });
});

// Signup Logic
router.post('/signup', async (req, res) => {
  const { name, email, password} = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO Users (name, email, password) VALUES (?, ?, ?)`;

    await db.query(query, [name, email, hashedPassword]);
    res.redirect('/login');
  } catch (err) {
    console.error('Error creating user:', err);
    if (err.code === 'ER_DUP_ENTRY') {
      res.status(400).send('Email already in use');
    } else {
      res.status(500).send('Server error');
    }
  }
});

// Login Logic
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const query = `SELECT * FROM Users WHERE email = ?`;
    const [results] = await db.query(query, [email]);

    if (results.length === 0) {
      return res.status(401).send('Invalid email or password');
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (isPasswordValid) {
      req.session.user = {
        id: user.id,
        name: user.name,
        role: user.role, // Store the user's role
      };
      res.redirect(`/${user.role}`); // Redirect based on role
    } else {
      res.status(401).send('Invalid email or password');
    }
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
