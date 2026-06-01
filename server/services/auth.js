import crypto from 'crypto';
import User from '../models/User.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken
} from '../utils/token.js';
import { sendResetPasswordEmail, sendRegisterEmail, sendLoginEmail } from './email.js';

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL = 'https://api.github.com/user';
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails';

function createAuthPayload(user) {
  const accessToken = generateAccessToken({ userId: user._id, role: user.role });
  const refreshToken = generateRefreshToken({ userId: user._id });
  return { user, accessToken, refreshToken };
}

function createRandomPassword() {
  return crypto.randomBytes(24).toString('hex');
}

function getGithubConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const error = new Error('GitHub OAuth Client ID 或 Client Secret 未配置');
    error.statusCode = 500;
    throw error;
  }

  return { clientId, clientSecret };
}

async function requestGithubJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'tiku-auth',
      ...(options.headers || {}),
    },
    ...options,
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    const error = new Error(data.error_description || data.message || 'GitHub 授权失败');
    error.statusCode = 401;
    throw error;
  }

  return data;
}

async function exchangeGithubCode(code, redirectUri) {
  const { clientId, clientSecret } = getGithubConfig();
  const body = {
    client_id: clientId,
    client_secret: clientSecret,
    code,
  };

  if (redirectUri) {
    body.redirect_uri = redirectUri;
  }

  const tokenData = await requestGithubJson(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!tokenData.access_token) {
    const error = new Error('GitHub 授权返回缺少 access_token');
    error.statusCode = 401;
    throw error;
  }

  return tokenData.access_token;
}

async function getGithubProfile(accessToken) {
  const headers = { Authorization: `Bearer ${accessToken}` };
  const [profile, emails] = await Promise.all([
    requestGithubJson(GITHUB_USER_URL, { headers }),
    requestGithubJson(GITHUB_EMAILS_URL, { headers }).catch(() => []),
  ]);

  const primaryEmail = Array.isArray(emails)
    ? emails.find((item) => item.primary && item.verified)?.email || emails.find((item) => item.verified)?.email
    : '';

  return {
    id: String(profile.id || ''),
    login: profile.login || '',
    name: profile.name || profile.login || 'GitHub 用户',
    email: primaryEmail || profile.email || '',
    avatar: profile.avatar_url || '',
    htmlUrl: profile.html_url || '',
  };
}

function sanitizeGithubUsername(profile) {
  const base = String(profile.login || profile.name || 'github')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '')
    .slice(0, 18) || 'github';
  return `${base}_${profile.id.slice(-6)}`;
}

function createGithubEmail(profile) {
  return profile.email || `github_${profile.id}@github.local`;
}

async function createUniqueGithubUsername(profile) {
  const base = sanitizeGithubUsername(profile);
  let username = base;
  let suffix = 1;

  while (await User.exists({ username })) {
    suffix += 1;
    username = `${base}_${suffix}`;
  }

  return username;
}

async function findGithubUser(profile) {
  let user = await User.findOne({ githubId: profile.id });
  if (!user && profile.email) {
    user = await User.findOne({ email: profile.email });
  }
  return user;
}

async function createGithubUser(profile) {
  const username = await createUniqueGithubUsername(profile);
  const email = createGithubEmail(profile);
  const existingEmailUser = await User.findOne({ email });
  if (existingEmailUser) {
    existingEmailUser.githubId = existingEmailUser.githubId || profile.id;
    existingEmailUser.githubUsername = profile.login || existingEmailUser.githubUsername;
    existingEmailUser.nickname = existingEmailUser.nickname || profile.name;
    existingEmailUser.avatar = existingEmailUser.avatar || profile.avatar;
    return existingEmailUser;
  }

  const user = new User({
    username,
    email,
    password: createRandomPassword(),
    authProvider: 'github',
    githubId: profile.id,
    githubUsername: profile.login,
    nickname: profile.name,
    avatar: profile.avatar,
    emailVerified: Boolean(profile.email),
  });

  return user;
}

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

  await sendRegisterEmail(user).catch((err) => {
    console.error('Failed to send register email:', err.message);
  });

  return createAuthPayload(user);
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

  sendLoginEmail(user).catch(() => {});

  return createAuthPayload(user);
}

/**
 * Login with GitHub OAuth code
 * @param {string} code
 * @param {string} redirectUri
 * @returns {Object} { user, accessToken, refreshToken }
 */
export async function loginWithGithub(code, redirectUri = '') {
  if (!code) {
    const error = new Error('GitHub 授权 code 不能为空');
    error.statusCode = 400;
    throw error;
  }

  const accessToken = await exchangeGithubCode(code, redirectUri);
  const profile = await getGithubProfile(accessToken);

  if (!profile.id) {
    const error = new Error('GitHub 授权返回缺少用户 ID');
    error.statusCode = 401;
    throw error;
  }

  let user = await findGithubUser(profile);
  if (!user) {
    user = await createGithubUser(profile);
  }

  user.authProvider = user.authProvider === 'password' ? user.authProvider : 'github';
  user.githubId = user.githubId || profile.id;
  user.githubUsername = profile.login || user.githubUsername;
  user.nickname = user.nickname || profile.name;
  user.avatar = user.avatar || profile.avatar;
  if (profile.email && user.email === createGithubEmail({ ...profile, email: '' })) {
    user.email = profile.email;
    user.emailVerified = true;
  }

  await user.save();
  return createAuthPayload(user);
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
