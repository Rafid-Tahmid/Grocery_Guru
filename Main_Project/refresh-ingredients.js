#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// Colors for console output
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

function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Command failed: ${error.message}. stdout: ${stdout}, stderr: ${stderr}`));
            } else {
                resolve({ stdout, stderr });
            }
        });
    });
}

async function checkDatabaseExists() {
    try {
        // Try with root user first
        const result = await execPromise('mysql -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME=\'wdc\';" 2>/dev/null');
        return result.stdout.includes('wdc');
    } catch (error) {
        // If that fails, database probably doesn't exist
        return false;
    }
}

async function refreshIngredients() {
    try {
        log('🔄 Refreshing ingredients data while preserving all user data...', colors.bold + colors.blue);

        // Start MySQL if not running
        log('🔧 Starting MySQL service...', colors.blue);
        try {
            await execPromise('sudo service mysql start');
            await new Promise((resolve) => {
                setTimeout(resolve, 2000);
            });
            log('✅ MySQL service started', colors.green);
        } catch (error) {
            log('⚠️  MySQL might already be running', colors.yellow);
        }

        // Check if database exists
        const dbExists = await checkDatabaseExists();
        if (!dbExists) {
            log('❌ Error: Database "wdc" doesn\'t exist. Please run "npm start" first to create the database.', colors.red);
            process.exit(1);
        }

        log('✅ Database exists, preserving all user data...', colors.green);

        // Recreate ingredients table
        log('🗑️  Dropping old ingredients table...', colors.yellow);
        await execPromise('mysql -e "USE wdc; DROP TABLE IF EXISTS ingredients;"');

        log('🏗️  Creating new ingredients table...', colors.yellow);
        await execPromise(`mysql -e "USE wdc; CREATE TABLE ingredients (
            ingredient_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            store ENUM('Coles', 'Woolworths') NOT NULL,
            product_name VARCHAR(200) NOT NULL,
            product_price DECIMAL(8,2) NOT NULL,
            product_image_link TEXT,
            product_category VARCHAR(100),
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_store (store),
            INDEX idx_category (product_category),
            INDEX idx_product_name (product_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"`);

        log('✅ Ingredients table recreated!', colors.green);

        // Import fresh CSV data
        log('📊 Importing fresh ingredient data from CSV...', colors.blue);

        const csvPath = path.join(__dirname, 'merged_store_data.csv');
        if (!fs.existsSync(csvPath)) {
            log('❌ Error: CSV file "merged_store_data.csv" not found', colors.red);
            process.exit(1);
        }

        // Clean CSV encoding
        log('🔧 Ensuring CSV file has proper UTF-8 encoding...', colors.yellow);
        try {
            await execPromise(`iconv -f utf-8 -t utf-8 -c "${csvPath}" > "${csvPath}.tmp" && mv "${csvPath}.tmp" "${csvPath}"`);
        } catch (error) {
            log('CSV encoding is already clean', colors.yellow);
        }

        // Enable local file import and run bulk import
        await execPromise('mysql -e "SET GLOBAL local_infile = 1;"');
        await execPromise(`cd "${__dirname}" && mysql --local-infile=1 --default-character-set=utf8mb4 < bulk_import.sql`);

        // Verify import
        const validResult = await execPromise('mysql -s -N -e "USE wdc; SELECT COUNT(*) FROM ingredients WHERE product_price > 0;"');
        const totalResult = await execPromise('mysql -s -N -e "USE wdc; SELECT COUNT(*) FROM ingredients;"');

        const validCount = parseInt(validResult.stdout.trim(), 10);
        const totalCount = parseInt(totalResult.stdout.trim(), 10);

        if (validCount === 0) {
            log('❌ Import failed - no valid products found', colors.red);
            process.exit(1);
        }

        log('✅ CSV import completed successfully!', colors.green);
        log(`📈 Imported ${totalCount} total products (${validCount} with valid prices)`, colors.bold);
        log('🎉 Ingredients data refreshed! All user data, saved recipes, and meal plans preserved.', colors.green);

    } catch (error) {
        log('❌ Refresh failed:', colors.red);
        log(error.stderr || error.stdout || error.message, colors.red);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    refreshIngredients();
}

module.exports = { refreshIngredients };