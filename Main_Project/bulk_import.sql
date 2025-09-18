USE wdc;

-- Set character encoding to handle special characters
SET NAMES utf8mb4;
SET CHARACTER_SET_CLIENT = utf8mb4;
SET CHARACTER_SET_CONNECTION = utf8mb4;
SET CHARACTER_SET_RESULTS = utf8mb4;

-- Display current status
SELECT 'Starting CSV import...' as status;

-- Clear existing data
DELETE FROM ingredients;
SELECT 'Cleared existing ingredients data' as status;

-- Enable local infile loading
SET GLOBAL local_infile = 1;

-- Bulk import from CSV file
LOAD DATA LOCAL INFILE 'merged_store_data.csv'
INTO TABLE ingredients
CHARACTER SET utf8mb4
FIELDS TERMINATED BY ','
ENCLOSED BY '"'
LINES TERMINATED BY '\r\n'
IGNORE 1 ROWS
(@product_name, @product_price, @dummy, @product_category, @product_website_link, @store)
SET
    product_name = @product_name,
    product_price = CASE
        WHEN @product_price = 'OUT_OF_STOCK' THEN 0.0
        WHEN @product_price = '' THEN 0.0
        ELSE CAST(@product_price AS DECIMAL(8,2))
    END,
    product_image_link = @product_website_link,
    product_category = @product_category,
    store = CASE
        WHEN LOWER(@store) = 'coles' THEN 'Coles'
        WHEN LOWER(@store) = 'woolworths' THEN 'Woolworths'
        ELSE @store
    END;

-- Show results
SELECT 'Import completed!' as status;
SELECT 'Store breakdown:' as status;
SELECT store, COUNT(*) as count FROM ingredients GROUP BY store;
SELECT 'Total records imported:' as status;
SELECT COUNT(*) as total_records FROM ingredients;

-- Verify data quality
SELECT 'Data quality check:' as status;
SELECT
    'Products with prices > 0' as metric,
    COUNT(*) as count
FROM ingredients
WHERE product_price > 0;

SELECT
    'Products with valid categories' as metric,
    COUNT(*) as count
FROM ingredients
WHERE product_category IS NOT NULL AND product_category != '';