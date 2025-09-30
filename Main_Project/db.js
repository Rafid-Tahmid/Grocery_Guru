require('dotenv').config();
const mysql = require('mysql2');

// Create regular connection for callback-style queries
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'appuser',
  password: process.env.DB_PASSWORD || 'securepassword',
  database: process.env.DB_NAME || 'wdc'
});

// Test the connection
connection.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    console.error('DB_HOST:', process.env.DB_HOST);
    console.error('DB_USER:', process.env.DB_USER);
    console.error('DB_NAME:', process.env.DB_NAME);
    console.error('Make sure environment variables are set in Railway and MySQL service is running.');
    // Don't throw - let the app start so we can see error pages
  } else {
    console.log('Connected to MySQL database');
  }
});

module.exports = connection;
