const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, '.env')
});
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const createError = require('http-errors');
const cors = require('cors');
const session = require('express-session');

const db = require('./db');
const authMiddleware = require('./middleware/auth');
const adminAuthMiddleware = require('./middleware/adminAuth');
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const app = express();



// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({
  origin: true,
  credentials: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Custom cookie name
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Allows cookies to be sent on same-site navigations
    path: '/' // Ensure cookie is available across all paths
  }
}));

// Public routes
app.use('/', indexRouter);
app.use('/', authRouter);

// Protected routes
app.use('/admin', authMiddleware, adminAuthMiddleware, adminRouter);

// Helper function to save recipe ingredients
function saveRecipeIngredients(recipeId, ingredients, callback) {
  if (!ingredients || ingredients.length === 0) {
    return callback(null);
  }

  // Clear existing ingredients for this recipe first
  return db.query(
    'DELETE FROM recipe_ingredients WHERE recipe_id = ?',
    [recipeId],
    (deleteErr) => {
      if (deleteErr) {
        return callback(deleteErr);
      }

      // Insert new ingredients
      let processed = 0;
      const total = ingredients.length;

      if (total === 0) {
        return callback(null);
      }

      return ingredients.forEach((ingredient) => {
        db.query(
          'INSERT INTO recipe_ingredients (recipe_id, ingredient_name, measure) VALUES (?, ?, ?)',
          [recipeId, ingredient.name, ingredient.measure],
          (insertIngredientErr) => {
            if (insertIngredientErr) {
              // Handle ingredient insertion error silently
            }
            processed++;
            if (processed === total) {
              return callback(null);
            }
            return undefined;
          }
        );
      });
    }
  );
}

// Protected profile route: returns user_name from DB
app.get('/profile', authMiddleware, (req, res) => {
  const userId = req.user.id;
  db.query(
    'SELECT first_name, user_name FROM users WHERE user_id = ?',
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to retrieve profile', error: err.message });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const nameToShow = results[0].first_name || results[0].user_name;
      return res.json({ first_name: nameToShow });
    }
  );
});

