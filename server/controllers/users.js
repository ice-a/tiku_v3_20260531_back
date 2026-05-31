import * as usersService from '../services/users.js';

/**
 * GET /api/users/profile
 */
export async function getProfile(req, res) {
  try {
    const user = await usersService.getProfile(req.user._id);
    res.json({
      success: true,
      data: { user }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * PUT /api/users/profile
 */
export async function updateProfile(req, res) {
  try {
    const { username, avatar, nickname, phone, bio, notificationPreferences } = req.body;
    const user = await usersService.updateProfile(req.user._id, {
      username,
      avatar,
      nickname,
      phone,
      bio,
      notificationPreferences
    });
    res.json({
      success: true,
      data: { user }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * PUT /api/users/password
 */
export async function updatePassword(req, res) {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Old password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    await usersService.updatePassword(req.user._id, oldPassword, newPassword);

    res.json({
      success: true,
      message: 'Password updated'
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * GET /api/users/ai-config
 */
export async function getAIConfig(req, res) {
  try {
    const aiConfig = await usersService.getAIConfig(req.user._id);
    res.json({
      success: true,
      data: { aiConfig }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * GET /api/users/ai-config/models
 */
export async function getAIModels(req, res) {
  try {
    const models = await usersService.fetchAIModels(req.user._id);
    res.json({
      success: true,
      data: { models }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * PUT /api/users/ai-config
 */
export async function updateAIConfig(req, res) {
  try {
    const { baseUrl, apiKey, model, enabled } = req.body;
    const aiConfig = await usersService.updateAIConfig(req.user._id, {
      baseUrl,
      apiKey,
      model,
      enabled
    });
    res.json({
      success: true,
      data: { aiConfig }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * GET /api/users/favorites
 */
export async function getFavorites(req, res) {
  try {
    const { itemType } = req.query;
    const favorites = await usersService.getFavorites(req.user._id, itemType);
    res.json({
      success: true,
      data: { favorites }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * POST /api/users/favorites
 */
export async function addFavorite(req, res) {
  try {
    const { itemType, itemId } = req.body;

    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        error: 'itemType and itemId are required'
      });
    }

    const validTypes = ['question', 'navigation', 'affiliate'];
    if (!validTypes.includes(itemType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid itemType. Must be question, navigation, or affiliate'
      });
    }

    const favorite = await usersService.addFavorite(req.user._id, itemType, itemId);
    res.status(201).json({
      success: true,
      data: { favorite }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * DELETE /api/users/favorites/:itemType/:itemId
 */
export async function removeFavorite(req, res) {
  try {
    const { itemType, itemId } = req.params;
    await usersService.removeFavorite(req.user._id, itemType, itemId);
    res.json({
      success: true,
      message: 'Favorite removed'
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * GET /api/users/notifications
 */
export async function getNotifications(req, res) {
  try {
    const notifications = await usersService.getNotifications(req.user._id);
    res.json({
      success: true,
      data: { notifications }
    });
  } catch (err) {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: err.message
    });
  }
}

/**
 * GET /api/users/stats
 */
export async function getStats(req, res) {
  try {
    const stats = await usersService.getUserStats(req.user._id);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}
