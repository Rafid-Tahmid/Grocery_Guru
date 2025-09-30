require('dotenv').config();
const mysql = require('mysql2');

// Railway provides MYSQL_URL or individual variables with different names
// Check for Railway's variable names (MYSQLHOST, etc.) or custom ones (DB_HOST, etc.)
const connectionConfig = process.env.MYSQL_URL || process.env.DATABASE_URL
  ? process.env.MYSQL_URL || process.env.DATABASE_URL
  : {
      host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
      port: process.env.MYSQLPORT || process.env.DB_PORT || 3306,
      user: process.env.MYSQLUSER || process.env.DB_USER || 'appuser',
      password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'securepassword',
      database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'wdc'
    };

// Create regular connection for callback-style queries
const connection = mysql.createConnection(connectionConfig);

// Log connection attempt (without password)
if (typeof connectionConfig === 'string') {
  console.log('Using MySQL connection URL');
} else {
  console.log('Database connection config:', {
    host: connectionConfig.host,
    port: connectionConfig.port,
    user: connectionConfig.user,
    database: connectionConfig.database
  });
}

// Test the connection
connection.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Connection attempted with:', {
      host: typeof connectionConfig === 'string' ? 'from URL' : connectionConfig.host,
      user: typeof connectionConfig === 'string' ? 'from URL' : connectionConfig.user,
      database: typeof connectionConfig === 'string' ? 'from URL' : connectionConfig.database
    });
    console.error('\n🔍 Available Railway MySQL variables:');
    console.error('  MYSQLHOST:', process.env.MYSQLHOST || '(not set)');
    console.error('  MYSQLUSER:', process.env.MYSQLUSER || '(not set)');
    console.error('  MYSQLDATABASE:', process.env.MYSQLDATABASE || '(not set)');
    console.error('  MYSQL_URL:', process.env.MYSQL_URL ? 'set' : '(not set)');
    console.error('\n💡 Make sure you have added a MySQL database in Railway and linked it to this service!');
    // Don't throw - let the app start so we can see error pages
  } else {
    console.log('✅ Connected to MySQL database successfully!');
  }
});

module.exports = connection;
