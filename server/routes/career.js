import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import * as careerController from '../controllers/career.js';

const router = Router();

// POST /api/career/chat - AI 对话（需要认证）
router.post('/chat', auth, careerController.chat);

// GET /api/career/history - 获取对话列表（需要认证）
router.get('/history', auth, careerController.getHistoryList);

// GET /api/career/history/:id - 获取对话详情（需要认证）
router.get('/history/:id', auth, careerController.getHistoryById);

// DELETE /api/career/history/:id - 删除对话（需要认证）
router.delete('/history/:id', auth, careerController.deleteHistory);

// GET /api/career/resources - 获取资源列表（公开）
router.get('/resources', careerController.getResources);

export default router;
