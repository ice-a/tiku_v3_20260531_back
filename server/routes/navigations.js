import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  getNavigations,
  getNavigationById,
  createNavigation,
  submitNavigation,
  approveNavigation,
  rejectNavigation,
  updateNavigation,
  deleteNavigation,
  importNavigations
} from '../controllers/navigations.js';

const router = Router();

// GET /api/navigations - 获取导航列表（公开，只返回 approved）
router.get('/', getNavigations);

// GET /api/navigations/:id - 获取导航详情（公开）
router.get('/:id', getNavigationById);

// POST /api/navigations/submit - 用户提交导航（需登录，需审核）
router.post('/submit', auth, submitNavigation);

// POST /api/navigations - 创建导航（管理员，直接通过）
router.post('/', auth, requireRole('admin'), createNavigation);

// POST /api/navigations/import - 批量导入（管理员）
router.post('/import', auth, requireRole('admin'), upload.single('import'), importNavigations);

// PUT /api/navigations/:id/approve - 审核通过（管理员）
router.put('/:id/approve', auth, requireRole('admin'), approveNavigation);

// PUT /api/navigations/:id/reject - 拒绝（管理员）
router.put('/:id/reject', auth, requireRole('admin'), rejectNavigation);

// PUT /api/navigations/:id - 更新导航（管理员）
router.put('/:id', auth, requireRole('admin'), updateNavigation);

// DELETE /api/navigations/:id - 删除导航（管理员）
router.delete('/:id', auth, requireRole('admin'), deleteNavigation);

export default router;
