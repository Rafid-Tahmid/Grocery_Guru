#!/usr/bin/env node

/**
 * Fast CSV Import - Uses bulk inserts for speed
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const csvParser = require('csv-parser');

async function fastImport() {
  let connection;

  try {
    console.log('🚀 Fast CSV import starting...');

    // Get database credentials
    const host = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost';
    const port = process.env.MYSQLPORT || process.env.DB_PORT || 3306;
    const user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
    const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
    const database = process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';

    console.log(`📡 Connecting to ${host}:${port}...`);
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      connectTimeout: 20000
    });
    console.log('✅ Connected!');

    // Clear existing data
    console.log('🗑️  Clearing old data...');
    await connection.query('DELETE FROM ingredients');
    console.log('✅ Cleared!');

    // Read CSV
    const csvPath = path.join(__dirname, 'merged_store_data.csv');
    console.log(`📄 Reading: ${csvPath}`);

    const products = [];
    
    await new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csvParser())
        .on('data', (row) => {
          const productName = row['Product Name'] || row['product_name'] || '';
          const priceStr = row['Product Price'] || row['product_price'] || '0';
          const category = row['Product Category'] || row['product_category'] || '';
          const link = row['Product Website Link'] || row['product_website_link'] || '';
          const storeStr = row['store'] || row['Store'] || 'Coles';

          let price = 0.0;
          if (priceStr && priceStr !== 'OUT_OF_STOCK' && priceStr !== '') {
            price = parseFloat(priceStr) || 0.0;
          }

          const store = storeStr.toLowerCase() === 'woolworths' ? 'Woolworths' : 'Coles';

          products.push([store, productName, price, link, category]);

          if (products.length % 1000 === 0) {
            console.log(`  📊 Processed ${products.length} rows...`);
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`✅ Read ${products.length} products from CSV`);

    // Insert in batches
    console.log('💾 Inserting into database...');
    const batchSize = 500;
    let inserted = 0;

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      await connection.query(
        `INSERT INTO ingredients (store, product_name, product_price, product_image_link, product_category) VALUES ?`,
        [batch]
      );
      inserted += batch.length;
      console.log(`  ✅ Inserted ${inserted}/${products.length} products`);
    }

    // Verify
    const [result] = await connection.query('SELECT COUNT(*) as count FROM ingredients');
    console.log(`\n🎉 Import complete! Total products: ${result[0].count}`);

    const [stats] = await connection.query(`
      SELECT store, COUNT(*) as count 
      FROM ingredients 
      GROUP BY store
    `);
    console.log('\n📊 By store:');
    stats.forEach(s => console.log(`   ${s.store}: ${s.count}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  fastImport()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fastImport };
