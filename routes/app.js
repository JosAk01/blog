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
router.get('/author', isAuthenticated, authorize('author'), (req, res) => {
  res.render('author', { session: req.session });
});

// User Page (accessible to all logged-in users)
router.get('/user', isAuthenticated, authorize('user'), async (req, res) => {
  try {
    const [blogs] = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC');

    res.render('user', {
      session: req.session,
      blogs, //
    });
  } catch (err) {
    console.error('Error loading blogs for user page:', err.message);
    res.status(500).send('Something went wrong while loading the user dashboard.');
  }
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

// Route to show all blogs (e.g., homepage or user dashboard)
router.get('/blogs', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM blogs ORDER BY created_at DESC');
    res.render('user', { blogs: rows }); // Make sure you're passing `blogs`
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading blogs');
  }
});


// blogRoutes.js
router.get('/blog/:slug', async (req, res) => {
  const { slug } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM blogs WHERE slug = ?', [slug]);

    if (rows.length === 0) {
      return res.status(404).render('404');
    }

    const blog = rows[0];
    res.render('blog-detail', { blog });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading blog');
  }
});

// Setting Page
router.get('/setting', (req, res) => {
  res.render('setting'); /*organize to do jehovahs will*/
});

// Calender Page
router.get('/calender', (req, res) => {
  res.render('calender'); /*organize to do jehovahs will*/
});

// Map Page
router.get('/map', (req, res) => {
  res.render('map'); /*organize to do jehovahs will*/
});


module.exports = router;
