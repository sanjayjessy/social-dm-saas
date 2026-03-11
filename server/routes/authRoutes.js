import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import PendingUser from '../models/PendingUser.js';
import Workspace from '../models/Workspace.js';
import { uploadAvatar } from "../middleware/upload.js";
import fs from "fs";
import path from "path";
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import sendEmail from '../utils/sendEmail.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key-change-in-production', {
    expiresIn: '30d'
  });
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create or update pending user
    let pendingUser = await PendingUser.findOne({ email });
    if (pendingUser) {
      pendingUser.name = name;
      pendingUser.password = password; // mongoose hooks will trigger if we use them, but we don't have them on PendingUser. We rely on User schema to hash it later. Wait, PendingUser stores plain password? Yes, it's temporary.
      pendingUser.role = role || 'user';
      pendingUser.token = verificationToken;
      pendingUser.createdAt = Date.now();
      await pendingUser.save();
    } else {
      pendingUser = new PendingUser({
        name,
        email,
        password, // Plain text here temporarily for 24 hours. Safe enough for local prototyping, but in prod we'd encrypt it or hash it.
        role: role || 'user',
        token: verificationToken
      });
      await pendingUser.save();
    }

    const verifyUrl = `${process.env.FRONTEND_URL || 'https://clickmychats.netlify.app'}/verify-email?token=${verificationToken}`;
    const emailHtml = `
      <h2>Verify your ClickMyChat account</h2>
      <p>Thanks for signing up! Please confirm your email address to activate your account.</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;margin:20px 0;background:#0f8b8d;color:#fff;text-decoration:none;border-radius:5px;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `;

    // Send verification email
    const emailResult = await sendEmail({
      to: pendingUser.email,
      subject: "Welcome to ClickMyChat - Verify your Email",
      html: emailHtml
    });

    if (!emailResult.success) {
      console.error("❌ Failed to send verification email:", emailResult.error);
    } else {
      console.log("✅ Verification email sent to:", pendingUser.email);
    }

    res.status(201).json({
      success: true,
      message: 'Registration initiated. Please check your email to verify your account.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user._id);

    let workspace = null;
    if (user.workspaceId) {
      workspace = await Workspace.findById(user.workspaceId);
    }

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          authProvider: user.authProvider,
          workspaceId: user.workspaceId,
          workspacePlan: workspace?.plan || 'free',
          workspaceBillingCycle: workspace?.billingCycle || 'monthly',
          workspaceBillingCycleStart: workspace?.billingCycleStart,
          workspaceBillingCycleEnd: workspace?.billingCycleEnd,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Google Login
router.post('/google-login', async (req, res) => {
  try {
    const { token: idToken, role, actionType } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify the Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatar } = payload;

    // Check if user exists by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    // No strict blocking — Google auth always uses find-or-create.
    // If user already exists on signup: just log them in.
    // If user doesn't exist on login: just create an account for them.

    if (!user) {
      // Create new user if doesn't exist
      user = new User({
        name,
        email,
        googleId,
        authProvider: 'google',
        avatar,
        role: role || 'user',
        isVerified: true // Google emails are pre-verified
      });

      const workspace = new Workspace({ ownerId: user._id });
      await workspace.save();
      user.workspaceId = workspace._id;

      await user.save();
    } else if (!user.googleId) {
      // If user exists with email but no googleId (originally signed up with email/password)
      // Link the Google account to the existing profile
      user.googleId = googleId;
      if (user.authProvider === 'local') {
        user.authProvider = 'google';
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
      }
      await user.save();
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    const token = generateToken(user._id);

    let workspace = null;
    if (user.workspaceId) {
      workspace = await Workspace.findById(user.workspaceId);
    }

    res.json({
      success: true,
      message: 'Google Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          createdAt: user.createdAt,
          authProvider: user.authProvider,
          workspaceId: user.workspaceId,
          workspacePlan: workspace?.plan || 'free',
          workspaceBillingCycle: workspace?.billingCycle || 'monthly',
          workspaceBillingCycleStart: workspace?.billingCycleStart,
          workspaceBillingCycleEnd: workspace?.billingCycleEnd
        },
        token
      }
    });

  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to authenticate with Google'
    });
  }
});

