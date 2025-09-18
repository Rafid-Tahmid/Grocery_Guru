const db = require('../db');

// Admin authentication middleware
module.exports = function (req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Please log in to continue' });
  }

  // Check if user is admin
  const sql = 'SELECT is_admin FROM users WHERE user_id = ?';
  db.query(sql, [req.session.userId], (err, results) => {
    if (err) {
      console.error('Error checking admin status:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }

    if (results.length === 0 || !results[0].is_admin) {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // User is admin, proceed
    next();
  });
};