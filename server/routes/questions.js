import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import * as questionsController from '../controllers/questions.js';

const router = Router();

// GET /api/questions/stats - 获取统计（需要认证，放在 /:id 之前）
router.get('/stats', auth, questionsController.getStats);

// GET /api/questions - 获取题目列表（公开）
router.get('/', questionsController.getList);

// GET /api/questions/:id - 获取题目详情（公开）
router.get('/:id', questionsController.getById);

// POST /api/questions - 创建题目（需要认证）
router.post('/', auth, questionsController.create);

// PUT /api/questions/:id - 更新题目（需要认证）
router.put('/:id', auth, questionsController.update);

// DELETE /api/questions/:id - 删除题目（需要认证）
router.delete('/:id', auth, questionsController.deleteQuestion);

// POST /api/questions/import - 批量导入（需要认证，文件上传）
router.post('/import', auth, upload.single('import'), questionsController.importQuestions);

// POST /api/questions/:id/approve - 审核通过（管理员）
router.post('/:id/approve', auth, requireRole('admin'), questionsController.approve);

// POST /api/questions/:id/reject - 审核拒绝（管理员）
router.post('/:id/reject', auth, requireRole('admin'), questionsController.reject);

// POST /api/questions/:id/practice - 练习答题（需要认证）
router.post('/:id/practice', auth, questionsController.practice);

// POST /api/questions/:id/ai-score - AI 评分（需要认证）
router.post('/:id/ai-score', auth, questionsController.aiScore);

// POST /api/questions/:id/ai-answer - AI 生成答案（需要认证）
router.post('/:id/ai-answer', auth, questionsController.aiAnswer);

// GET /api/questions/:id/share - 生成分享图片（公开）
router.get('/:id/share', questionsController.share);

// POST /api/questions/:id/feedback - 提交反馈（需要认证）
router.post('/:id/feedback', auth, questionsController.submitFeedback);

export default router;