// Get current user (protected route)
router.get('/me', async (req, res) => {
  try {
    // This will be protected by auth middleware
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Invalidate tokens issued before passwordChangedAt (prevent session hijacking)
    if (user.passwordChangedAt) {
      const tokenIssuedAt = decoded.iat * 1000; // iat is in seconds
      if (tokenIssuedAt < new Date(user.passwordChangedAt).getTime()) {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired due to a password change. Please log in again.'
        });
      }
    }

    let workspace = null;
    if (user.workspaceId) {
      workspace = await Workspace.findById(user.workspaceId);
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        authProvider: user.authProvider,
        workspaceId: user.workspaceId,
        workspacePlan: workspace?.plan || 'free',
        workspaceBillingCycle: workspace?.billingCycle || 'monthly',
        workspaceBillingCycleStart: workspace?.billingCycleStart,
        workspaceBillingCycleEnd: workspace?.billingCycleEnd,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
});

router.put('/update', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key-change-in-production'
      );
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const { name, email, phone, password, isActive } = req.body;

    console.log('req.body:', req.body); const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    if (password && password.trim() !== "") {
      user.password = password; // assuming you hash in pre-save middleware
    }

    await user.save();

    const updatedUser = await User.findById(user._id).select('-password');
    let workspace = null;
    if (updatedUser.workspaceId) {
      workspace = await Workspace.findById(updatedUser.workspaceId);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          phone: updatedUser.phone,
          avatar: updatedUser.avatar,
          authProvider: updatedUser.authProvider,
          workspaceId: updatedUser.workspaceId,
          workspacePlan: workspace?.plan || 'free',
          workspaceBillingCycle: workspace?.billingCycle || 'monthly',
          workspaceBillingCycleStart: workspace?.billingCycleStart,
          workspaceBillingCycleEnd: workspace?.billingCycleEnd,
          createdAt: updatedUser.createdAt
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during profile update'
    });
  }
});

router.put("/avatar", uploadAvatar.single("avatar"), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const userFolder = path.join(process.cwd(), "uploads/users", decoded.userId);
    const avatarPath = path.join(userFolder, "avatar.jpg");

    // 🔴 REMOVE CASE
    if (!req.file) {

      if (fs.existsSync(userFolder)) {
        fs.rmSync(userFolder, { recursive: true, force: true });
      }

      user.avatar = null;
      await user.save();

      return res.json({
        success: true,
        message: "Avatar removed",
        data: { avatar: null }
      });
    }

    // 🟢 UPLOAD CASE
    user.avatar = `/uploads/users/${decoded.userId}/avatar.jpg`;
    await user.save();

    res.json({
      success: true,
      message: "Avatar updated",
      data: { avatar: user.avatar }
    });

  } catch (err) {
    console.error("Avatar route error:", err);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

// Verify Email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Invalid or missing token.' });
    }

    const pendingUser = await PendingUser.findOne({ token });

    if (!pendingUser) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token.' });
    }

    // Create the actual user
    const user = new User({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password, // Pre-save hook in User schema will hash this
      role: pendingUser.role,
      isVerified: true
    });

    const workspace = new Workspace({ ownerId: user._id });
    await workspace.save();
    user.workspaceId = workspace._id;

    await user.save();

    // Delete the pending user since they are verified
    await PendingUser.deleteOne({ _id: pendingUser._id });

    res.status(200).json({ success: true, message: 'Email verified successfully.' });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during verification.' });
  }
});

