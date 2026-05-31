import crypto from 'crypto';
import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/token.js';
import { sendResetPasswordEmail, sendRegisterEmail, sendLoginEmail } from './email.js';

/**
 * Register a new user
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {Object} { user, accessToken, refreshToken }
 */
export async function register(username, email, password) {
  // Check if username or email already exists
  const existingUser = await User.findOne({
    $or: [{ username }, { email }]
  });

  if (existingUser) {
    const field = existingUser.username === username ? 'Username' : 'Email';
    const error = new Error(`${field} already exists`);
    error.statusCode = 409;
    throw error;
  }

  const user = new User({ username, email, password });
  await user.save();

  const accessToken = generateAccessToken({ userId: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user._id });

  sendRegisterEmail(user).catch(() => {});

  return { user, accessToken, refreshToken };
}

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Object} { user, accessToken, refreshToken }
 */
export async function login(email, password) {
  const user = await User.findOne({ email });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const accessToken = generateAccessToken({ userId: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user._id });

  sendLoginEmail(user).catch(() => {});

  return { user, accessToken, refreshToken };
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken
 * @returns {Object} { accessToken, refreshToken }
 */
export async function refreshToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token');
    error.statusCode = 401;
    throw error;
  }

  const user = await User.findById(decoded.userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 401;
    throw error;
  }

  const newAccessToken = generateAccessToken({ userId: user._id, role: user.role });
  const newRefreshToken = generateRefreshToken({ userId: user._id });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

/**
 * Change user password
 * @param {string} userId
 * @param {string} oldPassword
 * @param {string} newPassword
 */
export async function changePassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    const error = new Error('Old password is incorrect');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  await user.save();
}

/**
 * Get user profile
 * @param {string} userId
 * @returns {Object} user
 */
export async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user;
}

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} data - { username, avatar, notificationPreferences }
 * @returns {Object} updated user
 */
export async function updateProfile(userId, data) {
  const allowedFields = ['username', 'avatar', 'notificationPreferences'];
  const updates = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  // Check username uniqueness if being updated
  if (updates.username) {
    const existing = await User.findOne({
      username: updates.username,
      _id: { $ne: userId }
    });
    if (existing) {
      const error = new Error('Username already exists');
      error.statusCode = 409;
      throw error;
    }
  }

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  return user;
}

/**
 * Send password reset email
 * @param {string} email
 */
export async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) {
    const error = new Error('该邮箱未注册');
    error.statusCode = 404;
    throw error;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpire = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  await sendResetPasswordEmail(user, resetToken);
}

/**
 * Reset password using token
 * @param {string} token
 * @param {string} newPassword
 */
export async function resetPassword(token, newPassword) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: new Date() },
  });

  if (!user) {
    const error = new Error('链接无效或已过期');
    error.statusCode = 400;
    throw error;
  }

  user.password = newPassword;
  user.resetPasswordToken = '';
  user.resetPasswordExpire = undefined;
  await user.save();
}
