#!/bin/bash

# Check dependencies
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
        if [ $? -ne 0 ]; then
            echo "Failed to install dependencies"
            exit 1
        fi
    fi
}

# Root check
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo"
    exit 1
fi

# Install dependencies if needed
check_dependencies

# Start MySQL
service mysql start
sleep 3

# Check if database exists, if not create it
DB_EXISTS=$(mysql -s -N -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='wdc';" 2>/dev/null)

if [ -z "$DB_EXISTS" ]; then
    echo "Database doesn't exist, creating fresh database..."
    mysql < wdc.sql
else
    echo "Database exists, preserving user data and only refreshing ingredients..."

    # Create database and user if they don't exist (safe operations)
    mysql -e "CREATE DATABASE IF NOT EXISTS wdc;"
    mysql -e "CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 'securepassword';"
    mysql -e "GRANT ALL PRIVILEGES ON wdc.* TO 'appuser'@'localhost';"
    mysql -e "FLUSH PRIVILEGES;"

    # Only recreate the ingredients table (preserve all other data)
    mysql -e "USE wdc; DROP TABLE IF EXISTS ingredients;"
    mysql -e "USE wdc; CREATE TABLE ingredients (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"

    echo "Ingredients table recreated, all other data preserved!"
fi

# Always import fresh CSV data
echo "Importing fresh ingredient data from CSV..."

if [ ! -f "merged_store_data.csv" ]; then
    echo "Error: CSV file not found"
    exit 1
fi

# Clean the original CSV file for proper UTF-8 encoding
echo "Ensuring CSV file has proper UTF-8 encoding..."
iconv -f utf-8 -t utf-8 -c merged_store_data.csv > merged_store_data.csv.tmp 2>/dev/null && mv merged_store_data.csv.tmp merged_store_data.csv || echo "CSV encoding is already clean"

mysql -e "SET GLOBAL local_infile = 1;"
mysql --local-infile=1 --default-character-set=utf8mb4 < bulk_import.sql

# Verify import
VALID_COUNT=$(mysql -s -N -e "USE wdc; SELECT COUNT(*) FROM ingredients WHERE product_price > 0;" 2>/dev/null || echo "0")
if [ "$VALID_COUNT" -eq 0 ]; then
    echo "Import failed"
    exit 1
fi

echo "CSV import completed successfully!"

# Start application
npm start