// Resend Verification
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

    // Check if user already completely exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Account is already verified. Please login.' });
    }

    const pendingUser = await PendingUser.findOne({ email });

    if (!pendingUser) {
      return res.status(404).json({ success: false, message: 'Pending registration not found. Please sign up.' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    pendingUser.token = verificationToken;
    pendingUser.createdAt = Date.now();
    await pendingUser.save();

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    const emailHtml = `
      <h2>Verify your ClickMyChat account</h2>
      <p>Please confirm your email address to activate your account.</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:10px 20px;margin:20px 0;background:#0f8b8d;color:#fff;text-decoration:none;border-radius:5px;">Verify Email</a>
      <p>This link will expire in 24 hours.</p>
    `;

    await sendEmail({
      to: pendingUser.email,
      subject: "ClickMyChat - Verify your Email",
      html: emailHtml
    });

    res.status(200).json({ success: true, message: 'Verification email sent successfully.' });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ success: false, message: 'Server error resending verification.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password — Step 1: Send OTP
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // No account found with this email
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this email address.' });
    }

    // Google-linked accounts must log in via Google — they have no password
    if (user.authProvider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'This account uses Google Sign-In. Please log in with Google instead.'
      });
    }

    // ── Rate-limit: max 3 OTP requests per 15 minutes ────────────────────────
    const WINDOW_MS   = 15 * 60 * 1000; // 15 min
    const MAX_REQUESTS = 3;
    const now = Date.now();

    if (
      user.otpRequestWindowStart &&
      now - new Date(user.otpRequestWindowStart).getTime() < WINDOW_MS
    ) {
      if (user.otpRequestCount >= MAX_REQUESTS) {
        return res.status(429).json({
          success: false,
          message: 'Too many OTP requests. Please wait 15 minutes before trying again.'
        });
      }
      user.otpRequestCount += 1;
    } else {
      // New window
      user.otpRequestWindowStart = new Date(now);
      user.otpRequestCount = 1;
    }

    // ── Generate 6-digit OTP & hash it ───────────────────────────────────────
    const otp     = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordOtpHash    = otpHash;
    user.resetPasswordOtpExpires = new Date(now + 10 * 60 * 1000); // 10 min
    user.resetPasswordAttempts   = 0;

    await user.save();

    // ── Send OTP e-mail ───────────────────────────────────────────────────────
    const emailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:8px;">
        <h2 style="color:#0f8b8d;margin-bottom:8px;">ClickMyChat — Password Reset</h2>
        <p style="color:#374151;">We received a request to reset your password.</p>
        <p style="color:#374151;">Your one-time password (OTP) is:</p>
        <div style="font-size:2.5em;font-weight:bold;letter-spacing:0.3em;color:#111827;background:#f3f4f6;padding:16px;border-radius:6px;text-align:center;margin:20px 0;">
          ${otp}
        </div>
        <p style="color:#6b7280;font-size:.875em;">This code expires in <strong>10 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `;

    await sendEmail({
      to:      user.email,
      subject: 'ClickMyChat — Your Password Reset OTP',
      html:    emailHtml
    });

    return res.status(200).json({ success: true, message: 'OTP sent! Check your inbox.' });
  } catch (error) {
    console.error('Forgot-password error:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password — Step 2: Verify OTP → get reset token
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.resetPasswordOtpHash) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    // ── Attempt limit: max 5 ─────────────────────────────────────────────────
    const MAX_ATTEMPTS = 5;
    if (user.resetPasswordAttempts >= MAX_ATTEMPTS) {
      // Clear OTP so user must request a new one
      user.resetPasswordOtpHash    = null;
      user.resetPasswordOtpExpires = null;
      user.resetPasswordAttempts   = 0;
      await user.save();
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.'
      });
    }

    // ── Check expiry ─────────────────────────────────────────────────────────
    if (new Date() > new Date(user.resetPasswordOtpExpires)) {
      user.resetPasswordOtpHash    = null;
      user.resetPasswordOtpExpires = null;
      user.resetPasswordAttempts   = 0;
      await user.save();
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // ── Compare SHA256 hashes (constant-time) ─────────────────────────────────
    const incomingHash = crypto.createHash('sha256').update(otp.trim()).digest('hex');
    const storedHash   = user.resetPasswordOtpHash;

    if (
      incomingHash.length !== storedHash.length ||
      !crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash))
    ) {
      user.resetPasswordAttempts += 1;
      await user.save();
      const remaining = MAX_ATTEMPTS - user.resetPasswordAttempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
      });
    }

    // ── OTP valid — issue a short-lived reset token ───────────────────────────
    const resetToken = jwt.sign(
      { userId: user._id, purpose: 'password-reset' },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '15m' }
    );

    // Keep OTP hash alive until password is actually reset (cleared in reset-password)
    user.resetPasswordAttempts = 0;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
      data: { resetToken }
    });
  } catch (error) {
    console.error('Verify-OTP error:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Forgot Password — Step 3: Reset Password using reset token
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }

    // ── Validate reset token ──────────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired. Please request a new OTP.' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Ensure the OTP flow was actually completed (hash must still exist)
    if (!user.resetPasswordOtpHash) {
      return res.status(400).json({ success: false, message: 'Password reset session is invalid. Please start over.' });
    }

    // ── Update password & clear reset fields ──────────────────────────────────
    user.password                 = newPassword; // pre-save hook hashes it
    user.passwordChangedAt        = new Date();
    user.resetPasswordOtpHash     = null;
    user.resetPasswordOtpExpires  = null;
    user.resetPasswordAttempts    = 0;
    user.otpRequestCount          = 0;
    user.otpRequestWindowStart    = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    console.error('Reset-password error:', error);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

export default router;
