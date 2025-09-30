#!/usr/bin/env node

/**
 * Production Database Initialization Script
 * 
 * This script initializes the database schema for production environments
 * where i don't have sudo/root access to MySQL.
 * 
 * Usage:
 *   node init-db.js
 * 
 * Make sure your .env file has the correct database credentials:
 *   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function initializeDatabase() {
  let connection;

  try {
    log('🚀 Starting database initialization...', colors.blue);
    
    // Validate environment variables
    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
      log('❌ Missing required environment variables!', colors.red);
      log('Please set: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME', colors.yellow);
      process.exit(1);
    }

    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      multipleStatements: true,
      connectTimeout: 10000
    });

    log('✅ Connected to database successfully', colors.green);

    // Read SQL file
    const sqlFile = path.join(__dirname, 'wdc.sql');
    let sql = fs.readFileSync(sqlFile, 'utf8');

    // Remove commands that require privileges (for production)
    // Remove database creation and user management (hosting provider handles this)
    sql = sql.replace(/CREATE DATABASE IF NOT EXISTS wdc;/gi, '');
    sql = sql.replace(/CREATE USER IF NOT EXISTS.*?;/gi, '');
    sql = sql.replace(/GRANT ALL PRIVILEGES.*?;/gi, '');
    sql = sql.replace(/FLUSH PRIVILEGES;/gi, '');
    sql = sql.replace(/USE wdc;/gi, '');

    log(' Executing SQL schema...', colors.yellow);

    // Split by statements and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await connection.query(statement);
      } catch (err) {
        // Ignore "table already exists" errors
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }
    }

    log(' Database schema initialized successfully!', colors.green);

    // Verify tables were created
    const [tables] = await connection.query('SHOW TABLES');
    log(`\n Created ${tables.length} tables:`, colors.blue);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      log(`   - ${tableName}`, colors.reset);
    });

    log('\n Database initialization complete!', colors.bold + colors.green);
    log('You can now start your application with: npm start', colors.reset);

  } catch (error) {
    log('\n Database initialization failed:', colors.red);
    log(error.message, colors.red);
    log('\nPlease check your environment variables:', colors.yellow);
    log('  DB_HOST=' + (process.env.DB_HOST || '(not set)'), colors.yellow);
    log('  DB_USER=' + (process.env.DB_USER || '(not set)'), colors.yellow);
    log('  DB_NAME=' + (process.env.DB_NAME || '(not set)'), colors.yellow);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
