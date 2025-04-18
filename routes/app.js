const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../models/User');
const { isAuthenticated, authorize } = require('../middlewares/auth');
const pool = require('../models/User');


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
  res.render('admin', { session: req.session });
});

// Editor Page
router.get('/editor', isAuthenticated, authorize('editor'), (req, res) => {
  res.render('editor', { session: req.session });
});

// User Page (accessible to all logged-in users)
router.get('/user', isAuthenticated, authorize('user'), (req, res) => {
  res.render('user', { session: req.session });

  // try {
  //   const [users] = await pool.query('SELECT * FROM users WHERE role = ?', ['user']);
  //   res.render('user', {
  //     name: req.session.name.user,
  //     user, // pass the users array to EJS
  //   });
  // } catch (err) {
  //   console.error('Error fetching user:', err);
  //   res.status(500).send('Internal Server Error');
  // }
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