// Save recipe from external API
app.post('/api/save-recipe', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const {
    external_id, recipe_name, strTags, recipe_category, recipe_region,
    recipe_photo, directions, directions_video, ingredients
  } = req.body;

  // Check if recipe already exists for this user
  db.query(
    'SELECT recipe_id FROM saved_recipes WHERE user_id = ? AND recipe_name = ?',
    [userId, recipe_name],
    (err, existing) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to check existing recipe', error: err.message });
      }

      if (existing.length > 0) {
        // Recipe already exists, return the existing recipe_id
        return res.json({
          recipe_id: existing[0].recipe_id,
          message: 'Recipe already exists'
        });
      }

      // Insert new recipe
      db.query(
        `INSERT INTO saved_recipes
         (user_id, external_id, recipe_name, strTags, recipe_category, recipe_region,
          recipe_photo, directions, directions_video, is_favorite)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
        [userId, external_id || null, recipe_name, strTags || '', recipe_category || '', recipe_region || '',
          recipe_photo || '', directions || '', directions_video || ''],
        (insertErr, result) => {
          if (insertErr) {
            return res.status(500).json({ message: 'Failed to save recipe', error: insertErr.message });
          }

          const recipeId = result.insertId;

          // Save ingredients if provided
          if (ingredients && ingredients.length > 0) {
            saveRecipeIngredients(recipeId, ingredients, (ingredientErr) => {
              if (ingredientErr) {
                // console.error('Warning: Failed to save ingredients:', ingredientErr.message);
              }
              return res.json({
                recipe_id: recipeId,
                message: 'Recipe saved successfully'
              });
            });
          } else {
            return res.json({
              recipe_id: recipeId,
              message: 'Recipe saved successfully'
            });
          }
        }
      );
    }
  );
});

// Get saved recipes for meal planner
app.get('/api/saved-recipes', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.query(
    'SELECT recipe_id, recipe_name, recipe_category, recipe_region, recipe_photo FROM saved_recipes WHERE user_id = ?',
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to retrieve saved recipes', error: err.message });
      }
      // All saved recipes are favorited by definition
      const recipesWithFavoriteStatus = results.map((recipe) => ({
        ...recipe,
        is_favorite: true
      }));
      return res.json(recipesWithFavoriteStatus);
    }
  );
});

// Recipe favorite endpoints
app.get('/api/recipes/:id/favorite', authMiddleware, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;

  db.query(
    'SELECT recipe_id FROM saved_recipes WHERE recipe_id = ? AND user_id = ?',
    [recipeId, userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to check favorite status', error: err.message });
      }
      // If recipe exists in saved_recipes, it's favorited
      return res.json({ isFavorited: results.length > 0 });
    }
  );
});

app.post('/api/recipes/:id/favorite', authMiddleware, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;
  const recipeData = req.body;

  // Check if recipe exists in saved recipes
  db.query(
    'SELECT * FROM saved_recipes WHERE recipe_id = ? AND user_id = ?',
    [recipeId, userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to check recipe status', error: err.message });
      }

      if (results.length === 0) {
        // Recipe doesn't exist, so save it as favorited
        db.query(
          'INSERT INTO saved_recipes (recipe_id, user_id, recipe_name, recipe_category, recipe_region, recipe_photo, is_favorite) VALUES (?, ?, ?, ?, ?, ?, true)',
          [recipeId, userId, recipeData.recipe_name || '', recipeData.recipe_category || '', recipeData.recipe_region || '', recipeData.recipe_photo || ''],
          (err) => {
            if (err) {
              return res.status(500).json({ message: 'Failed to save recipe', error: err.message });
            }
            return res.json({ message: 'Recipe favorited successfully', isFavorited: true });
          }
        );
      } else {
        // Recipe exists, remove it from favorites
        db.query(
          'DELETE FROM saved_recipes WHERE recipe_id = ? AND user_id = ?',
          [recipeId, userId],
          (err) => {
            if (err) {
              return res.status(500).json({ message: 'Failed to remove recipe', error: err.message });
            }
            return res.json({ message: 'Recipe unfavorited successfully', isFavorited: false });
          }
        );
      }
    }
  );
});

// ===================================================================
// MEAL PLAN API ENDPOINTS
// ===================================================================

// Get user's meal plan
app.get('/api/meal-plan', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT mp.recipe_id, mp.day_of_week, mp.meal_type, sr.recipe_name, sr.recipe_photo, sr.recipe_category, sr.recipe_region
     FROM meal_plan mp
     JOIN saved_recipes sr ON mp.recipe_id = sr.recipe_id
     WHERE mp.user_id = ?
     ORDER BY FIELD(mp.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
              FIELD(mp.meal_type, 'Breakfast', 'Lunch', 'Dinner')`,
    [userId],
    (err, results) => {
      if (err) {
        // console.error('Database error retrieving meal plan:', err);
        return res.status(500).json({ message: 'Failed to retrieve meal plan', error: err.message });
      }
      return res.json(results);
    }
  );
});

