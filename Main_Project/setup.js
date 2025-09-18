#!/usr/bin/env node

const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

// Configuration
const DB_CONFIG = {
    host: 'localhost',
    user: 'appuser',
    password: 'securepassword',
    database: 'wdc',
    multipleStatements: true
};

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
    // console.log(`${color}${message}${colors.reset}`);
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

async function startMySQL() {
    log('Starting MySQL service...', colors.blue);
    try {
        await execPromise('sudo service mysql start');
        // Wait a bit for MySQL to fully start
        await new Promise((resolve) => {
            setTimeout(resolve, 3000);
        });
        log('MySQL service started', colors.green);
    } catch (error) {
        log('MySQL might already be running or failed to start', colors.yellow);
        log(error.stderr || error.stdout, colors.yellow);
    }
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

async function setupDatabase() {
    log('Setting up database...', colors.blue);

    try {
        const dbExists = await checkDatabaseExists();

        if (!dbExists) {
            log('Creating fresh database from wdc.sql...', colors.yellow);
            await execPromise(`mysql < ${path.join(__dirname, 'wdc.sql')}`);
            log('Database created successfully', colors.green);
        } else {
            log('Database exists, preserving user data...', colors.yellow);

            // Create database and user if they don't exist (safe operations)
            await execPromise('mysql -e "CREATE DATABASE IF NOT EXISTS wdc;"');
            await execPromise('mysql -e "CREATE USER IF NOT EXISTS \'appuser\'@\'localhost\' IDENTIFIED BY \'securepassword\';"');
            await execPromise('mysql -e "GRANT ALL PRIVILEGES ON wdc.* TO \'appuser\'@\'localhost\';"');
            await execPromise('mysql -e "FLUSH PRIVILEGES;"');

            // Recreate tokens table
            await execPromise(`mysql -e "USE wdc; DROP TABLE IF EXISTS reset_tokens;"`);

            await execPromise(`mysql -e "USE wdc; CREATE TABLE reset_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT UNSIGNED NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used BOOLEAN DEFAULT FALSE,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);"`);


            // Recreate ingredients table
            await execPromise(`mysql -e "USE wdc; DROP TABLE IF EXISTS ingredients;"`);
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

            log('Database setup completed, user data preserved', colors.green);
        }
    } catch (error) {
        log('Database setup failed:', colors.red);
        log(error.stderr || error.stdout || error.message, colors.red);
        throw error;
    }
}

async function importCSVData() {
    log('Importing CSV data...', colors.blue);

    const csvPath = path.join(__dirname, 'merged_store_data.csv');
    if (!fs.existsSync(csvPath)) {
        log('CSV file not found, skipping import', colors.yellow);
        return;
    }

    try {
        // Clean CSV encoding
        log('Ensuring proper UTF-8 encoding...', colors.yellow);
        try {
            await execPromise(`iconv -f utf-8 -t utf-8 -c "${csvPath}" > "${csvPath}.tmp" && mv "${csvPath}.tmp" "${csvPath}"`);
        } catch (error) {
            log('CSV encoding is already clean', colors.yellow);
        }

        // Enable local file import and run bulk import
        await execPromise('mysql -e "SET GLOBAL local_infile = 1;"');
        await execPromise(`cd "${__dirname}" && mysql --local-infile=1 --default-character-set=utf8mb4 < bulk_import.sql`);

        // Verify import
        const result = await execPromise('mysql -s -N -e "USE wdc; SELECT COUNT(*) FROM ingredients WHERE product_price > 0;"');
        const validCount = parseInt(result.stdout.trim(), 10);

        if (validCount === 0) {
            throw new Error('Import failed - no valid products found');
        }

        log(`CSV import completed! Imported ${validCount} valid products`, colors.green);
    } catch (error) {
        log('CSV import failed:', colors.red);
        log(error.stderr || error.stdout || error.message, colors.red);
        throw error;
    }
}

async function startServer() {
    log('Starting Node.js server...', colors.blue);

    // Change to the correct directory and start the app
    process.chdir(__dirname);

    // Start the server using spawn to keep it running
    const server = spawn('node', ['app.js'], {
        stdio: 'inherit'
    });

    server.on('error', (error) => {
        log('Failed to start server:', colors.red);
        log(error.message, colors.red);
        process.exit(1);
    });

    server.on('close', (code) => {
        log(`Server exited with code ${code}`, code === 0 ? colors.green : colors.red);
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        log('\nShutting down...', colors.yellow);
        server.kill('SIGINT');
        process.exit(0);
    });

    log('Server started successfully!', colors.green);
    log('Access your application at http://localhost:8080', colors.bold);
}

async function main() {
    try {
        log('Starting WDC Application Setup...', colors.bold + colors.blue);

        await startMySQL();
        await setupDatabase();
        await importCSVData();
        await startServer();

    } catch (error) {
        log('Setup failed:', colors.red);
        log(error.message || error, colors.red);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (require.main === module) {
    main();
}

module.exports = { main };
