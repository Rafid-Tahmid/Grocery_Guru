require('dotenv').config();
const mysql = require('mysql2');

// Use connection URL if available, otherwise use individual params
const connectionConfig = process.env.MYSQL_URL 
  ? process.env.MYSQL_URL
  : {
      host: process.env.DB_HOST || 'ballast.proxy.rlwy.net',
      port: process.env.MYSQL_PORT || 12216,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'eBcOHwdXomkahLYqBRsEBXyKqdn!mwMk',
      database: process.env.DB_NAME || 'railway'
    };

// Create regular connection for callback-style queries
const connection = mysql.createConnection(connectionConfig);

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
