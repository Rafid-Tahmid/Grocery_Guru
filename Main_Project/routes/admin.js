// routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// Get current user info
router.get('/current-user', (req, res) => {
  const userId = req.session.userId;
  const sql = 'SELECT user_id, first_name, user_name, is_admin FROM users WHERE user_id = ?';

  db.query(sql, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Failed to fetch current user', error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(results[0]);
  });
});

// Get all users (including admin status)
router.get('/users', async (req, res) => {
  const sql = 'SELECT user_id, first_name, last_name, user_name, email_address, phone_number, state, postcode, is_admin FROM users';

  db.query(sql, (err, results) => {
    if (err) {
      console.error('Error fetching users:', err);
      return res.status(500).json({ message: 'Failed to fetch users', error: err.message });
    }
    res.json(results);
  });
});

// Add new user (including admin status)
router.post('/users', async (req, res) => {
  const { firstName, lastName, email, username, password, phone, state, postcode, isAdmin } = req.body;

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = `
      INSERT INTO users (first_name, last_name, user_name, password, email_address, phone_number, state, postcode, is_admin)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [firstName, lastName, username, hashedPassword, email, phone, state, postcode, isAdmin || false], (err, result) => {
      if (err) {
        console.error('Error adding user:', err);
        return res.status(500).json({ message: 'Failed to add user', error: err.message });
      }

      res.status(201).json({
        message: 'User added successfully',
        userId: result.insertId
      });
    });
  } catch (err) {
    console.error('Error hashing password:', err);
    res.status(500).json({ message: 'Failed to add user', error: err.message });
  }
});

// Update user (including admin status)
router.put('/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { firstName, lastName, email, username, password, phone, state, postcode, isAdmin } = req.body;

  // Prevent user from removing their own admin status
  if (req.session.userId === parseInt(userId) && isAdmin === false) {
    return res.status(400).json({ message: 'You cannot remove your own admin privileges' });
  }

  try {
    let sql;
    let params;

    if (password) {
      // If password is provided, update it along with other fields
      const hashedPassword = await bcrypt.hash(password, 10);
      sql = `
        UPDATE users
        SET first_name = ?, last_name = ?, user_name = ?, password = ?,
            email_address = ?, phone_number = ?, state = ?, postcode = ?, is_admin = ?
        WHERE user_id = ?
      `;
      params = [firstName, lastName, username, hashedPassword, email, phone, state, postcode, isAdmin || false, userId];
    } else {
      // If no password provided, update other fields only
      sql = `
        UPDATE users
        SET first_name = ?, last_name = ?, user_name = ?,
            email_address = ?, phone_number = ?, state = ?, postcode = ?, is_admin = ?
        WHERE user_id = ?
      `;
      params = [firstName, lastName, username, email, phone, state, postcode, isAdmin || false, userId];
    }

    db.query(sql, params, (err, result) => {
      if (err) {
        console.error('Error updating user:', err);
        return res.status(500).json({ message: 'Failed to update user', error: err.message });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'User updated successfully' });
    });
  } catch (err) {
    console.error('Error in update operation:', err);
    res.status(500).json({ message: 'Failed to update user', error: err.message });
  }
});

// Delete user
router.delete('/users/:id', (req, res) => {
  const userId = req.params.id;

  // Prevent user from deleting their own account
  if (req.session.userId === parseInt(userId)) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }

  const sql = 'DELETE FROM users WHERE user_id = ?';

  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      return res.status(500).json({ message: 'Failed to delete user', error: err.message });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  });
});

module.exports = router;