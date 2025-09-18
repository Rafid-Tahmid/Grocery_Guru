const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all recipes
router.get('/recipes', (req, res) => {
  const sql = 'SELECT * FROM recipes';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching recipes:', err);
      return res.status(500).json({ message: 'Failed to fetch recipes', error: err.message });
    }
    res.json(results);
  });
});

// Get a single recipe by ID
router.get('/recipes/:id', (req, res) => {
  const recipeId = req.params.id;
  const sql = 'SELECT * FROM recipes WHERE recipe_id = ?';
  db.query(sql, [recipeId], (err, results) => {
    if (err) {
      console.error('Error fetching recipe:', err);
      return res.status(500).json({ message: 'Failed to fetch recipe', error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.json(results[0]);
  });
});

module.exports = router;