const express = require('express');
const path = require('path');
const mysql = require('mysql2/promise');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const dotenv = require('dotenv');
const crypto = require('crypto'); // To generate a secure secret key
const appRoutes = require('./routes/app'); // Routes module

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});



app.set("view engine", "ejs");
app.set("views", "views");

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Session store setup
const sessionStore = new MySQLStore({}, pool); // Store sessions in MySQL

// Generate a secure session secret if not set in environment variables
const generateSecureSecret = () => {
  return crypto.randomBytes(32).toString('hex'); // 64-character random string
};

// Use session middleware
app.use(
  session({
    key: process.env.SESSION_COOKIE_NAME || 'user_session', // Cookie name
    secret: process.env.SESSION_SECRET || generateSecureSecret(), // Fallback to generated key
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 2, // 2 hours
      // secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true, // Prevent JavaScript access
    },
  })
);

// Use the appRoutes for handling app-specific routes
app.use(appRoutes);

// Error handling for undefined routes
app.use((req, res) => {
  res.status(404).send('Page not found');
});

// Start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
