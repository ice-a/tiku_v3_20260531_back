import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import {
  getAffiliates,
  getAffiliateById,
  createAffiliate,
  updateAffiliate,
  deleteAffiliate,
  importAffiliates
} from '../controllers/affiliates.js';

const router = Router();

// GET /api/affiliates - 获取 AFF 列表（公开）
router.get('/', getAffiliates);

// GET /api/affiliates/:id - 获取 AFF 详情（公开）
router.get('/:id', getAffiliateById);

// POST /api/affiliates - 创建 AFF（管理员）
router.post('/', auth, requireRole('admin'), createAffiliate);

// POST /api/affiliates/import - 批量导入（管理员）
router.post('/import', auth, requireRole('admin'), upload.single('import'), importAffiliates);

// PUT /api/affiliates/:id - 更新 AFF（管理员）
router.put('/:id', auth, requireRole('admin'), updateAffiliate);

// DELETE /api/affiliates/:id - 删除 AFF（管理员）
router.delete('/:id', auth, requireRole('admin'), deleteAffiliate);

export default router;
