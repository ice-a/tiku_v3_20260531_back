import * as usersService from '../services/users.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest } from '../utils/HttpError.js';
import { validatePasswordStrength } from '../utils/passwordPolicy.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const getProfile = asyncHandler(async (req, res) => {
  const user = await usersService.getProfile(req.user._id);
  res.json({ success: true, data: { user } });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { username, avatar, nickname, phone, bio, notificationPreferences, socials, customSocial } = req.body;
  const user = await usersService.updateProfile(req.user._id, {
    username,
    avatar,
    nickname,
    phone,
    bio,
    notificationPreferences,
    socials,
    customSocial,
  });
  res.json({ success: true, data: { user } });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw badRequest('Old password and new password are required');
  }

  const pwCheck = validatePasswordStrength(newPassword);
  if (!pwCheck.ok) {
    throw badRequest(pwCheck.reason);
  }

  await usersService.updatePassword(req.user._id, oldPassword, newPassword);
  res.json({ success: true, message: 'Password updated' });
});

export const getAIConfig = asyncHandler(async (req, res) => {
  const aiConfig = await usersService.getAIConfig(req.user._id);
  res.json({ success: true, data: { aiConfig } });
});

export const getAIModels = asyncHandler(async (req, res) => {
  const { baseUrl, apiKey } = req.body;
  const models = await usersService.fetchAIModels(req.user._id, { baseUrl, apiKey });
  res.json({ success: true, data: { models } });
});

export const updateAIConfig = asyncHandler(async (req, res) => {
  const { baseUrl, apiKey, model, enabled } = req.body;
  const aiConfig = await usersService.updateAIConfig(req.user._id, {
    baseUrl,
    apiKey,
    model,
    enabled,
  });
  res.json({ success: true, data: { aiConfig } });
});

export const getFavorites = asyncHandler(async (req, res) => {
  const { itemType } = req.query;
  const favorites = await usersService.getFavorites(req.user._id, itemType);
  res.json({ success: true, data: { favorites } });
});

export const addFavorite = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.body;

  if (!itemType || !itemId) {
    throw badRequest('itemType and itemId are required');
  }

  const validTypes = ['question', 'navigation', 'affiliate'];
  if (!validTypes.includes(itemType)) {
    throw badRequest('Invalid itemType. Must be question, navigation, or affiliate');
  }

  const favorite = await usersService.addFavorite(req.user._id, itemType, itemId);
  res.status(201).json({ success: true, data: { favorite } });
});

export const removeFavorite = asyncHandler(async (req, res) => {
  const { itemType, itemId } = req.params;
  await usersService.removeFavorite(req.user._id, itemType, itemId);
  res.json({ success: true, message: 'Favorite removed' });
});

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await usersService.getNotifications(req.user._id);
  res.json({ success: true, data: { notifications } });
});

export const getMySubmissions = asyncHandler(async (req, res) => {
  const result = await usersService.getMySubmissions(req.user._id);
  res.json({ success: true, data: result });
});

export const getSiteStats = asyncHandler(async (req, res) => {
  const stats = await usersService.getSiteStats();
  res.json({ success: true, data: stats });
});

export const getStats = asyncHandler(async (req, res) => {
  const stats = await usersService.getUserStats(req.user._id);
  res.json({ success: true, data: stats });
});

export const sendEmailVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw badRequest('请提供邮箱地址');
  }
  if (!EMAIL_REGEX.test(email)) {
    throw badRequest('邮箱格式不正确');
  }
  await usersService.sendEmailVerification(req.user._id, email);
  res.json({ success: true, message: '验证邮件已发送，请查收' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) {
    throw badRequest('请提供验证令牌');
  }
  const user = await usersService.verifyEmail(req.user._id, token);
  res.json({
    success: true,
    message: '邮箱验证成功',
    data: { email: user.email, emailVerified: user.emailVerified },
  });
});
