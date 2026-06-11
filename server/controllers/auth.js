import * as authService from '../services/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/HttpError.js';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const register = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const email = String(req.body.email || '').toLowerCase().trim();

  if (!username || !email || !password) {
    throw badRequest('Username, email and password are required');
  }

  if (!EMAIL_REGEX.test(email)) {
    throw badRequest('Invalid email format');
  }

  const pwCheck = validatePasswordStrength(password);
  if (!pwCheck.ok) {
    throw badRequest(pwCheck.reason);
  }

  const result = await authService.register(username, email, password);

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const email = String(req.body.email || '').toLowerCase().trim();

  if (!email || !password) {
    throw badRequest('Email and password are required');
  }

  const result = await authService.login(email, password);

  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const githubLogin = asyncHandler(async (req, res) => {
  const { code, redirectUri } = req.body;

  if (!code) {
    throw badRequest('GitHub 授权 code 不能为空');
  }

  const result = await authService.loginWithGithub(code, redirectUri);

  res.json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw badRequest('Refresh token is required');
  }

  const result = await authService.refreshToken(refreshToken);

  res.json({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);

  res.json({
    success: true,
    data: { user },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { username, avatar, notificationPreferences } = req.body;

  const user = await authService.updateProfile(req.user._id, {
    username,
    avatar,
    notificationPreferences,
  });

  res.json({
    success: true,
    data: { user },
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw badRequest('邮箱不能为空');
  }

  await authService.forgotPassword(email);

  res.json({
    success: true,
    message: '重置密码邮件已发送，请查收',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw badRequest('Token 和密码不能为空');
  }

  const pwCheck = validatePasswordStrength(password);
  if (!pwCheck.ok) {
    throw badRequest(pwCheck.reason);
  }

  await authService.resetPassword(token, password);

  res.json({
    success: true,
    message: '密码重置成功',
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw badRequest('Old password and new password are required');
  }

  const pwCheck = validatePasswordStrength(newPassword);
  if (!pwCheck.ok) {
    throw badRequest(pwCheck.reason);
  }

  await authService.changePassword(req.user._id, oldPassword, newPassword);

  res.json({
    success: true,
    message: 'Password updated',
  });
});

export const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout(req.user._id);
  res.json({ success: true, message: result.message });
});
