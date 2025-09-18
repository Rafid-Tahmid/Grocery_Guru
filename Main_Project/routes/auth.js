// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Number of salt rounds for hashing
const SALT_ROUNDS = 10;

// Configure nodemailer (you'll need to set up your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can change this to your email service
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Single endpoint to handle both signup and login
router.post('/submit-form', async (req, res) => {
  const { email, username, password, confirmPassword, firstName, lastName, phoneNumber, state, postcode } = req.body;

  // Validate password confirmation on signup
  if (username && password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  // Validate password length for signup
  if (username && password.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters long' });
  }

  // ————— SIGNUP —————
  if (username) {
    try {
      // Hash the password before storing
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const sql = `
        INSERT INTO users (first_name, last_name, user_name, password, email_address, phone_number, state, postcode)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      db.query(sql, [firstName, lastName, username, hashedPassword, email, phoneNumber, state, postcode], (err, result) => {
        if (err) {
          console.error('Signup error:', err);
          return res
            .status(500)
            .json({ message: 'Signup failed', error: err.message });
        }
        return res.json({
          message: 'Signup successful',
          userId: result.insertId
        });
      });
    } catch (err) {
      console.error('Error hashing password:', err);
      return res
        .status(500)
        .json({ message: 'Signup failed', error: err.message });
    }
  } else {
    // ————— LOGIN —————
    const sql = `
      SELECT user_id, password AS hashedPassword
      FROM users
      WHERE email_address = ?
    `;
    db.query(sql, [email], async (err, results) => {
      if (err) {
        console.error('Login error:', err);
        return res
          .status(500)
          .json({ message: 'Login failed', error: err.message });
      }
      if (results.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      try {
        const storedHash = results[0].hashedPassword;
        const passwordMatch = await bcrypt.compare(password, storedHash);
        if (passwordMatch) {
          // Store user info in session
          req.session.userId = results[0].user_id;
          return res.json({
            message: 'Login successful',
            userId: results[0].user_id
          });
        } else {
          return res.status(401).json({ message: 'Invalid credentials' });
        }
      } catch (err) {
        console.error('Error comparing passwords:', err);
        return res
          .status(500)
          .json({ message: 'Login failed', error: err.message });
      }
    });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Password reset request
router.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    // Check if user exists
    const userQuery = 'SELECT user_id, first_name FROM users WHERE email_address = ?';
    db.query(userQuery, [email], async (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If your email is registered, you will receive a reset link.' });
      }

      const user = results[0];

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in database
      const tokenQuery = 'INSERT INTO reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)';
      db.query(tokenQuery, [user.user_id, resetToken, expiresAt], async (err) => {
        if (err) {
          console.error('Token storage error:', err);
          return res.status(500).json({ message: 'Error generating reset token' });
        }

        // Send reset email
        const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;
        const mailOptions = {
          from: process.env.EMAIL_USER || 'noreply@groceryguru.com',
          to: email,
          subject: 'Password Reset - GroceryGuru',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Password Reset Request</h2>
              <p>Hello ${user.first_name || 'User'},</p>
              <p>You have requested to reset your password for your GroceryGuru account.</p>
              <p>Click the button below to reset your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #666;">${resetUrl}</p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #666; font-size: 12px;">This is an automated message from GroceryGuru. Please do not reply to this email.</p>
            </div>
          `
        };

        try {
          await transporter.sendMail(mailOptions);
          res.json({ message: 'If your email is registered, you will receive a reset link.' });
        } catch (error) {
          console.error('Email sending error:', error);
          // For testing: log the reset URL to console if email fails
          console.log('*********************');
          console.log('PASSWORD RESET URL (for testing):');
          console.log(resetUrl);
          console.log('*********************');
          // Still respond successfully for security (don't reveal email sending failed)
          res.json({ message: 'If your email is registered, you will receive a reset link.' });
        }
      });
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Password reset
router.post('/api/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters long' });
  }

  try {
    // Check if token is valid and not expired
    const tokenQuery = `
      SELECT rt.user_id, rt.used
      FROM reset_tokens rt
      WHERE rt.token = ? AND rt.expires_at > NOW() AND rt.used = FALSE
    `;

    db.query(tokenQuery, [token], async (err, results) => {
      if (err) {
        console.error('Token verification error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const { user_id } = results[0];

      try {
        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);

        // Update user password
        const updateQuery = 'UPDATE users SET password = ? WHERE user_id = ?';
        db.query(updateQuery, [hashedPassword, user_id], (err) => {
          if (err) {
            console.error('Password update error:', err);
            return res.status(500).json({ message: 'Error updating password' });
          }

          // Mark token as used
          const markUsedQuery = 'UPDATE reset_tokens SET used = TRUE WHERE token = ?';
          db.query(markUsedQuery, [token], (err) => {
            if (err) {
              console.error('Token update error:', err);
              // Password was updated successfully, so we can still return success
            }

            // Clean up old tokens for this user
            const cleanupQuery = 'DELETE FROM reset_tokens WHERE user_id = ? AND (used = TRUE OR expires_at < NOW())';
            db.query(cleanupQuery, [user_id]);

            res.json({ message: 'Password reset successfully' });
          });
        });
      } catch (error) {
        console.error('Password hashing error:', error);
        res.status(500).json({ message: 'Error processing password' });
      }
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update user profile
router.post('/api/update-profile', async (req, res) => {
  const { firstName, lastName, email, phoneNumber, state, postcode, currentPassword, newPassword } = req.body;
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    // First verify current password
    const verifyQuery = 'SELECT password, email_address FROM users WHERE user_id = ?'; // Also fetch current email
    db.query(verifyQuery, [userId], async (err, results) => {
      if (err) {
        console.error('Password verification error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const { password: storedPasswordHash, email_address: currentEmail } = results[0];

      const passwordMatch = await bcrypt.compare(currentPassword, storedPasswordHash);
      if (!passwordMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      // Check if new email already exists for another user
      if (email && email !== currentEmail) { // Only check if email is provided and is different from current
        const emailExistsQuery = 'SELECT user_id FROM users WHERE email_address = ?';
        const [emailExistsErr, emailExistsResults] = await new Promise(resolve => {
          db.query(emailExistsQuery, [email], (err, res) => resolve([err, res]));
        });

        if (emailExistsErr) {
          console.error('Email existence check error:', emailExistsErr);
          return res.status(500).json({ message: 'Database error during email check' });
        }

        if (emailExistsResults.length > 0) {
          return res.status(409).json({ message: 'An account with this email already exists.' });
        }
      }

      // Build update query based on provided fields
      let updateFields = [];
      let updateValues = [];

      if (firstName) {
        updateFields.push('first_name = ?');
        updateValues.push(firstName);
      }
      if (lastName) {
        updateFields.push('last_name = ?');
        updateValues.push(lastName);
      }
      if (email) {
        updateFields.push('email_address = ?');
        updateValues.push(email);
      }
      if (phoneNumber) {
        updateFields.push('phone_number = ?');
        updateValues.push(phoneNumber);
      }
      if (state) {
        updateFields.push('state = ?');
        updateValues.push(state);
      }
      if (postcode) {
        updateFields.push('postcode = ?');
        updateValues.push(postcode);
      }
      if (newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
        updateFields.push('password = ?');
        updateValues.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      // Add user_id to updateValues
      updateValues.push(userId);

      const updateQuery = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE user_id = ?
      `;

      db.query(updateQuery, updateValues, (err) => {
        if (err) {
          console.error('Profile update error:', err);
          return res.status(500).json({ message: 'Failed to update profile' });
        }
        res.json({ message: 'Profile updated successfully' });
      });
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user profile data
router.get('/profile', async (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  try {
    const query = `
      SELECT
        first_name,
        last_name,
        email_address,
        phone_number,
        state,
        postcode
      FROM users
      WHERE user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
      if (err) {
        console.error('Profile fetch error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json(results[0]);
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