// Add or Update recipe in meal plan
app.post('/api/meal-plan', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const {
    recipe_id, day_of_week, meal_type
  } = req.body;

  // console.log('Meal plan request:', { userId, recipe_id, day_of_week, meal_type });

  if (!recipe_id || !day_of_week || !meal_type) {
    return res.status(400).json({ message: 'Missing required fields: recipe_id, day_of_week, meal_type' });
  }

  // First, verify the recipe exists in saved_recipes for this user
  db.query(
    'SELECT recipe_id FROM saved_recipes WHERE recipe_id = ? AND user_id = ?',
    [recipe_id, userId],
    (recipeErr, recipeResults) => {
      if (recipeErr) {
        // console.error('Database error checking recipe existence:', recipeErr);
        return res.status(500).json({ message: 'Failed to verify recipe existence', error: recipeErr.message });
      }

      if (recipeResults.length === 0) {
        // console.log('Recipe not found in saved_recipes:', recipe_id, 'for user:', userId);
        return res.status(404).json({ message: 'Recipe not found in saved recipes. Please save the recipe first.' });
      }

      // console.log('Recipe exists in saved_recipes, proceeding with meal plan operation');

      // Now check if a meal already exists for this day and meal type for the user
      db.query(
        `SELECT plan_id FROM meal_plan
         WHERE user_id = ? AND day_of_week = ? AND meal_type = ?`,
        [userId, day_of_week, meal_type],
        (err, existing) => {
          if (err) {
            // console.error('Database error checking existing meal plan entry:', err);
            return res.status(500).json({ message: 'Failed to check existing meal plan entry', error: err.message });
          }

          if (existing.length > 0) {
            // Update existing meal
            // console.log('Updating existing meal plan entry');
            db.query(
              'UPDATE meal_plan SET recipe_id = ? WHERE plan_id = ?',
              [recipe_id, existing[0].plan_id],
              (updateErr) => {
                if (updateErr) {
                // console.error('Database error updating meal plan:', updateErr);
                  return res.status(500).json({ message: 'Failed to update meal plan', error: updateErr.message });
                }
                return res.json({ message: 'Meal plan updated successfully' });
              }
            );
          } else {
            // Insert new meal
            // console.log('Inserting new meal plan entry');
            db.query(
              `INSERT INTO meal_plan
               (user_id, recipe_id, day_of_week, meal_type)
               VALUES (?, ?, ?, ?)`,
              [userId, recipe_id, day_of_week, meal_type],
              (insertErr) => {
                if (insertErr) {
                  // console.error('Database error adding to meal plan:', insertErr);
                  // console.error('Insert values:', [userId, recipe_id, day_of_week, meal_type]);
                  return res.status(500).json({ message: 'Failed to add to meal plan', error: insertErr.message });
                }
                return res.json({ message: 'Recipe added to meal plan successfully' });
              }
            );
          }
        }
      );
    }
  );
});

// Remove recipe from meal plan
app.delete('/api/meal-plan', authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { day_of_week, meal_type } = req.body;

  if (!day_of_week || !meal_type) {
    return res.status(400).json({ message: 'Missing required fields: day_of_week, meal_type' });
  }

  db.query(
    `DELETE FROM meal_plan
     WHERE user_id = ? AND day_of_week = ? AND meal_type = ?`,
    [userId, day_of_week, meal_type],
    (err, result) => {
      if (err) {
        // console.error('Database error removing meal from plan:', err);
        return res.status(500).json({ message: 'Failed to remove meal from plan', error: err.message });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Meal entry not found for this user, day, and meal type.' });
      }
      return res.json({ message: 'Meal removed successfully' });
    }
  );
});

// Clear entire meal plan for a user
app.delete('/api/meal-plan/clear-week', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.query(
    `DELETE FROM meal_plan
     WHERE user_id = ?`,
    [userId],
    (err) => {
      if (err) {
        // console.error('Database error clearing meal plan:', err);
        return res.status(500).json({ message: 'Failed to clear meal plan', error: err.message });
      }
      return res.json({ message: 'Meal plan cleared successfully' });
    }
  );
});

// Get ingredients for user's meal plan (for shopping list generation)
app.get('/api/meal-plan/ingredients', authMiddleware, (req, res) => {
  const userId = req.user.id;

  db.query(
    `SELECT DISTINCT ri.ingredient_name, ri.measure
     FROM meal_plan mp
     JOIN saved_recipes sr ON mp.recipe_id = sr.recipe_id
     JOIN recipe_ingredients ri ON sr.recipe_id = ri.recipe_id
     WHERE mp.user_id = ?
     ORDER BY ri.ingredient_name`,
    [userId],
    (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Failed to retrieve meal plan ingredients', error: err.message });
      }
      return res.json(results);
    }
  );
});

