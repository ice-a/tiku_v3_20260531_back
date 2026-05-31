import User from '../models/User.js';
import Favorite from '../models/Favorite.js';
import PracticeRecord from '../models/PracticeRecord.js';
import Question from '../models/Question.js';
import Navigation from '../models/Navigation.js';
import Affiliate from '../models/Affiliate.js';
import { normalizeAndValidateBaseUrl, buildModelsUrl } from './aiClient.js';

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
 * @param {Object} data - { username, avatar, nickname, phone, bio, notificationPreferences }
 * @returns {Object} updated user
 */
export async function updateProfile(userId, data) {
  const allowedFields = ['username', 'avatar', 'nickname', 'phone', 'bio', 'notificationPreferences'];
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
 * Update user password
 * @param {string} userId
 * @param {string} oldPassword
 * @param {string} newPassword
 */
export async function updatePassword(userId, oldPassword, newPassword) {
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
 * Fetch available models from AI API
 * @param {string} userId
 * @returns {Array} models
 */
export async function fetchAIModels(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const aiConfig = user.aiConfig || {};
  if (!aiConfig.baseUrl || !aiConfig.apiKey) {
    const error = new Error('Please configure AI baseUrl and apiKey first');
    error.statusCode = 400;
    throw error;
  }

  const baseUrl = await normalizeAndValidateBaseUrl(aiConfig.baseUrl);
  const endpoint = buildModelsUrl(baseUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${aiConfig.apiKey}`
      },
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.error?.message || data.error || response.statusText;
      const error = new Error(`Failed to fetch models (${response.status}): ${detail}`);
      error.statusCode = 502;
      throw error;
    }

    const models = (data.data || data.models || [])
      .map(m => ({ id: m.id, owned_by: m.owned_by || '' }))
      .filter(m => m.id)
      .sort((a, b) => a.id.localeCompare(b.id));

    return models;
  } catch (err) {
    if (err.name === 'AbortError') {
      const error = new Error('Fetch models request timed out');
      error.statusCode = 504;
      throw error;
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get AI config (with masked apiKey)
 * @param {string} userId
 * @returns {Object} aiConfig
 */
export async function getAIConfig(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const aiConfig = user.aiConfig || {};
  const result = {
    baseUrl: aiConfig.baseUrl || '',
    model: aiConfig.model || '',
    enabled: aiConfig.enabled || false,
    apiKey: maskApiKey(aiConfig.apiKey || '')
  };

  return result;
}

/**
 * Update AI config
 * @param {string} userId
 * @param {Object} config - { baseUrl, apiKey, model, enabled }
 * @returns {Object} aiConfig
 */
export async function updateAIConfig(userId, config) {
  const allowedFields = ['baseUrl', 'apiKey', 'model', 'enabled'];
  const updates = {};

  if (config.baseUrl !== undefined && config.baseUrl !== '') {
    config.baseUrl = await normalizeAndValidateBaseUrl(config.baseUrl);
  }

  for (const field of allowedFields) {
    if (field === 'apiKey' && config[field] === '') {
      continue;
    }
    if (config[field] !== undefined) {
      updates[`aiConfig.${field}`] = config[field];
    }
  }

  const user = await User.findByIdAndUpdate(userId, { $set: updates }, {
    new: true,
    runValidators: true
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }

  const aiConfig = user.aiConfig || {};
  return {
    baseUrl: aiConfig.baseUrl || '',
    model: aiConfig.model || '',
    enabled: aiConfig.enabled || false,
    apiKey: maskApiKey(aiConfig.apiKey || '')
  };
}

/**
 * Get favorites list
 * @param {string} userId
 * @param {string} itemType - question|navigation|affiliate
 * @returns {Array} favorites
 */
export async function getFavorites(userId, itemType) {
  const query = { userId };
  if (itemType) {
    query.itemType = itemType;
  }
  const favorites = await Favorite.find(query).sort({ createdAt: -1 }).lean();
  const questionIds = favorites.filter(item => item.itemType === 'question').map(item => item.itemId);
  const navigationIds = favorites.filter(item => item.itemType === 'navigation').map(item => item.itemId);
  const affiliateIds = favorites.filter(item => item.itemType === 'affiliate').map(item => item.itemId);

  const [questions, navigations, affiliates] = await Promise.all([
    questionIds.length ? Question.find({ _id: { $in: questionIds } }).lean() : Promise.resolve([]),
    navigationIds.length ? Navigation.find({ _id: { $in: navigationIds } }).lean() : Promise.resolve([]),
    affiliateIds.length ? Affiliate.find({ _id: { $in: affiliateIds } }).lean() : Promise.resolve([])
  ]);

  const questionMap = new Map(questions.map(item => [String(item._id), item]));
  const navigationMap = new Map(navigations.map(item => [String(item._id), item]));
  const affiliateMap = new Map(affiliates.map(item => [String(item._id), item]));

  return favorites.map((favorite) => {
    let item = null;
    if (favorite.itemType === 'question') item = questionMap.get(String(favorite.itemId)) || null;
    if (favorite.itemType === 'navigation') item = navigationMap.get(String(favorite.itemId)) || null;
    if (favorite.itemType === 'affiliate') item = affiliateMap.get(String(favorite.itemId)) || null;

    return {
      ...favorite,
      _id: favorite._id,
      favoriteId: favorite._id,
      ...item,
      itemId: favorite.itemId,
      itemType: favorite.itemType
    };
  });
}

/**
 * Add favorite
 * @param {string} userId
 * @param {string} itemType
 * @param {string} itemId
 * @returns {Object} favorite
 */
export async function addFavorite(userId, itemType, itemId) {
  const existing = await Favorite.findOne({ userId, itemType, itemId });
  if (existing) {
    const error = new Error('Already favorited');
    error.statusCode = 409;
    throw error;
  }

  const favorite = new Favorite({ userId, itemType, itemId });
  await favorite.save();
  return favorite;
}

/**
 * Remove favorite
 * @param {string} userId
 * @param {string} itemType
 * @param {string} itemId
 */
export async function removeFavorite(userId, itemType, itemId) {
  const result = await Favorite.findOneAndDelete({ userId, itemType, itemId });
  if (!result) {
    const error = new Error('Favorite not found');
    error.statusCode = 404;
    throw error;
  }
}

/**
 * Get notifications (from user notification preferences)
 * @param {string} userId
 * @returns {Object} notificationPreferences
 */
export async function getNotifications(userId) {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    throw error;
  }
  return user.notificationPreferences || {};
}

/**
 * Get user stats (favorites, practice count, accuracy)
 * @param {string} userId
 * @returns {Object} stats
 */
export async function getUserStats(userId) {
  const [favoriteCount, practiceCount, correctCount] = await Promise.all([
    Favorite.countDocuments({ userId }),
    PracticeRecord.countDocuments({ userId }),
    PracticeRecord.countDocuments({ userId, isCorrect: true })
  ]);
  return {
    favoriteCount,
    practiceCount,
    correctCount,
    accuracy: practiceCount > 0 ? Math.round((correctCount / practiceCount) * 100) : 0
  };
}

/**
 * Mask API key: show first 4 chars + ****
 * @param {string} apiKey
 * @returns {string}
 */
function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length <= 4) {
    return apiKey || '';
  }
  return apiKey.slice(0, 4) + '****';
}
