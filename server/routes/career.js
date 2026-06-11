import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import * as careerController from '../controllers/career.js';

const router = Router();

// AI 对话（需登录 + AI 配置）
router.post('/chat', auth, careerController.chat);

// 对话历史
router.get('/history', auth, careerController.getHistoryList);
router.get('/history/:id', auth, careerController.getHistoryById);
router.delete('/history/:id', auth, careerController.deleteHistory);

// 资源（公开）
router.get('/resources', careerController.getResources);

// 帖子
router.get('/posts', careerController.getPosts);
router.get('/posts/:id', careerController.getPostById);
router.post('/posts', auth, careerController.createPost);
router.put('/posts/:id', auth, careerController.updatePost);
router.delete('/posts/:id', auth, careerController.deletePost);
router.post('/posts/:id/like', auth, careerController.likePost);
router.post('/posts/:id/unlike', auth, careerController.unlikePost);
router.post('/posts/:id/favorite', auth, careerController.favoritePost);
router.post('/posts/:id/unfavorite', auth, careerController.unfavoritePost);

// 评论
router.get('/posts/:id/comments', careerController.getComments);
router.post('/posts/:id/comments', auth, careerController.addComment);

// 关联题目
router.put('/posts/:id/question/:questionId', auth, careerController.checkAndUpdateQuestionRelation);

export default router;
