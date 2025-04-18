const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create a connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'blog',
    waitForConnections: true,
    connectionLimit: 10, // Maximum number of connections in the pool
    queueLimit: 0,       // Unlimited queue
});

// Test the connection
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database.');
        connection.release(); // Release the connection back to the pool
    } catch (err) {
        console.error('Database connection failed:', err);
        process.exit(1); // Exit the application on failure
    }
})();

module.exports = pool;