// Get ingredient prices from Coles only
app.get('/api/ingredients/prices/:ingredient', (req, res) => {
  const { ingredient } = req.params;

  // Search for ingredient prices in Coles store only using fuzzy matching
  db.query(
    `SELECT product_name, product_price, product_image_link, product_category
     FROM ingredients
     WHERE product_name LIKE ? AND store = 'Coles'
     ORDER BY product_price ASC`,
    [`%${ingredient}%`],
    (dbErr, results) => {
      if (dbErr) {
        return res.status(500).json({ message: 'Failed to retrieve ingredient prices', error: dbErr.message });
      }

      // Return the best (cheapest) option from Coles
      let colesProduct = null;

      if (results.length > 0) {
        // Find the cheapest product with price > 0 (in stock)
        const inStockProducts = results.filter((item) => parseFloat(item.product_price) > 0);

        if (inStockProducts.length > 0) {
          colesProduct = {
            product_name: inStockProducts[0].product_name,
            product_price: inStockProducts[0].product_price,
            product_website_link: inStockProducts[0].product_image_link,
            // This is actually the website link
            product_category: inStockProducts[0].product_category
          };
        } else {
          // All products are out of stock, return the first one
          colesProduct = {
            product_name: results[0].product_name,
            product_price: results[0].product_price,
            product_website_link: results[0].product_image_link,
            // This is actually the website link
            product_category: results[0].product_category
          };
        }
      }

      return res.json({
        Coles: colesProduct
      });
    }
  );
});

// Get recipe details
app.get('/api/recipes/:id', authMiddleware, (req, res) => {
  const recipeId = req.params.id;
  const userId = req.user.id;

  // Find the recipe using recipe_id
  db.query(
    `SELECT r.*,
     CASE WHEN sr.recipe_id IS NOT NULL THEN true ELSE false END as is_favorite
     FROM recipes r
     LEFT JOIN saved_recipes sr ON r.recipe_id = sr.recipe_id AND sr.user_id = ?
     WHERE r.recipe_id = ?`,
    [userId, recipeId],
    (err, results) => {
      if (err) {
        // console.error('Database error retrieving recipe:', err);
        return res.status(500).json({ message: 'Failed to retrieve recipe', error: err.message });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'Recipe not found' });
      }

      const recipe = results[0];

      // Get ingredients for this recipe
      db.query(
        'SELECT ingredient_name, measure FROM recipe_ingredients WHERE recipe_id = ?',
        [recipeId],
        (ingredientsErr, ingredients) => {
          if (ingredientsErr) {
            // console.error('Database error retrieving ingredients:', ingredientsErr);
            return res.status(500).json({ message: 'Failed to retrieve ingredients', error: ingredientsErr.message });
          }

          recipe.ingredients = ingredients;
          return res.json(recipe);
        }
      );
    }
  );
});

// Get individual saved recipe by ID
app.get('/api/saved-recipes/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const userId = req.user.user_id;

  // Query to get recipe with its ingredients
  const recipeQuery = `
    SELECT
      sr.recipe_id, sr.recipe_name, sr.recipe_category, sr.recipe_region,
      sr.recipe_photo, sr.directions, sr.directions_video, sr.date_saved,
      ri.ingredient_name, ri.measure
    FROM saved_recipes sr
    LEFT JOIN recipe_ingredients ri ON sr.recipe_id = ri.recipe_id
    WHERE sr.recipe_id = ? AND sr.user_id = ?
    ORDER BY ri.id
  `;

  db.query(recipeQuery, [id, userId], (err, rows) => {
    if (err) {
      // console.error('Error fetching saved recipe:', err);
      return res.status(500).json({ message: 'Error fetching recipe' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' });
    }

    // Group ingredients by recipe
    const recipe = {
      recipe_id: rows[0].recipe_id,
      recipe_name: rows[0].recipe_name,
      recipe_category: rows[0].recipe_category,
      recipe_region: rows[0].recipe_region,
      recipe_photo: rows[0].recipe_photo,
      directions: rows[0].directions,
      directions_video: rows[0].directions_video,
      date_saved: rows[0].date_saved,
      ingredients: []
    };

    // Add ingredients to the recipe object
    rows.forEach((row) => {
      if (row.ingredient_name) {
        recipe.ingredients.push({
          ingredient_name: row.ingredient_name,
          measure: row.measure
        });
      }
    });

    res.json(recipe);
  });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
/* eslint-disable-next-line no-unused-vars */
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.json({
    message: err.message,
    ...(req.app.get('env') === 'development' ? { error: err } : {})
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  // Server started successfully - no console logging needed
});

module.exports = app;
