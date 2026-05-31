import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as usersController from '../controllers/users.js';

const router = Router();

// GET /api/users/profile - 获取个人信息
router.get('/profile', auth, usersController.getProfile);

// PUT /api/users/profile - 更新个人信息
router.put('/profile', auth, usersController.updateProfile);

// PUT /api/users/password - 修改密码
router.put('/password', auth, usersController.updatePassword);

// GET /api/users/ai-config - 获取 AI 配置
router.get('/ai-config', auth, usersController.getAIConfig);

// GET /api/users/ai-config/models - 获取可用模型列表
router.get('/ai-config/models', auth, usersController.getAIModels);

// PUT /api/users/ai-config - 更新 AI 配置
router.put('/ai-config', auth, usersController.updateAIConfig);

// GET /api/users/favorites - 获取收藏列表
router.get('/favorites', auth, usersController.getFavorites);

// POST /api/users/favorites - 添加收藏
router.post('/favorites', auth, usersController.addFavorite);

// DELETE /api/users/favorites/:itemType/:itemId - 取消收藏
router.delete('/favorites/:itemType/:itemId', auth, usersController.removeFavorite);

// GET /api/users/notifications - 获取通知列表
router.get('/notifications', auth, usersController.getNotifications);

// GET /api/users/stats - 获取用户统计
router.get('/stats', auth, usersController.getStats);

export default router;
