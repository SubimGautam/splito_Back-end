import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/user.model';
import auth from '../middleware/auth';
import { sendResetCode } from '../utils/email';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    
    console.log('📝 Registration attempt:', { username, email });

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists' 
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'user',
    });

    await user.save();
    console.log('✅ User created successfully:', username);

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' } as jwt.SignOptions
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('='.repeat(50));
    console.log('🔐 LOGIN ATTEMPT');
    console.log('='.repeat(50));
    console.log('📧 Email:', email);

    const trimmedEmail = email?.trim().toLowerCase();
    const trimmedPassword = password?.trim();

    if (!trimmedEmail || !trimmedPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      console.log('❌ User not found for email:', trimmedEmail);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ User found:', user.username);

    const isMatch = await bcrypt.compare(trimmedPassword, user.password);
    console.log('🔑 Password match result:', isMatch);

    if (!isMatch) {
      console.log('❌ Password comparison failed');
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ Password matched successfully');

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' } as jwt.SignOptions
    );

    console.log('✅ Login successful for:', user.username);
    console.log('='.repeat(50));

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Forgot Password - Send 6-digit code
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('='.repeat(50));
    console.log('🔐 FORGOT PASSWORD REQUEST');
    console.log('='.repeat(50));
    console.log('📧 Email:', email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    
    // For security, don't reveal if email exists or not
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.json({ 
        success: true, 
        message: 'If that email exists, a reset code has been sent.' 
      });
    }

    console.log('✅ User found:', user.username);

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set code expiry (10 minutes)
    const codeExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Save code and expiry to user
    user.resetCode = resetCode;
    user.resetCodeExpires = codeExpires;
    await user.save();

    console.log('✅ Reset code generated for user:', user.username);
    console.log('🔑 Code:', resetCode);
    
    // SEND EMAIL WITH CODE
    try {
      await sendResetCode(email, resetCode);
      console.log('✅ Reset code email sent to:', email);
    } catch (emailError) {
      console.error('❌ Failed to send email:', emailError);
    }

    res.json({ 
      success: true, 
      message: 'If that email exists, a reset code has been sent.' 
    });

  } catch (error) {
    console.error('❌ Forgot password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Verify Reset Code
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log('='.repeat(50));
    console.log('🔐 VERIFY CODE REQUEST');
    console.log('='.repeat(50));
    console.log('📧 Email:', email);
    console.log('🔑 Code:', code);

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and code are required'
      });
    }

    // Find user with valid code
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetCode: code,
      resetCodeExpires: { $gt: new Date() }
    });

    if (!user) {
      console.log('❌ Invalid or expired code for email:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired code'
      });
    }

    console.log('✅ Valid code found for user:', user.username);

    // Generate a temporary token for password reset
    const resetToken = jwt.sign(
      { userId: user._id, email: user.email, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '15m' } as jwt.SignOptions
    );

    res.json({
      success: true,
      message: 'Code verified successfully',
      data: {
        resetToken,
        email: user.email
      }
    });

  } catch (error) {
    console.error('❌ Verify code error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, password, confirmPassword } = req.body;
    
    console.log('='.repeat(50));
    console.log('🔐 RESET PASSWORD REQUEST');
    console.log('='.repeat(50));

    if (!resetToken || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'your-secret-key') as any;
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({
        success: false,
        message: 'Invalid reset token'
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password and clear reset code
    user.password = hashedPassword;
    user.resetCode = null;
    user.resetCodeExpires = null; 
    await user.save();

    console.log('✅ Password reset successful for:', user.username);
    console.log('='.repeat(50));

    res.json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    console.error('❌ Reset password error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// Refresh token
router.post('/refresh-token', auth, async (req: any, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' } as jwt.SignOptions
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Token refresh failed' 
    });
  }
});

export default router;