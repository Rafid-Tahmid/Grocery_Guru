#!/bin/bash

# Script to refresh only ingredients data while preserving all other data
echo "🔄 Refreshing ingredients data while preserving all user data..."

# Root check
if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo"
    exit 1
fi

# Start MySQL if not running
service mysql start
sleep 2

# Check if database exists
DB_EXISTS=$(mysql -s -N -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='wdc';" 2>/dev/null)

if [ -z "$DB_EXISTS" ]; then
    echo "❌ Error: Database 'wdc' doesn't exist. Please run start.sh first to create the database."
    exit 1
fi

echo "✅ Database exists, preserving all user data..."

# Only recreate the ingredients table (preserve all other data)
echo "🗑️  Dropping old ingredients table..."
mysql -e "USE wdc; DROP TABLE IF EXISTS ingredients;"

echo "🏗️  Creating new ingredients table..."
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

echo "✅ Ingredients table recreated!"

# Import fresh CSV data
echo "📊 Importing fresh ingredient data from CSV..."

if [ ! -f "merged_store_data.csv" ]; then
    echo "❌ Error: CSV file 'merged_store_data.csv' not found"
    exit 1
fi

# Clean the CSV file for proper UTF-8 encoding
echo "🔧 Ensuring CSV file has proper UTF-8 encoding..."
iconv -f utf-8 -t utf-8 -c merged_store_data.csv > merged_store_data.csv.tmp 2>/dev/null && mv merged_store_data.csv.tmp merged_store_data.csv || echo "CSV encoding is already clean"

# Enable local file import and run the bulk import
mysql -e "SET GLOBAL local_infile = 1;"
mysql --local-infile=1 --default-character-set=utf8mb4 < bulk_import.sql

# Verify import
VALID_COUNT=$(mysql -s -N -e "USE wdc; SELECT COUNT(*) FROM ingredients WHERE product_price > 0;" 2>/dev/null || echo "0")
TOTAL_COUNT=$(mysql -s -N -e "USE wdc; SELECT COUNT(*) FROM ingredients;" 2>/dev/null || echo "0")

if [ "$VALID_COUNT" -eq 0 ]; then
    echo "❌ Import failed - no valid products found"
    exit 1
fi

echo "✅ CSV import completed successfully!"
echo "📈 Imported $TOTAL_COUNT total products ($VALID_COUNT with valid prices)"
echo "🎉 Ingredients data refreshed! All user data, saved recipes, and meal plans preserved."