#!/usr/bin/env node

/**
 * CSV Import Script for Railway
 * 
 * This script reads the merged_store_data.csv file and imports it into
 * the Railway MySQL database using INSERT statements instead of LOAD DATA INFILE.
 * 
 * Usage: node import-csv-to-railway.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const mysql = require('mysql2/promise');

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

async function importCSV() {
  let connection;

  try {
    log('🚀 Starting CSV import to Railway database...', colors.bold + colors.blue);

    // Get database credentials
    const host = process.env.MYSQLHOST || process.env.DB_HOST;
    const port = process.env.MYSQLPORT || process.env.DB_PORT || 3306;
    const user = process.env.MYSQLUSER || process.env.DB_USER;
    const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
    const database = process.env.MYSQLDATABASE || process.env.DB_NAME;

    if (!host || !user || !password || !database) {
      log('❌ Missing database credentials!', colors.red);
      log('Required: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE', colors.yellow);
      process.exit(1);
    }

    // Connect to database
    log(`📡 Connecting to ${host}:${port}...`, colors.blue);
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 20000
    });
    log('✅ Connected successfully!', colors.green);

    // Clear existing data
    log('🗑️  Clearing existing ingredients...', colors.yellow);
    await connection.query('DELETE FROM ingredients');
    log('✅ Cleared!', colors.green);

    // Read and import CSV
    const csvPath = path.join(__dirname, 'merged_store_data.csv');
    if (!fs.existsSync(csvPath)) {
      log('❌ CSV file not found: ' + csvPath, colors.red);
      process.exit(1);
    }

    log(`📄 Reading CSV file: ${csvPath}`, colors.blue);

    const fileStream = fs.createReadStream(csvPath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let lineNumber = 0;
    let imported = 0;
    let skipped = 0;
    const batchSize = 100;
    let batch = [];

    for await (const line of rl) {
      lineNumber++;

      // Skip header
      if (lineNumber === 1) continue;

      // Parse CSV line
      const regex = /("(?:[^"]|"")*"|[^,]*)/g;
      const values = [];
      let match;
      
      while ((match = regex.exec(line)) !== null) {
        if (match[1] !== undefined && match[1] !== '') {
          values.push(match[1].replace(/^"|"$/g, '').replace(/""/g, '"'));
        }
      }

      if (values.length < 6) {
        skipped++;
        continue;
      }

      const [productName, priceStr, , productCategory, productWebsiteLink, storeStr] = values;

      // Parse price
      let price = 0.0;
      if (priceStr && priceStr !== 'OUT_OF_STOCK' && priceStr !== '') {
        price = parseFloat(priceStr) || 0.0;
      }

      // Parse store
      let store = 'Coles';
      if (storeStr && storeStr.toLowerCase() === 'woolworths') {
        store = 'Woolworths';
      }

      batch.push([
        store,
        productName || '',
        price,
        productWebsiteLink || '',
        productCategory || ''
      ]);

      // Insert batch
      if (batch.length >= batchSize) {
        await connection.query(
          `INSERT INTO ingredients (store, product_name, product_price, product_image_link, product_category) 
           VALUES ?`,
          [batch]
        );
        imported += batch.length;
        batch = [];
        
        // Show progress
        if (imported % 1000 === 0) {
          log(`  📊 Imported ${imported} products...`, colors.blue);
        }
      }
    }

    // Insert remaining batch
    if (batch.length > 0) {
      await connection.query(
        `INSERT INTO ingredients (store, product_name, product_price, product_image_link, product_category) 
         VALUES ?`,
        [batch]
      );
      imported += batch.length;
    }

    log(`\n✅ Import completed!`, colors.green);
    log(`   📦 Total imported: ${imported}`, colors.green);
    log(`   ⏭️  Skipped (invalid): ${skipped}`, colors.yellow);

    // Verify import
    const [stats] = await connection.query(`
      SELECT 
        store,
        COUNT(*) as count,
        SUM(CASE WHEN product_price > 0 THEN 1 ELSE 0 END) as with_price
      FROM ingredients 
      GROUP BY store
    `);

    log(`\n📊 Import Statistics:`, colors.bold + colors.blue);
    stats.forEach(row => {
      log(`   ${row.store}: ${row.count} products (${row.with_price} with prices)`, colors.blue);
    });

    const [total] = await connection.query('SELECT COUNT(*) as total FROM ingredients');
    log(`\n🎉 Total records in database: ${total[0].total}`, colors.bold + colors.green);

  } catch (error) {
    log('\n❌ Import failed:', colors.red);
    log(error.message, colors.red);
    if (error.stack) {
      log(error.stack, colors.red);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      log('\n👋 Database connection closed', colors.blue);
    }
  }
}

// Run if called directly
if (require.main === module) {
  importCSV();
}

module.exports = { importCSV };
