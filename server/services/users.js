import crypto from 'crypto';
import User from '../models/User.js';
import Favorite from '../models/Favorite.js';
import PracticeRecord from '../models/PracticeRecord.js';
import Question from '../models/Question.js';
import Navigation from '../models/Navigation.js';
import Affiliate from '../models/Affiliate.js';
import CareerPost from '../models/CareerPost.js';
import { normalizeAndValidateBaseUrl, buildModelsUrl } from './aiClient.js';
import { sendEmailVerificationEmail } from './email.js';
import { badRequest, notFound } from '../utils/HttpError.js';

export async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }
  return user;
}

export async function updateProfile(userId, data) {
  const allowedFields = ['username', 'avatar', 'nickname', 'phone', 'bio', 'notificationPreferences', 'socials', 'customSocial'];
  const updates = {};

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates[field] = data[field];
    }
  }

  if (updates.username) {
    const existing = await User.findOne({
      username: updates.username,
      _id: { $ne: userId }
    });
    if (existing) {
      throw badRequest('Username already exists');
    }
  }

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true
  });

  if (!user) {
    throw notFound('User not found');
  }

  return user;
}

export async function updatePassword(userId, oldPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }

  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    throw badRequest('Old password is incorrect');
  }

  user.password = newPassword;
  await user.save();
}

export async function fetchAIModels(userId, override = {}) {
  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }

  const aiConfig = user.aiConfig || {};
  const baseUrlRaw = override.baseUrl || aiConfig.baseUrl;
  const apiKey = override.apiKey || aiConfig.apiKey;

  if (!baseUrlRaw || !apiKey) {
    throw badRequest('Please configure AI baseUrl and apiKey first');
  }

  const baseUrl = await normalizeAndValidateBaseUrl(baseUrlRaw);
  const endpoint = buildModelsUrl(baseUrl);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`
      },
      signal: controller.signal
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data.error?.message || data.error || response.statusText;
      throw badRequest(`Failed to fetch models (${response.status}): ${detail}`);
    }

    const models = (data.data || data.models || [])
      .map(m => ({ id: m.id, owned_by: m.owned_by || '' }))
      .filter(m => m.id)
      .sort((a, b) => a.id.localeCompare(b.id));

    return models;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw badRequest('Fetch models request timed out');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getAIConfig(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }

  const aiConfig = user.aiConfig || {};
  return {
    baseUrl: aiConfig.baseUrl || '',
    model: aiConfig.model || '',
    enabled: aiConfig.enabled || false,
    apiKey: maskApiKey(aiConfig.apiKey || '')
  };
}

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
    throw notFound('User not found');
  }

  const aiConfig = user.aiConfig || {};
  return {
    baseUrl: aiConfig.baseUrl || '',
    model: aiConfig.model || '',
    enabled: aiConfig.enabled || false,
    apiKey: maskApiKey(aiConfig.apiKey || '')
  };
}

export async function getFavorites(userId, itemType) {
  const query = { userId };
  if (itemType) {
    query.itemType = itemType;
  }
  const favorites = await Favorite.find(query).sort({ createdAt: -1 }).lean();
  const questionIds = favorites.filter(item => item.itemType === 'question').map(item => item.itemId);
  const navigationIds = favorites.filter(item => item.itemType === 'navigation').map(item => item.itemId);
  const affiliateIds = favorites.filter(item => item.itemType === 'affiliate').map(item => item.itemId);
  const careerPostIds = favorites.filter(item => item.itemType === 'careerPost').map(item => item.itemId);

  const [questions, navigations, affiliates, careerPosts] = await Promise.all([
    questionIds.length ? Question.find({ _id: { $in: questionIds } }).lean() : Promise.resolve([]),
    navigationIds.length ? Navigation.find({ _id: { $in: navigationIds } }).lean() : Promise.resolve([]),
    affiliateIds.length ? Affiliate.find({ _id: { $in: affiliateIds } }).lean() : Promise.resolve([]),
    careerPostIds.length ? CareerPost.find({ _id: { $in: careerPostIds } }).lean() : Promise.resolve([])
  ]);

  const questionMap = new Map(questions.map(item => [String(item._id), item]));
  const navigationMap = new Map(navigations.map(item => [String(item._id), item]));
  const affiliateMap = new Map(affiliates.map(item => [String(item._id), item]));
  const careerPostMap = new Map(careerPosts.map(item => [String(item._id), item]));

  return favorites.map((favorite) => {
    let item = null;
    if (favorite.itemType === 'question') item = questionMap.get(String(favorite.itemId)) || null;
    if (favorite.itemType === 'navigation') item = navigationMap.get(String(favorite.itemId)) || null;
    if (favorite.itemType === 'affiliate') item = affiliateMap.get(String(favorite.itemId)) || null;
    if (favorite.itemType === 'careerPost') item = careerPostMap.get(String(favorite.itemId)) || null;

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

export async function addFavorite(userId, itemType, itemId) {
  const existing = await Favorite.findOne({ userId, itemType, itemId });
  if (existing) {
    throw badRequest('Already favorited');
  }

  const favorite = new Favorite({ userId, itemType, itemId });
  await favorite.save();
  return favorite;
}

export async function removeFavorite(userId, itemType, itemId) {
  const result = await Favorite.findOneAndDelete({ userId, itemType, itemId });
  if (!result) {
    throw notFound('Favorite not found');
  }
}

export async function getNotifications(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }
  return user.notificationPreferences || {};
}

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

export async function getMySubmissions(userId) {
  const [questions, navigations] = await Promise.all([
    Question.find({ uploadedBy: userId })
      .select('text category difficulty status createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean(),
    Navigation.find({ uploadedBy: userId })
      .select('name url category status createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()
  ]);
  return { questions, navigations };
}

export async function getSiteStats() {
  const [totalUsers, totalQuestions, totalNavigations, totalAffiliates, totalPractices] = await Promise.all([
    User.countDocuments(),
    Question.countDocuments(),
    Navigation.countDocuments(),
    Affiliate.countDocuments(),
    PracticeRecord.countDocuments()
  ]);
  return { totalUsers, totalQuestions, totalNavigations, totalAffiliates, totalPractices };
}

function normalizeEmail(email) {
  return String(email || '').toLowerCase().trim();
}

export async function sendEmailVerification(userId, email) {
  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }

  const normalizedEmail = normalizeEmail(email);
  const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: userId } });
  if (existing) {
    throw badRequest('该邮箱已被其他用户使用');
  }

  const verifyToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verifyToken).digest('hex');

  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpire = new Date(Date.now() + 30 * 60 * 1000);
  if (user.email !== normalizedEmail) {
    user.email = normalizedEmail;
    user.emailVerified = false;
  }
  await user.save();

  await sendEmailVerificationEmail(user, verifyToken);
}

export async function verifyEmail(userId, token) {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    _id: userId,
    emailVerificationToken: hashedToken,
    emailVerificationExpire: { $gt: new Date() },
  });

  if (!user) {
    throw badRequest('验证链接无效或已过期');
  }

  user.emailVerified = true;
  user.emailVerificationToken = '';
  user.emailVerificationExpire = undefined;
  await user.save();

  return user;
}

function maskApiKey(apiKey) {
  if (!apiKey || apiKey.length <= 4) {
    return apiKey || '';
  }
  return apiKey.slice(0, 4) + '****';
}
