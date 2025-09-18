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
    console.log('Make sure MySQL is running and the database is set up correctly.');
    throw err;
  }
  console.log('Connected to MySQL database');
});

module.exports = connection;
