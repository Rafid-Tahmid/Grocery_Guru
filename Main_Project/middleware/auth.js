// middleware/auth.js

// Session-based authentication middleware
module.exports = function (req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Please log in to continue' });
  }

  // Attach user info to request object
  req.user = { id: req.session.userId };
  next();
};