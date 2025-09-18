CREATE DATABASE IF NOT EXISTS wdc;

CREATE USER IF NOT EXISTS 'appuser'@'localhost' IDENTIFIED BY 'securepassword';
GRANT ALL PRIVILEGES ON wdc.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;

USE wdc;
-- USERS TABLE
CREATE TABLE users (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    password VARCHAR(64) NOT NULL,
    first_name VARCHAR(64),
    user_name VARCHAR(64),
    last_name VARCHAR(64),
    state VARCHAR(64),
    postcode VARCHAR(64),
    email_address VARCHAR(64) UNIQUE NOT NULL,
    phone_number VARCHAR(64),
    is_admin BOOLEAN DEFAULT FALSE
);

-- SAVED RECIPES TABLE
CREATE TABLE saved_recipes (
    recipe_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, -- internal recipe ID
    user_id INT UNSIGNED,
    external_id VARCHAR(20),                          -- TheMealDB API ID (idMeal)
    recipe_name VARCHAR(100) NOT NULL,                -- strMeal
    strTags TEXT,                                     -- recipe tags from API
    recipe_category VARCHAR(50),                      -- strCategory (e.g., Vegetarian)
    recipe_region VARCHAR(50),                        -- strArea (e.g., Italian)
    recipe_photo TEXT,                                -- strMealThumb
    directions TEXT,                                  -- strInstructions
    directions_video TEXT,                            -- strYoutube
    date_saved TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_favorite BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- RECIPE INGREDIENTS TABLE (for storing ingredients of saved recipes)
CREATE TABLE recipe_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT UNSIGNED,
    ingredient_name VARCHAR(200) NOT NULL,
    measure VARCHAR(100),
    FOREIGN KEY (recipe_id) REFERENCES saved_recipes(recipe_id) ON DELETE CASCADE
);

-- INGREDIENTS TABLE (Simple structure for CSV import)
CREATE TABLE ingredients (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MEAL PLAN TABLE (for scheduling meals by day/type)
CREATE TABLE meal_plan (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED,
    recipe_id INT UNSIGNED,
    external_id VARCHAR(20),                          -- TheMealDB API ID for direct linking
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    meal_type ENUM('Breakfast', 'Lunch', 'Dinner') NOT NULL,
    plan_group VARCHAR(100), -- e.g., 'Weekly Plan', 'Family Meals'
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES saved_recipes(recipe_id) ON DELETE CASCADE
);

-- RESET TOKENS TABLE (for password reset functionality)
CREATE TABLE reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    used BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);